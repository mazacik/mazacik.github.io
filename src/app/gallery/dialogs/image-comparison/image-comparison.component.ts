import { CommonModule } from '@angular/common';
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
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './image-comparison.component.html',
  styleUrls: ['./image-comparison.component.scss']
})
export class ImageComparisonComponent extends DialogContentBase<void> implements OnInit {

  configuration: DialogContainerConfiguration = {
    title: 'Image Comparison',
    buttons: [{
      text: () => 'Undo',
      click: () => this.comparison = this.tournament.undo(),
      disabled: () => ArrayUtils.isEmpty(this.tournament.comparisons)
    }, {
      text: () => 'Reset',
      click: () => this.reset()
    }, {
      text: () => 'Close',
      click: () => this.close()
    }]
  }

  tournament: Tournament = null;
  comparison: [GalleryImage, GalleryImage] = null;

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
    this.comparison = this.tournament.getNextComparison();
  }

  protected onImageClick(winner: GalleryImage, loser: GalleryImage): void {
    this.tournament.handleUserInput(winner, loser);
    this.comparison = this.tournament.getNextComparison();
    this.stateService.tournamentState = this.tournament.getState();
    this.serializationService.save();
  }

  protected reset(): void {
    this.stateService.tournamentState = null;
    this.start();
  }

  public close(): void {
    this.resolve();
  }

}
