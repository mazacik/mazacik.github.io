import { EnvironmentInjector, Injectable, runInInjectionContext, signal, WritableSignal } from '@angular/core';
import { Firestore, collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from '@angular/fire/firestore';
import { environment } from 'src/environments/environment';

export interface ShoppingListItem {
  text: string;
  check: boolean;
  position: number;
}

export type ShoppingListConnectionState = 'connected' | 'connecting' | 'disconnected';

@Injectable({
  providedIn: 'root'
})
export class ShoppingListService {

  private unsubscribe?: () => void;
  private readonly collectionPath: string = 'shopping-list';

  private readonly itemsSignal: WritableSignal<ShoppingListItem[]> = signal([]);
  private readonly connectionSignal: WritableSignal<ShoppingListConnectionState> = signal('disconnected');
  public readonly items = this.itemsSignal.asReadonly();
  public readonly connectionState = this.connectionSignal.asReadonly();

  constructor(
    private firestore: Firestore,
    private injector: EnvironmentInjector
  ) { }

  public connect(): void {
    if (this.unsubscribe) {
      return;
    }

    if (!this.ensureConfigured()) {
      return;
    }

    this.connectionSignal.set('connecting');

    this.unsubscribe = this.runInContext(() => {
      const listQuery = query(
        collection(this.firestore, this.collectionPath),
        orderBy('position', 'desc')
      );

      return onSnapshot(
        listQuery,
        snapshot => {
          const items = snapshot.docs.map(docSnapshot => ({
            id: docSnapshot.id,
            ...docSnapshot.data()
          }));
          this.applyRemote(items);
          this.connectionSignal.set(snapshot.metadata.fromCache ? 'connecting' : 'connected');
        },
        () => {
          this.connectionSignal.set('disconnected');
        }
      );
    });
  }

  public disconnect(): void {
    if (!this.unsubscribe) {
      return;
    }

    this.unsubscribe();
    this.unsubscribe = undefined;
    this.connectionSignal.set('disconnected');
  }

  public addItem(text: string): void {
    const normalized = this.normalizeText(text);
    if (!normalized || !this.ensureConfigured()) {
      return;
    }

    const items = this.itemsSignal();
    if (items.some(item => item.text === normalized)) {
      return;
    }

    const nextItem: ShoppingListItem = {
      text: normalized,
      check: false,
      position: this.nextPosition(items)
    };

    this.applyLocal([...items, nextItem]);
    this.writeItem(nextItem, false);
  }

  public toggleItem(text: string): void {
    if (!this.ensureConfigured()) {
      return;
    }

    const normalized = this.normalizeText(text);
    if (!normalized) {
      return;
    }

    const items = this.itemsSignal();
    const index = items.findIndex(item => item.text === normalized);
    if (index === -1) {
      return;
    }

    const updated: ShoppingListItem = { ...items[index], check: !items[index].check };
    const next = [...items];
    next[index] = updated;

    this.applyLocal(next);
    this.writeItem(updated, true);
  }

  public removeItem(text: string): void {
    if (!this.ensureConfigured()) {
      return;
    }

    const normalized = this.normalizeText(text);
    if (!normalized) {
      return;
    }

    const next = this.itemsSignal().filter(item => item.text !== normalized);
    this.applyLocal(next);
    this.deleteItem(normalized);
  }

  public clearCompleted(): void {
    if (!this.ensureConfigured()) {
      return;
    }

    const items = this.itemsSignal();
    const completed = items.filter(item => item.check);
    const next = items.filter(item => !item.check);
    this.applyLocal(next);
    this.deleteItems(completed.map(item => item.text));
  }

  private applyLocal(items: ShoppingListItem[]): void {
    this.itemsSignal.set(this.sortItems(items));
  }

  private applyRemote(items: unknown): void {
    const sanitized = this.sanitizeItems(items);
    this.itemsSignal.set(this.sortItems(sanitized));
  }

  private ensureConfigured(): boolean {
    const configured: boolean = this.isFirebaseConfigured();
    if (!configured) {
      this.connectionSignal.set('disconnected');
    }
    return configured;
  }

  private isFirebaseConfigured(): boolean {
    const config = (environment as { firebase?: Record<string, string | undefined> }).firebase;
    if (!config) {
      return false;
    }

    const requiredKeys: string[] = ['apiKey', 'projectId', 'appId'];
    return requiredKeys.every(key => {
      const value = config[key];
      return !!value && !value.startsWith('YOUR_');
    });
  }

  private sanitizeItems(items: unknown): ShoppingListItem[] {
    if (!Array.isArray(items)) {
      return this.itemsSignal();
    }

    const sanitized: ShoppingListItem[] = [];

    for (const raw of items) {
      if (!raw || typeof raw !== 'object') {
        continue;
      }

      const record = raw as Partial<ShoppingListItem>;
      const text = typeof record.text === 'string' ? this.normalizeText(record.text) : '';
      if (!text) {
        continue;
      }

      const check = typeof record.check === 'boolean' ? record.check : false;
      const position = typeof record.position === 'number' && Number.isFinite(record.position)
        ? record.position
        : 0;

      sanitized.push({ text, check, position });
    }

    return sanitized;
  }

  private sortItems(items: ShoppingListItem[]): ShoppingListItem[] {
    return items.slice().sort((left, right) => {
      const positionDelta = right.position - left.position;
      if (positionDelta !== 0) {
        return positionDelta;
      }
      return left.text.localeCompare(right.text);
    });
  }

  private normalizeText(text: string): string {
    return text.trim().replace(/\s+/gu, ' ').slice(0, 20);
  }

  private nextPosition(items: ShoppingListItem[]): number {
    const positions = items
      .map(item => item.position)
      .filter(position => Number.isFinite(position));
    if (positions.length === 0) {
      return 1;
    }
    return Math.max(...positions) + 1;
  }

  private encodeId(text: string): string {
    return encodeURIComponent(text);
  }

  private runInContext<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  private writeItem(item: ShoppingListItem, merge: boolean): void {
    void this.runInContext(() => setDoc(
      doc(this.firestore, this.collectionPath, this.encodeId(item.text)),
      {
        text: item.text,
        check: item.check,
        position: item.position
      },
      { merge }
    ));
  }

  private deleteItem(text: string): void {
    void this.runInContext(() => deleteDoc(
      doc(this.firestore, this.collectionPath, this.encodeId(text))
    ));
  }

  private deleteItems(texts: string[]): void {
    void this.runInContext(() => Promise.all(
      texts.map(text => deleteDoc(doc(this.firestore, this.collectionPath, this.encodeId(text))))
    ));
  }

}
