import { Injectable, Injector } from "@angular/core";
import { nanoid } from "nanoid";
import { DialogService } from "src/app/shared/services/dialog.service";
import { ArrayUtils } from "src/app/shared/utils/array.utils";
import { StringUtils } from "src/app/shared/utils/string.utils";
import { Tag } from "../models/tag.class";
import { FilterService } from "./filter.service";
import { GalleryStateService } from "./gallery-state.service";
import { GallerySerializationService } from "./gallery-serialization.service";

@Injectable({
  providedIn: 'root',
})
export class TagService {

  public readonly tags: Tag[] = [];

  constructor(
    private injector: Injector,
    private dialogService: DialogService,
    private stateService: GalleryStateService,
    private serializationService: GallerySerializationService
  ) { }

  public getRootTags(): Tag[] {
    return this.tags.filter(tag => !tag.parent);
  }

  public getParentPseudoTags(tag: Tag): Tag[] {
    return this.tags.filter(t => t.pseudo && t.children.includes(tag));
  }

  public sort(tags: Tag[], useNameWithParents: boolean = false): void {
    if (tags) {
      if (useNameWithParents) {
        tags.sort((t1, t2) => t1.getNameWithParents().localeCompare(t2.getNameWithParents()));
      } else {
        tags.sort((t1, t2) => t1.name.localeCompare(t2.name));
      }
    }
  }

  public async openTagCreate(parent: Tag): Promise<void> {
    if (parent) {
      const name: string = await this.dialogService.createInput({
        title: 'Create Tag: ' + parent.getNameWithParents(),
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
        this.sort(parent.children);

        this.tags.push(tag);
        this.sort(this.tags);

        this.serializationService.save();
      }
    }
  }

  public async openTagGroupCreate(parent?: Tag): Promise<void> {
    if (parent) {
      const name: string = await this.dialogService.createInput({
        title: 'Create Tag Group: ' + parent.getNameWithParents(),
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
        this.sort(parent.children);

        this.tags.push(tagGroup);
        this.sort(this.tags);

        this.serializationService.save();
      }
    } else {
      const name: string = await this.dialogService.createInput({
        title: 'Create Tag Group: Root',
        placeholder: 'Name',
        validationFn: value => !this.tags.filter(t => !t.parent).map(t => t.name).includes(value)
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

        this.tags.push(tagGroup);
        this.sort(this.tags);

        this.serializationService.save();
      }
    }
  }

  public async insertTagGroup(tag: Tag): Promise<void> {
    if (tag) {
      if (await this.dialogService.createConfirmation({
        title: 'Confirmation',
        messages: ['Insert Tag Group between \'' + tag.getNameWithParents() + '\' and its parent?']
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
        this.sort(tag.parent.children);

        tag.parent = tagGroup;

        this.tags.push(tagGroup);
        this.serializationService.save();
      }
    }
  }

  public async openTagRename(tag: Tag): Promise<void> {
    const name: string = await this.dialogService.createInput({
      title: 'Rename: ' + tag.getNameWithParents(),
      placeholder: 'Name',
      defaultValue: tag.name,
      validationFn: value => {
        if (tag.parent) {
          return !tag.parent.children.map(t => t.name).includes(value);
        } else {
          return !this.tags.filter(t => !t.parent).map(t => t.name).includes(value);
        }
      }
    });

    if (!StringUtils.isEmpty(name)) {
      tag.name = name;

      this.sort(tag.parent?.children);
      this.sort(this.tags);

      this.serializationService.save();
    }
  }

  public async openTagDelete(tag: Tag): Promise<void> {
    let message: string;
    if (tag.group) {
      message = 'Delete \'' + tag.getNameWithParents() + '\' and its descendants?';
    } else {
      message = 'Delete \'' + tag.getNameWithParents() + '\'';
    }

    if (await this.dialogService.createConfirmation({
      title: 'Confirmation',
      messages: [message]
    })) {
      ArrayUtils.remove(tag.parent?.children, tag);

      const tags: Tag[] = tag.collectChildren().concat(tag);
      ArrayUtils.remove(this.tags, tags);

      for (const image of this.stateService.images) {
        ArrayUtils.remove(image.tags, tags)
      }

      this.injector.get(FilterService).updateFilters();
      this.serializationService.save();
    }
  }

  public async openTagParentChange(tag: Tag): Promise<void> {
    const children: Tag[] = tag.collectChildren();
    const availableParents: Tag[] = this.tags.filter(t => {
      if (!t.group) return false;
      if (t == tag) return false;
      if (t == tag.parent) return false;
      if (children.includes(t)) return false;
      if (t.children.map(c => c.name).includes(tag.name)) return false;
      return true;
    });

    const parent: Tag = await this.dialogService.createSelect({
      title: 'Change Parent: ' + tag.getNameWithParents(),
      options: availableParents,
      nullOption: tag.parent ? 'Root' : null,
      defaultValue: tag.parent,
      getText: option => option.getCompleteName()
    });

    this.changeParent(tag, parent);
  }

  public changeParent(tag: Tag, parent: Tag): void {
    if (tag.group && parent === null) {
      // move group to root
      ArrayUtils.remove(tag.parent?.children, tag);

      tag.parent = null;

      this.injector.get(FilterService).updateFilters(...this.stateService.images.filter(image => image.tags.includes(tag)));
      this.serializationService.save();
    } else if (parent) {
      ArrayUtils.remove(tag.parent?.children, tag);

      tag.parent = parent;
      tag.parent.open = true;
      tag.parent.children.push(tag);
      this.sort(tag.parent.children);

      this.injector.get(FilterService).updateFilters(...this.stateService.images.filter(image => image.tags.includes(tag)));
      this.serializationService.save();
    }
  }

  public async editPseudoList(tag: Tag): Promise<void> {
    if (!tag.group) {
      const options: Tag[] = this.tags.filter(t => {
        if (t == tag) return false;
        if (t.group) return false;
        if (t.pseudo) return false;
        return true;
      });

      this.sort(options, true);

      // TODO ask Gepeto how to reflect inputs with types
      const pseudoSelection: Tag[] = await this.dialogService.createMultiSelect<Tag>({
        title: 'Edit Pseudo List: ' + tag.getNameWithParents(),
        options: options,
        getText: (option: Tag) => option.getNameWithParents(),
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
        this.sort(tag.children, true);

        this.injector.get(FilterService).updateFilters();
        this.serializationService.save();
      }
    }
  }

}
