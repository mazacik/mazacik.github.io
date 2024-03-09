import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { DialogueNode } from '../../../../../models/components/dialogue-node.interface';
import { Scenario } from '../../../../../models/components/scenario.interface';
import { Action } from '../../../../../models/logic/action.model';
import { Identifiable } from '../../../../../models/logic/identifiable.model';
import { Variable } from '../../../../../models/logic/variable.model';
import { AdventureEditorService } from '../../../../../services/adventure-editor.service';
import { AdventureStateService } from '../../../../../services/adventure-state.service';
import { AdventureFactory } from '../../../../../utils/adventure.factory';

@Component({
  selector: 'app-action-editor',
  templateUrl: './action-editor.component.html',
  styleUrls: ['./action-editor.component.scss']
})
export class ActionEditorComponent implements OnInit {

  @Input() action: Action;
  @Input() weightVisible: boolean;

  @Output() removeAction: EventEmitter<Action> = new EventEmitter<Action>();

  constructor(
    private editorService: AdventureEditorService,
    private stateService: AdventureStateService
  ) { }

  ngOnInit(): void {

  }

  getParentScenario(node: DialogueNode): Scenario {
    return this.stateService.getScenario(node.parentScenarioId);
  }

  getAvailableNodes(): DialogueNode[] {
    const index: number = this.stateService.currentScenario.nodes.indexOf(this.stateService.currentScenario.currentNode);
    const currentScenarioNodes: DialogueNode[] = this.stateService.currentScenario.nodes.filter(node => this.stateService.currentScenario.nodes.indexOf(node) > index);
    const otherScenariosNodes: DialogueNode[] = this.stateService.getNodes().filter(node => !currentScenarioNodes.includes(node));
    return currentScenarioNodes.concat(otherScenariosNodes);
  }

  getAvailableVariables(): Variable[] {
    const currentScenarioVariables: Variable[] = this.stateService.currentScenario.variables;
    const variables: Variable[] = this.stateService.getVariables().filter(variable => !currentScenarioVariables.includes(variable));
    return currentScenarioVariables.concat(variables);
  }

  getVariableOptions(variableChange: Identifiable): Identifiable[] {
    if (variableChange?.id) return this.stateService.getVariable(variableChange.id).options;
  }

  createVariableChange(): void {
    this.action.variableChanges.push({});
  }

  removeVariableChange(variableChange: Identifiable): void {
    ArrayUtils.remove(this.action.variableChanges, variableChange);
  }

  createStoryChange(): void {
    this.action.storyChanges.push({ id: null, value: '' });
  }

  removeStoryChange(storyChange: Identifiable): void {
    ArrayUtils.remove(this.action.storyChanges, storyChange);
  }

  onWeightChange(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;
    if (isNaN(input.valueAsNumber) || input.valueAsNumber <= 0) {
      input.valueAsNumber = 0;
      this.action.weight = 0;
    } else {
      input.valueAsNumber = Math.floor(input.valueAsNumber);
      this.action.weight = input.valueAsNumber;
    }
  }

  onRemoveActionClick(): void {
    this.removeAction.emit(this.action)
  }

  createNode(): void {
    this.editorService.openDialogueNodeEditor(AdventureFactory.createDialogueNode(), this.stateService.currentScenario).then(resultNode => {
      this.action.nextNodeId = resultNode.id;
    });
  }

}
