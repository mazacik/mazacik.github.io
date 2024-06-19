import { Injectable } from "@angular/core";
import { AdventureGoogleDriveService } from "src/app/adventure/services/adventure-google-drive.service";
import { BooleanBehaviorSubject } from "src/app/shared/classes/boolean-behavior-subject.class";
import { DialogService } from "src/app/shared/services/dialog.service";
import { ButtonEditorComponent } from "../components/editors/button-editor/button-editor.component";
import { CharacterEditorComponent } from "../components/editors/character-editor/character-editor.component";
import { DialogueLineEditorComponent } from "../components/editors/dialogue-line-editor/dialogue-line-editor.component";
import { DialogueNodeEditorComponent } from "../components/editors/dialogue-node-editor/dialogue-node-editor.component";
import { ScenarioEditorComponent } from "../components/editors/scenario-editor/scenario-editor.component";
import { VariableEditorComponent } from "../components/editors/variable-editor/variable-editor.component";
import { Button } from "../models/components/button.interface";
import { Character } from "../models/components/character.interface";
import { DialogueLine } from "../models/components/dialogue-line.interface";
import { DialogueNode } from "../models/components/dialogue-node.interface";
import { Scenario } from "../models/components/scenario.interface";
import { Variable } from "../models/logic/variable.model";
import { AdventureStateService } from "./adventure-state.service";

@Injectable({
  providedIn: 'root',
})
export class AdventureEditorService {

  sidebarVisible: BooleanBehaviorSubject = new BooleanBehaviorSubject(true);
  storyVisible: boolean = false;
  flowchartVisible: boolean = false;
  focusMode: boolean = false;

  constructor(
    private googleService: AdventureGoogleDriveService,
    private stateService: AdventureStateService,
    private dialogService: DialogService
  ) { }

  public async openScenarioEditor(scenario: Scenario): Promise<Scenario> {
    this.stateService.currentScenario = scenario;

    const resultScenario: Scenario = await this.dialogService.create(ScenarioEditorComponent, { sourceScenario: scenario });
    if (resultScenario) {
      if (!this.stateService.scenarios.includes(resultScenario)) {
        this.stateService.scenarios.push(resultScenario);
      }

      this.googleService.updateAdventure();
    }

    return resultScenario;
  }

  public async openCharacterEditor(character: Character, scenario: Scenario): Promise<Character> {
    const resultCharacter: Character = await this.dialogService.create(CharacterEditorComponent, { sourceCharacter: character });
    if (resultCharacter) {
      if (scenario && !scenario.characters.includes(resultCharacter)) {
        scenario.characters.push(resultCharacter);
      }
    }

    return resultCharacter;
  }

  public async openVariableEditor(variable: Variable, scenario: Scenario): Promise<Variable> {
    const resultVariable: Variable = await this.dialogService.create(VariableEditorComponent, { sourceVariable: variable });
    if (resultVariable) {
      if (scenario && !scenario.variables.includes(resultVariable)) {
        scenario.variables.push(resultVariable);
      }
    }

    return resultVariable;
  }

  public async openDialogueNodeEditor(node: DialogueNode, scenario: Scenario): Promise<DialogueNode> {
    const resultNode: DialogueNode = await this.dialogService.create(DialogueNodeEditorComponent, { sourceNode: node });
    if (resultNode) {
      if (!scenario.nodes.includes(resultNode)) {
        resultNode.parentScenarioId = scenario.id;
        scenario.nodes.push(resultNode);
      }
    }

    return resultNode;
  }

  public async openDialogueLineEditor(line: DialogueLine, node: DialogueNode): Promise<DialogueLine> {
    const resultLine: DialogueLine = await this.dialogService.create(DialogueLineEditorComponent, { sourceLine: line });
    if (resultLine) {
      if (!node.lines.includes(resultLine)) {
        node.lines.push(resultLine);
      }
    }

    return resultLine;
  }

  public async openButtonEditor(button: Button, scenario: Scenario, node?: DialogueNode): Promise<Button> {
    const resultButton: Button = await this.dialogService.create(ButtonEditorComponent, { sourceButton: button });
    if (resultButton) {
      if (!scenario.buttons.find(scenarioButton => scenarioButton.id == resultButton.id)) {
        scenario.buttons.push(resultButton);
      }

      if (node) {
        if (!node.buttonIds.find(pageButtonId => pageButtonId == resultButton.id)) {
          node.buttonIds.push(resultButton.id);
        }
      }
    }

    return resultButton;
  }

}
