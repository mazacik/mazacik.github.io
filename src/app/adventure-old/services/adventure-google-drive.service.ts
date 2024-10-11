import { HttpClient } from "@angular/common/http";
import { Injectable, Injector } from "@angular/core";
import { SerializableAdventure } from "src/app/adventure/models/components/serializable-adventure.interface";
import { Delay } from "src/app/shared/classes/delay.class";
import { DialogService } from "src/app/shared/services/dialog.service";
import { ApplicationService } from "../../shared/services/application.service";
import { BaseGoogleDriveService } from "../../shared/services/base-google-drive.service";
import { AdventureStateService } from "./adventure-state.service";
import { GraphRendererService } from "./graph-renderer.service";

@Injectable({
  providedIn: 'root',
})
export class AdventureGoogleDriveService extends BaseGoogleDriveService {

  public delay: Delay = new Delay(3000);
  private readonly FILE_ID: string = '1l3MbDnNr9VKc1aADVATWCYe1tMwLUTp-';
  protected readonly FIELDS: string = 'id,name,mimeType,appProperties';

  constructor(
    override http: HttpClient,
    private injector: Injector,
    private applicationService: ApplicationService,
    private stateService: AdventureStateService,
    private dialogService: DialogService
  ) {
    super(http);
  }

  public requestAdventure(): Promise<SerializableAdventure> {
    return this.getContent<SerializableAdventure>(this.FILE_ID);
  }

  public updateAdventure(instant: boolean = false, renderGraphs: boolean = false): void {
    if (renderGraphs) this.injector.get(GraphRendererService).renderNotes();
    this.applicationService.changes.next(true);

    const updateContent = () => {
      this.updateContent(this.FILE_ID, JSON.stringify(this.stateService.serialize())).then(() => {
        this.applicationService.errors.next(false);
      }).catch(error => {
        this.applicationService.errors.next(true);
        this.dialogService.createMessage('Error', ['Google Drive Error, check console.']);
        console.log(error);
      }).finally(() => {
        this.applicationService.changes.next(false);
      });
    }

    if (instant) {
      this.delay.stop();
      updateContent();
    } else {
      this.delay.restart(() => updateContent());
    }
  }

}
