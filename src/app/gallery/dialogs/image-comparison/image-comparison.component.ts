import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/model/gallery-image.class';
import { Contender } from 'src/app/shared/classes/contender.class';
import { Tournament2 } from 'src/app/shared/classes/tournament2.class';
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

  tournament: Tournament2<GalleryImage>;

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
    this.tournament = new Tournament2(this.images, image => image.id, this.stateService.comparison);
  }

  protected onImageClick(winner: Contender<GalleryImage>, loser: Contender<GalleryImage>): void {
    this.tournament.handleUserDecision(winner, loser);
  }

  protected reset(): void {
    this.tournament.reset();
  }

  protected save(): void {
    const comparison: { [key: string]: string[] } = {};
    for (const item of this.tournament.data) {
      comparison[item.id] = item.directlyBetterThan.map(dbt => dbt.id);
    }

    this.stateService.comparison = comparison;
    this.stateService.updateData(true);
    this.resolve(false);
  }

  public close(): void {
    this.resolve(false);
  }

}
