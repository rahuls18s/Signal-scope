import { ErrorHandler, Injectable, inject, signal } from '@angular/core';
@Injectable({providedIn:'root'})
export class ErrorService {
 readonly message = signal('');
 report(error: unknown): void { this.message.set(error instanceof Error ? error.message : String(error)); }
 clear(): void { this.message.set(''); }
}
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
 private readonly errors = inject(ErrorService);
 handleError(error: unknown): void { console.error('[SignalScope]', error); this.errors.report(error); }
}

