export interface SurveyResult {
  userId: string;
  userDisplayName: string;
  submitDate: string;
  choices: { [key: string]: string[] };
}