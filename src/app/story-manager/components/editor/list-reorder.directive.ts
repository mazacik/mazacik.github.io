import { Directive, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output } from '@angular/core';

export interface ListMove {
  id: string;
  offset: number;
}

@Directive({ selector: '[storyListReorder]' })
export class ListReorderDirective implements OnChanges, OnDestroy {
  @Input({ required: true }) storyListReorder: { id: string }[] = [];
  @Input() reorderDisabled = false;
  @Output() reordered = new EventEmitter<ListMove>();
  private draggedId = '';
  private source: HTMLElement;
  private target: HTMLElement;

  constructor(private element: ElementRef<HTMLElement>) {}

  ngOnChanges() {
    if (this.reorderDisabled || (this.draggedId && this.index(this.draggedId) < 0)) this.clear();
  }

  private row(event: Event): HTMLElement | undefined {
    const row = (event.target as Element)?.closest<HTMLElement>('[data-reorder-id]');
    return row?.parentElement === this.element.nativeElement ? row : undefined;
  }

  private index(id: string) {
    return this.storyListReorder.findIndex((item) => item.id === id);
  }

  @HostListener('dragstart', ['$event'])
  start(event: DragEvent) {
    const row = this.row(event);
    if (!row) return;
    this.clear();
    if (this.reorderDisabled || this.index(row.dataset['reorderId']) < 0) {
      event.preventDefault();
      return;
    }
    this.draggedId = row.dataset['reorderId'];
    this.source = row;
    row.classList.add('dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', this.draggedId);
    }
    event.stopPropagation();
  }

  private destination(event: DragEvent) {
    const row = this.row(event);
    if (this.reorderDisabled || !this.draggedId || !row) return;
    const from = this.index(this.draggedId),
      to = this.index(row.dataset['reorderId']);
    if (from < 0 || to < 0 || from === to) return;
    const rect = row.getBoundingClientRect();
    const after = event.clientY >= rect.top + rect.height / 2;
    const insertion = to + (after ? 1 : 0);
    return { row, after, offset: insertion - (insertion > from ? 1 : 0) - from };
  }

  @HostListener('dragover', ['$event'])
  over(event: DragEvent) {
    this.clearTarget();
    const destination = this.destination(event);
    if (!destination) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.target = destination.row;
    this.target.classList.add(destination.after ? 'drop-after' : 'drop-before');
  }

  @HostListener('dragleave', ['$event'])
  leave(event: DragEvent) {
    if (!this.target?.contains(event.relatedTarget as Node)) this.clearTarget();
  }

  @HostListener('drop', ['$event'])
  drop(event: DragEvent) {
    const destination = this.destination(event),
      id = this.draggedId;
    this.clear();
    if (!destination) return;
    event.preventDefault();
    event.stopPropagation();
    if (destination.offset) this.reordered.emit({ id, offset: destination.offset });
  }

  @HostListener('keydown', ['$event'])
  keydown(event: KeyboardEvent) {
    if (this.reorderDisabled || !event.altKey || event.ctrlKey || event.metaKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const row = this.row(event);
    if (!row) return;
    const id = row.dataset['reorderId'],
      index = this.index(id),
      offset = event.key === 'ArrowUp' ? -1 : 1;
    event.preventDefault();
    if (index >= 0 && index + offset >= 0 && index + offset < this.storyListReorder.length) {
      this.reordered.emit({ id, offset });
      setTimeout(() => {
        if (row.isConnected) row.focus();
      });
    }
  }

  private clearTarget() {
    this.target?.classList.remove('drop-before', 'drop-after');
    this.target = undefined;
  }

  @HostListener('dragend')
  clear() {
    this.clearTarget();
    this.source?.classList.remove('dragging');
    this.source = undefined;
    this.draggedId = '';
  }

  ngOnDestroy() {
    this.clear();
  }
}
