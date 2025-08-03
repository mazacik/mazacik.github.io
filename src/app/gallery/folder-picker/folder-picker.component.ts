import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GalleryGoogleDriveService } from 'src/app/gallery/services/gallery-google-drive.service';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { GoogleMetadata } from '../../shared/classes/google-api/google-metadata.class';
import { GoogleFileUtils } from '../../shared/utils/google-file.utils';
import { Data } from '../models/data.interface';

@Component({
  selector: 'app-folder-picker',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './folder-picker.component.html',
  styleUrls: ['./folder-picker.component.scss']
})
export class FolderPickerComponent implements OnInit {

  private readonly FOLDER_ROOT: string = 'root';
  private readonly FOLDER_GALLERY_DATA: string = 'gallerydata';
  private readonly SUFFIX_DATA_FILE: string = '-data.json';
  private readonly SUFFIX_ARCHIVE_FOLDER: string = '-archive';

  private dataFolder: GoogleMetadata;
  protected dataFiles: GoogleMetadata[];
  protected folders: GoogleMetadata[];

  constructor(
    private router: Router,
    private googleService: GalleryGoogleDriveService,
    protected applicationService: ApplicationService
  ) {
    this.applicationService.loading.set(true);
  }

  async ngOnInit(): Promise<void> {
    const rootFolderFiles = await this.googleService.getFolderMetadata();
    this.dataFolder = rootFolderFiles.find(file => file.name == this.FOLDER_GALLERY_DATA);
    if (!this.dataFolder) this.dataFolder = await this.googleService.createFolder(this.FOLDER_GALLERY_DATA, this.FOLDER_ROOT);
    const dataFolderFiles = await this.googleService.getFolderMetadata(this.dataFolder.id);
    this.dataFiles = dataFolderFiles.filter(file => file.name.endsWith(this.SUFFIX_DATA_FILE));
    const helper: string[] = this.dataFiles.map(meta => meta.name.substring(0, meta.name.indexOf(this.SUFFIX_DATA_FILE)));
    this.folders = rootFolderFiles.filter(file => GoogleFileUtils.isFolder(file) && !helper.includes(file.name) && file.name != this.FOLDER_GALLERY_DATA);
    this.applicationService.loading.set(false);
  }

  protected onDataFileClick(dataFile: GoogleMetadata): void {
    this.applicationService.loading.set(true);
    this.googleService.dataFileId = dataFile.id;
    this.router.navigate(['/gallery']);
  }

  protected async onFolderClick(folder: GoogleMetadata): Promise<void> {
    this.applicationService.loading.set(true);
    const dataFile: GoogleMetadata = await this.googleService.createFile(folder.name + this.SUFFIX_DATA_FILE, [this.dataFolder.id], 'application/json');
    const archiveFolder: GoogleMetadata = await this.googleService.createFolder(folder.name + this.SUFFIX_ARCHIVE_FOLDER, this.dataFolder.id);
    this.googleService.dataFileId = dataFile.id;
    this.googleService.updateContent(dataFile.id, {
      dataFolderId: folder.id,
      archiveFolderId: archiveFolder.id
    } as Data).then(() => {
      this.router.navigate(['/gallery']);
    });
  }

}
