import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { lastValueFrom } from "rxjs";
import { GoogleMetadata } from "src/app/shared/classes/google-api/google-metadata.class";
import { BaseGoogleDriveService } from "../../shared/services/base-google-drive.service";
import { Data } from "../model/data.interface";

@Injectable({
  providedIn: 'root',
})
export class GalleryGoogleDriveService extends BaseGoogleDriveService {

  private _fileId: string;
  protected readonly FIELDS: string = 'id,name,thumbnailLink,mimeType,imageMediaMetadata,videoMediaMetadata';

  constructor(
    override http: HttpClient
  ) {
    super(http);
  }

  public get fileId(): string {
    if (!this._fileId) {
      const dataFileId: string = sessionStorage.getItem('dataFileId');
      if (dataFileId) {
        this._fileId = dataFileId;
      }
    }
    return this._fileId;
  }

  public set fileId(fileId: string) {
    this._fileId = fileId;
    sessionStorage.setItem('dataFileId', fileId);
  }

  public createDataFile(folderName: string): Promise<GoogleMetadata> {
    return this.createFile(folderName + '.tagallery', ['root'], 'application/json');
  }

  public async getData(): Promise<Data> {
    const url: string = 'https://www.googleapis.com/drive/v3/files/' + this.fileId;
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
