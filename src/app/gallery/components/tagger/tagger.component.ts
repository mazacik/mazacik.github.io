import { CommonModule } from '@angular/common';
import { Component, effect, HostBinding } from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import { drawer2 } from 'src/app/shared/constants/animations.constants';
import { ScreenUtils } from 'src/app/shared/utils/screen.utils';
import { GalleryImage } from '../../models/gallery-image.class';
import { GalleryStateService } from '../../services/gallery-state.service';
import { TagService } from '../../services/tag.service';
import { TaggerRowComponent } from './tagger-row/tagger-row.component';

@Component({
  selector: 'app-tagger',
  standalone: true,
  imports: [
    CommonModule,
    TippyDirective,
    TaggerRowComponent
  ],
  animations: [drawer2],
  templateUrl: './tagger.component.html',
  styleUrls: ['./tagger.component.scss']
})
export class TaggerComponent {

  protected ScreenUtils = ScreenUtils;

  @HostBinding('class.visible')
  public get classVisible(): boolean {
    return this.stateService.taggerVisible;
  }

  protected target: GalleryImage;
  protected groupMode: boolean = false;

  constructor(
    protected tagService: TagService,
    protected stateService: GalleryStateService
  ) {
    effect(() => {
      this.target = this.stateService.fullscreenImage();
      if (this.target == null) {
        this.groupMode = false;
      }
    });
  }

}
