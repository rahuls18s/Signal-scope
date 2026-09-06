export type DebugValue = string | number | boolean | null | DebugValue[] | { [key: string]: DebugValue };
export type NodeKind = 'Signal' | 'Computed' | 'Effect' | 'Observable' | 'Subject' | 'BehaviorSubject' | 'API/Event' | 'Component';
export type ScenarioId = 'cart' | 'search' | 'analytics' | 'dataset';
export interface ReactiveNode {
 id: string; name: string; kind: NodeKind; value: DebugValue; previous: DebugValue;
 updates: number; executions: number; unchanged: number; lastUpdated: number;
 duration: number; totalDuration: number; maxDuration: number; dependencies: string[];
 description: string; writable: boolean; code: string;
}
export interface ReactiveEdge { source: string; target: string }
export interface ReactiveEvent { id: number; nodeId: string; name: string; kind: NodeKind; previous: DebugValue; value: DebugValue; timestamp: number; duration: number; changed: boolean }
export interface StateSnapshot { id: number; timestamp: number; label: string; scenario: ScenarioId; values: Record<string, DebugValue> }
export interface PerformanceMetric { updates: number; computed: number; effects: number; average: number; slowest: ReactiveNode | null; unchanged: number }
export interface ObservableEmission { id: number; stage: string; value: DebugValue; timestamp: number; status: 'next' | 'error' | 'complete' }
export interface DebugSession { version: 1; id: string; name: string; savedAt: number; scenario: ScenarioId; snapshots: StateSnapshot[]; events: ReactiveEvent[]; nodes?: ReactiveNode[] }
export interface NodeDefinition { id: string; kind: NodeKind; value: DebugValue; dependencies?: string[]; description?: string; code?: string; writable?: boolean }

