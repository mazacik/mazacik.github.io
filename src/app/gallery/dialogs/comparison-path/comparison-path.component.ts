import { Component, OnInit } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { GalleryImage } from '../../models/gallery-image.class';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-comparison-path',
  imports: [],
  templateUrl: './comparison-path.component.html',
  styleUrls: ['./comparison-path.component.scss']
})
export class ComparisonPathComponent extends DialogContentBase<boolean> implements OnInit {

  public override inputs: { start: GalleryImage; end: GalleryImage; };

  public configuration: DialogContainerConfiguration = {
    title: () => 'Ranking Path',
    headerButtons: [{
      iconClass: 'fa-solid fa-times',
      click: () => this.close()
    }],
    footerButtons: [{
      text: () => 'Close',
      click: () => this.close()
    }]
  };

  protected path: GalleryImage[] = [];

  constructor(
    protected stateService: GalleryStateService
  ) {
    super();
  }

  ngOnInit(): void {
    this.buildPath();
  }

  public close(): void {
    this.resolve(false);
  }

  protected openFullscreen(image: GalleryImage): void {
    if (!image) return;
    this.stateService.fullscreenImage.set(image);
  }

  private buildPath(): void {
    const start = this.inputs?.start;
    const end = this.inputs?.end;
    if (!start || !end) {
      this.path = [];
      return;
    }

    const pathIds = this.stateService.imageSort.getPathIds(start.id, end.id);
    const imageById = new Map(this.stateService.images.map(image => [image.id, image]));
    this.path = pathIds.map(id => imageById.get(id) ?? (id === start.id ? start : id === end.id ? end : undefined)).filter(Boolean);
  }
}
