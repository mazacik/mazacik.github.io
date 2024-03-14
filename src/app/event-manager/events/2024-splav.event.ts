import { Event } from '../models/event.interface';
import { SurveyQuestion } from '../models/survey-question.interface';

export const splav2024: Event = {
  id: '2024-splav',
  title: 'Splav 2024',
  questions: ([{
    id: 'pocetdni',
    title: 'Na koľko dní pôjdeme?',
    type: 'radio',
    dontcare: true,
    choices: [{
      id: 'pocetdni3',
      text: '3 dni',
      description: 'Štvrtok večer výjazd, Piatok ráno štart, Nedeľa poobede domov.'
    }, {
      id: 'pocetdni4',
      text: '4 dni',
      description: 'Streda večer výjazd, Štvrtok ráno štart, Nedeľa poobede domov.'
    }]
  }, {
    id: 'termin',
    title: 'Ktoré víkendy môžeš ísť?',
    description: 'Fakt prosím čo najviac, potrebujeme sa na niektorom zhodnúť.',
    type: 'checkbox',
    choices: [{
      id: 'termin1',
      text: '15.-16. Jún',
      selected: true
    }, {
      id: 'termin2',
      text: '22.-23. Jún',
      selected: true
    }, {
      id: 'termin3',
      text: '29.-30. Jún',
      selected: true
    }, {
      id: 'termin4',
      text: '06.-07. Júl',
      selected: true
    }, {
      id: 'termin5',
      text: '13.-14. Júl',
      description: 'Pohoda',
      selected: true
    }, {
      id: 'termin6',
      text: '20.-21. Júl',
      selected: true
    }, {
      id: 'termin7',
      text: '27.-28. Júl',
      selected: true
    }, {
      id: 'termin8',
      text: '03.-04. Aug',
      selected: true
    }, {
      id: 'termin9',
      text: '10.-11. Aug',
      description: 'Grape',
      selected: true
    }, {
      id: 'termin10',
      text: '17.-18. Aug',
      description: 'Lovestream',
      selected: true
    }]
  }] as SurveyQuestion[]).map(poll => {
    if (poll.dontcare) poll.choices.push({ id: 'dontcare', text: 'Je mi to jedno', selected: !poll.choices.some(choice => choice.selected) });
    return poll;
  })
}