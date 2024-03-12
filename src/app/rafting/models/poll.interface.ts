import { PollOption } from "./poll-option.interface";

export interface Poll {
  id: string;
  title: string;
  description: string;
  type: 'checkbox' | 'radio',
  dontcare: boolean;
  options: PollOption[];
}