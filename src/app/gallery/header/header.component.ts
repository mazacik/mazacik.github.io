import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { GalleryService } from '../gallery.service';
import { TagGroup } from '../model/tag-group.interface';
import { Tag } from '../model/tag.interface';
import { GalleryStateService } from '../services/gallery-state.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    TippyDirective
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {

  constructor(
    protected applicationService: ApplicationService,
    protected stateService: GalleryStateService,
    protected galleryService: GalleryService
  ) { }

  protected resetTag(tag: Tag): void {
    tag.state = 0;
    this.stateService.updateFilters();
    this.stateService.save();
  }

  protected getPositiveTags(): Tag[] {
    return this.stateService.tagGroups?.flatMap(group => group.tags).filter(tag => tag.state == 1);
  }

  protected getNegativeTags(): Tag[] {
    return this.stateService.tagGroups?.flatMap(group => group.tags).filter(tag => tag.state == -1);
  }

  protected getTagGroup(tag: Tag): TagGroup {
    return this.stateService.tagGroups.find(group => group.tags.includes(tag));
  }

}
