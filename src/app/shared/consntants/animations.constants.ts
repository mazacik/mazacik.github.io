import { animate, state, style, transition, trigger } from "@angular/animations";

const ANIMATION_DURATION: number = 1000;
const ANIMATION_TIMINGS: string = ANIMATION_DURATION + 'ms ease';

export const skip = trigger('skip', [
  transition(':enter', [])
])

export const fade = trigger('fade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate(ANIMATION_TIMINGS, style({ opacity: 1 }))
  ]),
  transition(':leave', [
    style({ opacity: 1 }),
    animate(ANIMATION_TIMINGS, style({ opacity: 0 }))
  ])
]);

export const enter = trigger('enter', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate(ANIMATION_TIMINGS, style({ opacity: 1 }))
  ])
]);

export const leave = trigger('leave', [
  transition(':leave', [
    style({ opacity: 1 }),
    animate(ANIMATION_TIMINGS, style({ opacity: 0 }))
  ])
]);

export const hidden = trigger('hidden', [
  transition('* => true', [
    style({ opacity: '*' }),
    animate(ANIMATION_TIMINGS, style({ opacity: 0 }))
  ]),
  transition('true => *', [
    style({ opacity: 0 }),
    animate(ANIMATION_TIMINGS, style({ opacity: '*' }))
  ])
]);

export const drawer = trigger('drawer', [
  transition(':enter', [
    style({ height: 0, opacity: 0 }),
    animate(ANIMATION_TIMINGS, style({ height: '*', opacity: '*' }))
  ]),
  transition(':leave', [
    style({ height: '*', opacity: '*' }),
    animate(ANIMATION_TIMINGS, style({ height: 0, opacity: 0 }))
  ])
]);