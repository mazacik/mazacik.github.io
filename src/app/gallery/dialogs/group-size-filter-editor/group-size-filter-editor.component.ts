import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogContainerConfiguration } from 'src/app/shared/components/dialog/dialog-container-configuration.interface';
import { DialogContentBase } from 'src/app/shared/components/dialog/dialog-content-base.class';
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
export class GroupSizeFilterEditor extends DialogContentBase<boolean> implements OnInit {

  min: number;
  max: number;

  public configuration: DialogContainerConfiguration = {
    title: 'Group Size Filter Editor',
    buttons: [{
      text: () => 'Close',
      click: () => this.close()
    }, {
      text: () => 'Submit',
      disabled: () => !this.canSubmit(),
      click: () => this.submit()
    }]
  };

  constructor(
    private stateService: GalleryStateService
  ) {
    super();
  }

  ngOnInit(): void {
    this.min = this.stateService.filterGroupSizeMin;
    this.max = this.stateService.filterGroupSizeMax;
  }

  canSubmit(): boolean {
    return this.min != null && this.max != null && this.min <= this.max;
  }

  public override submit(): void {
    if (this.canSubmit()) {
      this.stateService.filterGroupSizeMin = this.min;
      this.stateService.filterGroupSizeMax = this.max;
      this.resolve(true);
    }
  }

  public close(): void {
    this.resolve(false);
  }

}
