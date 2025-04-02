import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Delay } from "src/app/shared/classes/delay.class";
import { DialogService } from "src/app/shared/services/dialog.service";
import { ApplicationService } from "../../shared/services/application.service";
import { BaseGoogleDriveService } from "../../shared/services/base-google-drive.service";
import { Data } from "../models/data.interface";
import { StoryManagerStateService } from "./story-manager-state.service";

@Injectable({
  providedIn: 'root',
})
export class StoryManagerGoogleDriveService extends BaseGoogleDriveService {

  public delay: Delay = new Delay(3000);
  private readonly FILE_ID: string = '1ydFjvWYG3p-m3S_gDodNJbc0Cyeqv82Z';
  protected readonly FIELDS: string = 'id,name,mimeType,appProperties';

  constructor(
    override http: HttpClient,
    private applicationService: ApplicationService,
    private stateService: StoryManagerStateService,
    private dialogService: DialogService
  ) {
    super(http);
  }

  public request(): Promise<Data> {
    const contentPromise: Promise<Data> = this.getContent<Data>(this.FILE_ID);
    contentPromise.catch(error => {
      this.applicationService.errors.set(true);
      this.dialogService.createMessage('Error', ['Google Drive Error, check console.']);
      console.log(error);
    });
    return contentPromise;
  }

  public update(instant: boolean = false): void {
    this.applicationService.changes.set(true);

    const updateContent = () => {
      this.updateContent(this.FILE_ID, JSON.stringify(this.stateService.serialize())).then(() => {
        this.applicationService.errors.set(false);
      }).catch(error => {
        this.applicationService.errors.set(true);
        this.dialogService.createMessage('Error', ['Google Drive Error, check console.']);
        console.log(error);
      }).finally(() => {
        this.applicationService.changes.set(false);
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
