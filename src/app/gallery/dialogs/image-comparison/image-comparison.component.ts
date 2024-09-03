import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/model/gallery-image.class';
import { Tournament } from 'src/app/shared/classes/tournament.class';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';
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
export class ImageComparisonComponent extends DialogContent<boolean> implements OnInit {

  @Input() images: GalleryImage[];

  tournament: Tournament<GalleryImage>;

  configuration: DialogConfiguration = {
    title: 'Image Comparison',
    buttons: [{
      text: () => 'Reset',
      click: () => this.reset()
    }, {
      text: () => 'Save',
      click: () => this.save()
    }]
  }

  constructor(
    private stateService: GalleryStateService
  ) {
    super();
  }

  ngOnInit(): void {
    const comparison: { [key: string]: GalleryImage[] } = {};
    if (this.stateService.comparison) {
      for (const [key, directlyBetterThanIds] of Object.entries(this.stateService.comparison)) {
        comparison[key] = this.stateService.images.filter(image => directlyBetterThanIds.includes(image.id));
      }
    }

    this.tournament = new Tournament(this.images, image => image.id, comparison);
  }

  protected onImageClick(winner: GalleryImage, loser: GalleryImage): void {
    this.tournament.addComparisonResult(winner, loser);
  }

  protected reset(): void {
    this.tournament.reset();
  }

  protected save(): void {
    const comparison: { [key: string]: string[] } = {};
    for (const [key, directlyBetterThan] of Object.entries(this.tournament.directlyBetterThan)) {
      comparison[key] = directlyBetterThan.map(image => image.id);
    }

    this.stateService.comparison = comparison;
    this.stateService.updateData(true);
    this.resolve(false);
  }

  public close(): void {
    this.resolve(false);
  }

}
