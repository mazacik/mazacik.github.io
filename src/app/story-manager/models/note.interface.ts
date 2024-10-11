import { Story } from "./story.interface";

export interface Note {

  title: string;
  text: string;
  tags: string[];

  // transient
  parent: Story;
  wordCount: number;

}
