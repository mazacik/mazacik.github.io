import { Note } from "./note.interface";

export interface Story {

  title: string;
  notes: Note[];
  noteTags: string[];

}
