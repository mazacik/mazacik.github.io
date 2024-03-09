import { animate, style, transition, trigger } from "@angular/animations";

export const fade = trigger('fade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('500ms ease', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    style({ opacity: 1 }),
    animate('500ms ease', style({ opacity: 0 }))
  ])
]);

export const enter = trigger('enter', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('500ms ease', style({ opacity: 1 }))
  ])
]);

export const leave = trigger('leave', [
  transition(':leave', [
    style({ opacity: 1 }),
    animate('500ms ease', style({ opacity: 0 }))
  ])
]);

export const hidden = trigger('hidden', [
  transition('* => true', [
    style({ opacity: 1 }),
    animate('500ms ease', style({ opacity: 0 }))
  ]),
  transition('true => *', [
    style({ opacity: 0 }),
    animate('500ms ease', style({ opacity: 1 }))
  ])
]);

export const drawer = trigger('drawer', [
  transition(':enter', [
    style({ height: 0 }),
    animate('500ms ease', style({}))
  ]),
  transition(':leave', [
    style({}),
    animate('500ms ease', style({ height: 0 }))
  ])
]);