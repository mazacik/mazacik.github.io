import { Injectable } from "@angular/core";
import { ArrayUtils } from "src/app/shared/utils/array.utils";
import { StringUtils } from "src/app/shared/utils/string.utils";
import { Data } from "../models/data.interface";
import { Note } from "../models/note.interface";
import { Story } from "../models/story.interface";
import { StoryStatus } from "../models/story-status.enum";

@Injectable({
  providedIn: 'root',
})
export class StoryManagerStateService {

  public stories: Story[];

  public currentStory: Story;

  constructor() { }

  public initialize(data: Data): void {
    if (data && !ArrayUtils.isEmpty(data.stories)) {
      this.stories = data.stories;

      for (const story of this.stories) {
        for (const note of story.notes) {
          note.wordCount = StringUtils.getWordCount(note.text);
        }
      }
    }

    if (!this.stories) this.stories = [];
  }

  public serialize(): Data {
    return {
      stories: this.stories.map(story => {
        return {
          title: story.title,
          status: story.status,
          notes: story.notes.map(note => {
            return {
              title: note.title,
              text: note.text,
              tags: note.tags
            } as Note;
          }),
          noteTags: story.noteTags
        }
      })
    } as Data;
  }

}
