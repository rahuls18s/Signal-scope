import { A11yModule, LiveAnnouncer } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { interval, map } from 'rxjs';
import { DebugSession, DebugValue, NodeKind, ScenarioId } from './core/models/reactive';
import { ErrorService } from './core/services/error.service';
import { ReactiveDebugEngine } from './core/services/reactive-debug-engine';
import { ScenarioService } from './core/services/scenario.service';
import { SessionStore } from './core/services/session-store';
import { findCycles } from './core/utils/debug-ledger';
import { parseDebugSession } from './core/utils/session-codec';
import { DependencyGraph } from './features/dependency-graph/dependency-graph';
import { ValuePipe } from './shared/value.pipe';

type View = 'workspace' | 'rxjs' | 'performance';
type TreeFilter = 'All' | NodeKind | 'Warnings' | 'Slow' | 'Frequently updated';
type SignalInputType = 'number' | 'string' | 'boolean';

@Component({ selector:'app-root', imports:[FormsModule,A11yModule,DependencyGraph,ValuePipe], templateUrl:'./app-root.html', styleUrl:'./app-root.scss', changeDetection:ChangeDetectionStrategy.OnPush })
export class AppRoot implements OnDestroy {
  readonly engine=inject(ReactiveDebugEngine); readonly scenarios=inject(ScenarioService); readonly errors=inject(ErrorService);
  private readonly sessions=inject(SessionStore); private readonly announcer=inject(LiveAnnouncer);
  private demoTimer?:ReturnType<typeof setInterval>; private replayTimer?:ReturnType<typeof setInterval>;
  readonly view=signal<View>('workspace'); readonly search=signal(''); readonly eventSearch=signal(''); readonly kindFilter=signal<TreeFilter>('All');
  readonly newSignalOpen=signal(false); readonly newSignalName=signal('customValue'); readonly newSignalValue=signal('42'); readonly newSignalType=signal<SignalInputType>('number');
  readonly savedSessions=signal<DebugSession[]>([]); readonly isDemoRunning=signal(false);
  readonly clock=toSignal(interval(1000).pipe(map(()=>Date.now())),{initialValue:Date.now()});
  readonly snapshotCursor=linkedSignal(()=>Math.max(0,this.engine.snapshots().length-1));
  readonly filteredNodes=computed(()=>{const term=this.search().trim().toLowerCase(),filter=this.kindFilter();return this.engine.nodes().filter(node=>{const text=!term||`${node.name} ${node.kind}`.toLowerCase().includes(term);const matches=filter==='All'||(filter==='Warnings'&&(node.maxDuration>16||node.unchanged>5))||(filter==='Slow'&&node.maxDuration>16)||(filter==='Frequently updated'&&node.updates>=10)||node.kind===filter;return text&&matches;});});
  readonly visibleEvents=computed(()=>{const term=this.eventSearch().trim().toLowerCase();return this.engine.events().filter(e=>!term||`${e.name} ${e.kind} ${JSON.stringify(e.value)}`.toLowerCase().includes(term));});
  readonly cycles=computed(()=>findCycles(this.engine.edges())); readonly snapshot=computed(()=>this.engine.snapshots()[this.snapshotCursor()]??null);
  readonly rxNodes=computed(()=>this.engine.nodes().filter(n=>['Observable','Subject','BehaviorSubject','API/Event'].includes(n.kind)));
  readonly scenarioOptions:{id:ScenarioId;name:string;detail:string}[]=[{id:'cart',name:'Shopping cart',detail:'Signals + computed + effect'},{id:'search',name:'Search pipeline',detail:'debounceTime + switchMap'},{id:'analytics',name:'Live analytics',detail:'Event stream + derived state'},{id:'dataset',name:'Large dataset',detail:'25,000 record filtering'}];
  readonly filters:TreeFilter[]=['All','Signal','Computed','Effect','Observable','Component','Slow','Frequently updated','Warnings'];
  readonly operators=['map','filter','debounceTime','distinctUntilChanged','switchMap','mergeMap','concatMap','exhaustMap','catchError','retry','shareReplay','combineLatest','forkJoin','bufferTime','throttleTime'];
  constructor(){this.scenarios.load('cart');void this.refreshSessions();}
  ngOnDestroy():void{this.stopDemo();this.stopReplay();}
  selectScenario(id:string):void{this.stopDemo();this.scenarios.load(id as ScenarioId);this.view.set(id==='search'?'rxjs':'workspace');this.snapshotCursor.set(0);this.announce(`${id} scenario loaded`);}
  selectNode(id:string):void{this.engine.selectedId.set(id);}
  updateSelected(raw:string):void{const node=this.engine.selected();if(!node)return;let value:DebugValue=raw;if(typeof node.value==='number')value=Number(raw);if(typeof node.value==='boolean')value=raw==='true';try{this.engine.write(node.id,value);this.announce(`${node.name} updated`);}catch(error){this.errors.report(error);}}
  quickWrite(id:string,value:DebugValue):void{try{this.engine.write(id,value);}catch(error){this.errors.report(error);}}
  addCustomSignal():void{try{const name=this.newSignalName().trim();const type=this.newSignalType();const raw=this.newSignalValue();const value:DebugValue=type==='number'?Number(raw):type==='boolean'?raw==='true':raw;if(type==='number'&&!Number.isFinite(value as number))throw new Error('Enter a valid numeric value.');this.engine.registerSignal(name,value,'User-defined playground signal.',candidate=>typeof candidate===type);this.engine.selectedId.set(name);this.engine.capture(`Created ${name}`);this.newSignalOpen.set(false);this.announce(`${name} signal created`);}catch(error){this.errors.report(error);}}
  runDemo():void{this.stopDemo();this.isDemoRunning.set(true);let step=0;const actions:Record<ScenarioId,(()=>void)[]>={cart:[()=>this.quickWrite('price',120),()=>this.quickWrite('quantity',4),()=>this.quickWrite('discount',15),()=>this.quickWrite('price',95)],search:[()=>this.scenarios.emitSearch('r'),()=>this.scenarios.emitSearch('ra'),()=>this.scenarios.emitSearch('rah'),()=>this.scenarios.emitSearch('rahul')],analytics:[()=>this.scenarios.simulateAnalytics(),()=>this.scenarios.simulateAnalytics(),()=>this.scenarios.simulateAnalytics(),()=>this.scenarios.simulateAnalytics()],dataset:[()=>this.quickWrite('scoreThreshold',75),()=>this.quickWrite('categoryFilter','Angular'),()=>this.quickWrite('scoreThreshold',45),()=>this.quickWrite('categoryFilter','All')]};const run=actions[this.engine.scenario()];this.demoTimer=setInterval(()=>{run[step]?.();step++;if(step>=run.length){this.stopDemo();this.announce('Demo complete');}},650);}
  stopDemo():void{if(this.demoTimer)clearInterval(this.demoTimer);this.demoTimer=undefined;this.isDemoRunning.set(false);}
  restoreSelected():void{const state=this.snapshot();if(!state)return;try{this.engine.restore(state);this.announce(`State ${state.id} restored`);}catch(error){this.errors.report(error);}}
  moveSnapshot(delta:number):void{this.snapshotCursor.update(i=>Math.min(Math.max(0,i+delta),this.engine.snapshots().length-1));}
  replay():void{this.stopReplay();this.snapshotCursor.set(0);this.replayTimer=setInterval(()=>{const state=this.snapshot();if(state)this.engine.restore(state,false);if(this.snapshotCursor()>=this.engine.snapshots().length-1)this.stopReplay();else this.moveSnapshot(1);},700);}
  stopReplay():void{if(this.replayTimer)clearInterval(this.replayTimer);this.replayTimer=undefined;}
  async saveSession():Promise<void>{try{const savedAt=Date.now();await this.sessions.save({version:1,id:crypto.randomUUID(),name:`${this.engine.scenario()} · ${new Date(savedAt).toLocaleString()}`,savedAt,scenario:this.engine.scenario(),snapshots:this.engine.snapshots(),events:this.engine.events(),nodes:this.engine.nodes()});await this.refreshSessions();this.announce('Session saved locally');}catch(error){this.errors.report(error);}}
  async loadSession(session:DebugSession):Promise<void>{try{this.scenarios.load(session.scenario);const final=session.snapshots.at(-1);for(const node of session.nodes??[]){if(node.writable&&!this.engine.ledger.nodes.has(node.id)){const value=final?.values[node.id]??node.value;this.engine.registerSignal(node.id,value,node.description);}}if(final)this.engine.restore(final,false);this.engine.ledger.snapshots=session.snapshots.map(x=>structuredClone(x));this.engine.ledger.events=[...session.events].reverse().map(x=>structuredClone(x));this.engine.publish();this.announce('Saved session loaded');}catch(error){this.errors.report(error);}}
  async deleteSession(id:string):Promise<void>{try{await this.sessions.remove(id);await this.refreshSessions();}catch(error){this.errors.report(error);}}
  exportSession():void{const savedAt=Date.now();const session:DebugSession={version:1,id:crypto.randomUUID(),name:`Exported ${this.engine.scenario()} session`,savedAt,scenario:this.engine.scenario(),nodes:this.engine.nodes(),events:this.engine.events(),snapshots:this.engine.snapshots()};const url=URL.createObjectURL(new Blob([JSON.stringify(session,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`signalscope-${this.engine.scenario()}.json`;link.click();URL.revokeObjectURL(url);}
  async importSession(files:FileList|null):Promise<void>{const file=files?.item(0);if(!file)return;try{const session=parseDebugSession(await file.text());await this.sessions.save({...session,id:crypto.randomUUID(),savedAt:Date.now(),name:`Imported · ${session.name}`});await this.refreshSessions();await this.loadSession(session);}catch(error){this.errors.report(error);}}
  formatTime(timestamp:number):string{return new Date(timestamp).toLocaleTimeString([],{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit',fractionalSecondDigits:3});}
  consumers(){const node=this.engine.selected();return node?this.engine.consumers(node):[];}
  private async refreshSessions():Promise<void>{try{this.savedSessions.set(await this.sessions.list());}catch(error){this.errors.report(error);}}
  private announce(message:string):void{void this.announcer.announce(message);}
}
