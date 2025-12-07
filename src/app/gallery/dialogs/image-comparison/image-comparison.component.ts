import { DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { Tournament } from 'src/app/shared/classes/tournament.class';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { GoogleFileUtils } from 'src/app/shared/utils/google-file.utils';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { FilterService } from '../../services/filter.service';

@Component({
  selector: 'app-image-comparison',
  imports: [DecimalPipe],
  templateUrl: './image-comparison.component.html',
  styleUrls: ['./image-comparison.component.scss']
})
export class ImageComparisonComponent implements OnInit, OnDestroy {

  tournament: Tournament = null;
  comparison: [GalleryImage, GalleryImage] = null;
  protected progressBarVisible: boolean = true;
  protected totalComparisons: number = 0;
  protected remainingComparisons: number = 0;
  protected completedComparisons: number = 0;

  protected loadingLT: boolean = true;
  protected loadingRT: boolean = true;
  protected loadingLC: boolean = true;
  protected loadingRC: boolean = true;

  constructor(
    private applicationService: ApplicationService,
    private serializationService: GallerySerializationService,
    private filterService: FilterService,
    private stateService: GalleryStateService
  ) { }

  ngOnInit(): void {
    this.configureHeader();
    this.start();
  }

  ngOnDestroy(): void {
    this.applicationService.removeHeaderButtons('start', ['comparison-reset', 'comparison-undo', 'comparison-progress-bar']);
  }

  private configureHeader(): void {
    this.applicationService.addHeaderButtons('start', [{
      id: 'comparison-reset',
      tooltip: 'Reset Comparison',
      classes: ['fa-solid', 'fa-rotate-left'],
      onClick: () => this.reset(),
      disabled: () => !this.tournament || this.tournament.comparisons.length == 0
    }, {
      id: 'comparison-undo',
      tooltip: 'Undo Comparison',
      classes: ['fa-solid', 'fa-delete-left'],
      onClick: () => this.undo(),
      disabled: () => !this.tournament || this.tournament.comparisons.length == 0
    }, {
      id: 'comparison-progress-bar',
      tooltip: 'Toggle Comparison Progress Bar',
      classes: ['fa-solid', 'fa-solid fa-list-check'],
      onClick: () => this.toggleProgressBar()
    }]);
  }

  protected start(): void {
    this.tournament = new Tournament();
    this.tournament.start(this.stateService.images.filter(image => GoogleFileUtils.isImage(image)), this.stateService.tournamentState);
    this.nextComparison();
  }

  protected onImageClick(winner: GalleryImage, loser: GalleryImage): void {
    this.tournament.handleUserInput(winner, loser);
    this.nextComparison();
    this.stateService.tournamentState = this.tournament.getState();
    this.serializationService.save();
  }

  public nextComparison(): void {
    this.comparison = this.tournament.getNextComparison();
    this.updateProgress();
    this.loadingLT = true;
    this.loadingLC = true;
    this.loadingRT = true;
    this.loadingRC = true;
  }

  protected undo(): void {
    this.comparison = this.tournament.undo();
    this.updateProgress();
    this.stateService.tournamentState = this.tournament.getState();
    this.serializationService.save();
  }

  public reset(): void {
    this.stateService.tournamentState = null;
    this.serializationService.save();
    this.start();
  }

  private toggleProgressBar(): void {
    this.progressBarVisible = !this.progressBarVisible;
  }

  public get progressPercent(): number {
    return this.totalComparisons === 0 ? 0 : (this.completedComparisons / this.totalComparisons) * 100;
  }

  private updateProgress(): void {
    if (!this.tournament) return;
    const progress = this.tournament.getComparisonProgress();
    this.completedComparisons = progress.completed;
    this.remainingComparisons = progress.remaining;
    this.totalComparisons = progress.total;
  }

  protected getSrc(image: GalleryImage): SafeUrl {
    if (image == this.comparison[0]) {
      if (!this.loadingLC) return image.contentLink;
      if (!this.loadingLT) return image.thumbnailLink;
    } else if (image == this.comparison[1]) {
      if (!this.loadingRC) return image.contentLink;
      if (!this.loadingRT) return image.thumbnailLink;
    }
  }

}
