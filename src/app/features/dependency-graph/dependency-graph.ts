import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ReactiveNode } from '../../core/models/reactive';
import { ValuePipe } from '../../shared/value.pipe';

@Component({
  selector: 'app-dependency-graph', imports: [ValuePipe], templateUrl: './dependency-graph.html', styleUrl: './dependency-graph.scss', changeDetection: ChangeDetectionStrategy.OnPush
})
export class DependencyGraph {
  readonly nodes = input.required<ReactiveNode[]>();
  readonly selectedId = input<string>('');
  readonly selectNode = output<string>();
  readonly levels = computed(() => {
    const nodes = this.nodes();
    const remaining = new Set(nodes.map(node => node.id));
    const placed = new Set<string>();
    const levels: ReactiveNode[][] = [];
    while (remaining.size) {
      const level = nodes.filter(node => remaining.has(node.id) && node.dependencies.every(id => placed.has(id) || !remaining.has(id)));
      const safe = level.length ? level : nodes.filter(node => remaining.has(node.id)).slice(0, 1);
      levels.push(safe); safe.forEach(node => { remaining.delete(node.id); placed.add(node.id); });
    }
    return levels;
  });
}
