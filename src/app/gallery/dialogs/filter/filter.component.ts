import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
import { GalleryService } from '../../gallery.service';
import { Filter } from '../../model/filter.interface';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss']
})
export class FilterComponent extends DialogContentBase<boolean> {

  public configuration: DialogContainerConfiguration = {
    title: 'Filter Configuration',
    buttons: [{
      text: () => 'OK',
      click: () => this.close()
    }],
    hideHeaderCloseButton: true
  };

  constructor(
    protected galleryService: GalleryService,
    protected stateService: GalleryStateService
  ) {
    super();
  }

  protected getFilterClass(filter: Filter, isIcon: boolean = false): string {
    switch (filter.state) {
      case 1:
        return 'positive ' + (isIcon ? 'fa-solid' : '');
      case -1:
        return 'negative ' + (isIcon ? 'fa-solid' : '');
      default:
        return isIcon ? 'fa-regular' : '';
    }
  }

  protected toggleFilter(filter: Filter): void {
    filter.state = filter.state == 0 ? 1 : filter.state == 1 ? -1 : 0;
    this.stateService.updateFilters();
  }

  protected clearFilters(): void {
    this.stateService.tags.forEach(tag => tag.state = 0);
    this.stateService.updateFilters();
  }

  protected isActiveFilter(): boolean {
    return this.stateService.tags.some(tag => tag.state != 0);
  }

  @HostListener('window:keydown.escape', ['$event'])
  public close(): void {
    this.stateService.save();
    this.resolve(true);
  }

}
