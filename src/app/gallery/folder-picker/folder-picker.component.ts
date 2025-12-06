import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { GalleryGoogleDriveService } from 'src/app/gallery/services/gallery-google-drive.service';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { GoogleMetadata } from '../../shared/classes/google-api/google-metadata.class';
import { GoogleFileUtils } from '../../shared/utils/google-file.utils';
import { Data } from '../models/data.interface';

@Component({
  selector: 'app-folder-picker',
  imports: [
    CommonModule
  ],
  templateUrl: './folder-picker.component.html',
  styleUrls: ['./folder-picker.component.scss']
})
export class FolderPickerComponent extends DialogContentBase<void> implements OnInit {

  public configuration: DialogContainerConfiguration = {
    title: 'Select a Google Drive Folder',
    headerButtons: [{
      iconClass: 'fa-solid fa-times',
      click: () => this.close()
    }],
    footerButtons: [{
      text: () => 'Cancel',
      click: () => this.close()
    }],
    waitForContent: new Promise(resolve => this.ready = resolve)
  };

  private readonly FOLDER_ROOT: string = 'root';
  private readonly FOLDER_GALLERY_DATA: string = 'gallerydata';
  private readonly SUFFIX_DATA_FILE: string = '-data.json';
  private readonly SUFFIX_ARCHIVE_FOLDER: string = '-archive';

  protected loading: boolean = true;
  private ready: (value: void | PromiseLike<void>) => void;

  private dataFolder: GoogleMetadata;
  protected dataFiles: GoogleMetadata[];
  protected folders: GoogleMetadata[];

  constructor(
    private googleService: GalleryGoogleDriveService,
    protected applicationService: ApplicationService
  ) {
    super();
    this.applicationService.loading.set(true);
  }

  public async ngOnInit(): Promise<void> {
    const rootFolderFiles = await this.googleService.getFolderMetadata();
    this.dataFolder = rootFolderFiles.find(file => file.name == this.FOLDER_GALLERY_DATA);
    if (!this.dataFolder) this.dataFolder = await this.googleService.createFolder(this.FOLDER_GALLERY_DATA, this.FOLDER_ROOT);
    const dataFolderFiles = await this.googleService.getFolderMetadata(this.dataFolder.id);
    this.dataFiles = dataFolderFiles.filter(file => file.name.endsWith(this.SUFFIX_DATA_FILE));
    const helper: string[] = this.dataFiles.map(meta => meta.name.substring(0, meta.name.indexOf(this.SUFFIX_DATA_FILE)));
    this.folders = rootFolderFiles.filter(file => GoogleFileUtils.isFolder(file) && !helper.includes(file.name) && file.name != this.FOLDER_GALLERY_DATA);
    this.applicationService.loading.set(false);
    this.loading = false;
    this.ready();
  }

  protected onDataFileClick(dataFile: GoogleMetadata): void {
    this.applicationService.loading.set(true);
    this.googleService.dataFileId = dataFile.id;
    this.resolve();
  }

  protected async onFolderClick(folder: GoogleMetadata): Promise<void> {
    this.applicationService.loading.set(true);
    const dataFile: GoogleMetadata = await this.googleService.createFile(folder.name + this.SUFFIX_DATA_FILE, [this.dataFolder.id], 'application/json');
    const archiveFolder: GoogleMetadata = await this.googleService.createFolder(folder.name + this.SUFFIX_ARCHIVE_FOLDER, this.dataFolder.id);
    this.googleService.dataFileId = dataFile.id;
    await this.googleService.updateContent(dataFile.id, { dataFolderId: folder.id, archiveFolderId: archiveFolder.id } as Data);
    this.resolve();
  }

  public close(): void {
    this.resolve();
  }

}
