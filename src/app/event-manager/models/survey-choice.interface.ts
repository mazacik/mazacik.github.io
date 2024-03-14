export interface SurveyChoice {
  id: string;
  text: string;
  description?: string;
  hyperlink?: string;
  disabled?: boolean;
  selected?: boolean;
}