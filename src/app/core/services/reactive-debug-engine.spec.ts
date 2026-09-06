import '@angular/compiler';
import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ErrorService } from './error.service';
import { ReactiveDebugEngine } from './reactive-debug-engine';

describe('ReactiveDebugEngine', () => {
  beforeAll(() => getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => getTestBed().resetTestEnvironment());
  afterEach(() => TestBed.resetTestingModule());
  it('tracks real signals and restores validated snapshots', () => {
    TestBed.configureTestingModule({ providers:[ReactiveDebugEngine,ErrorService] });
    const engine=TestBed.inject(ReactiveDebugEngine);
    const price=engine.registerSignal('price',100,'price',value=>typeof value==='number'&&value>=0);
    const total=engine.registerComputed('total',['price'],()=>price()*2,'computed');
    engine.flush(); const initial=engine.capture('initial');
    engine.write('price',125); expect(total()).toBe(250); expect(engine.events().some(event=>event.nodeId==='total')).toBe(true);
    engine.restore(initial,false); expect(price()).toBe(100); expect(total()).toBe(200);
    expect(()=>engine.write('price',-1)).toThrow(/Invalid value/);
    expect(()=>engine.write('total',1)).toThrow(/not writable/);
  });

  it('rejects snapshots from another scenario', () => {
    TestBed.configureTestingModule({ providers:[ReactiveDebugEngine,ErrorService] });
    const engine=TestBed.inject(ReactiveDebugEngine); engine.registerSignal('query','','query');
    expect(()=>engine.restore({id:1,timestamp:Date.now(),label:'wrong',scenario:'search',values:{query:''}})).toThrow(/scenario does not match/);
  });

  it('exposes graph projections, controls recording, and clears resources', async () => {
    TestBed.configureTestingModule({ providers:[ReactiveDebugEngine,ErrorService] });
    const engine=TestBed.inject(ReactiveDebugEngine); const disposed={value:false};
    engine.registerSignal('source',1,'source'); engine.registerExternal({id:'view',kind:'Component',value:'ready',dependencies:['source']});
    engine.selectedId.set('source'); engine.flush();
    expect(engine.read('source')).toBe(1); expect(engine.read('unknown')).toBeNull(); expect(engine.edges()).toEqual([{source:'source',target:'view'}]);
    expect(engine.selected()?.id).toBe('source'); expect(engine.consumers(engine.selected()!)[0]?.id).toBe('view'); expect(engine.metrics().updates).toBe(0);
    engine.write('source',1); expect(engine.snapshots()).toHaveLength(0);
    engine.togglePause(); engine.record('source',2); engine.record('unknown',2); expect(engine.events()).toHaveLength(0);
    engine.togglePause(); engine.record('source',3); await Promise.resolve(); expect(engine.events()).toHaveLength(1); engine.clearTimeline(); await Promise.resolve(); expect(engine.events()).toHaveLength(0);
    expect(()=>engine.restore({id:1,timestamp:0,label:'missing',scenario:'cart',values:{}})).toThrow(/missing or unknown/);
    engine.addDisposer(()=>disposed.value=true); engine.reset('analytics'); expect(disposed.value).toBe(true); expect(engine.scenario()).toBe('analytics'); expect(engine.nodes()).toEqual([]);
  });

  it('runs and disposes an Angular effect', () => {
    TestBed.configureTestingModule({ providers:[ReactiveDebugEngine,ErrorService] });
    const engine=TestBed.inject(ReactiveDebugEngine); const source=engine.registerSignal('source',1,'source');
    engine.registerEffect('sideEffect',['source'],()=>`seen ${source()}`); TestBed.tick();
    expect(engine.read('sideEffect')).toBe('seen 1'); engine.write('source',2,false); TestBed.tick(); expect(engine.read('sideEffect')).toBe('seen 2');
    engine.reset('cart');
  });
});
