import { SurveyQuestion } from "./survey-question.interface";

export interface Event {
  id: string;
  title: string;
  questions: SurveyQuestion[];
}