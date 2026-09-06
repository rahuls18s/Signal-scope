import { DebugSession, ReactiveEvent, ReactiveNode, ScenarioId, StateSnapshot } from '../models/reactive';

const scenarios: ScenarioId[]=['cart','search','analytics','dataset'];
const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null;

export function parseDebugSession(text:string):DebugSession {
  let value:unknown;
  try { value=JSON.parse(text); } catch { throw new Error('Invalid session: the file is not valid JSON.'); }
  if(!isRecord(value)||value['version']!==1||typeof value['id']!=='string'||typeof value['name']!=='string'||typeof value['savedAt']!=='number'||!scenarios.includes(value['scenario'] as ScenarioId)||!Array.isArray(value['snapshots'])||!Array.isArray(value['events'])) throw new Error('Invalid session: unsupported or incomplete SignalScope data.');
  return {version:1,id:value['id'],name:value['name'],savedAt:value['savedAt'],scenario:value['scenario'] as ScenarioId,snapshots:value['snapshots'] as StateSnapshot[],events:value['events'] as ReactiveEvent[],nodes:Array.isArray(value['nodes'])?value['nodes'] as ReactiveNode[]:undefined};
}
