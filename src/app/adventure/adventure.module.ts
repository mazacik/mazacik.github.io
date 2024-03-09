import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { AdventureComponent } from './adventure.component';
import { ButtonEditorComponent } from './components/editors/button-editor/button-editor.component';
import { ActionEditorComponent } from './components/editors/button-editor/logic-editor/action-editor/action-editor.component';
import { LogicEditorComponent } from './components/editors/button-editor/logic-editor/logic-editor.component';
import { CharacterEditorComponent } from './components/editors/character-editor/character-editor.component';
import { DialogueNodeEditorComponent } from './components/editors/dialogue-node-editor/dialogue-node-editor.component';
import { ScenarioEditorComponent } from './components/editors/scenario-editor/scenario-editor.component';
import { VariableEditorComponent } from './components/editors/variable-editor/variable-editor.component';
import { NotesComponent } from './components/notes/notes.component';
import { ScenarioBrowserComponent } from './components/scenario-browser/scenario-browser.component';
import { DialogueLineEditorComponent } from './components/editors/dialogue-line-editor/dialogue-line-editor.component';

@NgModule({
  declarations: [
    AdventureComponent,
    ScenarioBrowserComponent,
    ScenarioEditorComponent,
    CharacterEditorComponent,
    VariableEditorComponent,
    DialogueNodeEditorComponent,
    DialogueLineEditorComponent,
    ButtonEditorComponent,
    LogicEditorComponent,
    ActionEditorComponent,
    NotesComponent
  ],
  imports: [
    CommonModule,
    SharedModule
  ],
  exports: [

  ],
  providers: [

  ]
})
export class AdventureModule { }
