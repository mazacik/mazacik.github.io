import { SurveyChoice } from "./survey-choice.interface";

export interface SurveyQuestion {
  id: string;
  active: boolean;
  title: string;
  description: string;
  type: 'checkbox' | 'radio',
  dontcare: boolean;
  choices?: SurveyChoice[];
}