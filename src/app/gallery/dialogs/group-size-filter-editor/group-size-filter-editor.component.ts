import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-group-size-filter-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './group-size-filter-editor.component.html',
  styleUrls: ['./group-size-filter-editor.component.scss'],
})
export class GroupSizeFilterEditor extends DialogContent<boolean> implements OnInit {

  min: number;
  max: number;

  public configuration: DialogConfiguration = {
    title: 'Group Size Filter Editor',
    buttons: [{
      text: () => 'Submit',
      disabled: () => !this.canSubmit(),
      click: () => this.submit()
    }, {
      text: () => 'Close',
      click: () => this.close()
    }]
  };

  constructor(
    private stateService: GalleryStateService
  ) {
    super();
  }

  ngOnInit(): void {
    this.min = this.stateService.groupSizeFilterMin;
    this.max = this.stateService.groupSizeFilterMax;
  }

  canSubmit(): boolean {
    return this.min != null && this.max != null && this.min <= this.max;
  }

  @HostListener('window:keydown.enter', ['$event'])
  submit(): void {
    if (this.canSubmit()) {
      this.stateService.groupSizeFilterMin = this.min;
      this.stateService.groupSizeFilterMax = this.max;
      this.resolve(true);
    }
  }

  public close(): void {
    this.resolve(false);
  }

}
