import { SurveyQuestion } from "../models/survey-question.interface";

export const survey: SurveyQuestion[] = ([{
  id: 'kedy',
  title: 'Ktoré dátumy ti vyhovujú?',
  description: 'Vyber všetky možnosti.',
  type: 'checkbox',
  dontcare: true,
  options: [{
    id: 'kedy1',
    text: 'Dátum 1'
  }, {
    id: 'kedy2',
    text: 'Dátum 2'
  }, {
    id: 'kedy3',
    text: 'Dátum 3'
  }]
}, {
  id: 'kempy',
  title: 'Ktoré kempy preferuješ?',
  description: 'Ak chceš byť v kempoch 2 noci, vyber 2 kempy.',
  type: 'checkbox',
  dontcare: true,
  options: [{
    id: 'kemp1',
    text: 'Kemp 1'
  }, {
    id: 'kemp2',
    text: 'Kemp 2'
  }, {
    id: 'kemp3',
    text: 'Kemp 3'
  }, {
    id: 'kemp4',
    text: 'Kemp 4'
  }]
}, {
  id: 'ubytovna',
  title: 'Kde prespíme noc pred splavom?',
  description: 'Začíname splavovať ráno, cesta trvá asi 4 hodiny.',
  type: 'radio',
  dontcare: true,
  options: [{
    id: 'ubytovna1',
    text: 'Ubytovňa 1'
  }, {
    id: 'ubytovna2',
    text: 'Ubytovňa 2'
  }, {
    id: 'ubytovna3',
    text: 'Ubytovňa 3'
  }, {
    id: 'ubytovna4',
    text: 'Ubytovňa 4'
  }, {
    id: 'ubytovna5',
    text: 'Ubytovňa 5'
  }]
}] as SurveyQuestion[]).map(poll => {
  if (poll.dontcare) poll.options.push({ id: 'dontcare', text: 'Je mi to jedno', selected: true });
  return poll;
});