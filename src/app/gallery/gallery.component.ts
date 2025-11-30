import { Component, OnDestroy, OnInit } from '@angular/core';
import { ApplicationService } from '../shared/services/application.service';
import { DialogService } from '../shared/services/dialog.service';
import { FilterComponent } from './components/filter/filter.component';
import { FullscreenComponent } from './components/fullscreen/fullscreen.component';
import { MasonryComponent } from './components/masonry/masonry.component';
import { TaggerComponent } from './components/tagger/tagger.component';
import { FilterService } from './services/filter.service';
import { GalleryGoogleDriveService } from './services/gallery-google-drive.service';
import { GallerySerializationService } from './services/gallery-serialization.service';
import { GalleryStateService } from './services/gallery-state.service';
import { GalleryService } from './services/gallery.service';

@Component({
  selector: 'app-gallery',
  imports: [
    FilterComponent,
    MasonryComponent,
    FullscreenComponent,
    TaggerComponent
  ],
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss']
})
export class GalleryComponent implements OnInit, OnDestroy {

  protected loading: boolean = true;

  constructor(
    private serializationService: GallerySerializationService,
    private applicationService: ApplicationService,
    protected stateService: GalleryStateService,
    private galleryService: GalleryService,
    private googleService: GalleryGoogleDriveService,
    private filterService: FilterService,
    private dialogService: DialogService
  ) {
    this.applicationService.loading.set(true);
  }

  ngOnInit(): void {
    this.registerModuleSettings();
    this.configureHeader();
    this.serializationService.processData().then(() => this.loading = false);
  }

  ngOnDestroy(): void {
    this.applicationService.clearPageHeader();
  }

  private configureHeader(): void {
    this.applicationService.setPageHeader({
      start: [{
        id: 'toggle-filter',
        tooltip: 'Open Filter Configuration',
        classes: ['fa-solid', 'fa-filter'],
        containerClasses: () => ({
          'drawer-container': true,
          'drawer-hidden': !this.stateService.filterVisible
        }),
        onClick: () => this.stateService.filterVisible = !this.stateService.filterVisible
      }, {
        id: 'create-group',
        tooltip: 'Create Image Group',
        classes: ['fa-solid', 'fa-folder-plus'],
        onClick: () => this.galleryService.openImageGroupEditor()
      }, {
        id: 'open-comparison',
        tooltip: 'Comparison',
        classes: ['fa-solid', 'fa-folder'],
        onClick: () => this.galleryService.openComparison()
      }],
      end: [{
        id: 'google-drive',
        tooltip: 'Google Drive',
        classes: ['fa-brands', 'fa-google-drive'],
        onClick: () => this.googleService.openFolderById(this.stateService.dataFolderId)
      }]
    });
  }

  private registerModuleSettings(): void {
    if (!this.stateService.settings) {
      this.stateService.settings = {} as any;
    }
    if (this.stateService.settings.showFileInformation === undefined) {
      this.stateService.settings.showFileInformation = true;
    }
    this.applicationService.registerModuleSettings({
      id: 'gallery-settings',
      label: 'Gallery',
      items: [{
        id: 'show-tag-count',
        type: 'toggle',
        label: 'Show Tag Count',
        getValue: () => !!this.stateService.settings?.showTagCount,
        onChange: value => {
          this.stateService.settings.showTagCount = value;
          this.serializationService.save();
        }
      }, {
        id: 'show-videos',
        type: 'toggle',
        label: 'Show Videos',
        getValue: () => !!this.stateService.settings?.showVideos,
        onChange: value => {
          this.stateService.settings.showVideos = value;
          this.filterService.updateFilters();
          this.serializationService.save();
        }
      }, {
        id: 'show-file-information',
        type: 'toggle',
        label: 'Show File Information',
        getValue: () => this.stateService.settings?.showFileInformation ?? true,
        onChange: value => {
          this.stateService.settings.showFileInformation = value;
          this.serializationService.save();
        }
      }, {
        id: 'show-masonry-file-names',
        type: 'toggle',
        label: 'Show Masonry File Names',
        getValue: () => !!this.stateService.settings?.showMasonryBrickFileNames,
        onChange: value => {
          this.stateService.settings.showMasonryBrickFileNames = value;
          this.serializationService.save();
        }
      }, {
        id: 'auto-bookmark',
        type: 'toggle',
        label: 'Auto Bookmark',
        getValue: () => !!this.stateService.settings?.autoBookmark,
        onChange: value => {
          this.stateService.settings.autoBookmark = value;
          this.serializationService.save();
        }
      }, {
        id: 'bookmark-all',
        type: 'action',
        label: 'Bookmark All Images',
        onClick: () => this.bookmarkAllImages()
      }, {
        id: 'reset-dialog-positions',
        type: 'action',
        label: 'Reset Dialog Positions',
        onClick: () => this.resetDialogPositions()
      }]
    });
  }

  private bookmarkAllImages(): void {
    this.dialogService.createConfirmation({ title: 'Confirmation: Bookmark All Images', messages: ['Are you sure you want to bookmark all images?'] }).then(success => {
      if (success) {
        this.stateService.images.forEach(image => image.bookmark = true);
        this.filterService.updateFilters();
        this.serializationService.save();
      }
    });
  }

  private resetDialogPositions(): void {
    this.dialogService.containerComponentInstances.forEach(instance => {
      instance.top = null;
      instance.left = null;
    });

    for (let i = 0; i < localStorage.length; i++) {
      const key: string = localStorage.key(i);
      if (key.endsWith('.top') || key.endsWith('.left')) {
        localStorage.removeItem(key);
      }
    }
  }

}
