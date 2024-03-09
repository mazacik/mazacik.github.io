import { Component, OnInit } from '@angular/core';
import { ApplicationService } from '../shared/services/application.service';
import { AdventureActionService } from './services/adventure-action.service';
import { AdventureEditorService } from './services/adventure-editor.service';
import { AdventureGoogleDriveService } from './services/adventure-google-drive.service';
import { AdventureStateService } from './services/adventure-state.service';
import { GraphRendererService } from './services/graph-renderer.service';

@Component({
  selector: 'app-adventure',
  templateUrl: './adventure.component.html',
  styleUrls: ['./adventure.component.scss']
})
export class AdventureComponent implements OnInit {

  constructor(
    public googleService: AdventureGoogleDriveService,
    private graphService: GraphRendererService,
    protected editorService: AdventureEditorService,
    protected applicationService: ApplicationService,
    protected stateService: AdventureStateService,
    protected actionService: AdventureActionService
  ) {
    this.applicationService.loading.next(true);
  }

  ngOnInit(): void {
    this.googleService.requestAdventure().then(serializable => {
      this.stateService.initialize(serializable);
      this.graphService.renderNotes();
      this.applicationService.loading.next(false);
    });
  }

  import(): void {
    navigator.clipboard.readText().then(text => this.stateService.initialize(JSON.parse(text)));
  }

  export(): void {
    const jsonData: string = JSON.stringify(this.stateService.serialize());
    navigator.clipboard.writeText(jsonData);
    console.log(jsonData);
  }

}
