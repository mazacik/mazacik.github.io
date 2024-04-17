import { GoogleMetadata } from "src/app/shared/classes/google-api/google-metadata.class";
import { GalleryGroup } from "./gallery-group.class";

export class GalleryImage extends GoogleMetadata {

  public heart: boolean;
  public bookmark: boolean;
  public tags: string[];
  public likes: number;

  public top: number;
  public left: number;
  public width: number;
  public height: number;
  public aspectRatio: number;
  public contentLink: string;

  public group: GalleryGroup;

  public hasGroup(): boolean {
    return this.group?.images.length > 1;
  }

  public getGroupImages(): GalleryImage[] {
    return this.group?.images;
  }

}
