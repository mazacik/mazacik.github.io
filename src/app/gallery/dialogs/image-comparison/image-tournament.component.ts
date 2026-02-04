import { DecimalPipe } from '@angular/common';
import { Component, effect } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { Tournament } from 'src/app/shared/classes/tournament.class';
import { GoogleFileUtils } from 'src/app/shared/utils/google-file.utils';
import { ComparisonPathComponent } from '../comparison-path/comparison-path.component';
import { FilterService } from '../../services/filter.service';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GalleryUtils } from '../../../shared/utils/gallery.utils';

@Component({
  selector: 'app-image-tournament',
  imports: [ImageComponent, DecimalPipe],
  templateUrl: './image-tournament.component.html',
  styleUrls: ['./image-tournament.component.scss']
})
export class ImageTournamentComponent {
  protected readonly galleryUtils = GalleryUtils;

  protected comparison: [GalleryImage, GalleryImage] = null;
  protected winnersLeft: GalleryImage[] = [];
  protected losersLeft: GalleryImage[] = [];
  protected winnersRight: GalleryImage[] = [];
  protected losersRight: GalleryImage[] = [];
  protected ranking: GalleryImage[] = [];
  private longPressTimer: number | null = null;
  private suppressNextClick: boolean = false;
  private readonly longPressDelayMs: number = 500;
  private readonly autoPickDebugEnabled: boolean = false;

  constructor(
    private filterService: FilterService,
    private serializationService: GallerySerializationService,
    private dialogService: DialogService,
    protected stateService: GalleryStateService
  ) {
    effect(() => {
      this.stateService.tournament.comparison();
      this.refreshComparisonRelations();
    });
  }

