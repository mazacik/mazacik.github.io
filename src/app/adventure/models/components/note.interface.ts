import { Scenario } from "./scenario.interface";

export interface Note {

  title: string;
  text: string;
  wordCount: number;

  parentScenario: Scenario;

}
