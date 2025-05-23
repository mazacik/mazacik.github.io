import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { lastValueFrom } from "rxjs";
import { BaseGoogleDriveService } from "../../shared/services/base-google-drive.service";
import { Data } from "../model/data.interface";

@Injectable({
  providedIn: 'root',
})
export class GalleryGoogleDriveService extends BaseGoogleDriveService {

  private _fileId: string;
  protected readonly FIELDS: string = 'id,name,mimeType,thumbnailLink,imageMediaMetadata,videoMediaMetadata';

  constructor(
    override http: HttpClient
  ) {
    super(http);
  }

  public get dataFileId(): string {
    if (!this._fileId) {
      const dataFileId: string = sessionStorage.getItem('dataFileId');
      if (dataFileId) {
        this._fileId = dataFileId;
      }
    }
    return this._fileId;
  }

  public set dataFileId(fileId: string) {
    this._fileId = fileId;
    sessionStorage.setItem('dataFileId', fileId);
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
