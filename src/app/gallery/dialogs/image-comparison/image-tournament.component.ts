import { DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { GoogleFileUtils } from 'src/app/shared/utils/google-file.utils';
import { ComparisonPathComponent } from '../comparison-path/comparison-path.component';
import { FilterService } from '../../services/filter.service';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';

@Component({
  selector: 'app-image-tournament',
  imports: [ImageComponent, DecimalPipe],
  templateUrl: './image-tournament.component.html',
  styleUrls: ['./image-tournament.component.scss']
})
export class ImageTournamentComponent implements OnInit, OnDestroy {

  protected progressBarVisible: boolean = true;

  constructor(
    private filterService: FilterService,
    private applicationService: ApplicationService,
    private serializationService: GallerySerializationService,
    private dialogService: DialogService,
    protected stateService: GalleryStateService
  ) { }

  ngOnInit(): void {
    this.configureHeader();
    const images = this.stateService.images.filter(image => GoogleFileUtils.isImage(image));
    const imagesToCompare = this.filterService.images().filter(image => GoogleFileUtils.isImage(image));
    this.stateService.tournament.start(images, imagesToCompare, this.stateService.tournamentState);
  }

  ngOnDestroy(): void {
    this.applicationService.removeHeaderButtons('center', ['comparison-undo', 'comparison-skip', 'comparison-progress-bar']);
  }

  private configureHeader(): void {
    this.applicationService.addHeaderButtons('center', [{
      id: 'comparison-undo',
      tooltip: 'Undo Comparison',
      classes: ['fa-solid', 'fa-delete-left'],
      hidden: () => this.stateService.viewMode !== 'tournament',
      onClick: () => this.undo(),
      disabled: () => !this.stateService.tournament || this.stateService.tournament.comparisons.length == 0
    }, {
      id: 'comparison-skip',
      tooltip: 'Skip Comparison',
      classes: ['fa-solid', 'fa-forward'],
      hidden: () => this.stateService.viewMode !== 'tournament',
      onClick: () => this.stateService.tournament.skip()
    }, {
      id: 'comparison-progress-bar',
      tooltip: 'Toggle Comparison Progress Bar',
      classes: ['fa-solid', 'fa-list-check'],
      hidden: () => this.stateService.viewMode !== 'tournament',
      onClick: () => this.progressBarVisible = !this.progressBarVisible
    }]);
  }

  protected onImageClick(winner: GalleryImage): void {
    this.stateService.tournament.handleUserInput(winner);
    this.stateService.tournamentState = this.stateService.tournament.getState();
    this.serializationService.save();
  }

  protected undo(): void {
    this.stateService.tournament.undo();
    this.stateService.tournamentState = this.stateService.tournament.getState();
    this.serializationService.save();
  }

  protected openComparisonPath(start: GalleryImage, end: GalleryImage): void {
    if (!start || !end) return;
    this.dialogService.create(ComparisonPathComponent, { start, end });
  }

}
