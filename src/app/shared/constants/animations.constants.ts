import { animate, state, style, transition, trigger } from "@angular/animations";

export const ANIMATION_DURATION: number = 500;
export const ANIMATION_TIMINGS: string = ANIMATION_DURATION + 'ms ease';

export const skip = trigger('skip', [
  transition(':enter', [])
])

export const fade = trigger('fade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate(ANIMATION_TIMINGS, style({ opacity: 1 }))
  ]),
  transition(':leave', [
    style({ opacity: 1, 'pointer-events': 'none' }),
    animate(ANIMATION_TIMINGS, style({ opacity: 0 }))
  ])
]);

export const scalefade = trigger('scalefade', [
  transition(':enter', [
    style({ opacity: 0, width: 0, 'min-width': 0, height: 0, 'min-height': 0 }),
    animate(ANIMATION_TIMINGS, style({ opacity: '*', width: '*', 'min-width': '*', height: '*', 'min-height': '*' }))
  ]),
  transition(':leave', [
    style({ opacity: '*', 'pointer-events': 'none', width: '*', 'min-width': '*', height: '*', 'min-height': '*' }),
    animate(ANIMATION_TIMINGS, style({ opacity: 0, width: 0, 'min-width': 0, height: 0, 'min-height': 0 }))
  ])
]);

export const crossfade = trigger('crossfade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate(ANIMATION_TIMINGS, style({ opacity: 1 }))
  ]),
  transition(':leave', [
    style({ opacity: 1, 'pointer-events': 'none', position: 'absolute' }),
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

export const drawer2 = trigger('drawer2', [
  state('0', style({ height: 0 })),
  transition('1 => void', []),
  transition('1 => *', [
    style({ height: '*' }),
    animate(ANIMATION_TIMINGS, style({ height: 0 }))
  ]),
  transition('0 => void', [
    style({ height: 0 }),
    animate(ANIMATION_TIMINGS, style({ height: 0 }))
  ]),
  transition('0 => *', [
    style({ height: 0 }),
    animate(ANIMATION_TIMINGS, style({ height: '*' }))
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