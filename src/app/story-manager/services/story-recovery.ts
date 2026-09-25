import { Data } from '../models/data.interface';

export interface Recovery {
  base: string;
  data: Data;
}
export class StoryRecovery {
  constructor(private readonly scope: string) {}
  private async operation<T>(key: string, mode: IDBTransactionMode, action: (store: IDBObjectStore, key: string) => IDBRequest<T>): Promise<T> {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('story-manager-recovery', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('documents');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction('documents', mode);
      const request = action(transaction.objectStore('documents'), this.scope + ':' + key);
      transaction.oncomplete = () => {
        db.close();
        resolve(request.result);
      };
      transaction.onabort = transaction.onerror = () => {
        db.close();
        reject(transaction.error ?? request.error);
      };
    });
  }
  read(): Promise<Recovery> {
    return this.operation('pending', 'readonly', (s, k) => s.get(k));
  }
  write(value: Recovery): Promise<unknown> {
    return this.operation('pending', 'readwrite', (s, k) => s.put(value, k));
  }
  clear(): Promise<unknown> {
    return this.operation('pending', 'readwrite', (s, k) => s.delete(k));
  }
  async backup(data: Data): Promise<void> {
    const existing = await this.operation('original', 'readonly', (s, k) => s.get(k));
    if (!existing) await this.operation('original', 'readwrite', (s, k) => s.put(data, k));
  }
}
