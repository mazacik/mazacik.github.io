import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/model/gallery-image.class';
import { Tournament } from 'src/app/shared/classes/tournament.class';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';

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
      text: () => 'Close',
      click: () => this.close()
    }]
  }

  ngOnInit(): void {
    this.tournament = new Tournament(this.images, image => image.id);
  }

  onImageClick(winner: GalleryImage, loser: GalleryImage): void {
    this.tournament.addComparisonResult(winner, loser);
  }

  reset(): void {
    this.tournament.reset();
  }

  public close(): void {
    this.resolve(false);
  }

}
