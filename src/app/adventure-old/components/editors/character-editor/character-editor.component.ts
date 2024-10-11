import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Character } from 'src/app/adventure/models/components/character.interface';
import { DialogConfiguration } from 'src/app/shared/components/dialog/dialog-configuration.class';
import { DialogContent } from 'src/app/shared/components/dialog/dialog-content.class';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { AdventureFactory } from '../../../utils/adventure.factory';

@Component({
  selector: 'app-character-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './character-editor.component.html',
  styleUrls: ['./character-editor.component.scss']
})
export class CharacterEditorComponent extends DialogContent<Character> implements OnInit {

  @Input() sourceCharacter: Character;

  editableCharacter: Character;

  configuration: DialogConfiguration = {
    title: 'Character Editor',
    buttons: [{
      text: () => 'Done',
      disabled: () => !this.canSubmit(),
      click: () => this.submit()
    }, {
      text: () => 'Cancel',
      click: () => this.close()
    }]
  }

  constructor() {
    super();
  }

  ngOnInit(): void {
    this.editableCharacter = AdventureFactory.createCharacter();
    if (this.sourceCharacter) {
      this.editableCharacter.id = this.sourceCharacter.id;
      this.editableCharacter.name = this.sourceCharacter.name;
      this.editableCharacter.color = this.sourceCharacter.color;
    }
  }

  canSubmit(): boolean {
    if (StringUtils.isEmpty(this.editableCharacter.id)) return false;
    if (StringUtils.isEmpty(this.editableCharacter.name)) return false;
    if (StringUtils.isEmpty(this.editableCharacter.color)) return false;

    return true;
  }

  submit(): void {
    if (this.canSubmit()) {
      this.sourceCharacter.id = this.editableCharacter.id;
      this.sourceCharacter.name = this.editableCharacter.name;
      this.sourceCharacter.color = this.editableCharacter.color;

      this.resolve(this.sourceCharacter);
    }
  }

  public close(): void {
    this.resolve(null);
  }

}
