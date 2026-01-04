export class Filter {

  state: number;

  get colorClass(): string {
    switch (this.state) {
      case 1:
        return 'positive';
      case -1:
        return 'negative';
      default:
        return '';
    }
  }

  constructor(state: number = 0) {
    this.state = state;
  }

}
