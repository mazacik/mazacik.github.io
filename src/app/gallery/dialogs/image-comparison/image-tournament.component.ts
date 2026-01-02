import { DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { Tournament } from 'src/app/shared/classes/tournament.class';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { ApplicationService } from 'src/app/shared/services/application.service';
import { GoogleFileUtils } from 'src/app/shared/utils/google-file.utils';
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

  protected tournament: Tournament = new Tournament();
  protected progressBarVisible: boolean = true;

  constructor(
    private filterService: FilterService,
    private stateService: GalleryStateService,
    private applicationService: ApplicationService,
    private serializationService: GallerySerializationService
  ) { }

  ngOnInit(): void {
    this.configureHeader();
    const images = this.stateService.images.filter(image => GoogleFileUtils.isImage(image));
    const imagesToCompare = this.filterService.images().filter(image => GoogleFileUtils.isImage(image));
    this.tournament.start(images, imagesToCompare, this.stateService.tournamentState);
  }

  ngOnDestroy(): void {
    this.applicationService.removeHeaderButtons('start', ['comparison-undo', 'comparison-skip', 'comparison-progress-bar']);
  }

  private configureHeader(): void {
    this.applicationService.addHeaderButtons('start', [{
      id: 'comparison-undo',
      tooltip: 'Undo Comparison',
      classes: ['fa-solid', 'fa-delete-left'],
      hidden: () => this.stateService.viewMode !== 'tournament',
      onClick: () => this.undo(),
      disabled: () => !this.tournament || this.tournament.comparisons.length == 0
    }, {
      id: 'comparison-skip',
      tooltip: 'Skip Comparison',
      classes: ['fa-solid', 'fa-forward'],
      hidden: () => this.stateService.viewMode !== 'tournament',
      onClick: () => this.tournament.skip()
    }, {
      id: 'comparison-progress-bar',
      tooltip: 'Toggle Comparison Progress Bar',
      classes: ['fa-solid', 'fa-list-check'],
      hidden: () => this.stateService.viewMode !== 'tournament',
      onClick: () => this.progressBarVisible = !this.progressBarVisible
    }]);
  }

  protected onImageClick(winner: GalleryImage): void {
    this.tournament.handleUserInput(winner);
    this.stateService.tournamentState = this.tournament.getState();
    this.serializationService.save();
  }

  protected undo(): void {
    this.tournament.undo();
    this.stateService.tournamentState = this.tournament.getState();
    this.serializationService.save();
  }

}
