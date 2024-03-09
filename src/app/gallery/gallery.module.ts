import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { FolderPickerComponent } from './folder-picker/folder-picker.component';
import { GalleryTagEditorComponent } from './dialogs/gallery-tag-editor/gallery-tag-editor.component';
import { GalleryTagGroupEditorComponent } from './dialogs/gallery-tag-group-editor/gallery-tag-group-editor.component';
import { GroupSizeFilterEditor } from './dialogs/group-size-filter-editor/group-size-filter-editor.component';
import { ImageComparisonComponent } from './dialogs/image-comparison/image-comparison.component';
import { FullscreenComponent } from './fullscreen/fullscreen.component';
import { GalleryComponent } from './gallery.component';
import { MasonryComponent } from './masonry/masonry.component';
import { SidebarComponent } from './sidebar/sidebar.component';

@NgModule({
  declarations: [
    FolderPickerComponent,

    GroupSizeFilterEditor,
    ImageComparisonComponent,
    GalleryTagEditorComponent,
    GalleryTagGroupEditorComponent,

    MasonryComponent,
    SidebarComponent,
    GalleryComponent,
    FullscreenComponent
  ],
  imports: [
    CommonModule,
    SharedModule
  ],
  exports: [

  ],
  providers: [

  ]
})
export class GalleryModule { }
