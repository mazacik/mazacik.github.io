import { Injectable } from "@angular/core";
import { ArrayUtils } from "src/app/shared/utils/array.utils";
import { Note } from "../../models/components/note.interface";

@Injectable({
  providedIn: 'root',
})
export class NotesService {

  public focusNote: Note;
  public readonly openNotes: Note[] = [];

  public openNote(note: Note, newTab: boolean): void {
    if (newTab || this.openNotes.length == 0) {
      ArrayUtils.push(this.openNotes, note);
    } else {
      this.openNotes[this.openNotes.indexOf(this.focusNote)] = note;
    }

    this.focusNote = note;
  }

  public closeNote(note: Note): void {
    if (note == this.focusNote) {
      this.focusNote = ArrayUtils.nearestRightFirst(this.openNotes, this.openNotes.indexOf(note));
    }

    ArrayUtils.remove(this.openNotes, note);
  }

}
