import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Character } from 'src/app/adventure/models/components/character.interface';
import { DialogueLine } from 'src/app/adventure/models/components/dialogue-line.interface';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { AdventureEditorService } from '../../../services/adventure-editor.service';
import { AdventureStateService } from '../../../services/adventure-state.service';
import { AdventureFactory } from '../../../utils/adventure.factory';

@Component({
  selector: 'app-dialogue-line-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './dialogue-line-editor.component.html',
  styleUrls: ['./dialogue-line-editor.component.scss']
})
export class DialogueLineEditorComponent extends DialogContent<DialogueLine> implements OnInit {

  @Input() sourceLine: DialogueLine;

  editableLine: DialogueLine;

  configuration: DialogConfiguration = {
    title: 'Dialogue Line Editor',
    buttons: [{
      text: () => 'Done',
      disable: () => !this.canSubmit(),
      click: () => this.submit()
    }, {
      text: () => 'Cancel',
      click: () => this.close()
    }]
  }

  constructor(
    private editorService: AdventureEditorService,
    protected stateService: AdventureStateService
  ) {
    super();
  }

  ngOnInit(): void {
    this.editableLine = AdventureFactory.createDialogueLine();
    if (this.sourceLine) {
      this.editableLine.characterId = this.sourceLine.characterId;
      this.editableLine.text = this.sourceLine.text;
    }
  }

  openCharacterEditor(): void {
    this.editorService.openCharacterEditor(AdventureFactory.createCharacter(), this.stateService.currentScenario);
  }

  getCharacters(): Character[] {
    return this.stateService.currentScenario.characters;
  }

  canSubmit(): boolean {
    if (StringUtils.isEmpty(this.editableLine.characterId)) return false;
    if (StringUtils.isEmpty(this.editableLine.text)) return false;

    return true;
  }

  submit(): void {
    if (this.canSubmit()) {
      this.sourceLine.characterId = this.editableLine.characterId;
      this.sourceLine.text = this.editableLine.text;
      this.resolve(this.sourceLine);
    }
  }

  public close(): void {
    this.resolve(null);
  }

}
