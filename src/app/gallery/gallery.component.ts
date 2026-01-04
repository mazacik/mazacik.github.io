import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { KeyboardShortcutTarget } from '../shared/classes/keyboard-shortcut-target.interface';
import { ApplicationSettingsComponent } from '../shared/dialogs/application-settings/application-settings.component';
import { ApplicationService } from '../shared/services/application.service';
import { DialogService } from '../shared/services/dialog.service';
import { KeyboardShortcutService } from '../shared/services/keyboard-shortcut.service';
import { ArrayUtils } from '../shared/utils/array.utils';
import { GoogleFileUtils } from '../shared/utils/google-file.utils';
import { ScreenUtils } from '../shared/utils/screen.utils';
import { FilterComponent } from './components/filter/filter.component';
import { FullscreenComponent } from './components/fullscreen/fullscreen.component';
import { MasonryComponent } from './components/masonry/masonry.component';
import { TaggerComponent } from './components/tagger/tagger.component';
import { ImageTournamentComponent } from './dialogs/image-comparison/image-tournament.component';
import { GalleryImage } from './models/gallery-image.class';
import { FilterService } from './services/filter.service';
import { GallerySerializationService } from './services/gallery-serialization.service';
import { GalleryStateService, GalleryViewMode } from './services/gallery-state.service';
import { GalleryService } from './services/gallery.service';

@Component({
  selector: 'app-gallery',
  imports: [
    FilterComponent,
    MasonryComponent,
    ImageTournamentComponent,
    FullscreenComponent,
    TaggerComponent
  ],
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss']
})
export class GalleryComponent implements KeyboardShortcutTarget, OnInit, OnDestroy {

  @ViewChild(ImageTournamentComponent)
  private imageTournamentComponent?: ImageTournamentComponent;

  protected get viewMode(): GalleryViewMode {
    return this.stateService.viewMode;
  }

  protected set viewMode(value: GalleryViewMode) {
    this.stateService.viewMode = value;
  }

  protected loading: boolean = true;

  constructor(
    private serializationService: GallerySerializationService,
    private applicationService: ApplicationService,
    private keyboardShortcutService: KeyboardShortcutService,
    private galleryService: GalleryService,
    private filterService: FilterService,
    private dialogService: DialogService,
    protected stateService: GalleryStateService
  ) {
    this.applicationService.loading.set(true);
  }

  ngOnInit(): void {
    this.configureHeader();
    this.registerModuleSettings();
    this.serializationService.processData().then(() => {
      this.keyboardShortcutService.register(this);
      this.loading = false;
    });
  }

  ngOnDestroy(): void {
    this.keyboardShortcutService.unregister(this);
  }

  processKeyboardShortcut(event: KeyboardEvent): void {
    if (this.stateService.fullscreenImage()) {
      switch (event.code) {
        case 'Escape':
          this.stateService.fullscreenImage.set(null);
          break;
        case 'KeyR':
          this.setRandomTarget();
          break;
        case 'KeyG':
          this.setRandomGroupTarget();
          break;
      }
    }
  }

