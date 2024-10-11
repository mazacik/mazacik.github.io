import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { Button } from '../../../models/components/button.interface';
import { Logic } from '../../../models/logic/logic.model';
import { Operator } from '../../../models/logic/operator.enum';
import { AdventureFactory } from '../../../utils/adventure.factory';
import { LogicEditorComponent } from './logic-editor/logic-editor.component';

@Component({
  selector: 'app-button-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LogicEditorComponent
  ],
  templateUrl: './button-editor.component.html',
  styleUrls: ['./button-editor.component.scss']
})
export class ButtonEditorComponent extends DialogContent<Button> implements OnInit {

  @Input() sourceButton: Button;

  editableButton: Button;

  configuration: DialogConfiguration = {
    title: 'Button Editor',
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
    private dialogService: DialogService
  ) {
    super();
  }

  ngOnInit(): void {
    this.editableButton = AdventureFactory.createButton();
    if (this.sourceButton) {
      this.editableButton.text = this.sourceButton.text;
      this.editableButton.tooltip = this.sourceButton.tooltip;
      this.editableButton.logic = this.sourceButton.logic;
      this.editableButton.disabled = this.sourceButton.disabled;
      this.editableButton.hidden = this.sourceButton.hidden;
    }
  }

  createLogicEntry(): void {
    this.editableButton.logic.push(AdventureFactory.createLogic(Operator.ALWAYS));
  }

  onRemoveLogic(logic: Logic): void {
    if (ArrayUtils.isEmpty(logic.conditions) && logic.actions.every(action => ArrayUtils.isEmpty(action.storyChanges) && ArrayUtils.isEmpty(action.variableChanges))) {
      ArrayUtils.remove(this.editableButton.logic, logic);
    } else {
      this.dialogService.createConfirmation('Remove Logic Entry', ['Are you sure you want to remove this logic entry?'], 'Yes', 'No').then(result => {
        if (result) {
          ArrayUtils.remove(this.editableButton.logic, logic);
        }
      });
    }
  }

  canSubmit(): boolean {
    return !StringUtils.isEmpty(this.editableButton.text);
  }

  submit(): void {
    if (this.canSubmit()) {
      this.sourceButton.text = this.editableButton.text;
      this.sourceButton.tooltip = this.editableButton.tooltip;

      for (const logic of this.editableButton.logic) {
        for (const action of logic.actions) {
          action.storyChanges = action.storyChanges.filter(storyChange => !StringUtils.isEmpty(storyChange.value));
          action.variableChanges = action.variableChanges.filter(variableChange => !StringUtils.isEmpty(variableChange.value));
        }
      }

      this.sourceButton.logic = this.editableButton.logic;
      this.sourceButton.hidden = AdventureFactory.createCondition(Operator.NEVER); // TODO
      this.sourceButton.disabled = AdventureFactory.createCondition(Operator.NEVER); // TODO

      this.resolve(this.sourceButton);
    }
  }

  public close(): void {
    this.resolve(null);
  }

}
