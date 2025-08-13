import { Note } from "./note.interface";
import { StoryStatus } from "./story-status.enum";

export interface Story {

  title: string;
  status?: StoryStatus;
  tags: string[];
  notes: Note[];
  currentNote?: Note;

}
