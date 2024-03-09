import { SmartBehaviorSubject } from './smart-behavior-subject.class';

export class BooleanBehaviorSubject extends SmartBehaviorSubject<boolean> {

  constructor(initialValue?: boolean) {
    super(initialValue);
  }

  toggle(): void {
    this.next(!this.value);
  }

}