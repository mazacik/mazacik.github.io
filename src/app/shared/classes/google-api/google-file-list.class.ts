import { GoogleMetadata } from "./google-metadata.class";

// Google API response, don't change
export class GoogleFileList {

  files: GoogleMetadata[];
  incompleteSearch: boolean;
  kind: 'drive#file' | 'drive#fileList';

}
