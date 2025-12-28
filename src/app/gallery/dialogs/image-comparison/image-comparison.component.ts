import { DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { Tournament } from 'src/app/shared/classes/tournament.class';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { GoogleFileUtils } from 'src/app/shared/utils/google-file.utils';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { DialogService } from 'src/app/shared/services/dialog.service';

@Component({
  selector: 'app-image-comparison',
  imports: [ImageComponent, DecimalPipe],
  templateUrl: './image-comparison.component.html',
  styleUrls: ['./image-comparison.component.scss']
})
export class ImageComparisonComponent implements OnInit, OnDestroy {

  protected tournament: Tournament;
  protected comparison: [GalleryImage, GalleryImage];
  protected progressBarVisible: boolean = true;
  protected totalComparisons: number = 0;
  protected remainingComparisons: number = 0;
  protected completeComparisons: number = 0;
  protected estimateTotalComparisons: number = 0;

  constructor(
    private sanitizer: DomSanitizer,
    private applicationService: ApplicationService,
    private serializationService: GallerySerializationService,
    private stateService: GalleryStateService,
    private dialogService: DialogService
  ) { }

  ngOnInit(): void {
    this.configureHeader();
    this.start();
  }

  ngOnDestroy(): void {
    this.applicationService.removeHeaderButtons('start', ['comparison-close', 'comparison-reset', 'comparison-undo', 'comparison-skip', 'comparison-progress-bar']);
  }

  private configureHeader(): void {
    this.applicationService.addHeaderButtons('start', [{
      id: 'comparison-close',
      tooltip: 'Close Comparison',
      classes: ['fa-solid', 'fa-times'],
      onClick: () => this.stateService.comparisonImages = null
    }, {
      id: 'comparison-reset',
      tooltip: 'Reset Comparison',
      classes: ['fa-solid', 'fa-rotate-left'],
      onClick: () => {
        this.dialogService.createConfirmation({ title: 'Reset Comparison', messages: ['Are you sure?'] }).then(success => {
          if (success) {
            this.reset();
          }
        });
      },
      disabled: () => !this.tournament || this.tournament.comparisons.length == 0
    }, {
      id: 'comparison-undo',
      tooltip: 'Undo Comparison',
      classes: ['fa-solid', 'fa-delete-left'],
      onClick: () => this.undo(),
      disabled: () => !this.tournament || this.tournament.comparisons.length == 0
    }, {
      id: 'comparison-skip',
      tooltip: 'Skip Comparison',
      classes: ['fa-solid', 'fa-forward'],
      onClick: () => this.comparison = this.tournament.getNextComparison()
    }, {
      id: 'comparison-progress-bar',
      tooltip: 'Toggle Comparison Progress Bar',
      classes: ['fa-solid', 'fa-list-check'],
      onClick: () => this.progressBarVisible = !this.progressBarVisible
    }]);
  }

  protected start(): void {
    this.tournament = new Tournament();
    const images = this.stateService.images.filter(image => GoogleFileUtils.isImage(image));
    const imagesToCompare = this.stateService.comparisonImages.filter(image => GoogleFileUtils.isImage(image));
    this.estimateTotalComparisons = this.calculateEstimateTotalComparisons(imagesToCompare.length);
    this.tournament.start(images, imagesToCompare, this.stateService.tournamentState);
    this.nextComparison();
  }

  protected onImageClick(winner: GalleryImage): void {
    this.tournament.handleUserInput(winner, winner == this.comparison[0] ? this.comparison[1] : this.comparison[0]);
    this.nextComparison();
    this.stateService.tournamentState = this.tournament.getState();
    this.serializationService.save();
  }

  public nextComparison(): void {
    this.comparison = this.tournament.getNextComparison();
    this.updateProgress();
  }

  protected getLoadingSrc(image: GalleryImage): SafeStyle {
    return this.sanitizer.bypassSecurityTrustStyle('url(' + image.thumbnailLink + ')');
  }

  protected getNextBestBeatenImages(image: GalleryImage): GalleryImage[] {
    if (!this.tournament || !image) return [];
    return this.tournament.getNextBestBeatenImages(image, 5);
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

  public get progressPercent(): number {
    return this.totalComparisons === 0 ? 0 : (this.completeComparisons / this.totalComparisons) * 100;
  }

  public get estimateProgressPercent(): number {
    return this.estimateTotalComparisons === 0 ? 0 : Math.min(100, (this.completeComparisons / this.estimateTotalComparisons) * 100);
  }

  private calculateEstimateTotalComparisons(imageCount: number): number {
    if (imageCount <= 1) return 0;
    const factor = 0.52; // tuned so k * N * log2(N) matches observed workloads
    return Math.round(factor * imageCount * Math.log2(imageCount));
  }

  private updateProgress(): void {
    if (!this.tournament) return;
    const progress = this.tournament.getComparisonProgress();
    this.completeComparisons = progress.completed;
    this.remainingComparisons = progress.remaining;
    this.totalComparisons = progress.total;
  }

}
