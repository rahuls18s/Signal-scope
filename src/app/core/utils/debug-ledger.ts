import { DebugValue, NodeDefinition, PerformanceMetric, ReactiveEdge, ReactiveEvent, ReactiveNode, ScenarioId, StateSnapshot } from '../models/reactive';

export function equalValue(a: DebugValue, b: DebugValue): boolean { return JSON.stringify(a) === JSON.stringify(b); }
export function findCycles(edges: ReactiveEdge[]): string[][] {
 const adjacency = new Map<string, string[]>();
 for (const edge of edges) adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target]);
 const visited = new Set<string>(), active = new Set<string>(), stack: string[] = [], cycles: string[][] = [];
 const visit = (id: string): void => {
  if (active.has(id)) { cycles.push([...stack.slice(stack.indexOf(id)), id]); return; }
  if (visited.has(id)) return;
  visited.add(id); active.add(id); stack.push(id);
  for (const child of adjacency.get(id) ?? []) visit(child);
  stack.pop(); active.delete(id);
 };
 for (const id of adjacency.keys()) visit(id);
 return cycles;
}
export class DebugLedger {
 readonly nodes = new Map<string, ReactiveNode>();
 events: ReactiveEvent[] = [];
 snapshots: StateSnapshot[] = [];
 paused = false;
 private eventId = 0;
 private snapshotId = 0;
 constructor(readonly eventLimit = 12000, readonly snapshotLimit = 120) {}
 get edges(): ReactiveEdge[] { return [...this.nodes.values()].flatMap(node => node.dependencies.map(source => ({source, target:node.id}))); }
 register(def: NodeDefinition): ReactiveNode {
  if (!/^[a-zA-Z][\w.-]*$/.test(def.id)) throw new Error('Use a name beginning with a letter, followed by letters, digits, dots or underscores.');
  if (this.nodes.has(def.id)) throw new Error('A node named ' + def.id + ' already exists.');
  for (const id of def.dependencies ?? []) if (!this.nodes.has(id)) throw new Error('Unknown dependency: ' + id);
  const node: ReactiveNode = { ...def, name:def.id, previous:null, value:structuredClone(def.value), updates:0, executions:0, unchanged:0, lastUpdated:Date.now(), duration:0, totalDuration:0, maxDuration:0, dependencies:[...(def.dependencies ?? [])], description:def.description ?? '', code:def.code ?? '', writable:def.writable ?? false };
  this.nodes.set(node.id, node); return node;
 }
 record(id: string, value: DebugValue, duration = 0): ReactiveEvent {
  const node = this.nodes.get(id);
  if (!node) throw new Error('Unknown reactive node: ' + id);
  if (!Number.isFinite(duration) || duration < 0) throw new Error('Invalid execution duration');
  const changed = !equalValue(node.value, value), timestamp = Date.now();
  const event: ReactiveEvent = { id:++this.eventId, nodeId:id, name:node.name, kind:node.kind, previous:structuredClone(node.value), value:structuredClone(value), timestamp, duration, changed };
  node.previous = event.previous; node.value = event.value; node.executions++; node.duration = duration;
  node.totalDuration += duration; node.maxDuration = Math.max(node.maxDuration, duration); node.lastUpdated = timestamp;
  if (changed) node.updates++; else node.unchanged++;
  if (!this.paused) { this.events.push(event); if (this.events.length > this.eventLimit) this.events.splice(0, this.events.length - this.eventLimit); }
  return event;
 }
 capture(scenario: ScenarioId, values: Record<string, DebugValue>, label: string): StateSnapshot {
  const snapshot = { id:++this.snapshotId, timestamp:Date.now(), scenario, values:structuredClone(values), label };
  this.snapshots.push(snapshot);
  if (this.snapshots.length > this.snapshotLimit) this.snapshots.shift();
  return snapshot;
 }
 metrics(): PerformanceMetric {
  const nodes = [...this.nodes.values()];
  const executions = nodes.reduce((sum, n) => sum+n.executions, 0);
  return { updates:nodes.reduce((s,n)=>s+n.updates,0), computed:nodes.filter(n=>n.kind==='Computed').reduce((s,n)=>s+n.executions,0), effects:nodes.filter(n=>n.kind==='Effect').reduce((s,n)=>s+n.executions,0), average:executions ? nodes.reduce((s,n)=>s+n.totalDuration,0)/executions : 0, slowest:nodes.filter(n=>n.executions>0).sort((a,b)=>b.maxDuration-a.maxDuration)[0] ?? null, unchanged:nodes.filter(n=>n.kind==='Computed').reduce((s,n)=>s+n.unchanged,0) };
 }
 reset(): void { this.nodes.clear(); this.events=[]; this.snapshots=[]; this.eventId=0; this.snapshotId=0; }
}

