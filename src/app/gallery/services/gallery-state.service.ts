import { Injectable, WritableSignal, signal } from "@angular/core";
import { GalleryGroup } from "src/app/gallery/models/gallery-group.class";
import { GalleryImage } from "src/app/gallery/models/gallery-image.class";
import { Tournament, TournamentState } from "src/app/shared/classes/tournament.class";
import { ScreenUtils } from "src/app/shared/utils/screen.utils";
import { GallerySettings } from "../models/gallery-settings.interface";

export type GalleryViewMode = 'masonry' | 'tournament';

@Injectable({
  providedIn: 'root',
})
export class GalleryStateService {

  public dataFolderId: string;
  public archiveFolderId: string;

  public settings: GallerySettings;
  public viewMode: GalleryViewMode = 'masonry';

  public readonly images: GalleryImage[] = [];
  public readonly imageGroups: GalleryGroup[] = [];

  public readonly fullscreenImage: WritableSignal<GalleryImage> = signal(null);

  public filterVisible: boolean = ScreenUtils.isLargeScreen();
  public taggerVisible: boolean = ScreenUtils.isLargeScreen();

  public groupEditorGroup: GalleryGroup;

  public tournament: Tournament = new Tournament();
  public tournamentState: TournamentState;

  constructor() { }

}
