import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { VariableType } from '../../../models/logic/variable-type.enum';
import { Variable } from '../../../models/logic/variable.model';
import { AdventureStateService } from '../../../services/adventure-state.service';
import { AdventureFactory } from '../../../utils/adventure.factory';

@Component({
  selector: 'app-variable-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './variable-editor.component.html',
  styleUrls: ['./variable-editor.component.scss']
})
export class VariableEditorComponent extends DialogContent<Variable> implements OnInit {

  @Input() sourceVariable: Variable;

  editableVariable: Variable;

  configuration: DialogConfiguration = {
    title: 'Variable Editor',
    buttons: [{
      text: () => 'Done',
      disabled: () => !this.canSubmit(),
      click: () => this.submit()
    }, {
      text: () => 'Cancel',
      click: () => this.close()
    }]
  }

  constructor(
    private dialogService: DialogService,
    private stateService: AdventureStateService
  ) {
    super();
  }

  ngOnInit(): void {
    this.editableVariable = AdventureFactory.createVariable();
    if (this.sourceVariable) {
      this.editableVariable.id = this.sourceVariable.id;
      this.editableVariable.type = this.sourceVariable.type;
      this.editableVariable.options = this.sourceVariable.options;
    } else {
      this.editableVariable.type = VariableType.ENUM;
    }
  }

  createOption(): void {
    this.editableVariable.options.push({ value: '' });
  }

  removeOption(option: { value: string }): void {
    if (StringUtils.isEmpty(option.value)) {
      ArrayUtils.remove(this.editableVariable.options, option);
    } else {
      this.dialogService.createConfirmation('Remove Option', ['Remove option ' + option.value, 'Are you sure?'], 'Yes', 'No').then(result => {
        if (result) {
          ArrayUtils.remove(this.editableVariable.options, option);
        }
      });
    }
  }

  getVariableTypes(): VariableType[] {
    return Object.values(VariableType);
  }

  onVariableTypeChange(variableType: VariableType): void {
    switch (variableType) {
      case VariableType.BOOLEAN:
        this.editableVariable.initialValue = 'false';
        break;
      case VariableType.NUMBER:
        this.editableVariable.initialValue = '0';
        break;
      case VariableType.ENUM:
        this.editableVariable.initialValue = null;
        break;
    }
  }

  processVariableChange(): void {
    for (const button of this.stateService.getButtons()) {
      for (const logic of button.logic) {
        for (const action of logic.actions) {
          for (const variableChange of action.variableChanges) {
            if (variableChange.id == this.sourceVariable.id) {
              variableChange.id = this.editableVariable.id;
            }
          }
        }
      }
    }
  }

  canSubmit(): boolean {
    if (StringUtils.isEmpty(this.editableVariable.id)) return false;
    if (StringUtils.isEmpty(this.editableVariable.type)) return false;

    switch (this.editableVariable.type) {
      case VariableType.BOOLEAN:
        if (StringUtils.isEmpty(this.editableVariable.initialValue)) return false;
        break;
      case VariableType.NUMBER:
        if (this.editableVariable.initialValue == null || this.editableVariable.initialValue.length == 0) return false;
        break;
      case VariableType.ENUM:
        if (!this.editableVariable.options.some(option => option.value)) return false;
        break;
    }

    return true;
  }

  submit(): void {
    if (this.canSubmit()) {
      if (this.sourceVariable.id) {
        this.processVariableChange();
      }

      this.sourceVariable.id = this.editableVariable.id;
      this.sourceVariable.type = this.editableVariable.type;

      switch (this.editableVariable.type) {
        case VariableType.BOOLEAN:
        case VariableType.NUMBER:
          this.sourceVariable.options.length = 0;
          break;
        case VariableType.ENUM:
          this.sourceVariable.options = this.editableVariable.options.filter(option => !StringUtils.isEmpty(option.value));
          break;
      }

      this.sourceVariable.initialValue = this.editableVariable.initialValue;

      this.resolve(this.sourceVariable);
    }
  }

  public close(): void {
    this.resolve(null);
  }

}
