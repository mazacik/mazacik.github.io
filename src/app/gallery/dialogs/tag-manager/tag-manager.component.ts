import { CommonModule } from '@angular/common';
import { Component, effect, HostBinding } from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import { drawer2 } from 'src/app/shared/constants/animations.constants';
import { ScreenUtils } from 'src/app/shared/utils/screen.utils';
import { GalleryImage } from '../../model/gallery-image.class';
import { GalleryStateService } from '../../services/gallery-state.service';
import { TagService } from '../../services/tag.service';
import { TagManagerRowComponent } from './tag-manager-row/tag-manager-row.component';

@Component({
  selector: 'app-tag-manager',
  standalone: true,
  imports: [
    CommonModule,
    TippyDirective,
    TagManagerRowComponent
  ],
  animations: [drawer2],
  templateUrl: './tag-manager.component.html',
  styleUrls: ['./tag-manager.component.scss']
})
export class TagManagerComponent {

  protected ScreenUtils = ScreenUtils;

  @HostBinding('class.visible')
  public get classVisible(): boolean {
    return this.stateService.tagManagerVisible;
  }

  protected target: GalleryImage;
  protected groupMode: boolean = false;

  constructor(
    protected tagService: TagService,
    protected stateService: GalleryStateService
  ) {
    effect(() => {
      this.target = this.stateService.target();
      if (this.target == null) {
        this.groupMode = false;
      }
    });
  }

}
