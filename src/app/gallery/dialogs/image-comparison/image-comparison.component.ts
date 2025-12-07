import { DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { Tournament } from 'src/app/shared/classes/tournament.class';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { GoogleFileUtils } from 'src/app/shared/utils/google-file.utils';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-image-comparison',
  imports: [DecimalPipe],
  templateUrl: './image-comparison.component.html',
  styleUrls: ['./image-comparison.component.scss']
})
export class ImageComparisonComponent implements OnInit, OnDestroy {

  protected tournament: Tournament;
  protected comparison: [GalleryImage, GalleryImage];
  protected progressBarVisible: boolean = true;
  protected totalComparisons: number = 0;
  protected remainingComparisons: number = 0;
  protected completedComparisons: number = 0;

  protected loadingL: boolean;
  protected loadingR: boolean;

  constructor(
    private sanitizer: DomSanitizer,
    private applicationService: ApplicationService,
    private serializationService: GallerySerializationService,
    private stateService: GalleryStateService
  ) { }

  ngOnInit(): void {
    this.configureHeader();
    this.start();
  }

  ngOnDestroy(): void {
    this.applicationService.removeHeaderButtons('start', ['comparison-close', 'comparison-reset', 'comparison-undo', 'comparison-progress-bar']);
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
      onClick: () => this.progressBarVisible = !this.progressBarVisible
    }]);
  }

  protected start(): void {
    this.tournament = new Tournament();
    const images = this.stateService.images.filter(image => GoogleFileUtils.isImage(image));
    const imagesToCompare = this.stateService.comparisonImages.filter(image => GoogleFileUtils.isImage(image));
    this.tournament.start(images, imagesToCompare, this.stateService.tournamentState);
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

    if (this.comparison) {
      this.loadingL = true;
      this.loadingR = true;

      const [imageL, imageR] = this.comparison;

      const imageDecoderL = new Image();
      imageDecoderL.src = imageL.contentLink;
      imageDecoderL.decode().finally(() => {
        if (imageL == this.comparison[0]) {
          this.loadingL = false;
        }
      });

      const imageDecoderR = new Image();
      imageDecoderR.src = imageR.contentLink;
      imageDecoderR.decode().finally(() => {
        if (imageR == this.comparison[1]) {
          this.loadingR = false;
        }
      });
    }
  }

  protected getLoadingSrc(image: GalleryImage): SafeStyle {
    return this.sanitizer.bypassSecurityTrustStyle('url(' + image.thumbnailLink + ')');
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
    return this.totalComparisons === 0 ? 0 : (this.completedComparisons / this.totalComparisons) * 100;
  }

  private updateProgress(): void {
    if (!this.tournament) return;
    const progress = this.tournament.getComparisonProgress();
    this.completedComparisons = progress.completed;
    this.remainingComparisons = progress.remaining;
    this.totalComparisons = progress.total;
  }

}
