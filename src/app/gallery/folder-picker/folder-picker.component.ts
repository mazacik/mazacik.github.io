import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GalleryGoogleDriveService } from 'src/app/gallery/services/gallery-google-drive.service';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { GoogleMetadata } from '../../shared/classes/google-api/google-metadata.class';
import { GoogleFileUtils } from '../../shared/utils/google-file.utils';
import { Data } from '../model/data.interface';

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

  protected dataFiles: GoogleMetadata[];
  protected folders: GoogleMetadata[];

  constructor(
    private router: Router,
    private dialogService: DialogService,
    private googleService: GalleryGoogleDriveService,
    protected applicationService: ApplicationService
  ) {
    this.applicationService.loading.next(true);
  }

  ngOnInit(): void {
    this.googleService.getFolderMetadata().then(metadata => {
      this.dataFiles = metadata.filter(e => e.name.endsWith('.tagallery'));
      const helper: string[] = this.dataFiles.map(f => f.name.substring(0, f.name.indexOf('.tagallery')));
      this.folders = metadata.filter(e => GoogleFileUtils.isFolder(e) && !helper.includes(e.name));
    }).finally(() => {
      this.applicationService.loading.next(false);
    });
  }

  protected onDataFileClick(dataFile: GoogleMetadata): void {
    this.applicationService.loading.next(true);
    sessionStorage.setItem('dataFileId', dataFile.id);
    this.router.navigate(['/gallery']);
  }

  protected onFolderClick(folder: GoogleMetadata): void {
    this.applicationService.loading.next(true);
    this.googleService.createDataFile(folder.name).then(dataFile => {
      sessionStorage.setItem('dataFileId', dataFile.id);
        this.googleService.updateContent(dataFile.id, {
          rootFolderId: folder.id,
          imageProperties: [],
          groupProperties: [],
          tagGroups: [],
          heartsFilter: 0,
          bookmarksFilter: 0,
          groupSizeFilterMin: 0,
          groupSizeFilterMax: 999
        } as Data).then(() => {
          this.router.navigate(['/gallery']);
      });
    });
  }

}
