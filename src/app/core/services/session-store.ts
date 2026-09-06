import { Injectable } from '@angular/core';
import { DebugSession } from '../models/reactive';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly database = 'signalscope';
  private readonly store = 'sessions';

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.database, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(this.store, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Could not open the local session database.'));
    });
  }

  async save(session: DebugSession): Promise<void> {
    const database = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(this.store, 'readwrite');
      transaction.objectStore(this.store).put(session);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Could not save the debugging session.'));
    });
    database.close();
  }

  async list(): Promise<DebugSession[]> {
    const database = await this.open();
    const sessions = await new Promise<DebugSession[]>((resolve, reject) => {
      const request = database.transaction(this.store).objectStore(this.store).getAll();
      request.onsuccess = () => resolve(request.result as DebugSession[]);
      request.onerror = () => reject(new Error('Could not load saved sessions.'));
    });
    database.close();
    return sessions.sort((a, b) => b.savedAt - a.savedAt);
  }

  async remove(id: string): Promise<void> {
    const database = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(this.store, 'readwrite');
      transaction.objectStore(this.store).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Could not delete the session.'));
    });
    database.close();
  }
}
