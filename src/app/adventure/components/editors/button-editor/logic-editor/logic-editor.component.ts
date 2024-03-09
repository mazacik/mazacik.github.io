import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { Action } from '../../../../models/logic/action.model';
import { Condition } from '../../../../models/logic/condition.model';
import { Identifiable } from '../../../../models/logic/identifiable.model';
import { Logic } from '../../../../models/logic/logic.model';
import { Operator } from '../../../../models/logic/operator.enum';
import { Variable } from '../../../../models/logic/variable.model';
import { AdventureStateService } from '../../../../services/adventure-state.service';
import { AdventureFactory } from '../../../../utils/adventure.factory';
import { ActionEditorComponent } from './action-editor/action-editor.component';

@Component({
  selector: 'app-logic-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ActionEditorComponent
  ],
  templateUrl: './logic-editor.component.html',
  styleUrls: ['./logic-editor.component.scss']
})
export class LogicEditorComponent implements OnInit {

  @Input() logic: Logic;
  @Input() removable: boolean;

  @Output() removeLogic: EventEmitter<Logic> = new EventEmitter<Logic>();

  constructor(
    protected stateService: AdventureStateService
  ) { }

  ngOnInit(): void {

  }

  createVariableCheck(): void {
    const condition: Condition = AdventureFactory.createCondition(Operator.EQ);
    condition.variable = AdventureFactory.createVariable();
    this.logic.conditions.push(condition);
  }

  createChanceCheck(): void {
    this.logic.conditions.push(AdventureFactory.createCondition(Operator.CHANCE));
  }

  createAction(): void {
    this.logic.actions.push(AdventureFactory.createAction());
  }

  isLogicalCondition(condition: Condition): boolean {
    return this.getLogicalOperators().includes(condition?.operator);
  }

  isVariableCondition(condition: Condition): boolean {
    return this.getComparisonOperators().includes(condition?.operator);
  }

  isChanceCondition(condition: Condition): boolean {
    return condition?.operator == Operator.CHANCE;
  }

  compareVariables(v1: Variable, v2: Variable): boolean {
    return v1 && v2 ? v1.id == v2.id : v1 == v2;
  }

  compareOptions(o1: Identifiable, o2: Identifiable): boolean {
    return o1 && o2 ? o1.id == o2.id : o1 == o2;
  }

  onRemoveConditionClick(condition: Condition): void {
    ArrayUtils.remove(this.logic.conditions, condition);
  }

  hasChanceCheck(): boolean {
    return this.logic.conditions.some(condition => this.isChanceCondition(condition));
  }

  onRemoveLogicClick(): void {
    this.removeLogic.emit(this.logic);
  }

  onRemoveAction(action: Action): void {
    ArrayUtils.remove(this.logic.actions, action);
  }

  onChanceChange(condition: Condition, event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;
    if (isNaN(input.valueAsNumber)) {
      input.value = '';
      condition.chance = undefined;
    } else if (input.valueAsNumber < 0) {
      input.valueAsNumber = 0;
      condition.chance = 0;
    } else if (input.valueAsNumber > 100) {
      input.valueAsNumber = 100;
      condition.chance = 100;
    } else {
      input.valueAsNumber = Math.floor(input.valueAsNumber);
      condition.chance = input.valueAsNumber;
    }
  }

  getLogicalOperators(): string[] {
    if (ArrayUtils.isEmpty(this.logic.conditions)) {
      return [Operator.ALWAYS];
    } else {
      return [Operator.AND, Operator.OR];
    }
  }

  getComparisonOperators(): string[] {
    return [Operator.EQ, Operator.NEQ];
  }

}
