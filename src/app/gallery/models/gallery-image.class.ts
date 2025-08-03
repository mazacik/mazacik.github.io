import { GoogleMetadata } from "src/app/shared/classes/google-api/google-metadata.class";
import { GalleryGroup } from "./gallery-group.class";
import { Tag } from "./tag.class";

export class GalleryImage extends GoogleMetadata {

  public heart: boolean;
  public bookmark: boolean;
  public tags: Tag[];

  // transient
  public aspectRatio: number;
  public contentLink: string;
  public group: GalleryGroup;
  public passesFilter: boolean;
  public parentFolderId: string;

  public masonryTop: number;
  public masonryLeft: number;
  public masonryWidth: number;
  public masonryHeight: number;

}
