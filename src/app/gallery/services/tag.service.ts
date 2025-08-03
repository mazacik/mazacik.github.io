import { Injectable } from "@angular/core";
import { nanoid } from "nanoid";
import { DialogService } from "src/app/shared/services/dialog.service";
import { ArrayUtils } from "src/app/shared/utils/array.utils";
import { StringUtils } from "src/app/shared/utils/string.utils";
import { TagUtils } from "src/app/shared/utils/tag.utils";
import { Tag } from "../models/tag.class";
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

  public getParentPseudoTags(tag: Tag): Tag[] {
    return this.stateService.tags.filter(t => t.isPseudo() && t.children.includes(tag));
  }

  public async openTagCreate(parent: Tag): Promise<void> {
    if (parent) {
      const name: string = await this.dialogService.createInput({
        title: 'Create Tag: ' + parent.getCompleteName(),
        placeholder: 'Name',
        validationFn: value => !parent.children.filter(t => !t.group).map(t => t.name).includes(value)
      });

      if (!StringUtils.isEmpty(name)) {
        const tag: Tag = new Tag();
        tag.id = nanoid();
        tag.name = name;
        tag.group = false;
        tag.state = 0;
        tag.parent = parent;
        tag.children = [];

        parent.children.push(tag);
        parent.sortChildren();

        this.stateService.tags.push(tag);
        TagUtils.sort(this.stateService.tags);

        this.stateService.save();
      }
    }
  }

  public async openTagGroupCreate(parent?: Tag): Promise<void> {
    if (parent) {
      const name: string = await this.dialogService.createInput({
        title: 'Create Tag Group: ' + parent.getCompleteName(),
        placeholder: 'Name',
        validationFn: value => !parent.children.filter(t => t.group).map(t => t.name).includes(value)
      });

      if (!StringUtils.isEmpty(name)) {
        const tagGroup: Tag = new Tag();
        tagGroup.id = nanoid();
        tagGroup.name = name;
        tagGroup.group = true;
        tagGroup.state = 0;
        tagGroup.parent = parent;
        tagGroup.children = [];
        tagGroup.open = true;

        parent.children.push(tagGroup);
        parent.sortChildren();

        this.stateService.tags.push(tagGroup);
        TagUtils.sort(this.stateService.tags);

        this.stateService.save();
      }
    } else {
      const name: string = await this.dialogService.createInput({
        title: 'Create Tag Group: Root',
        placeholder: 'Name',
        validationFn: value => !this.stateService.tags.filter(t => !t.parent).map(t => t.name).includes(value)
      });

      if (!StringUtils.isEmpty(name)) {
        const tagGroup: Tag = new Tag();
        tagGroup.id = nanoid();
        tagGroup.name = name;
        tagGroup.group = true;
        tagGroup.state = 0;
        tagGroup.parent = parent;
        tagGroup.children = [];
        tagGroup.open = true;

        this.stateService.tags.push(tagGroup);
        TagUtils.sort(this.stateService.tags);

        this.stateService.save();
      }
    }
  }

  public async insertTagGroup(tag: Tag): Promise<void> {
    if (tag) {
      if (await this.dialogService.createConfirmation({
        title: 'Confirmation',
        messages: ['Insert Tag Group between \'' + tag.getCompleteName() + '\' and its parent?']
      })) {
        const tagGroup: Tag = new Tag();
        tagGroup.id = nanoid();
        tagGroup.name = tag.name;
        tagGroup.group = true;
        tagGroup.state = 0;
        tagGroup.parent = tag.parent;
        tagGroup.children = [tag];
        tagGroup.open = true;

        ArrayUtils.remove(tag.parent.children, tag);
        ArrayUtils.push(tag.parent.children, tagGroup);
        tag.parent.sortChildren();

        tag.parent = tagGroup;

        this.stateService.tags.push(tagGroup);
        this.stateService.save();
      }
    }
  }

  public async openTagRename(tag: Tag): Promise<void> {
    const name: string = await this.dialogService.createInput({
      title: 'Rename: ' + tag.getCompleteName(),
      placeholder: 'Name',
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

      tag.parent?.sortChildren();
      TagUtils.sort(this.stateService.tags);

      this.stateService.save();
    }
  }

  public async openTagDelete(tag: Tag): Promise<void> {
    let message: string;
    if (tag.group) {
      message = 'Delete \'' + tag.getCompleteName() + '\' and its descendants?';
    } else {
      message = 'Delete \'' + tag.getCompleteName() + '\'';
    }

    if (await this.dialogService.createConfirmation({
      title: 'Confirmation',
      messages: [message]
    })) {
      ArrayUtils.remove(tag.parent?.children, tag);

      const tags: Tag[] = tag.collectChildren().concat(tag);
      ArrayUtils.remove(this.stateService.tags, tags);

      for (const image of this.stateService.images) {
        ArrayUtils.remove(image.tags, tags)
      }

      this.stateService.updateFilters();
      this.stateService.save();
    }
  }

  public async openTagParentChange(tag: Tag): Promise<void> {
    const children: Tag[] = tag.collectChildren();
    const availableParents: Tag[] = this.stateService.tags.filter(t => {
      if (!t.group) return false;
      if (t == tag) return false;
      if (t == tag.parent) return false;
      if (children.includes(t)) return false;
      if (t.children.map(c => c.name).includes(tag.name)) return false;
      return true;
    });

    const parent: Tag = await this.dialogService.createSelect({
      title: 'Change Parent: ' + tag.getCompleteName(),
      options: availableParents,
      nullOption: tag.parent ? 'Root' : null,
      defaultValue: tag.parent,
      getText: option => option.getCompleteName()
    });

    if (parent === null) {
      // move to root
      ArrayUtils.remove(tag.parent.children, tag);

      tag.parent = null;

      this.stateService.images.filter(image => image.tags.includes(tag)).forEach(image => this.stateService.updateFilters(image));
      this.stateService.save();
    } else {
      ArrayUtils.remove(tag.parent?.children, tag);

      tag.parent = parent;
      tag.parent.open = true;
      tag.parent.children.push(tag);
      tag.parent.sortChildren();

      this.stateService.images.filter(image => image.tags.includes(tag)).forEach(image => this.stateService.updateFilters(image));
      this.stateService.save();
    }
  }

  public async editPseudoList(tag: Tag): Promise<void> {
    if (!tag.group) {
      const options: Tag[] = this.stateService.tags.filter(t => {
        if (t == tag) return false;
        if (t.group) return false;
        if (t.isPseudo()) return false;
        return true;
      });

      TagUtils.sort(options, true);

      // TODO ask Gepeto how to reflect inputs with types
      const pseudoSelection: Tag[] = await this.dialogService.createMultiSelect<Tag>({
        title: 'Edit Pseudo List: ' + tag.getCompleteName(),
        options: options,
        getText: (option: Tag) => option.getCompleteName(),
        defaultSelection: tag.children,
        disableFn: (option: Tag, selection: Tag[]) => {
          for (const value of selection) {
            if (value.collectChildren().includes(option)) {
              return true;
            }
          }
        },
        onSelectionChange: (selection: Tag[], change: Tag) => {
          const changeChildren: Tag[] = change.collectChildren();
          for (const value of selection) {
            if (changeChildren.includes(value)) {
              ArrayUtils.remove(selection, value);
            }
          }
        }
      });

      if (pseudoSelection) {
        if (ArrayUtils.isEmpty(tag.children)) {
          // conversion to pseudo, remove tag from images
          this.stateService.images.forEach(image => ArrayUtils.remove(image.tags, tag));
        }

        tag.children = pseudoSelection;
        TagUtils.sort(tag.children, true);

        this.stateService.updateFilters();
        this.stateService.save();
      }
    }
  }

}
