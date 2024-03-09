import { BehaviorSubject, PartialObserver, Subscription } from 'rxjs';
import { skip } from 'rxjs/operators';

export class SmartBehaviorSubject<T> extends BehaviorSubject<T | null> {

  constructor(initialValue?: T | null) {
    super(initialValue);
  }

  next(value: T): void {
    if (value !== this.value) super.next(value);
  }

  subscribe(observer?: PartialObserver<T>): Subscription;
  subscribe(next?: ((value: T) => void) | null, error?: ((error: any) => void) | null, complete?: (() => void) | null): Subscription;
  subscribe(nextOrObserver?: ((value: T) => void) | PartialObserver<T> | null, error?: ((error: any) => void) | null, complete?: (() => void) | null): Subscription {
    if (typeof nextOrObserver === 'function') {
      return super.pipe(skip(1)).subscribe(nextOrObserver, error, complete);
    } else {
      return super.subscribe(nextOrObserver);
    }
  }

}