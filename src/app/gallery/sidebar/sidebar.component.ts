import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, effect } from '@angular/core';
import { TippyDirective } from '@ngneat/helipopper';
import { SwitchComponent } from 'src/app/shared/components/switch/switch.component';
import { SwitchEvent } from 'src/app/shared/components/switch/switch.event';
import { CreateDirective } from 'src/app/shared/directives/create.directive';
import { VariableDirective } from 'src/app/shared/directives/variable.directive';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { ScreenUtils } from '../../shared/utils/screen.utils';
import { GalleryTagEditorComponent } from '../dialogs/gallery-tag-editor/gallery-tag-editor.component';
import { GalleryTagGroupEditorComponent } from '../dialogs/gallery-tag-group-editor/gallery-tag-group-editor.component';
import { GroupSizeFilterEditor } from '../dialogs/group-size-filter-editor/group-size-filter-editor.component';
import { GalleryImage } from '../model/gallery-image.class';
import { TagGroup } from '../model/tag-group.interface';
import { Tag } from '../model/tag.interface';
import { GalleryStateService } from '../services/gallery-state.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    SwitchComponent,
    CreateDirective,
    VariableDirective,
    TippyDirective
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements AfterViewInit {

  private groupPreviews: { [key: string]: HTMLImageElement } = {};
  private sidebarGroupPreviewsLoaded: number = 0;

  private groupPreviewContainerOffsetLeft: number;
  private groupPreviewClickX: number;
  private tagListClickY: number;

  constructor(
    protected applicationService: ApplicationService,
    protected stateService: GalleryStateService,
    protected dialogService: DialogService
  ) {
    let previousTarget: GalleryImage;
    effect(beforeEffect => {
      beforeEffect(() => previousTarget = currentTarget);
      this.sidebarGroupPreviewsLoaded = 0;
      const currentTarget: GalleryImage = this.stateService.target();
      if (currentTarget?.group && previousTarget && currentTarget.group.images.includes(previousTarget)) this.moveTargetGroupPreviewIntoView(true);
    });
  }

  ngAfterViewInit(): void {
    this.setupTagListMouseDragEvents();
    this.setupGroupPreviewMouseDragEvents();
  }

  private setupTagListMouseDragEvents(): void {
    if (ScreenUtils.isLargeScreen()) {
      let tagListScrollTop: number;
      let tagListMouseDown: boolean;
      const container: HTMLElement = document.getElementsByClassName('taglist-scrollbar-container')[0] as HTMLElement;
      container.addEventListener('mousemove', event => {
        if (tagListMouseDown) {
          event.preventDefault();
          const y = event.pageY - container.offsetTop;
          const walkY = (y - this.tagListClickY) * 2;
          container.scrollTop = tagListScrollTop - walkY;
        }
      });
      window.addEventListener('mousedown', event => {
        tagListMouseDown = true;
        tagListScrollTop = container.scrollTop;
        this.tagListClickY = event.pageY - container.offsetTop;
      });
      window.addEventListener('mouseup', () => {
        tagListMouseDown = false;
      });
    }
  }

  private setupGroupPreviewMouseDragEvents(): void {
    if (ScreenUtils.isLargeScreen()) {
      let groupPreviewScrollLeft: number;
      let groupPreviewMouseDown: boolean;
      const container: HTMLElement = document.getElementsByClassName('sidebar-preview-group-scroll-container')[0] as HTMLElement;
      const removeMouseDownClass = () => {
        container.classList.remove('mouse-down');
        this.moveTargetGroupPreviewIntoView(true);
      }
      container.addEventListener('mouseleave', () => {
        if (!groupPreviewMouseDown) {
          removeMouseDownClass();
        }
      });
      const mouseMoveEventListener = (event: MouseEvent) => {
        event.preventDefault();
        const x = event.pageX + container.offsetLeft;
        const walkX = x - this.groupPreviewClickX;
        container.scrollLeft = groupPreviewScrollLeft - walkX;
      }
      container.addEventListener('mousedown', event => {
        groupPreviewMouseDown = true;
        container.classList.add('mouse-down');
        groupPreviewScrollLeft = container.scrollLeft;
        this.groupPreviewContainerOffsetLeft = container.offsetLeft;
        this.groupPreviewClickX = event.pageX + container.offsetLeft;
        window.addEventListener('mousemove', mouseMoveEventListener);
      });
      window.addEventListener('mouseup', event => {
        groupPreviewMouseDown = false;
        window.removeEventListener('mousemove', mouseMoveEventListener);
        if (!document.elementsFromPoint(event.x, event.y).includes(container)) {
          removeMouseDownClass();
        }
      });
    }
  }

  protected onGroupPreviewCreate(elementRef: ElementRef, image: GalleryImage): void {
    this.groupPreviews[image.id] = elementRef.nativeElement;
  }

  protected onGroupPreviewLoad(image: GalleryImage): void {
    this.sidebarGroupPreviewsLoaded++;
    if (this.sidebarGroupPreviewsLoaded == image.group.images.filter(groupImage => groupImage.passesFilter).length) {
      this.moveTargetGroupPreviewIntoView(false);
    }
  }

  private moveTargetGroupPreviewIntoView(smooth: boolean): void {
    const target: GalleryImage = this.stateService.target();
    if (target) {
      const imageElement: HTMLImageElement = this.groupPreviews[target.id];
      const containerElement: HTMLElement = document.getElementsByClassName('sidebar-preview-group-scroll-container')[0] as HTMLElement;
      if (imageElement && !containerElement.classList.contains('hovering') && !ScreenUtils.isElementVisible(imageElement, containerElement)) {
        const position: number = imageElement.offsetLeft - (containerElement.clientWidth - imageElement.clientWidth) / 2;
        // scrollIntoView is bugged on Chrome when scrolling multiple elements at once (masonry+sidebar)
        containerElement.scrollTo({ left: position, behavior: smooth ? 'smooth' : 'auto' });
      }
    }
  }

  protected isGroupPreviewContainerVisible(image: GalleryImage): boolean {
    return this.getGroupPreviewImages(image)?.length > 1;
  }

  protected getGroupPreviewImages(image: GalleryImage): GalleryImage[] {
    return image?.group?.images.filter(groupImage => groupImage.passesFilter);
  }

  protected openTagEditor(event?: MouseEvent, group?: TagGroup, tag?: Tag): void {
    if (!event || !this.tagListClickY || Math.abs(event.pageY - this.tagListClickY - 36) < ScreenUtils.MOUSE_MOVEMENT_TOLERANCE) {
      this.dialogService.create(GalleryTagEditorComponent, {
        group: group,
        tag: tag
      });
    }
  }

  protected openGroupEditor(event?: MouseEvent, group?: TagGroup): void {
    if (!event || !this.tagListClickY || Math.abs(event.pageY - this.tagListClickY - 36) < ScreenUtils.MOUSE_MOVEMENT_TOLERANCE) {
      this.dialogService.create(GalleryTagGroupEditorComponent, {
        group: group
      });
    }
  }

  protected openGroupSizeFilterDialog(): void {
    this.dialogService.create(GroupSizeFilterEditor).then(update => {
      if (update) {
        this.stateService.refreshFilter();
        this.stateService.updateData();
      }
    });
  }

  protected onFilterStateChange(filter: Tag | TagGroup, event: SwitchEvent): void {
    filter.state = event.state;
    this.stateService.refreshFilter();
    this.stateService.updateData();
  }

  protected onLikesStateChange(event: SwitchEvent): void {
    this.stateService.heartsFilter = event.state;
    this.stateService.refreshFilter();
    this.stateService.updateData();
  }

  protected onBookmarksStateChange(event: SwitchEvent): void {
    this.stateService.bookmarksFilter = event.state;
    this.stateService.refreshFilter();
    this.stateService.updateData();
  }

  protected onArchiveFilterStateChange(event: SwitchEvent): void {
    this.stateService.archiveFilter = event.state;
    this.stateService.refreshFilter();
    this.stateService.updateData();
  }

  protected onPreviewClick(): void {
    this.stateService.fullscreenVisible.set(true);
  }

  protected onGroupPreviewClick(event: MouseEvent, image: GalleryImage): void {
    if (Math.abs(event.pageX + this.groupPreviewContainerOffsetLeft - this.groupPreviewClickX) < ScreenUtils.MOUSE_MOVEMENT_TOLERANCE) {
      this.stateService.target.set(image);
    }
  }

  protected onGroupPreviewDoubleClick(event: MouseEvent, image: GalleryImage): void {
    if (Math.abs(event.pageX + this.groupPreviewContainerOffsetLeft - this.groupPreviewClickX) < ScreenUtils.MOUSE_MOVEMENT_TOLERANCE) {
      this.stateService.fullscreenVisible.set(true);
    }
  }

}
