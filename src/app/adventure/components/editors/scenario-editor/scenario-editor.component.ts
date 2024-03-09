import { Component, Input, OnInit } from '@angular/core';
import { Character } from 'src/app/adventure/models/components/character.interface';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { Button } from '../../../models/components/button.interface';
import { DialogueNode } from '../../../models/components/dialogue-node.interface';
import { Scenario } from '../../../models/components/scenario.interface';
import { Variable } from '../../../models/logic/variable.model';
import { AdventureEditorService } from '../../../services/adventure-editor.service';
import { AdventureStateService } from '../../../services/adventure-state.service';
import { AdventureFactory } from '../../../utils/adventure.factory';

@Component({
  selector: 'app-scenario-editor',
  templateUrl: './scenario-editor.component.html',
  styleUrls: ['./scenario-editor.component.scss']
})
export class ScenarioEditorComponent extends DialogContent<Scenario> implements OnInit {

  @Input() sourceScenario: Scenario;

  editableScenario: Scenario;

  configuration: DialogConfiguration = {
    title: 'Scenario Editor',
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
    this.editableScenario = AdventureFactory.createScenario();
    if (this.sourceScenario) {
      this.editableScenario.label = this.sourceScenario.label;
      this.editableScenario.characters = [...this.sourceScenario.characters];
      this.editableScenario.variables = [...this.sourceScenario.variables];
      this.editableScenario.nodes = [...this.sourceScenario.nodes];
    }
  }

  openCharacterEditor(character: Character = AdventureFactory.createCharacter()): void {
    this.editorService.openCharacterEditor(character, this.editableScenario);
  }

  deleteCharacter(character: Character): void {
    this.dialogService.createConfirmation('Remove Character', ['Remove character ' + character.name, 'Are you sure?'], 'Yes', 'No').then(result => {
      if (result) {
        // TODO handle characters in use

        // for (const button of this.editableScenario.buttons) {
        //   for (const logic of button.logic) {
        //     for (const action of logic.actions) {
        //       if (action.variableChanges.some(change => change.id == character.id)) {
        //         alert('Variable \'' + character.id + '\' is used in button \'' + button.text + '\'.');
        //         return;
        //       }
        //     }
        //   }
        // }

        ArrayUtils.remove(this.editableScenario.characters, character);
      }
    });
  }

  openVariableEditor(variable: Variable = AdventureFactory.createVariable()): void {
    this.editorService.openVariableEditor(variable, this.editableScenario);
  }

  deleteVariable(variable: Variable): void {
    this.dialogService.createConfirmation('Remove Variable', ['Remove variable ' + variable.id, 'Are you sure?'], 'Yes', 'No').then(result => {
      if (result) {
        for (const button of this.editableScenario.buttons) {
          for (const logic of button.logic) {
            for (const action of logic.actions) {
              if (action.variableChanges.some(change => change.id == variable.id)) {
                alert('Variable \'' + variable.id + '\' is used in button \'' + button.text + '\'.');
                return;
              }
            }
          }
        }

        ArrayUtils.remove(this.editableScenario.variables, variable);
      }
    });
  }

  openNodeEditor(node: DialogueNode = AdventureFactory.createDialogueNode()): void {
    this.editorService.openDialogueNodeEditor(node, this.editableScenario);
  }

  deleteNode(node: DialogueNode): void {
    this.dialogService.createConfirmation('Remove Variable', ['Remove variable ' + node.description, 'Are you sure?'], 'Yes', 'No').then(result => {
      if (result) {
        ArrayUtils.remove(this.editableScenario.nodes, node);
      }
    });
  }

  openButtonEditor(button: Button = AdventureFactory.createButton()): void {
    this.editorService.openButtonEditor(button, this.editableScenario);
  }

  deleteButton(button: Button): void {
    this.dialogService.createConfirmation('Remove Button', ['Remove button ' + button.text, 'Are you sure?'], 'Yes', 'No').then(result => {
      if (result) {
        this.stateService.getNodes().forEach(node => ArrayUtils.remove(node.buttonIds, button.id));
        ArrayUtils.remove(this.editableScenario.buttons, button);
      }
    });
  }

  canSubmit(): boolean {
    return !StringUtils.isEmpty(this.editableScenario.label);
  }

  submit(): void {
    if (this.canSubmit()) {
      this.sourceScenario.label = this.editableScenario.label;
      this.sourceScenario.characters = this.editableScenario.characters;
      this.sourceScenario.variables = this.editableScenario.variables;
      this.sourceScenario.nodes = this.editableScenario.nodes;
      this.resolve(this.sourceScenario);
    }
  }

  public close(): void {
    this.resolve(null);
  }

}
