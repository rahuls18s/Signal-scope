import { Injectable, Injector, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, delay, distinctUntilChanged, of, shareReplay, switchMap, tap } from 'rxjs';
import { DebugValue, ScenarioId } from '../models/reactive';
import { ReactiveDebugEngine } from './reactive-debug-engine';

@Injectable({ providedIn: 'root' })
export class ScenarioService {
  private readonly engine = inject(ReactiveDebugEngine);
  private readonly injector = inject(Injector);
  private analyticsTimer?: ReturnType<typeof setInterval>;
  private dataset: { id: number; category: string; score: number }[] = [];

  load(id: ScenarioId): void {
    if (this.analyticsTimer) clearInterval(this.analyticsTimer);
    this.engine.reset(id);
    if (id === 'cart') this.cart();
    if (id === 'search') this.search();
    if (id === 'analytics') this.analytics();
    if (id === 'dataset') this.largeDataset();
    this.engine.flush();
    this.engine.capture('Initial state');
  }

  emitSearch(value: string): void {
    this.engine.write('searchQuery', value);
  }

  simulateAnalytics(): void {
    const current = Number(this.engine.read('activeUsers'));
    this.engine.write('activeUsers', Math.max(1, current + Math.round(Math.random() * 18 - 7)), false);
    this.engine.record('eventStream', { type: 'page_view', route: ['/docs', '/pricing', '/dashboard'][Math.floor(Math.random() * 3)] });
    this.engine.flush();
    this.engine.capture('Analytics event');
  }

  private cart(): void {
    const price = this.engine.registerSignal('price', 100, 'Unit price in USD.', v => typeof v === 'number' && v >= 0);
    const quantity = this.engine.registerSignal('quantity', 2, 'Number of items in the cart.', v => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 99);
    const discount = this.engine.registerSignal('discount', 10, 'Percentage discount applied to the order.', v => typeof v === 'number' && v >= 0 && v <= 100);
    const total = this.engine.registerComputed('total', ['price', 'quantity'], () => price() * quantity(), 'computed(() => price() * quantity())');
    const cartTotal = this.engine.registerComputed('cartTotal', ['total', 'discount'], () => +(total() * (1 - discount() / 100)).toFixed(2), 'computed(() => total() * (1 - discount() / 100))');
    this.engine.registerExternal({ id: 'CartComponent', kind: 'Component', value: 'rendered', dependencies: ['cartTotal'], description: 'Angular component consuming cartTotal() in an OnPush template.' });
    this.engine.registerEffect('saveCartEffect', ['cartTotal'], () => `saved $${cartTotal()}`);
    this.engine.selectedId.set('cartTotal');
  }

  private search(): void {
    const query = this.engine.registerSignal('searchQuery', '', 'The current search field value.', v => typeof v === 'string');
    this.engine.registerExternal({ id: 'queryStream', kind: 'Observable', value: 'waiting', dependencies: ['searchQuery'], description: 'Signal converted into the input event stream.' });
    this.engine.registerExternal({ id: 'debounceTime', kind: 'Observable', value: 'waiting', dependencies: ['queryStream'], description: 'Waits 300ms after the latest keystroke.' });
    this.engine.registerExternal({ id: 'distinctUntilChanged', kind: 'Observable', value: 'waiting', dependencies: ['debounceTime'], description: 'Skips consecutive duplicate terms.' });
    this.engine.registerExternal({ id: 'searchApi', kind: 'API/Event', value: 'idle', dependencies: ['distinctUntilChanged'], description: 'A cancellable API simulation driven by switchMap().' });
    this.engine.registerExternal({ id: 'searchResults', kind: 'BehaviorSubject', value: [], dependencies: ['searchApi'], description: 'Latest API result exposed to the UI.' });
    this.engine.registerExternal({ id: 'SearchComponent', kind: 'Component', value: 'rendered', dependencies: ['searchResults'] });
    const subscription = toObservable(query, { injector:this.injector }).pipe(
      tap(value => this.engine.record('queryStream', value)),
      debounceTime(300), tap(value => this.engine.record('debounceTime', value)),
      distinctUntilChanged(), tap(value => this.engine.record('distinctUntilChanged', value)),
      switchMap(term => {
        this.engine.record('searchApi', term ? 'loading' : 'idle');
        return term ? of([`${term} signals`, `${term} rxjs`, `${term} performance`]).pipe(delay(260)) : of([]);
      }),
      catchError(error => { this.engine.record('searchApi', 'error'); return of([String(error)]); }),
      shareReplay({ bufferSize: 1, refCount: true })
    ).subscribe(results => { this.engine.record('searchApi', 'complete'); this.engine.record('searchResults', results); });
    this.engine.addDisposer(() => subscription.unsubscribe());
    this.engine.selectedId.set('searchQuery');
  }

