import { Poll } from "../models/poll.interface";

export const polls: Poll[] = [{
  id: 'kedy',
  title: 'Ktoré dátumy ti vyhovujú?',
  description: 'Vyber všetky možnosti.',
  type: 'checkbox',
  dontcare: true,
  options: [{ text: '1' }, { text: '2' }, { text: '3' }]
}, {
  id: 'kempy',
  title: 'Ktoré kempy preferuješ?',
  description: 'Ak chceš byť v kempoch 2 noci, vyber 2 kempy.',
  type: 'checkbox',
  dontcare: true,
  options: [{ text: 'Kemp 1' }, { text: 'Kemp 2' }, { text: 'Kemp 3' }, { text: 'Kemp 4' }]
}, {
  id: 'ubytovna',
  title: 'Kde prespíme noc pred splavom?',
  description: 'Začíname splavovať ráno, cesta trvá asi 4 hodiny.',
  type: 'radio',
  dontcare: true,
  options: [{ text: 'Ubytovňa 1' }, { text: 'Ubytovňa 2' }, { text: 'Ubytovňa 3' }, { text: 'Ubytovňa 4' }, { text: 'Ubytovňa 5' }]
}];