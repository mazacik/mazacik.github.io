import { HttpClient } from "@angular/common/http";
import { map } from "rxjs/operators";
import { GoogleMetadata } from "../classes/google-api/google-metadata.class";
import { GoogleFileList } from "../classes/google-api/google-file-list.class";

export abstract class BaseGoogleDriveService {

  protected readonly API_KEY: string = 'AIzaSyBLAfLb8QHSIqXPFTh2YJEMfMoW8EhJpRU';
  protected abstract readonly FIELDS: string;

  constructor(
    protected http: HttpClient
  ) { }

  public createFile(name: string, parents: string[], mimeType: string): Promise<GoogleMetadata> {
    const url: string = 'https://content.googleapis.com/drive/v3/files?key=' + this.API_KEY;
    return this.http.post<GoogleMetadata>(url, { name, parents, mimeType }).toPromise();
  }

  public createFolder(name: string, parentFolderId: string): Promise<GoogleMetadata> {
    const url: string = 'https://content.googleapis.com/drive/v3/files?key=' + this.API_KEY;
    return this.http.post<GoogleMetadata>(url, {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    }).toPromise();
  }

  public getFolderMetadata(id: string = 'root'): Promise<GoogleMetadata[]> {
    const query: string = "'" + id + "' in parents and trashed=false";
    const url: string = 'https://content.googleapis.com/drive/v3/files?pageSize=1000&q=' + query + '&fields=files(' + this.FIELDS + ')&key=' + this.API_KEY;
    return this.getFileArrayPromise(url);
  }

  public getEntityMetadata(id: string): Promise<GoogleMetadata> {
    const url: string = 'https://content.googleapis.com/drive/v3/files/' + id + '?fields=' + this.FIELDS + '&key=' + this.API_KEY;
    return this.http.get<GoogleMetadata>(url).toPromise();
  }

  public getContent<T>(id: string): Promise<T> {
    const url: string = 'https://www.googleapis.com/drive/v3/files/' + id;
    return this.http.get<T>(url, { params: { 'alt': 'media' }, responseType: 'json' }).toPromise();
  }

  public updateContent(id: string, content: any): Promise<GoogleMetadata> {
    const url: string = 'https://www.googleapis.com/upload/drive/v3/files/' + id + '?uploadType=media';
    return this.http.patch<GoogleMetadata>(url, content).toPromise();
  }

  public move(entityId: string, fromId: string, toId: string): Promise<void> {
    const url: string = 'https://www.googleapis.com/drive/v3/files/' + entityId + '?removeParents=' + fromId + '&addParents=' + toId + '&key=' + this.API_KEY;
    return this.http.patch<any>(url, {}).toPromise();
  }

  public trash(id: string): Promise<GoogleMetadata> {
    return this.updateMetadata(id, { trashed: true });
  }

  public updateProperty(id: string, key: string, value: string): Promise<GoogleMetadata> {
    return this.updateMetadata(id, { 'appProperties': { [key]: value } });
  }

  public updateProperties(id: string, appProperties: { [key: string]: string }): Promise<GoogleMetadata> {
    return this.updateMetadata(id, { appProperties });
  }

  public openFolderById(folderId: string): void {
    const url: string = 'https://drive.google.com/drive/folders/' + folderId;
    window.open(url, '_blank');
  }

  public openSearch(query: string): void {
    const url: string = 'https://drive.google.com/drive/search?q=' + query;
    window.open(url, '_blank');
  }

  private updateMetadata(id: string, body: {}): Promise<any> {
    const url: string = 'https://content.googleapis.com/drive/v3/files/' + id + '?fields=' + this.FIELDS + '&key=' + this.API_KEY;
    return this.http.patch(url, body).toPromise();
  }

  protected getFileArrayPromise(url: string, body?: any): Promise<GoogleMetadata[]> {
    if (body) {
      return this.http.post<GoogleFileList>(url, body).pipe(map(fileList => fileList ? fileList.files : [])).toPromise();
    } else {
      return this.http.get<GoogleFileList>(url).pipe(map(fileList => fileList ? fileList.files : [])).toPromise();
    }
  }

}