  private configureHeader(): void {
    const isMasonry = () => this.stateService.viewMode === 'masonry' && !isFullscreen() && !isFilter() && !isTagger();
    const isFullscreen = () => !!this.stateService.fullscreenImage() && !isTagger();
    const isFilter = () => this.stateService.viewMode === 'masonry' && !ScreenUtils.isLargeScreen() && this.stateService.filterVisible;
    const isTagger = () => !ScreenUtils.isLargeScreen() && this.stateService.taggerVisible;
    const isTournament = () => this.stateService.viewMode === 'tournament' && !isFullscreen();

    this.applicationService.addHeaderButtons('start', [{
      id: 'open-filter',
      tooltip: 'Open Filter',
      classes: ['fa-solid', 'fa-filter'],
      hidden: () => !isMasonry() || this.stateService.filterVisible,
      onClick: () => this.stateService.filterVisible = true
    }, {
      id: 'create-group',
      tooltip: 'Create Image Group',
      classes: ['fa-solid', 'fa-folder-plus'],
      hidden: () => !isMasonry(),
      onClick: () => this.galleryService.openImageGroupEditor()
    }, {
      id: 'random-image',
      tooltip: 'Random Image',
      classes: ['fa-solid', 'fa-shuffle'],
      hidden: () => !isFullscreen(),
      onClick: () => this.setRandomTarget()
    }, {
      id: 'random-group-image',
      tooltip: 'Random Image from Group',
      classes: ['fa-solid', 'fa-arrows-spin'],
      hidden: () => !isFullscreen() || !this.stateService.fullscreenImage().group,
      onClick: () => this.setRandomGroupTarget()
    }, {
      id: 'group-comparison',
      tooltip: 'Open Group Comparison',
      classes: ['fa-solid', 'fa-code-compare'],
      hidden: () => !isFullscreen() || !this.stateService.fullscreenImage().group,
      onClick: () => this.openGroupComparison()
    }, {
      id: 'group-manager',
      tooltip: 'Open Image Group Manager',
      classes: ['fa-solid', 'fa-object-group'],
      hidden: () => !isFullscreen() || !this.stateService.fullscreenImage().group,
      onClick: () => this.galleryService.openImageGroupEditor(this.stateService.fullscreenImage().group)
    }]);

    this.applicationService.addHeaderButtons('center', [{
      id: 'comparison-undo',
      tooltip: 'Undo Comparison',
      classes: ['fa-solid', 'fa-delete-left'],
      hidden: () => !isTournament(),
      onClick: () => this.imageTournamentComponent?.undo(),
      disabled: () => !this.stateService.tournament || this.stateService.tournament.comparisons.length == 0
    }, {
      id: 'comparison-skip',
      tooltip: 'Skip Comparison',
      classes: ['fa-solid', 'fa-forward'],
      hidden: () => !isTournament(),
      onClick: () => this.imageTournamentComponent?.skip()
    }, {
      id: 'comparison-progress-bar',
      tooltip: 'Toggle Comparison Progress Bar',
      classes: ['fa-solid', 'fa-list-check'],
      hidden: () => !isTournament(),
      onClick: () => this.imageTournamentComponent?.toggleProgressBar()
    }]);

    this.applicationService.addHeaderButtons('end', [{
      id: 'open-tagger',
      tooltip: 'Open Tagger',
      classes: ['fa-solid', 'fa-tags'],
      onClick: () => this.stateService.taggerVisible = true,
      hidden: () => !isFullscreen() || this.stateService.taggerVisible
    }, {
      id: 'close-fullscreen',
      tooltip: 'Close Fullscreen',
      classes: ['fa-solid', 'fa-times'],
      onClick: () => this.stateService.fullscreenImage.set(null),
      hidden: () => !isFullscreen()
    }, {
      id: 'close-filter',
      tooltip: 'Close Filter',
      classes: ['fa-solid', 'fa-times'],
      onClick: () => this.stateService.filterVisible = false,
      hidden: () => !isFilter()
    }, {
      id: 'close-tagger',
      tooltip: 'Close Tagger',
      classes: ['fa-solid', 'fa-times'],
      onClick: () => this.stateService.taggerVisible = false,
      hidden: () => !isTagger()
    }, {
      id: 'toggle-view',
      tooltip: () => this.viewMode === 'masonry' ? 'Open Comparison' : 'Open Masonry',
      classes: () => this.viewMode === 'masonry' ? ['fa-solid', 'fa-code-compare'] : ['fa-solid', 'fa-images'],
      onClick: () => this.viewMode = this.viewMode === 'masonry' ? 'tournament' : 'masonry',
      hidden: () => !isMasonry() && !isTournament()
    }, {
      id: 'open-settings',
      tooltip: 'Open Settings',
      classes: ['fa-solid', 'fa-gear'],
      onClick: () => this.dialogService.create(ApplicationSettingsComponent),
      hidden: () => !isMasonry() && !isTournament()
    }]);
  }

  private registerModuleSettings(): void {
    if (!this.stateService.settings) {
      this.stateService.settings = {} as any;
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
      }, {
        id: 'reset-comparison',
        type: 'action',
        label: 'Reset Comparison',
        onClick: () => {
          this.dialogService.createConfirmation({ title: 'Reset Comparison', messages: ['Are you sure?'] }).then(success => {
            if (success) {
              this.stateService.tournamentState = null;
              this.serializationService.save();

              const images = this.stateService.images.filter(image => GoogleFileUtils.isImage(image));
              const imagesToCompare = this.filterService.images().filter(image => GoogleFileUtils.isImage(image));
              this.stateService.tournament.start(images, imagesToCompare, this.stateService.tournamentState);
            }
          });
        }
      }]
    });
  }

  private setRandomTarget(): void {
    const filter: GalleryImage[] = this.filterService.images();
    if (!ArrayUtils.isEmpty(filter)) {
      let nextTarget: GalleryImage;
      const currentTarget: GalleryImage = this.stateService.fullscreenImage();

      if (currentTarget) {
        if (currentTarget.group) {
          nextTarget = ArrayUtils.getRandom(filter, currentTarget.group.images);
        } else {
          nextTarget = ArrayUtils.getRandom(filter, [currentTarget]);
        }
      } else {
        nextTarget = ArrayUtils.getRandom(filter);
      }

      if (nextTarget) {
        this.stateService.fullscreenImage.set(nextTarget);
      }
    }
  }

  protected setRandomGroupTarget(): void {
    const target: GalleryImage = this.stateService.fullscreenImage();
    if (target?.group) {
      this.stateService.fullscreenImage.set(ArrayUtils.getRandom(target.group.images, [target]));
    }
  }

  protected openGroupComparison(): void {
    const target: GalleryImage = this.stateService.fullscreenImage();
    if (target?.group) {
      this.stateService.viewMode = 'tournament';
      const images: GalleryImage[] = this.stateService.images.filter(image => GoogleFileUtils.isImage(image));
      const imagesToCompare: GalleryImage[] = target.group.images.filter(image => GoogleFileUtils.isImage(image));
      this.stateService.tournament.start(images, imagesToCompare, this.stateService.tournamentState);
    }
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
