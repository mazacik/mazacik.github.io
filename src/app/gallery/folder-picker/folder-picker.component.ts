import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GalleryGoogleDriveService } from 'src/app/gallery/services/gallery-google-drive.service';
import { ApplicationService } from 'src/app/shared/services/application.service';
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
    private googleService: GalleryGoogleDriveService,
    protected applicationService: ApplicationService
  ) {
    this.applicationService.loading.next(true);
  }

  ngOnInit(): void {
    this.googleService.getFolderMetadata().then(metas => {
      this.dataFiles = metas.filter(meta => meta.name.endsWith('.tagallery'));
      const helper: string[] = this.dataFiles.map(meta => meta.name.substring(0, meta.name.indexOf('.tagallery')));
      this.folders = metas.filter(meta => GoogleFileUtils.isFolder(meta) && !helper.includes(meta.name));
    }).finally(() => {
      this.applicationService.loading.next(false);
    });
  }

  protected onDataFileClick(dataFile: GoogleMetadata): void {
    this.applicationService.loading.next(true);
    this.googleService.fileId = dataFile.id;
    this.router.navigate(['/gallery']);
  }

  protected onFolderClick(folder: GoogleMetadata): void {
    this.applicationService.loading.next(true);
    this.googleService.createDataFile(folder.name).then(dataFile => {
      this.googleService.fileId = dataFile.id;
      this.googleService.updateContent(dataFile.id, {
        rootFolderId: folder.id,
        imageProperties: [],
        groupProperties: [],
        tagGroups: [],
        heartsFilter: 0,
        bookmarksFilter: 0,
        archiveFilter: 1,
        groupSizeFilterMin: 0,
        groupSizeFilterMax: 999
      } as Data).then(() => {
        this.router.navigate(['/gallery']);
      });
    });
  }

}
