import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { lastValueFrom } from "rxjs";
import { AppConstants } from "src/app/shared/constants/app.constants";
import { BaseGoogleDriveService } from "../../shared/services/base-google-drive.service";
import { Data } from "../models/data.interface";

@Injectable({
  providedIn: 'root',
})
export class GalleryGoogleDriveService extends BaseGoogleDriveService {

  protected readonly FIELDS: string = 'id,name,mimeType,size,thumbnailLink,imageMediaMetadata,videoMediaMetadata';

  constructor(
    override http: HttpClient
  ) {
    super(http);
  }

  public get dataFileId(): string {
    return sessionStorage.getItem(AppConstants.KEY_GOOGLE_DATA_FILE_ID);
  }

  public set dataFileId(fileId: string) {
    sessionStorage.setItem(AppConstants.KEY_GOOGLE_DATA_FILE_ID, fileId);
  }

  public async getData(): Promise<Data> {
    const url: string = 'https://www.googleapis.com/drive/v3/files/' + this.dataFileId;
    return await lastValueFrom(this.http.get<Data>(url, { params: { 'alt': 'media' }, responseType: 'json' })).catch(error => error);
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
