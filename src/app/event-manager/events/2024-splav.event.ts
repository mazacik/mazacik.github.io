import { Event } from '../models/event.interface';
import { SurveyQuestion } from '../models/survey-question.interface';

export const splav2024: Event = {
  id: '2024-splav',
  title: 'Splav 2024',
  questions: ([{
    id: 'pocetdni',
    title: 'Na ako dlho chceš ísť?',
    description: 'Chodíme iba raz za rok a 3 noci sú viac srandy ako 2. Ten posledný deň však býva dosť náročný.',
    type: 'radio',
    dontcare: 'true',
    choices: [{
      id: 'pocetdni4',
      text: '3 noci',
      description: 'Streda večer prídeme, Štvrtok ráno štart, Nedeľa večer doma.'
    }, {
      id: 'pocetdni4aleposlednydennesplavovat',
      text: '3 noci',
      description: '...ale v Nedeľu už nesplavovať, ráno hneď domov.'
    }, {
      id: 'pocetdni3',
      text: '2 noci',
      description: 'Štvrtok večer prídeme, Piatok ráno štart, Nedeľa večer doma.'
    }]
  }, {
    id: 'termin',
    title: 'Ktoré víkendy môžeš ísť?',
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
  }] as SurveyQuestion[]).map(poll => {
    if (poll.dontcare) poll.choices.push({ id: 'dontcare', text: 'Je mi to jedno', selected: !poll.choices.some(choice => choice.selected) });
    return poll;
  })
}