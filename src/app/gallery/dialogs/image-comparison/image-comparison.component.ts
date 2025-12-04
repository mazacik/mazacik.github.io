
import { DecimalPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { Tournament } from 'src/app/shared/classes/tournament.class';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { ArrayUtils } from 'src/app/shared/utils/array.utils';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-image-comparison',
  imports: [DecimalPipe],
  templateUrl: './image-comparison.component.html',
  styleUrls: ['./image-comparison.component.scss']
})
export class ImageComparisonComponent extends DialogContentBase<void> implements OnInit {

  configuration: DialogContainerConfiguration = {
    title: 'Image Comparison',
    headerButtons: [{
      iconClass: 'fa-solid fa-rotate-left',
      click: () => this.reset()
    }, {
      iconClass: 'fa-solid fa-backward-step',
      click: () => this.undo(),
      disabled: () => ArrayUtils.isEmpty(this.tournament.comparisons)
    }, {
      iconClass: 'fa-solid fa-list-check',
      click: () => this.toggleProgressBar()
    }, {
      iconClass: 'fa-solid fa-times',
      click: () => this.close()
    }]
  }

  tournament: Tournament = null;
  comparison: [GalleryImage, GalleryImage] = null;
  protected progressBarVisible: boolean = true;
  protected totalComparisons: number = 0;
  protected remainingComparisons: number = 0;
  protected completedComparisons: number = 0;

  constructor(
    private serializationService: GallerySerializationService,
    protected stateService: GalleryStateService
  ) {
    super();
  }

  ngOnInit(): void {
    this.start();
  }

  protected start(): void {
    this.tournament = new Tournament();
    this.tournament.start(this.stateService.images.slice(), this.stateService.tournamentState);
    this.refreshComparisonAndProgress();
  }

  protected onImageClick(winner: GalleryImage, loser: GalleryImage): void {
    this.tournament.handleUserInput(winner, loser);
    this.refreshComparisonAndProgress();
    this.syncTournamentState();
  }

  protected undo(): void {
    this.comparison = this.tournament.undo();
    this.refreshProgress();
    this.syncTournamentState();
  }

  protected reset(): void {
    this.stateService.tournamentState = null;
    this.start();
  }

  public close(): void {
    this.resolve();
  }

  private toggleProgressBar(): void {
    this.progressBarVisible = !this.progressBarVisible;
  }

  public get progressPercent(): number {
    return this.totalComparisons === 0 ? 0 : (this.completedComparisons / this.totalComparisons) * 100;
  }

  private refreshComparisonAndProgress(): void {
    this.comparison = this.tournament.getNextComparison();
    this.refreshProgress();
  }

  private refreshProgress(): void {
    if (!this.tournament) return;
    const progress = this.tournament.getComparisonProgress();
    this.completedComparisons = progress.completed;
    this.remainingComparisons = progress.remaining;
    this.totalComparisons = progress.total;
  }

  private syncTournamentState(): void {
    this.stateService.tournamentState = this.tournament.getState();
    this.serializationService.save();
  }

}
