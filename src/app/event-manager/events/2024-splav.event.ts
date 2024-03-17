import { Event } from '../models/event.interface';
import { SurveyQuestion } from '../models/survey-question.interface';

export const splav2024: Event = {
  id: '2024-splav',
  title: 'Splav 2024',
  questions: ([{
    id: 'termin',
    active: true,
    title: 'Ktoré víkendy môžeš?',
    description: 'Fakt vyber prosím čo najviac, aby sme sa mali šancu zhodnúť. Nie že kedy sa ti chce.',
    type: 'checkbox',
    choices: [{
      id: 'termin1',
      text: '15. - 16. Jún',
      description: 'Rock for People',
      selected: true
    }, {
      id: 'termin2',
      text: '22. - 23. Jún',
      selected: true
    }, {
      id: 'termin3',
      text: '29. - 30. Jún',
      selected: true
    }, {
      id: 'termin4',
      text: '06. - 07. Júl',
      selected: true
    }, {
      id: 'termin5',
      text: '13. - 14. Júl',
      description: 'Pohoda',
      selected: true
    }, {
      id: 'termin6',
      text: '20. - 21. Júl',
      description: 'Colours of Ostrava',
      selected: true
    }, {
      id: 'termin7',
      text: '27. - 28. Júl',
      selected: true
    }, {
      id: 'termin8',
      text: '03. - 04. Aug',
      selected: true
    }, {
      id: 'termin9',
      text: '10. - 11. Aug',
      description: 'Grape, Sziget',
      selected: true
    }, {
      id: 'termin10',
      text: '17. - 18. Aug',
      description: 'Lovestream',
      selected: true
    }]
  }, {
    id: 'nocivkempoch',
    active: true,
    title: 'Koľko nocí chceš byť v kempoch?',
    description: 'Chodíme iba raz za rok a 3 noci sú viac srandy ako 2. Ten posledný deň však býva dosť náročný.',
    type: 'radio',
    dontcare: 'true',
    choices: [{
      id: '3noci',
      text: '3 noci',
      description: 'Streda večer prídeme na ubytovňu, Štvrtok ráno štart, Nedeľa večer doma.'
    }, {
      id: '2noci',
      text: '2 noci',
      description: 'Štvrtok večer prídeme na ubytovňu, Piatok ráno štart, Nedeľa večer doma.'
    }]
  }, {
    id: 'splavovatajposlednyden',
    active: true,
    title: 'Chceš aj v Nedeľu ešte splavovať?',
    description: 'Posledný deň býva dosť náročný.',
    type: 'radio',
    dontcare: 'true',
    choices: [{
      id: 'ano',
      text: 'Áno',
      description: 'Jasné, pohodička.'
    }, {
      id: 'nie',
      text: 'Nie',
      description: 'Posledný deň si chcem sadnúť do auta a ísť domov.'
    }]
  }] as SurveyQuestion[]).map(poll => {
    if (poll.dontcare) poll.choices.push({ id: 'dontcare', text: 'Je mi to jedno', selected: !poll.choices.some(choice => choice.selected) });
    return poll;
  })
}