  private analytics(): void {
    const active = this.engine.registerSignal('activeUsers', 248, 'Simulated concurrent visitors.', v => typeof v === 'number' && v >= 0);
    const baseline = this.engine.registerSignal('baselineUsers', 220, 'Rolling comparison baseline.', v => typeof v === 'number' && v > 0);
    this.engine.registerExternal({ id: 'eventStream', kind: 'Subject', value: 'connected', description: 'Incoming page-view events.' });
    const change = this.engine.registerComputed('trafficDelta', ['activeUsers', 'baselineUsers'], () => +(((active() - baseline()) / baseline()) * 100).toFixed(1), 'computed(() => (activeUsers() - baselineUsers()) / baselineUsers())');
    this.engine.registerComputed('trafficStatus', ['trafficDelta'], () => change() > 15 ? 'surge' : change() < -10 ? 'drop' : 'normal', 'computed(() => classify(trafficDelta()))');
    this.engine.registerExternal({ id: 'AnalyticsComponent', kind: 'Component', value: 'rendered', dependencies: ['trafficStatus', 'eventStream'] });
    this.engine.selectedId.set('eventStream');
  }

  private largeDataset(): void {
    this.dataset = Array.from({ length: 25000 }, (_, id) => ({ id, category: ['Angular', 'RxJS', 'TypeScript', 'Testing'][id % 4], score: (id * 37) % 101 }));
    const category = this.engine.registerSignal('categoryFilter', 'All', 'Dataset category filter.', v => typeof v === 'string');
    const threshold = this.engine.registerSignal('scoreThreshold', 60, 'Minimum result score.', v => typeof v === 'number' && v >= 0 && v <= 100);
    this.engine.registerExternal({ id: 'datasetWorker', kind: 'Observable', value: 'ready · 25,000 records', dependencies: ['categoryFilter', 'scoreThreshold'], description: 'Runs dataset analysis off the main UI thread.' });
    this.engine.registerComputed('filteredCount', ['categoryFilter', 'scoreThreshold'], () => this.dataset.filter(row => (category() === 'All' || row.category === category()) && row.score >= threshold()).length, 'computed(() => records.filter(matches).length)');
    if (typeof Worker !== 'undefined') {
      const worker = new Worker(new URL('../../workers/analysis.worker', import.meta.url));
      worker.onmessage = ({ data }: MessageEvent<{ count: number; duration: number }>) => this.engine.record('datasetWorker', { count:data.count, durationMs:+data.duration.toFixed(2) }, data.duration);
      this.engine.registerEffect('workerFilterEffect', ['categoryFilter', 'scoreThreshold'], () => {
        const values=this.dataset.filter(row=>category()==='All'||row.category===category()).map(row=>row.score);
        worker.postMessage({ values, threshold:threshold() }); return 'analysis requested';
      });
      this.engine.addDisposer(() => worker.terminate());
    }
    this.engine.registerExternal({ id: 'DatasetComponent', kind: 'Component', value: 'rendered', dependencies: ['filteredCount'] });
    this.engine.selectedId.set('filteredCount');
  }
}
