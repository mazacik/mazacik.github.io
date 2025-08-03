import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { Contender } from 'src/app/shared/classes/contender.class';
import { Tournament } from 'src/app/shared/classes/tournament.class';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
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
export class ImageComparisonComponent extends DialogContentBase<boolean> implements OnInit {

  public override inputs: { images: GalleryImage[] };

  tournament: Tournament<GalleryImage>;

  configuration: DialogContainerConfiguration = {
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
    this.tournament = new Tournament(this.inputs.images, image => image.id, this.stateService.comparison);
  }

  protected onImageClick(winner: Contender<GalleryImage>, loser: Contender<GalleryImage>): void {
    this.tournament.handleUserInput(winner, loser);
  }

  protected reset(): void {
    this.tournament.reset();
  }

  protected save(): void {
    const comparison: { [key: string]: string[] } = {};
    for (const item of this.tournament.contenders) {
      comparison[item.id] = item.directlyBetterThan.map(dbt => dbt.id);
    }

    this.stateService.comparison = comparison;
    this.stateService.save(true);
    this.resolve(false);
  }

  public close(): void {
    this.resolve(false);
  }

}