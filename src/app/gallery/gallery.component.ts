import { Component, ElementRef, Injector, OnDestroy, OnInit, ViewChild, afterNextRender, effect, inject } from '@angular/core';
import { KeyboardShortcutTarget } from '../shared/classes/keyboard-shortcut-target.interface';
import { ApplicationSettingsComponent } from '../shared/dialogs/application-settings/application-settings.component';
import { ApplicationService } from '../shared/services/application.service';
import { DialogService } from '../shared/services/dialog.service';
import { KeyboardShortcutService } from '../shared/services/keyboard-shortcut.service';
import { ArrayUtils } from '../shared/utils/array.utils';
import { ScreenUtils } from '../shared/utils/screen.utils';
import { FilterComponent } from './components/filter/filter.component';
import { FullscreenComponent } from './components/fullscreen/fullscreen.component';
import { MasonryComponent } from './components/masonry/masonry.component';
import { TaggerComponent } from './components/tagger/tagger.component';
import { GalleryFeatures } from './constants/gallery-features';
import { ImageTournamentLongestChainComponent } from './dialogs/image-comparison/image-tournament-longest-chain.component';
import { ImageTournamentComponent } from './dialogs/image-comparison/image-tournament.component';
import { GalleryImage } from './models/gallery-image.class';
import { FilterService } from './services/filter.service';
import { GallerySerializationService } from './services/gallery-serialization.service';
import { GalleryStateService, GalleryViewMode } from './services/gallery-state.service';
import { GalleryService } from './services/gallery.service';
import { GallerySortUtils } from './utils/gallery-sort.utils';

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

  @ViewChild('taggerOverlay')
  private taggerOverlay?: ElementRef<HTMLDivElement>;

  protected tournamentSubview: 'comparison' | 'chain' = 'comparison';
  private readonly injector = inject(Injector);
  protected comparisonFilterOpen = false;
  protected taggerOverlayVisible: boolean = false;
  private fullscreenWasOpen: boolean = false;
  private browserFullscreenActive: boolean = !!document.fullscreenElement;
  private readonly browserFullscreenChangeListener = (): void => {
    this.browserFullscreenActive = !!document.fullscreenElement;
  };

  protected get viewMode(): GalleryViewMode {
    return this.stateService.viewMode;
  }

  protected set viewMode(value: GalleryViewMode) {
    const previousValue = this.stateService.viewMode;
    this.stateService.viewMode = value;
    if (value === 'tournament' && previousValue !== 'tournament') {
      this.imageTournamentComponent?.onEnterTournament();
    } else if (value === 'masonry' && previousValue === 'tournament') {
      this.imageTournamentComponent?.onLeaveTournament();
    }
  }

  protected loading: boolean = true;

  constructor(
    private serializationService: GallerySerializationService,
    private applicationService: ApplicationService,
    private keyboardShortcutService: KeyboardShortcutService,
    private galleryService: GalleryService,
    protected filterService: FilterService,
    private dialogService: DialogService,
    protected stateService: GalleryStateService
  ) {
    this.applicationService.loading.set(true);
    effect(() => {
      const fullscreenOpen = !!this.stateService.fullscreenImage();
      if (!this.fullscreenWasOpen && fullscreenOpen) {
        this.resetTaggerOverlayScroll();
      }
      this.fullscreenWasOpen = fullscreenOpen;
    });
  }

  ngOnInit(): void {
    document.addEventListener('fullscreenchange', this.browserFullscreenChangeListener);
    this.configureHeader();
    this.registerModuleSettings();
    this.serializationService.processData().then(() => {
      this.keyboardShortcutService.register(this);
      this.loading = false;
    });
  }

  ngOnDestroy(): void {
    this.keyboardShortcutService.unregister(this);
    document.removeEventListener('fullscreenchange', this.browserFullscreenChangeListener);
    this.applicationService.removeHeaderButtons(['browser-fullscreen', 'restart-active-image', 'skip-active-image']);
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(error => console.warn('Could not exit browser fullscreen mode.', error));
    }
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
      }
    }
  }

  protected openRankingAt(subjectId: string, ranking: ImageTournamentLongestChainComponent): void {
    this.tournamentSubview = 'chain';
    afterNextRender(() => ranking.scrollToSubject(subjectId), { injector: this.injector });
  }

  private configureHeader(): void {
    const isMasonry = () => this.stateService.viewMode === 'masonry' && !isFullscreen() && !isFilter();
    const isGroupManagerOpen = () => !!this.stateService.groupEditorGroup;
    const isFullscreen = () => !!this.stateService.fullscreenImage();
    const isFilter = () => this.stateService.viewMode === 'masonry' && !ScreenUtils.isLargeScreen() && this.stateService.filterVisible;
    const inComparison = () => this.viewMode === 'tournament' && !isFullscreen();
    const isTournament = () => inComparison() && (!this.comparisonFilterOpen || ScreenUtils.isLargeScreen());
    const hidePlacementActions = () => !isTournament() || this.tournamentSubview !== 'comparison' || !this.imageTournamentComponent?.hasActiveRankingImage;

    this.applicationService.addHeaderButtons('start', [{
      id: 'close-fullscreen',
      tooltip: 'Close Fullscreen',
      classes: 'fa-solid fa-arrow-left',
      onClick: () => this.stateService.fullscreenImage.set(null),
      hidden: () => !isFullscreen()
    }, {
      id: 'close-filter',
      tooltip: 'Close Filter',
      classes: 'fa-solid fa-arrow-left',
      onClick: () => this.stateService.filterVisible = false,
      hidden: () => isFullscreen() || !isFilter()
    }, {
      id: 'toggle-view-mode',
      tooltip: () => {
        if (this.viewMode === 'masonry') {
          return 'Open Comparison';
        }
        return this.tournamentSubview === 'chain' ? 'Back to Comparison' : 'Back to Gallery';
      },
      classes: () => this.viewMode === 'tournament' ? 'fa-solid fa-arrow-left' : 'fa-solid fa-code-compare',
      disabled: () => this.viewMode === 'masonry' && isGroupManagerOpen(),
      onClick: () => {
        if (this.viewMode === 'masonry') {
          this.tournamentSubview = 'comparison';
          this.viewMode = 'tournament';
          return;
        }
        if (this.tournamentSubview === 'chain') {
          this.tournamentSubview = 'comparison';
          return;
        }
        this.comparisonFilterOpen = false;
        this.viewMode = 'masonry';
      },
      hidden: () => !isMasonry() && !isTournament()
    }, {
      id: 'create-group',
      tooltip: 'Create Image Group',
      classes: 'fa-solid fa-folder-plus',
      disabled: isGroupManagerOpen,
      hidden: () => !isMasonry(),
      onClick: () => this.galleryService.openImageGroupEditor()
    }, {
      id: 'comparison-chain-toggle',
      tooltip: 'Open Ranking',
      classes: 'fa-solid fa-crown',
      hidden: () => !isTournament() || this.tournamentSubview !== 'comparison',
      onClick: () => this.tournamentSubview = 'chain'
    }, {
      id: 'toggle-consistency-checks-only',
      tooltip: () => this.imageTournamentComponent?.consistencyChecksOnly ? 'Resume Ranking' : 'Consistency Checks Only',
      classes: () => 'fa-solid fa-list-check' + (this.imageTournamentComponent?.consistencyChecksOnly ? ' active' : ''),
      hidden: () => !isTournament() || this.tournamentSubview !== 'comparison',
      onClick: () => this.imageTournamentComponent?.toggleConsistencyChecksOnly()
    }]);

    this.applicationService.addHeaderButtons('start-center', [{
      id: 'restart-active-image',
      tooltip: () => this.imageTournamentComponent?.isRankedRowMode ? 'Restart Image Placement' : 'Restart Image Comparisons',
      classes: 'fa-solid fa-rotate-left',
      hidden: hidePlacementActions,
      onClick: () => this.imageTournamentComponent?.resetActiveImage()
    }, {
      id: 'skip-active-image',
      tooltip: 'Skip Image',
      classes: 'fa-solid fa-forward-step',
      hidden: hidePlacementActions,
      onClick: () => this.imageTournamentComponent?.skipActiveImage()
    }]);

    this.applicationService.addHeaderButtons('center', [{
      id: 'open-filter',
      tooltip: 'Open Filter',
      classes: 'fa-solid fa-filter',
      count: () => this.filterService.masonry.images().length,
      disabled: () => isGroupManagerOpen() && !ScreenUtils.isLargeScreen(),
      hidden: () => !isMasonry() || this.stateService.filterVisible,
      onClick: () => this.stateService.filterVisible = true
    }, {
      id: 'random-image',
      tooltip: 'Random Image',
      classes: 'fa-solid fa-shuffle',
      hidden: () => !isFullscreen(),
      onClick: () => this.setRandomTarget()
    }, {
      id: 'toggle-comparison-filter-editor',
      tooltip: () => this.comparisonFilterOpen ? 'Close Filter Editor' : 'Open Filter Editor',
      classes: () => `fa-solid fa-filter${this.comparisonFilterOpen ? ' active' : ''}`,
      count: () => this.filterService.comparison.images().length,
      hidden: () => !inComparison(),
      onClick: () => this.comparisonFilterOpen = !this.comparisonFilterOpen
    }, {
      id: 'toggle-ranked-row',
      tooltip: () => this.stateService.settings?.useRankedRow ? 'Switch to Pairwise Comparison' : 'Switch to Ranked-column Placement',
      classes: () => `fa-solid fa-arrows-up-down${this.stateService.settings?.useRankedRow ? ' active' : ''}`,
      hidden: () => !GalleryFeatures.rankedColumnPlacement || !isTournament() || this.tournamentSubview !== 'comparison' || this.imageTournamentComponent?.consistencyChecksOnly || window.innerWidth < 1024,
      onClick: () => this.setRankedRowMode(!this.stateService.settings?.useRankedRow)
    }]);

    this.applicationService.addHeaderButtons('center-end', [{
      id: 'toggle-comparison-progress',
      tooltip: () => `${this.stateService.settings?.showComparisonProgress ? 'Hide' : 'Show'} Comparison Progress`,
      classes: () => `wide-header-shortcut fa-solid fa-bars-progress${this.stateService.settings?.showComparisonProgress ? ' active' : ''}`,
      hidden: () => !isTournament() || this.tournamentSubview !== 'comparison' || this.imageTournamentComponent?.consistencyChecksOnly,
      onClick: () => this.setComparisonProgress(!this.stateService.settings?.showComparisonProgress)
    }, {
      id: 'toggle-comparison-relations',
      tooltip: () => `${this.stateService.settings?.showComparisonRelations ? 'Hide' : 'Show'} Comparison Relations`,
      classes: () => `wide-header-shortcut fa-solid fa-code-compare${this.stateService.settings?.showComparisonRelations ? ' active' : ''}`,
      hidden: () => !isTournament() || this.tournamentSubview !== 'comparison' || this.imageTournamentComponent?.consistencyChecksOnly || !!this.imageTournamentComponent?.isRankedRowMode,
      onClick: () => this.setComparisonRelations(!this.stateService.settings?.showComparisonRelations)
    }]);

    this.applicationService.addHeaderButtons('end', [{
      id: 'browser-fullscreen',
      tooltip: () => {
        if (!document.fullscreenEnabled && !this.browserFullscreenActive) {
          return 'Browser Fullscreen Unavailable';
        }
        return this.browserFullscreenActive ? 'Exit Browser Fullscreen' : 'Enter Browser Fullscreen';
      },
      classes: () => `fa-solid ${this.browserFullscreenActive ? 'fa-compress' : 'fa-expand'}`,
      disabled: () => !document.fullscreenEnabled && !this.browserFullscreenActive,
      onClick: () => void this.toggleBrowserFullscreen()
    }, {
      id: 'open-settings',
      tooltip: 'Open Settings',
      classes: 'fa-solid fa-gear',
      onClick: () => this.dialogService.create(ApplicationSettingsComponent)
    }]);
  }

  private async toggleBrowserFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.fullscreenEnabled) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      }
    } catch (error) {
      console.warn('Could not change browser fullscreen mode.', error);
    }
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

    this.applicationService.registerModuleSettings({
      id: 'comparison-settings',
      label: 'Comparison',
      items: [...(GalleryFeatures.rankedColumnPlacement ? [{
        id: 'use-ranked-row',
        type: 'toggle' as const,
        label: 'Use Ranked Column on Desktop',
        getValue: () => !!this.stateService.settings?.useRankedRow,
        onChange: value => this.setRankedRowMode(value)
      }] : []), {
        id: 'show-comparison-relations',
        type: 'toggle',
        label: 'Show Comparison Relations',
        getValue: () => this.stateService.settings?.showComparisonRelations,
        onChange: value => this.setComparisonRelations(value)
      }, {
        id: 'show-comparison-progress',
        type: 'toggle',
        label: 'Show Comparison Progress',
        getValue: () => this.stateService.settings?.showComparisonProgress,
        onChange: value => this.setComparisonProgress(value)
      }, {
        id: 'reset-comparison',
        type: 'action',
        label: 'Reset Ranking',
        onClick: () => {
          this.dialogService.createConfirmation({ title: 'Reset Ranking', messages: ['Are you sure?'] }).then(success => {
            if (success) {
              this.imageTournamentComponent?.resetSort();
            }
          });
        }
      }]
    });
  }

  private setRandomTarget(): void {
    const filter: GalleryImage[] = this.filterService.masonry.images();
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

  private setComparisonRelations(value: boolean): void {
    this.stateService.settings.showComparisonRelations = value;
    this.serializationService.save();
    if (this.stateService.viewMode === 'tournament') {
      this.imageTournamentComponent?.refreshComparisonRelations();
    }
  }

  private setRankedRowMode(value: boolean): void {
    if (!GalleryFeatures.rankedColumnPlacement) return;
    if (this.imageTournamentComponent) {
      this.imageTournamentComponent.setRankedRowMode(value);
    } else {
      this.stateService.settings.useRankedRow = value;
      this.serializationService.save();
    }
  }

  private setComparisonProgress(value: boolean): void {
    this.stateService.settings.showComparisonProgress = value;
    this.serializationService.save();
  }

  protected onTaggerOverlayScroll(element: HTMLDivElement): void {
    this.taggerOverlayVisible = element.scrollTop > 1;
  }

  private isFullscreenImageRanked(): boolean {
    const target = this.stateService.fullscreenImage();
    return !!target && this.stateService.imageSort.rankedImageIds.includes(GallerySortUtils.getSortSubjectId(target));
  }

  private moveFullscreenImageToPending(): void {
    const target = this.stateService.fullscreenImage();
    if (!target) return;
    this.stateService.imageSort.moveRankedImageToPending(GallerySortUtils.getSortSubjectId(target));
    this.stateService.sortState = this.stateService.imageSort.getState();
    this.serializationService.save(true);
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

  private resetTaggerOverlayScroll(): void {
    const element = this.taggerOverlay?.nativeElement;
    if (!element) {
      return;
    }

    element.scrollTop = 0;
    this.taggerOverlayVisible = false;
  }

}
