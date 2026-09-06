import { Injectable, Injector, Signal, WritableSignal, computed, effect, inject, signal, untracked } from '@angular/core';
import { DebugValue, NodeDefinition, ReactiveNode, ScenarioId, StateSnapshot } from '../models/reactive';
import { DebugLedger } from '../utils/debug-ledger';
import { ErrorService } from './error.service';

@Injectable({providedIn:'root'})
export class ReactiveDebugEngine {
 readonly ledger = new DebugLedger();
 private readonly injector = inject(Injector);
 private readonly errors = inject(ErrorService);
 private readonly revision = signal(0);
 private readonly readers = new Map<string, Signal<DebugValue>>();
 private readonly writers = new Map<string, WritableSignal<DebugValue>>();
 private readonly validators = new Map<string, (value: DebugValue) => boolean>();
 private readonly disposers: (() => void)[] = [];
 private pending = false;
 readonly scenario = signal<ScenarioId>('cart');
 readonly selectedId = signal<string>('cartTotal');
 readonly paused = signal(false);
 readonly nodes = computed(() => { this.revision(); return [...this.ledger.nodes.values()].map(n=>({...n})); });
 readonly events = computed(() => { this.revision(); return [...this.ledger.events].reverse(); });
 readonly snapshots = computed(() => { this.revision(); return [...this.ledger.snapshots]; });
 readonly edges = computed(() => { this.revision(); return this.ledger.edges; });
 readonly metrics = computed(() => { this.revision(); return this.ledger.metrics(); });
 readonly selected = computed(() => this.nodes().find(n=>n.id===this.selectedId()) ?? null);

 registerSignal<T extends DebugValue>(id: string, initial: T, description: string, validate: (value: DebugValue) => boolean = value => typeof value === typeof initial): Signal<T> {
  const source = signal<T>(initial);
  this.ledger.register({id,kind:'Signal',value:initial,writable:true,description,code:'signal(' + JSON.stringify(initial) + ')'});
  this.readers.set(id,source as Signal<DebugValue>); this.writers.set(id,source as unknown as WritableSignal<DebugValue>); this.validators.set(id,validate); this.publish();
  return source;
 }
 registerComputed<T extends DebugValue>(id: string, dependencies: string[], calculate: () => T, code: string): Signal<T> {
  this.ledger.register({id,kind:'Computed',value:null,dependencies,code,description:'A real Angular computed signal. Measured when its evaluator executes.'});
  const derived = computed(() => {
   const started = performance.now();
   try { const value = calculate(); this.ledger.record(id,value,performance.now()-started); return value; }
   catch (error) { queueMicrotask(()=>this.errors.report(new Error('Signal evaluation failed: ' + id + ' — ' + String(error)))); throw error; }
  });
  this.readers.set(id, derived); return derived;
 }
 registerExternal(def: NodeDefinition): void { this.ledger.register(def); this.publish(); }
 registerEffect(id: string, dependencies: string[], callback: () => DebugValue): void {
  this.ledger.register({id,kind:'Effect',value:null,dependencies,description:'An actual Angular effect; scheduled by Angular after reactive writes.',code:'effect(() => { /* consume ' + dependencies.join(', ') + ' */ })'});
  const ref = effect(() => {
   const started = performance.now();
   try { const result = callback(); untracked(()=>this.record(id,result,performance.now()-started)); }
   catch (error) { untracked(()=>this.errors.report(new Error('Effect failed: ' + id + ' — ' + String(error)))); }
  }, {injector:this.injector, manualCleanup:true});
  this.disposers.push(()=>ref.destroy());
 }
 addDisposer(dispose: () => void): void { this.disposers.push(dispose); }
 record(id: string, value: DebugValue, duration = 0): void {
  if (!this.ledger.nodes.has(id)) return;
  this.ledger.record(id,value,duration); this.publish();
 }
 read(id: string): DebugValue { return this.readers.get(id)?.() ?? this.ledger.nodes.get(id)?.value ?? null; }
 write(id: string, value: DebugValue, capture = true): void {
  this.validateWrite(id,value);
  const writer = this.writers.get(id)!;
  if (Object.is(writer(),value)) return;
  const start=performance.now(); writer.set(value); this.record(id,value,performance.now()-start);
  this.flush();
  if (capture) this.capture('Changed ' + id);
 }
 private validateWrite(id: string, value: DebugValue): void {
  if (!this.writers.has(id)) throw new Error('Node is not writable: ' + id);
  if (!this.validators.get(id)!(value)) throw new Error('Invalid value for ' + id + '. Check its type and allowed range.');
 }
 flush(): void {
  for (const [id, reader] of this.readers) {
   try { reader(); } catch (error) { this.errors.report(new Error('Signal evaluation failed: '+id+' — '+String(error))); }
  }
  this.publish();
 }
 capture(label: string): StateSnapshot {
  const values: Record<string,DebugValue> = {};
  for (const [id,writer] of this.writers) values[id]=writer();
  const snapshot=this.ledger.capture(this.scenario(),values,label); this.publish(); return snapshot;
 }
 validateSnapshot(snapshot: StateSnapshot): void {
  if (snapshot.scenario!==this.scenario()) throw new Error('Invalid snapshot: scenario does not match.');
  const keys=Object.keys(snapshot.values);
  if (keys.length!==this.writers.size) throw new Error('Invalid snapshot: writable values are missing or unknown.');
  for (const [id,value] of Object.entries(snapshot.values)) this.validateWrite(id,value);
 }
 restore(snapshot: StateSnapshot, capture = true): void {
  this.validateSnapshot(snapshot);
  for (const [id,value] of Object.entries(snapshot.values)) { this.writers.get(id)!.set(structuredClone(value)); this.record(id,value); }
  this.flush();
  if (capture) this.capture('Restored state #' + snapshot.id);
 }
 togglePause(): void { this.paused.update(v=>!v); this.ledger.paused=this.paused(); }
 clearTimeline(): void { this.ledger.events=[]; this.publish(); }
 reset(scenario: ScenarioId): void {
  for (const dispose of this.disposers.splice(0)) dispose();
  this.readers.clear(); this.writers.clear(); this.validators.clear(); this.ledger.reset();
  this.scenario.set(scenario); this.publish();
 }
 publish(): void {
  if (this.pending) return;
  this.pending=true;
  queueMicrotask(()=>{this.pending=false; this.revision.update(v=>v+1);});
 }
 consumers(node: ReactiveNode): ReactiveNode[] { return this.nodes().filter(n=>n.dependencies.includes(node.id)); }
}

