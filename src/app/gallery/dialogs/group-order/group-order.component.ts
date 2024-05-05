import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnInit } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/model/gallery-image.class';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';
import { DragDropDirective } from 'src/app/shared/directives/dragdrop.directive';

@Component({
  selector: 'app-group-order',
  standalone: true,
  imports: [
    CommonModule,
    DragDropDirective
  ],
  templateUrl: './group-order.component.html',
  styleUrls: ['./group-order.component.scss']
})
export class GroupOrderComponent extends DialogContent<GalleryImage[]> implements OnInit {

  @Input() images: GalleryImage[];

  configuration: DialogConfiguration = {
    title: 'Group Order',
    buttons: [{
      text: () => 'Save',
      click: () => this.submit()
    }, {
      text: () => 'Close',
      click: () => this.close()
    }]
  }

  ngOnInit(): void {
    
  }

  @HostListener('window:keydown.enter', ['$event'])
  submit(): void {
    this.resolve(this.images);
  }

  @HostListener('window:keydown.escape', ['$event'])
  public close(): void {
    this.resolve(null);
  }

}
