import { Component, Input, Output, EventEmitter, OnChanges, ChangeDetectorRef, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Issue, Story, walkSteps } from '../../models/story.model';
import { sceneEdges } from '../../engine/story-validation';
interface MapNode {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  y: number;
}
interface MapEdge {
  id: string;
  from: string;
  passage: string;
  choice: string;
  path: string;
  label: string;
  x: number;
  y: number;
}
@Component({
  selector: 'story-scene-map',
  imports: [FormsModule],
  templateUrl: './scene-map.component.html',
  styleUrls: ['./editor.scss', './scene-map.component.scss'],
})
export class SceneMapComponent implements OnChanges {
  @Input() story: Story;
  @Input() revision = 0;
  @Input() selected = '';
  @Input() issues: Issue[] = [];
  @Output() selectScene = new EventEmitter<string>();
  @Output() selectChoice = new EventEmitter<{ scene: string; passage: string; choice: string }>();
  nodes: MapNode[] = [];
  edges: MapEdge[] = [];
  width = 800;
  height = 400;
  zoom = 1;
  x = 0;
  y = 0;
  query = '';
  focused = false;
  error = '';
  private generation = 0;
  private drag: { x: number; y: number } | null = null;
  constructor(private cdr: ChangeDetectorRef) {}
  ngOnChanges(changes: SimpleChanges) {
    if (changes['story'] || changes['revision'] || (this.focused && changes['selected'])) void this.layout();
  }
  async layout() {
    const generation = ++this.generation;
    try {
      const { graphlib, layout } = await import('@dagrejs/dagre');
      const graph = new graphlib.Graph({ multigraph: true }).setGraph({ rankdir: 'LR', nodesep: 45, ranksep: 110, marginx: 30, marginy: 30 }).setDefaultEdgeLabel(() => ({}));
      const allEdges = sceneEdges(this.story).filter((e) => this.story.scenes.some((s) => s.id === e.to));
      const visible = this.focused && this.selected ? new Set([this.selected, ...allEdges.filter((e) => e.from === this.selected || e.to === this.selected).flatMap((e) => [e.from, e.to])]) : null;
      const scenes = this.story.scenes.filter((s) => !visible || visible.has(s.id));
      scenes.forEach((s) => graph.setNode(s.id, { width: 220, height: 90 }));
      const edges = allEdges.filter((e) => scenes.some((s) => s.id === e.from) && scenes.some((s) => s.id === e.to));
      edges.forEach((e) => graph.setEdge(e.from, e.to, { width: 130, height: 24 }, e.id));
      layout(graph);
      if (generation !== this.generation) return;
      this.nodes = scenes.map((s) => {
        const n = graph.node(s.id);
        return {
          id: s.id,
          title: s.title,
          subtitle:
            (s.id === this.story.start ? 'Start · ' : '') +
            s.passages.length +
            ' passages' +
            (s.passages.some((p) => p.choices.some((c) => walkSteps(c.steps).some((step) => step.kind === 'end'))) ? ' · Ending' : ''),
          x: n.x,
          y: n.y,
        };
      });
      this.edges = edges.map((e) => {
        const value = graph.edge({ v: e.from, w: e.to, name: e.id });
        return { ...e, label: e.label.slice(0, 23), x: value.x, y: value.y, path: value.points.map((p, i) => (i ? 'L' : 'M') + p.x + ',' + p.y).join(' ') };
      });
      this.width = Math.max(400, graph.graph().width ?? 800);
      this.height = Math.max(260, graph.graph().height ?? 400);
      this.error = '';
      this.cdr.markForCheck();
    } catch {
      this.error = 'The map could not load. Scenes remain available in the scene list.';
      this.cdr.markForCheck();
    }
  }
  hasIssue(id: string) {
    return this.issues.some((i) => i.scene === id);
  }
  fit() {
    this.zoom = 1;
    this.x = 0;
    this.y = 0;
  }
  scale(factor: number) {
    this.zoom = Math.min(6, Math.max(0.2, this.zoom * factor));
  }
  down(event: PointerEvent) {
    if ((event.target as Element).closest('[data-node]')) return;
    this.drag = { x: event.clientX, y: event.clientY };
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
  }
  move(event: PointerEvent) {
    if (!this.drag) return;
    const bounds = (event.currentTarget as Element).getBoundingClientRect();
    this.x -= ((event.clientX - this.drag.x) * this.width) / bounds.width / this.zoom;
    this.y -= ((event.clientY - this.drag.y) * this.height) / bounds.height / this.zoom;
    this.drag = { x: event.clientX, y: event.clientY };
  }
  up() {
    this.drag = null;
  }
}
