import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { Tag } from '../../models/tag.class';

export interface TagCreateResult {
  name: string;
  parent: Tag | null;
}

export interface TagCreateInputs {
  group: boolean;
  parentGroups: Tag[];
  initialParent: Tag | null;
  validateName: (name: string, parent: Tag | null) => string | null;
}

@Component({
  selector: 'app-tag-create',
  imports: [FormsModule, NgSelectComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './tag-create.component.html',
  styleUrls: ['./tag-create.component.scss']
})
export class TagCreateComponent extends DialogContentBase<TagCreateResult | undefined, TagCreateInputs> implements OnInit {
  public configuration: DialogContainerConfiguration;

  protected name: string = '';
  protected parentOptions: { label: string; parent: Tag | null }[] = [];
  protected selectedParent: { label: string; parent: Tag | null };

  ngOnInit(): void {
    this.parentOptions = [{ label: 'Root', parent: null }, ...this.inputs.parentGroups.map(parent => ({ label: parent.getNameWithParents(), parent }))];
    this.selectedParent = this.parentOptions.find(option => option.parent === this.inputs.initialParent) ?? this.parentOptions[0];
    this.configuration = {
      title: this.inputs.group ? 'Create Tag Group' : 'Create Tag',
      headerButtons: [{ iconClass: 'fa-solid fa-times', click: () => this.close() }],
      footerButtons: [{
        text: 'Cancel',
        click: () => this.close()
      }, {
        text: 'Create',
        disabled: () => !this.canSubmit(),
        click: () => this.submit()
      }]
    };
  }

  protected getValidationMessage(): string | null {
    return this.inputs.validateName(this.name, this.selectedParent.parent);
  }

  protected canSubmit(): boolean {
    return !StringUtils.isEmpty(this.name) && this.getValidationMessage() === null;
  }

  public override submit(): void {
    if (this.canSubmit()) {
      this.resolve({ name: this.name, parent: this.selectedParent.parent });
    }
  }

  public close(): void {
    this.resolve(undefined);
  }
}
