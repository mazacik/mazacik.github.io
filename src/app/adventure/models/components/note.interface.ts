import { Scenario } from "./scenario.interface";

export interface Note {

  label: string;
  text: string;
  wordCount: number;

  parentScenario: Scenario;

}
