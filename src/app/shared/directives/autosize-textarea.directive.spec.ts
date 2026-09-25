import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { AutosizeTextareaDirective } from './autosize-textarea.directive';

@Component({
  imports: [FormsModule, AutosizeTextareaDirective],
  template: `<div [style.width.px]="width" [style.display]="visible ? 'block' : 'none'" style="height:160px;overflow:auto">
    <textarea
      [(ngModel)]="text"
      style="display:block;box-sizing:border-box;width:100%;min-width:0;min-height:36px;padding:6px;border:1px solid;font:16px/20px sans-serif;resize:none;overflow:hidden"></textarea>
  </div>`,
})
class TextareaFixture {
  text = 'Short note';
  width = 400;
  visible = true;
}

describe('Textarea automatic sizing', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [TextareaFixture] }));

  it('reflows native container changes without writing during resize notification delivery', async () => {
    const fixture = TestBed.createComponent(TextareaFixture);
    fixture.componentInstance.text = 'Words that wrap as the container changes width. '.repeat(40);
    fixture.detectChanges();
    await fixture.whenStable();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const heights: number[] = [];
    for (const width of [170, 400, 190, 400]) {
      textarea.parentElement.style.width = width + 'px';
      await nextFrame();
      await nextFrame();
      await nextFrame();
      heights.push(textarea.clientHeight);
      expect(textarea.scrollHeight).toBeLessThanOrEqual(textarea.clientHeight + 1);
    }
    expect(heights[0]).toBeGreaterThan(heights[1]);
    expect(heights[2]).toBeGreaterThan(heights[3]);
    fixture.destroy();
    await nextFrame();
  });

  it('grows for loaded text and shrinks when the model changes to shorter text', async () => {
    const fixture = TestBed.createComponent(TextareaFixture);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    const initial = textarea.clientHeight;
    fixture.componentInstance.text = 'A loaded paragraph.\n'.repeat(40);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(textarea.clientHeight).toBeGreaterThan(initial * 5);
    expect(textarea.scrollHeight).toBeLessThanOrEqual(textarea.clientHeight + 1);
    fixture.componentInstance.text = 'Short again';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(textarea.clientHeight).toBe(initial);
  });

  it('resizes pasted input and reflows after the available width changes', async () => {
    const fixture = TestBed.createComponent(TextareaFixture);
    fixture.detectChanges();
    await fixture.whenStable();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'A paragraph with many wrapping words. '.repeat(30);
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.text).toBe(textarea.value);
    const wideHeight = textarea.clientHeight;
    fixture.componentInstance.width = 180;
    fixture.detectChanges();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(textarea.clientHeight).toBeGreaterThan(wideHeight);
    expect(textarea.scrollHeight).toBeLessThanOrEqual(textarea.clientHeight + 1);
    textarea.value = '';
    textarea.dispatchEvent(new Event('input'));
    expect(textarea.clientHeight).toBeLessThan(wideHeight);
  });

  it('measures text when a hidden panel opens and preserves its scroll position during growth', async () => {
    const fixture = TestBed.createComponent(TextareaFixture);
    fixture.componentInstance.visible = false;
    fixture.componentInstance.text = 'An existing line.\n'.repeat(50);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.visible = true;
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.clientHeight).toBeGreaterThan(900);
    const panel = textarea.parentElement;
    panel.scrollTop = panel.scrollHeight;
    const top = panel.scrollTop;
    textarea.value += 'Another line.\n';
    textarea.dispatchEvent(new Event('input'));
    expect(panel.scrollTop).toBe(top);
    expect(textarea.scrollHeight).toBeLessThanOrEqual(textarea.clientHeight + 1);
  });
});
