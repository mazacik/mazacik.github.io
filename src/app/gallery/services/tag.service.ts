import { Injectable } from "@angular/core";
import { nanoid } from "nanoid";
import { DialogService } from "src/app/shared/services/dialog.service";
import { ArrayUtils } from "src/app/shared/utils/array.utils";
import { StringUtils } from "src/app/shared/utils/string.utils";
import { TagUtils } from "src/app/shared/utils/tag.utils";
import { Tag } from "../model/tag.interface";
import { GalleryStateService } from "./gallery-state.service";

@Injectable({
  providedIn: 'root',
})
export class TagService {

  constructor(
    private stateService: GalleryStateService,
    private dialogService: DialogService
  ) { }

  public getRootTags(): Tag[] {
    return this.stateService.tags.filter(tag => !tag.parent);
  }

  public getTagCount(tag: Tag): number {
    return this.stateService.images.filter(img => img.tags.includes(tag)).length;
  }

  public async openTagCreate(parent?: Tag): Promise<void> {
    if (parent) {
      const name: string = await this.dialogService.createInput({
        title: 'Create Tag',
        placeholder: 'Tag Name',
        validationFn: value => !parent.children.map(t => t.name).includes(value)
      });

      if (!StringUtils.isEmpty(name)) {
        const tag: Tag = { id: nanoid(), name: name, state: 0, parent: parent, children: [], open: true };

        parent.children.push(tag);
        parent.children.sort((t1, t2) => TagUtils.getCompleteName(t1).localeCompare(TagUtils.getCompleteName(t2)));

        this.stateService.tags.push(tag);
        this.stateService.tags.sort((t1, t2) => TagUtils.getCompleteName(t1).localeCompare(TagUtils.getCompleteName(t2)));
        this.stateService.save();
      }
    } else {
      const name: string = await this.dialogService.createInput({
        title: 'Create Tag',
        placeholder: 'Tag Name',
        validationFn: value => !this.stateService.tags.filter(t => !t.parent).map(t => t.name).includes(value)
      });

      if (!StringUtils.isEmpty(name)) {
        this.stateService.tags.push({ id: nanoid(), name: name, state: 0, children: [], open: true });
        this.stateService.tags.sort((t1, t2) => TagUtils.getCompleteName(t1).localeCompare(TagUtils.getCompleteName(t2)));
        this.stateService.save();
      }
    }
  }

  public async openTagRename(tag: Tag): Promise<void> {
    const name: string = await this.dialogService.createInput({
      title: 'Rename Tag: ' + TagUtils.getCompleteName(tag),
      placeholder: 'Tag Name',
      defaultValue: tag.name,
      validationFn: value => {
        if (tag.parent) {
          return !tag.parent.children.map(t => t.name).includes(value);
        } else {
          return !this.stateService.tags.filter(t => !t.parent).map(t => t.name).includes(value);
        }
      }
    });

    if (!StringUtils.isEmpty(name)) {
      tag.name = name;

      if (tag.parent) tag.parent.children.sort((t1, t2) => TagUtils.getCompleteName(t1).localeCompare(TagUtils.getCompleteName(t2)));
      this.stateService.tags.sort((t1, t2) => TagUtils.getCompleteName(t1).localeCompare(TagUtils.getCompleteName(t2)));

      this.stateService.save();
    }
  }

  public async openTagDelete(tag: Tag): Promise<void> {
    if (await this.dialogService.createConfirmation({ title: 'Delete Tag', messages: ['Delete \'' + TagUtils.getCompleteName(tag) + '\' and its descendats?'] })) {
      if (tag.parent) ArrayUtils.remove(tag.parent.children, tag);

      const tags: Tag[] = TagUtils.collectChildren(tag).concat(tag);
      ArrayUtils.remove(this.stateService.tags, tags);

      for (const image of this.stateService.images) {
        if (ArrayUtils.remove(image.tags, tags)) {
          this.stateService.updateFilters(image);
        }
      }

      this.stateService.save();
    }
  }

  public async openTagParentChange(tag: Tag): Promise<void> {
    const children: Tag[] = TagUtils.collectChildren(tag);
    const availableParents: Tag[] = this.stateService.tags.filter(t => {
      if (t == tag) return false;
      if (t == tag.parent) return false;
      if (children.includes(t)) return false;
      if (t.children.map(c => c.name).includes(tag.name)) return false;
      return true;
    });

    const parent: Tag = await this.dialogService.createSelect({
      title: 'Change Tag Parent: ' + TagUtils.getCompleteName(tag),
      options: availableParents,
      nullOption: tag.parent ? 'Root' : null,
      defaultValue: tag.parent,
      getText: option => TagUtils.getCompleteName(option)
    });

    if (parent) {
      ArrayUtils.remove(tag.parent?.children, tag);

      tag.parent = parent;
      tag.parent.open = true;
      tag.parent.children.push(tag);
      tag.parent.children.sort((t1, t2) => TagUtils.getCompleteName(t1).localeCompare(TagUtils.getCompleteName(t2)));

      for (const image of this.stateService.images) {
        if (image.tags.includes(tag)) {
          this.stateService.updateFilters(image);
        }
      }

      this.stateService.save();
    }
  }

}
