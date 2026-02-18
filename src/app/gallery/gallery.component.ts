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
import { ImageTournamentLongestChainComponent } from './dialogs/image-comparison/image-tournament-longest-chain.component';
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
    ImageTournamentLongestChainComponent,
    FullscreenComponent,
    TaggerComponent
  ],
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss']
})
export class GalleryComponent implements KeyboardShortcutTarget, OnInit, OnDestroy {

  @ViewChild(ImageTournamentComponent)
  private imageTournamentComponent?: ImageTournamentComponent;

  protected tournamentSubview: 'comparison' | 'chain' = 'comparison';

  protected get viewMode(): GalleryViewMode {
    return this.stateService.viewMode;
  }

  protected set viewMode(value: GalleryViewMode) {
    const previousValue = this.stateService.viewMode;
    this.stateService.viewMode = value;
    if (value === 'tournament' && previousValue !== 'tournament') {
      this.imageTournamentComponent?.onEnterTournament();
    }
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
    const isMasonry = () => this.stateService.viewMode === 'masonry' && !isFullscreen() && !isFilter();
    const isFullscreen = () => !!this.stateService.fullscreenImage();
    const isFilter = () => this.stateService.viewMode === 'masonry' && !ScreenUtils.isLargeScreen() && this.stateService.filterVisible;
    const isTournament = () => this.stateService.viewMode === 'tournament' && !isFullscreen();
    const isTournamentComparison = () => isTournament() && this.tournamentSubview === 'comparison';

    this.applicationService.addHeaderButtons('start', [{
      id: 'open-filter',
      tooltip: 'Open Filter',
      classes: 'fa-solid fa-filter',
      hidden: () => !isMasonry() || this.stateService.filterVisible,
      onClick: () => this.stateService.filterVisible = true
    }, {
      id: 'create-group',
      tooltip: 'Create Image Group',
      classes: 'fa-solid fa-folder-plus',
      hidden: () => !isMasonry(),
      onClick: () => this.galleryService.openImageGroupEditor()
    }, {
      id: 'random-image',
      tooltip: 'Random Image',
      classes: 'fa-solid fa-shuffle',
      hidden: () => !isFullscreen(),
      onClick: () => this.setRandomTarget()
    }, {
      id: 'random-group-image',
      tooltip: 'Random Image from Group',
      classes: 'fa-solid fa-arrows-spin',
      hidden: () => !isFullscreen() || !this.stateService.fullscreenImage().group,
      onClick: () => this.setRandomGroupTarget()
    }, {
      id: 'group-comparison',
      tooltip: 'Open Group Comparison',
      classes: 'fa-solid fa-code-compare',
      hidden: () => !isFullscreen() || !this.stateService.fullscreenImage().group,
      onClick: () => this.openGroupComparison()
    }, {
      id: 'group-manager',
      tooltip: 'Open Image Group Manager',
      classes: 'fa-solid fa-object-group',
      hidden: () => !isFullscreen() || !this.stateService.fullscreenImage().group,
      onClick: () => this.galleryService.openImageGroupEditor(this.stateService.fullscreenImage().group)
    }, {
      id: 'comparison-chain-toggle',
      tooltip: () => this.tournamentSubview === 'comparison' ? 'Open Longest Comparison Chain' : 'Open Tournament Comparisons',
      classes: () => this.tournamentSubview === 'chain' ? 'fa-solid fa-link active' : 'fa-solid fa-link',
      hidden: () => !isTournament(),
      onClick: () => this.toggleTournamentSubview()
    }]);

    this.applicationService.addHeaderButtons('center', [{
      id: 'comparison-undo',
      tooltip: 'Undo Comparison',
      classes: 'fa-solid fa-delete-left',
      hidden: () => !isTournamentComparison(),
      onClick: () => this.imageTournamentComponent?.undo(),
      disabled: () => !this.stateService.tournament || this.stateService.tournament.comparisons.length == 0
    }, {
      id: 'comparison-skip',
      tooltip: 'Skip Comparison',
      classes: 'fa-solid fa-forward',
      hidden: () => !isTournamentComparison(),
      onClick: () => this.imageTournamentComponent?.skip()
    }, {
      id: 'comparison-relations',
      tooltip: 'Toggle Comparison Relations and Progress Bar',
      classes: () => {
        if (this.stateService.settings?.showComparisonRelations) {
          return ['fa-solid fa-code-compare', 'fa-solid fa-slash'];
        }
        return ['fa-solid fa-code-compare'];
      },
      hidden: () => !isTournamentComparison(),
      onClick: () => this.imageTournamentComponent?.toggleRelations()
    }, {
      id: 'fullscreen-comparison-relations',
      tooltip: 'Toggle Comparison Relations',
      classes: () => {
        if (this.stateService.settings?.showFullscreenComparisonRelations) {
          return ['fa-solid fa-code-compare', 'fa-solid fa-slash'];
        }
        return ['fa-solid fa-code-compare'];
      },
      hidden: () => !isFullscreen(),
      onClick: () => {
        this.stateService.settings.showFullscreenComparisonRelations = !this.stateService.settings.showFullscreenComparisonRelations;
        this.serializationService.save();
      }
    }]);

    this.applicationService.addHeaderButtons('end', [{
      id: 'close-fullscreen',
      tooltip: 'Close Fullscreen',
      classes: 'fa-solid fa-times',
      onClick: () => this.stateService.fullscreenImage.set(null),
      hidden: () => !isFullscreen()
    }, {
      id: 'close-filter',
      tooltip: 'Close Filter',
      classes: 'fa-solid fa-times',
      onClick: () => this.stateService.filterVisible = false,
      hidden: () => !isFilter()
    }, {
      id: 'open-masonry',
      tooltip: 'Open Masonry',
      classes: () => this.viewMode === 'masonry' ? 'fa-solid fa-images active' : 'fa-solid fa-images',
      onClick: () => this.viewMode = 'masonry',
      hidden: () => !isMasonry() && !isTournament()
    }, {
      id: 'open-comparison',
      tooltip: 'Open Comparison',
      classes: () => this.viewMode === 'tournament' ? 'fa-solid fa-code-compare active' : 'fa-solid fa-code-compare',
      onClick: () => {
        this.tournamentSubview = 'comparison';
        this.viewMode = 'tournament';
      },
      hidden: () => !isMasonry() && !isTournament()
    }, {
      id: 'open-settings',
      tooltip: 'Open Settings',
      classes: 'fa-solid fa-gear',
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
      }]
    });

