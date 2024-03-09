import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[ngVar]',
  standalone: true
})
export class VariableDirective<T> {

  private context: VariableDirectiveContext<T> = new VariableDirectiveContext<T>();

  @Input() public set ngVar(context: T) {
    this.context.ngVar = context;
  }

  static ngTemplateGuard_ngVar: 'binding';
  static ngTemplateContextGuard<T>(dir: VariableDirective<T>, context: any): context is VariableDirectiveContext<T> {
    return true;
  }

  constructor(
    private containerRef: ViewContainerRef,
    private templateRef: TemplateRef<VariableDirectiveContext<T>>
  ) {
    this.containerRef.createEmbeddedView(this.templateRef, this.context);
  }

}

export class VariableDirectiveContext<T> {

  public ngVar: T;

}
