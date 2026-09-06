import { describe, expect, it } from 'vitest';
import { DebugLedger, equalValue, findCycles } from './debug-ledger';

describe('DebugLedger', () => {
  it('registers nodes and derives dependency edges', () => {
    const ledger=new DebugLedger();
    ledger.register({id:'price',kind:'Signal',value:100,writable:true});
    ledger.register({id:'total',kind:'Computed',value:200,dependencies:['price']});
    expect(ledger.edges).toEqual([{source:'price',target:'total'}]);
    expect(()=>ledger.register({id:'total',kind:'Signal',value:0})).toThrow(/already exists/);
    expect(()=>ledger.register({id:'1bad',kind:'Signal',value:0})).toThrow(/beginning with a letter/);
    expect(()=>ledger.register({id:'broken',kind:'Computed',value:0,dependencies:['missing']})).toThrow(/Unknown dependency/);
  });

  it('records changed and unchanged executions with timings', () => {
    const ledger=new DebugLedger(2);
    ledger.register({id:'count',kind:'Computed',value:1});
    ledger.record('count',2,4); ledger.record('count',2,7); ledger.record('count',3,2);
    expect(ledger.events).toHaveLength(2);
    expect(ledger.nodes.get('count')).toMatchObject({updates:2,executions:3,unchanged:1,maxDuration:7,totalDuration:13});
    expect(()=>ledger.record('missing',0)).toThrow(/Unknown reactive node/);
    expect(()=>ledger.record('count',0,-1)).toThrow(/Invalid execution duration/);
  });

  it('pauses the timeline without stopping metrics', () => {
    const ledger=new DebugLedger(); ledger.register({id:'source',kind:'Signal',value:0}); ledger.paused=true; ledger.record('source',1);
    expect(ledger.events).toHaveLength(0); expect(ledger.nodes.get('source')?.updates).toBe(1);
  });

  it('stays bounded under a ten-thousand-event workload',()=>{const ledger=new DebugLedger(1000);ledger.register({id:'load',kind:'Signal',value:0});for(let value=1;value<=10000;value++)ledger.record('load',value);expect(ledger.events).toHaveLength(1000);expect(ledger.events[0].value).toBe(9001);expect(ledger.nodes.get('load')?.updates).toBe(10000);});

  it('keeps bounded immutable snapshots', () => {
    const ledger=new DebugLedger(10,2); const values={price:100};
    ledger.capture('cart',values,'one'); values.price=120; ledger.capture('cart',values,'two'); ledger.capture('cart',values,'three');
    expect(ledger.snapshots.map(x=>x.label)).toEqual(['two','three']); expect(ledger.snapshots[0].values['price']).toBe(120);
    ledger.reset(); expect(ledger.nodes.size).toBe(0); expect(ledger.snapshots).toEqual([]);
  });

  it('calculates performance totals', () => {
    const ledger=new DebugLedger(); ledger.register({id:'calc',kind:'Computed',value:0}); ledger.register({id:'side',kind:'Effect',value:null}); ledger.record('calc',1,10); ledger.record('calc',1,20); ledger.record('side','ok',5);
    expect(ledger.metrics()).toMatchObject({updates:2,computed:2,effects:1,average:35/3,unchanged:1}); expect(ledger.metrics().slowest?.id).toBe('calc');
  });
});

describe('reactive graph utilities', () => {
  it('compares structural debug values',()=>{expect(equalValue({a:[1,true]}, {a:[1,true]})).toBe(true);expect(equalValue(1,'1')).toBe(false);});
  it('detects dependency cycles and ignores acyclic branches',()=>{expect(findCycles([{source:'a',target:'b'},{source:'b',target:'c'},{source:'c',target:'a'},{source:'x',target:'y'}])).toEqual([['a','b','c','a']]);expect(findCycles([{source:'a',target:'b'}])).toEqual([]);});
});
