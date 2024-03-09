import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AdventureGoogleDriveService } from 'src/app/adventure/services/adventure-google-drive.service';
import { GraphRendererService } from 'src/app/adventure/services/graph-renderer.service';
import { drawer } from 'src/app/shared/consntants/animations.constants';
import { DragDropDirective } from 'src/app/shared/directives/dragdrop.directive';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { ScreenUtils } from 'src/app/shared/utils/screen.utils';
import { Note } from '../../models/components/note.interface';
import { Scenario } from '../../models/components/scenario.interface';
import { AdventureEditorService } from '../../services/adventure-editor.service';
import { AdventureStateService } from '../../services/adventure-state.service';
import { AdventureFactory } from '../../utils/adventure.factory';

@Component({
  selector: 'app-scenario-browser',
  standalone: true,
  imports: [
    CommonModule,
    DragDropDirective
  ],
  templateUrl: './scenario-browser.component.html',
  styleUrls: ['./scenario-browser.component.scss'],
  animations: [drawer]
})
export class ScenarioBrowserComponent implements OnInit {

  constructor(
    private editorService: AdventureEditorService,
    private graphService: GraphRendererService,
    private dialogService: DialogService,
    protected googleService: AdventureGoogleDriveService,
    protected stateService: AdventureStateService
  ) { }

  ngOnInit(): void {

  }

  setCurrentNote(scenario: Scenario, note: Note): void {
    this.setCurrentScenario(scenario);
    this.stateService.currentScenario.currentNote = note;
  }

  setCurrentScenario(scenario: Scenario): void {
    this.stateService.currentScenario = scenario;

    if (!ScreenUtils.isLargeScreen()) {
      this.editorService.sidebarVisible.next(false);
    }

    if (!ArrayUtils.isEmpty(scenario.nodes)) {
      scenario.currentNode = scenario.nodes[0];
    }

    this.graphService.renderNotes();
  }

  setRandom(): void {
    const scenario: Scenario = ArrayUtils.getRandom(this.stateService.scenarios, [this.stateService.currentScenario]);
    const note: Note = ArrayUtils.getRandom(scenario.notes);
    this.setCurrentNote(scenario, note);

    const scenariosDiv: Element = document.querySelector('.content-container');
    const scenarioDiv: Element = scenariosDiv.children[this.stateService.scenarios.indexOf(scenario)];
    const notesDiv: Element = scenarioDiv.children[1];
    const noteDiv: Element = notesDiv.children[scenario.notes.indexOf(note)];
    noteDiv.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  removeScenario(scenario: Scenario): void {
    this.dialogService.createConfirmation('Delete Scenario', ['Do you really want to delete "' + scenario.label + '"?'], 'Yes', 'No').then(result => {
      if (result) {
        if (scenario == this.stateService.currentScenario) {
          this.setCurrentScenario(ArrayUtils.nearestRightFirst(this.stateService.scenarios, this.stateService.scenarios.indexOf(scenario)));
        }

        ArrayUtils.remove(this.stateService.scenarios, scenario);
        this.googleService.updateAdventure();
      }
    });
  }

  openScenarioEditor(scenario: Scenario = AdventureFactory.createScenario()): void {
    this.editorService.openScenarioEditor(scenario);
  }

  getNotesWordCount(scenario: Scenario): string {
    const count: number = scenario.notes.flatMap(note => note.wordCount).reduce((sum, current) => sum + current, 0);
    return count > 0 ? count + '' : '';
  }

  createNote(scenario: Scenario): void {
    if (!scenario.notes) scenario.notes = [];
    const note: Note = { label: 'New Note', text: '', wordCount: 0 };
    scenario.notes.push(note);
    scenario.currentNote = note;
    this.googleService.updateAdventure();
  }

  removeNote(scenario: Scenario, note: Note): void {
    const notes: Note[] = scenario.notes;
    this.dialogService.createConfirmation('Delete Note', ['Do you really want to delete "' + note.label + '"?'], 'Yes', 'No').then(result => {
      if (result) {
        scenario.currentNote = ArrayUtils.nearestRightFirst(notes, notes.indexOf(note));
        ArrayUtils.remove(notes, note);
        this.googleService.updateAdventure();
      }
    });
  }

}