    this.applicationService.registerModuleSettings({
      id: 'comparison-settings',
      label: 'Comparison',
      items: [{
        id: 'show-comparison-relations',
        type: 'toggle',
        label: 'Show Comparison Relations',
        getValue: () => this.stateService.settings?.showComparisonRelations,
        onChange: value => {
          this.stateService.settings.showComparisonRelations = value;
          this.serializationService.save();
          if (this.stateService.viewMode === 'tournament') {
            this.imageTournamentComponent?.refreshComparisonRelations();
          }
        }
      }, {
        id: 'hide-shared-comparison-relations',
        type: 'toggle',
        label: 'Hide Shared Relations',
        getValue: () => this.stateService.settings?.hideComparisonSharedRelations,
        onChange: value => {
          this.stateService.settings.hideComparisonSharedRelations = value;
          this.serializationService.save();
          if (this.stateService.viewMode === 'tournament') {
            this.imageTournamentComponent?.refreshComparisonRelations();
          }
        }
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

    this.applicationService.registerModuleSettings({
      id: 'fullscreen-settings',
      label: 'Fullscreen',
      items: [{
        id: 'show-fullscreen-comparison-relations',
        type: 'toggle',
        label: 'Show Comparison Relations',
        getValue: () => this.stateService.settings?.showFullscreenComparisonRelations,
        onChange: value => {
          this.stateService.settings.showFullscreenComparisonRelations = value;
          this.serializationService.save();
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
      this.tournamentSubview = 'comparison';
      this.stateService.viewMode = 'tournament';
      const images: GalleryImage[] = this.stateService.images.filter(image => GoogleFileUtils.isImage(image));
      const imagesToCompare: GalleryImage[] = target.group.images.filter(image => GoogleFileUtils.isImage(image));
      this.stateService.tournament.start(images, imagesToCompare, this.stateService.tournamentState);
    }
  }

  protected toggleTournamentSubview(): void {
    this.tournamentSubview = this.tournamentSubview === 'comparison' ? 'chain' : 'comparison';
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

}
