import { DecimalPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { GalleryImage } from 'src/app/gallery/models/gallery-image.class';
import { ImageComponent } from 'src/app/shared/components/image/image.component';
import { DialogService } from 'src/app/shared/services/dialog.service';
import { GoogleFileUtils } from 'src/app/shared/utils/google-file.utils';
import { ComparisonPathComponent } from '../comparison-path/comparison-path.component';
import { FilterService } from '../../services/filter.service';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GalleryUtils } from '../../../shared/utils/gallery.utils';

@Component({
  selector: 'app-image-tournament',
  imports: [ImageComponent, DecimalPipe],
  templateUrl: './image-tournament.component.html',
  styleUrls: ['./image-tournament.component.scss']
})
export class ImageTournamentComponent implements OnInit {
  protected readonly galleryUtils = GalleryUtils;

  protected progressBarVisible: boolean = true;
  protected comparison: [GalleryImage, GalleryImage] = null;
  protected winnersLeft: GalleryImage[] = [];
  protected losersLeft: GalleryImage[] = [];
  protected winnersRight: GalleryImage[] = [];
  protected losersRight: GalleryImage[] = [];
  protected ranking: GalleryImage[] = [];

  constructor(
    private filterService: FilterService,
    private serializationService: GallerySerializationService,
    private dialogService: DialogService,
    protected stateService: GalleryStateService
  ) { }

  ngOnInit(): void {
    const images = this.stateService.images.filter(image => GoogleFileUtils.isImage(image));
    const imagesToCompare = this.filterService.images().filter(image => GoogleFileUtils.isImage(image));
    this.stateService.tournament.start(images, imagesToCompare, this.stateService.tournamentState);
    this.refreshComparisonRelations();
  }

  protected onImageClick(winner: GalleryImage): void {
    this.stateService.tournament.handleUserInput(winner);
    this.stateService.tournamentState = this.stateService.tournament.getState();
    this.serializationService.save();
    this.refreshComparisonRelations();
  }

  public undo(): void {
    this.stateService.tournament.undo();
    this.stateService.tournamentState = this.stateService.tournament.getState();
    this.serializationService.save();
    this.refreshComparisonRelations();
  }

  public skip(): void {
    this.stateService.tournament.skip();
    this.refreshComparisonRelations();
  }

  public toggleProgressBar(): void {
    this.progressBarVisible = !this.progressBarVisible;
    this.refreshComparisonRelations();
  }

  protected openComparisonPath(start: GalleryImage, end: GalleryImage): void {
    if (!start || !end) return;
    const dialogResult = this.dialogService.create(ComparisonPathComponent, { start, end });
    if (dialogResult) {
      dialogResult.then(changed => {
        if (changed) {
          this.refreshComparisonRelations();
        }
      });
    }
  }

  private refreshComparisonRelations(): void {
    this.stateService.tournament.updateProgress();
    this.comparison = this.stateService.tournament?.comparison ?? null;
    if (this.comparison) {
      if (this.progressBarVisible) {
        this.winnersLeft = this.stateService.tournament.getNearestWinners(this.comparison[0]);
        this.losersLeft = this.stateService.tournament.getNearestLosers(this.comparison[0]);
        this.winnersRight = this.stateService.tournament.getNearestWinners(this.comparison[1]);
        this.losersRight = this.stateService.tournament.getNearestLosers(this.comparison[1]);
      } else {
        this.winnersLeft = [];
        this.losersLeft = [];
        this.winnersRight = [];
        this.losersRight = [];
      }
      this.ranking = [];
    } else {
      this.winnersLeft = [];
      this.losersLeft = [];
      this.winnersRight = [];
      this.losersRight = [];
      this.ranking = this.stateService.tournament?.getRanking?.() ?? [];
    }
  }

}