  protected onImageClick(winner: GalleryImage): void {
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      return;
    }
    this.stateService.tournament.handleUserInput(winner);
    this.stateService.tournamentState = this.stateService.tournament.getState();
    this.serializationService.save();
    this.refreshComparisonRelations();
  }

  public onEnterTournament(): void {
    const images = this.stateService.images.filter(image => GoogleFileUtils.isImage(image));
    const imagesToCompare = this.filterService.images().filter(image => GoogleFileUtils.isImage(image));
    const tournament = this.stateService.tournament;
    if (!tournament.comparisons || !tournament.matchesImagesToCompare(imagesToCompare)) {
      this.restartTournament(images, imagesToCompare);
    } else {
      this.refreshComparisonRelations();
    }
    this.logTournamentSimulationComparisonCount(images, imagesToCompare);
  }

  public undo(): void {
    this.stateService.tournament.undo();
    this.stateService.tournamentState = this.stateService.tournament.getState();
    this.serializationService.save();
    this.refreshComparisonRelations();
  }

  public skip(): void {
    this.stateService.tournament.skip();
    this.refreshComparisonRelations();
  }

  public toggleRelations(): void {
    this.stateService.settings.showComparisonRelations = !this.stateService.settings.showComparisonRelations;
    this.serializationService.save();
    this.refreshComparisonRelations();
  }

  protected onImageContextMenu(image: GalleryImage, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.openFullscreen(image);
  }

  protected onImageTouchStart(image: GalleryImage): void {
    if (!image) return;
    this.clearLongPressTimer();
    this.longPressTimer = window.setTimeout(() => {
      this.suppressNextClick = true;
      this.openFullscreen(image);
    }, this.longPressDelayMs);
  }

  protected onImageTouchEnd(): void {
    this.clearLongPressTimer();
  }

  protected onImageTouchMove(): void {
    this.clearLongPressTimer();
  }

  protected openComparisonPath(start: GalleryImage, end: GalleryImage): void {
    if (!start || !end) return;
    const dialogResult = this.dialogService.create(ComparisonPathComponent, { start, end });
    if (dialogResult) {
      dialogResult.then(changed => {
        if (changed) {
          this.refreshComparisonRelations();
        }
      });
    }
  }

  protected openFullscreen(image: GalleryImage): void {
    if (!image) return;
    this.stateService.fullscreenImage.set(image);
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer === null) return;
    window.clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
  }

  private restartTournament(images: GalleryImage[], imagesToCompare: GalleryImage[]): void {
    this.stateService.tournament.start(images, imagesToCompare, this.stateService.tournamentState);
    this.refreshComparisonRelations();
  }

  public refreshComparisonRelations(): void {
    this.stateService.tournament.updateProgress();
    this.comparison = this.stateService.tournament.comparison() ?? null;
    if (this.comparison) {
      if (this.stateService.settings?.showComparisonRelations) {
        this.winnersLeft = this.stateService.tournament.getNearestWinners(this.comparison[0]);
        this.losersLeft = this.stateService.tournament.getNearestLosers(this.comparison[0]);
        this.winnersRight = this.stateService.tournament.getNearestWinners(this.comparison[1]);
        this.losersRight = this.stateService.tournament.getNearestLosers(this.comparison[1]);
      } else {
        this.winnersLeft = [];
        this.losersLeft = [];
        this.winnersRight = [];
        this.losersRight = [];
      }
      this.filterSharedComparisonRelations();
      this.ranking = [];
    } else {
      this.winnersLeft = [];
      this.losersLeft = [];
      this.winnersRight = [];
      this.losersRight = [];
      const hasTournamentState = this.stateService.tournament.comparisons != null;
      this.ranking = hasTournamentState ? this.stateService.tournament.getRanking() : [];
    }
  }

  private filterSharedComparisonRelations(): void {
    if (!this.stateService.settings?.hideComparisonSharedRelations) {
      return;
    }

    const sharedWinnerIds = this.collectSharedIds(this.winnersLeft, this.winnersRight);
    if (sharedWinnerIds.size) {
      this.winnersLeft = this.winnersLeft.filter(image => !sharedWinnerIds.has(image.id));
      this.winnersRight = this.winnersRight.filter(image => !sharedWinnerIds.has(image.id));
    }

    const sharedLoserIds = this.collectSharedIds(this.losersLeft, this.losersRight);
    if (sharedLoserIds.size) {
      this.losersLeft = this.losersLeft.filter(image => !sharedLoserIds.has(image.id));
      this.losersRight = this.losersRight.filter(image => !sharedLoserIds.has(image.id));
    }
  }

  private collectSharedIds(left: GalleryImage[], right: GalleryImage[]): Set<string> {
    if (!left.length || !right.length) return new Set();
    const leftIds = new Set(left.map(image => image.id));
    const shared = new Set<string>();
    right.forEach(image => {
      if (leftIds.has(image.id)) {
        shared.add(image.id);
      }
    });
    return shared;
  }

  private logTournamentSimulationComparisonCount(images: GalleryImage[], imagesToCompare: GalleryImage[]): void {
    if (!this.autoPickDebugEnabled) return;
    const simulation = new Tournament();
    const startingState = this.stateService.tournament.getState();
    simulation.start(images, imagesToCompare, startingState);

    let comparison = simulation.comparison();
    let iterations = 0;
    const maxIterations = imagesToCompare.length * imagesToCompare.length + 1000;
    while (comparison) {
      const winner = this.pickSimulatedWinner(comparison, simulation.comparisons);
      simulation.handleUserInput(winner);
      comparison = simulation.comparison();
      iterations++;
      if (iterations > maxIterations) {
        break;
      }
    }

    console.log('[ImageTournament] simulated comparisons', simulation.comparisons.length);
  }

  private pickSimulatedWinner(
    comparison: [GalleryImage, GalleryImage],
    comparisons: [GalleryImage, GalleryImage][]
  ): GalleryImage {
    const [left, right] = comparison;
    const leftStats = this.getWinLossCounts(left, comparisons);
    const rightStats = this.getWinLossCounts(right, comparisons);

    if (leftStats.wins !== rightStats.wins) {
      return leftStats.wins > rightStats.wins ? left : right;
    }
    if (leftStats.losses !== rightStats.losses) {
      return leftStats.losses < rightStats.losses ? left : right;
    }
    return Math.random() < 0.5 ? left : right;
  }

  private getWinLossCounts(
    image: GalleryImage,
    comparisons: [GalleryImage, GalleryImage][]
  ): { wins: number; losses: number } {
    let wins = 0;
    let losses = 0;
    for (const [winner, loser] of comparisons) {
      if (winner?.id === image.id) wins++;
      if (loser?.id === image.id) losses++;
    }
    return { wins, losses };
  }

}
