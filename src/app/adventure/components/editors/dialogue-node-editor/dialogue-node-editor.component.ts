import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogueLine } from 'src/app/adventure/models/components/dialogue-line.interface';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { Button } from '../../../models/components/button.interface';
import { DialogueNode } from '../../../models/components/dialogue-node.interface';
import { AdventureEditorService } from '../../../services/adventure-editor.service';
import { AdventureStateService } from '../../../services/adventure-state.service';
import { AdventureFactory } from '../../../utils/adventure.factory';

@Component({
  selector: 'app-dialogue-node-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './dialogue-node-editor.component.html',
  styleUrls: ['./dialogue-node-editor.component.scss']
})
export class DialogueNodeEditorComponent extends DialogContent<DialogueNode> implements OnInit {

  @Input() sourceNode: DialogueNode;

  editableNode: DialogueNode;

  configuration: DialogConfiguration = {
    title: 'Dialogue Node Editor',
    buttons: [{
      text: () => 'Done',
      disable: () => !this.canSubmit(),
      click: () => this.submit()
    }, {
      text: () => 'Cancel',
      click: () => this.close()
    }]
  }

  constructor(
    private dialogService: DialogService,
    private editorService: AdventureEditorService,
    protected stateService: AdventureStateService
  ) {
    super();
  }

  ngOnInit(): void {
    this.editableNode = AdventureFactory.createDialogueNode();
    if (this.sourceNode) {
      this.editableNode.description = this.sourceNode.description;
      this.editableNode.lines = [...this.sourceNode.lines];
      this.editableNode.buttonIds = [...this.sourceNode.buttonIds];
    }
  }

  getAvailableButtons(): Button[] {
    return this.stateService.getButtons().filter(button => !this.editableNode.buttonIds.includes(button.id));
  }

  openDialogueLineEditor(dialogueLine: DialogueLine = AdventureFactory.createDialogueLine()): void {
    this.editorService.openDialogueLineEditor(dialogueLine, this.editableNode);
  }

  deleteDialogueLine(dialogueLine: DialogueLine): void {
    this.dialogService.createConfirmation('Remove Dialogue Line', ['Remove dialogue line ' + dialogueLine.text, 'Are you sure?'], 'Yes', 'No').then(result => {
      if (result) {
        ArrayUtils.remove(this.editableNode.lines, dialogueLine);
      }
    });
  }

  openButtonEditor(buttonId?: string): void {
    this.editorService.openButtonEditor(buttonId ? this.stateService.getButton(buttonId) : AdventureFactory.createButton(), this.stateService.getScenario(this.editableNode.parentScenarioId), this.editableNode);
  }

  deleteButton(buttonId: string): void {
    const button: Button = this.stateService.getButton(buttonId);
    this.dialogService.createConfirmation('Remove Button', ['Remove button ' + button.text, 'Are you sure?'], 'Yes', 'No').then(result => {
      if (result) {
        ArrayUtils.remove(this.editableNode.buttonIds, buttonId);
      }
    });
  }

  canSubmit(): boolean {
    if (StringUtils.isEmpty(this.editableNode.description)) return false;
    if (ArrayUtils.isEmpty(this.editableNode.lines)) return false;
    if (ArrayUtils.isEmpty(this.editableNode.buttonIds)) return false;

    return true;
  }

  submit(): void {
    if (this.canSubmit()) {
      this.sourceNode.description = this.editableNode.description;
      this.sourceNode.lines = this.editableNode.lines;
      this.sourceNode.buttonIds = this.editableNode.buttonIds;
      this.resolve(this.sourceNode);
    }
  }

  public close(): void {
    this.resolve(null);
  }

}
