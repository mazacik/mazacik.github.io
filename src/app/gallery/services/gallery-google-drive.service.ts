import { HttpClient } from "@angular/common/http";
import { Injectable, Injector } from "@angular/core";
import { Delay } from "src/app/shared/classes/delay.class";
import { GoogleMetadata } from "src/app/shared/classes/google-api/google-metadata.class";
import { ApplicationService } from "../../shared/services/application.service";
import { BaseGoogleDriveService } from "../../shared/services/base-google-drive.service";
import { Data } from "../model/data.interface";
import { GalleryStateService } from "./gallery-state.service";

@Injectable({
  providedIn: 'root',
})
export class GalleryGoogleDriveService extends BaseGoogleDriveService {

  protected readonly FIELDS: string = 'id,name,thumbnailLink,mimeType,imageMediaMetadata,videoMediaMetadata';
  private delay: Delay = new Delay(5000);

  constructor(
    protected http: HttpClient,
    private applicationService: ApplicationService,
    private injector: Injector
  ) {
    super(http);
  }

  public updateData(instant: boolean = false): void {
    const dataFileId: string = sessionStorage.getItem('dataFileId');
    if (dataFileId) {
      const stateService: GalleryStateService = this.injector.get(GalleryStateService);
      this.applicationService.changes.next(true);
      const updateContent = () => {
        this.updateContent(dataFileId, {
          rootFolderId: stateService.rootFolderId,
          heartsFilter: stateService.heartsFilter,
          bookmarksFilter: stateService.bookmarksFilter,
          groupSizeFilterMin: stateService.groupSizeFilterMin,
          groupSizeFilterMax: stateService.groupSizeFilterMax,
          tagGroups: stateService.tagGroups,
          imageProperties: stateService.images.map(image => {
            return {
              id: image.id,
              heart: image.heart,
              bookmark: image.bookmark,
              tags: image.tags
            }
          }),
          groupProperties: stateService.groups.map(group => {
            return {
              imageIds: group.images.map(image => image.id),
              starId: group.star.id
            }
          })
        } as Data).then(entity => {
          if (!entity) {
            this.applicationService.errors.next(true);
          }
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

  public async createDataFile(folderName: string): Promise<GoogleMetadata> {
    const dataFile: GoogleMetadata = await this.createFile(folderName + '.tagallery', ['root'], 'application/json');
    sessionStorage.setItem('dataFileId', dataFile.id);
    return dataFile;
  }

  public async getData(): Promise<Data> {
    const dataFileId: string = sessionStorage.getItem('dataFileId');
    if (dataFileId) {
      const url: string = 'https://www.googleapis.com/drive/v3/files/' + dataFileId;
      return await this.http.get<Data>(url, { params: { 'alt': 'media' }, responseType: 'json' }).toPromise();
    }
  }

  public async getBase64(entityId: string): Promise<string> {
    return new Promise(resolve => {
      const url: string = 'https://www.googleapis.com/drive/v3/files/' + entityId;
      this.http.get(url, { params: { 'alt': 'media' }, responseType: 'blob' }).subscribe(blob => {
        const fileReader: FileReader = new FileReader();
        fileReader.onload = event => resolve(event.target.result as string);
        fileReader.readAsDataURL(blob);
      });
    });
  }

}
