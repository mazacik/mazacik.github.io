export abstract class GoogleMetadata {

  public id: string;
  public name: string
  public mimeType: string;

  public thumbnailLink?: string;
  public imageMediaMetadata?: { width?: number, height?: number };
  public videoMediaMetadata?: { width?: number, height?: number, durationMillis?: string };

}
