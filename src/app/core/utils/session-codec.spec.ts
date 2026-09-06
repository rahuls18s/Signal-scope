import { describe,expect,it } from 'vitest';
import { parseDebugSession } from './session-codec';

describe('parseDebugSession',()=>{
  it('accepts a complete version-one session',()=>{const session={version:1,id:'one',name:'Cart',savedAt:1,scenario:'cart',snapshots:[],events:[],nodes:[]};expect(parseDebugSession(JSON.stringify(session))).toEqual(session);});
  it('rejects malformed JSON and incomplete data',()=>{expect(()=>parseDebugSession('{')).toThrow(/valid JSON/);expect(()=>parseDebugSession('{"version":1}')).toThrow(/incomplete/);});
});
