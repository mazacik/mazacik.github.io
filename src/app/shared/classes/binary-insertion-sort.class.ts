import { signal, WritableSignal } from '@angular/core';
import { ArrayUtils } from '../utils/array.utils';

export interface ActiveInsertion {
  imageId: string;
  low: number;
  high: number;
}

export interface SortState {
  rankedImageIds: string[];
  pendingImageIds: string[];
  activeInsertion: ActiveInsertion | null;
}

export interface SortOverlayIds {
  winners: string[];
  losers: string[];
  uncertain: string[];
}

export class BinaryInsertionSort {
  public readonly stateVersion: WritableSignal<number> = signal(0);

  private imageIds: string[] = [];
  private state: SortState = this.createEmptyState();

  public start(imageIds: string[], state?: SortState | null): void {
    this.imageIds = this.uniqueIds(imageIds);
    this.state = this.normalizeState(state);
    this.advance();
    this.notify();
  }

  public getState(): SortState {
    return this.cloneState(this.state);
  }

  public get rankedImageIds(): string[] {
    return this.state.rankedImageIds;
  }

  public get pendingImageIds(): string[] {
    return this.state.pendingImageIds;
  }

  public get activeInsertion(): ActiveInsertion | null {
    return this.state.activeInsertion;
  }

  public get currentComparisonIds(): [string, string] | null {
    const activeInsertion = this.state.activeInsertion;
    if (!activeInsertion || activeInsertion.low >= activeInsertion.high) {
      return null;
    }

    const mid = this.getCurrentMid();
    const opponentId = this.state.rankedImageIds[mid];
    return opponentId ? [activeInsertion.imageId, opponentId] : null;
  }

  public get pendingCountIncludingActive(): number {
    return this.state.pendingImageIds.length + (this.state.activeInsertion ? 1 : 0);
  }

  public get currentIntervalSize(): number {
    const activeInsertion = this.state.activeInsertion;
    return activeInsertion ? activeInsertion.high - activeInsertion.low + 1 : 0;
  }

  public answer(winnerImageId: string): void {
    const activeInsertion = this.state.activeInsertion;
    const currentComparison = this.currentComparisonIds;
    if (!activeInsertion || !currentComparison) {
      return;
    }

    const [activeImageId, opponentId] = currentComparison;
    const mid = this.getCurrentMid();
    if (winnerImageId === activeImageId) {
      activeInsertion.high = mid;
    } else if (winnerImageId === opponentId) {
      activeInsertion.low = mid + 1;
    } else {
      return;
    }

    this.advance();
    this.notify();
  }

  public addImageIds(imageIds: string[]): void {
    const knownIds = this.getKnownIdSet();
    const newIds = this.uniqueIds(imageIds).filter(id => !knownIds.has(id));
    if (!newIds.length) {
      return;
    }

    this.imageIds = this.uniqueIds([...this.imageIds, ...newIds]);
    this.state.pendingImageIds = ArrayUtils.shuffle([...this.state.pendingImageIds, ...newIds]);
    this.advance();
    this.notify();
  }

  public removeImageId(imageId: string): void {
    let changed = false;

    if (this.removeFromArray(this.imageIds, imageId)) {
      changed = true;
    }

    if (this.removeFromArray(this.state.pendingImageIds, imageId)) {
      changed = true;
    }

    if (this.state.activeInsertion?.imageId === imageId) {
      this.state.activeInsertion = null;
      changed = true;
    }

    if (this.removeFromArray(this.state.rankedImageIds, imageId)) {
      this.restartActiveInsertion();
      changed = true;
    }

    if (!changed) {
      return;
    }

    this.advance();
    this.notify();
  }

  public resetActiveInsertion(): void {
    if (!this.state.activeInsertion) {
      return;
    }

    this.restartActiveInsertion();
    this.advance();
    this.notify();
  }

  public moveRankedImageToPending(imageId: string): void {
    if (!this.removeFromArray(this.state.rankedImageIds, imageId)) {
      return;
    }

    if (this.state.activeInsertion?.imageId !== imageId && !this.state.pendingImageIds.includes(imageId)) {
      this.insertAtRandomPendingPosition(imageId);
    }

    this.restartActiveInsertion();
    this.advance();
    this.notify();
  }

  public getOverlayIds(imageId: string): SortOverlayIds {
    if (this.state.activeInsertion?.imageId === imageId) {
      return this.getActiveOverlayIds();
    }

    return this.getRankedOverlayIds(imageId);
  }

  public getRankedOverlayIds(imageId: string): SortOverlayIds {
    const index = this.state.rankedImageIds.indexOf(imageId);
    if (index === -1) {
      return { winners: [], losers: [], uncertain: [] };
    }

    return {
      winners: this.state.rankedImageIds.slice(0, index),
      losers: this.state.rankedImageIds.slice(index + 1),
      uncertain: []
    };
  }

  public getActiveOverlayIds(): SortOverlayIds {
    const activeInsertion = this.state.activeInsertion;
    if (!activeInsertion) {
      return { winners: [], losers: [], uncertain: [] };
    }

    return {
      winners: this.state.rankedImageIds.slice(0, activeInsertion.low),
      losers: this.state.rankedImageIds.slice(activeInsertion.high),
      uncertain: this.state.rankedImageIds.slice(activeInsertion.low, activeInsertion.high)
    };
  }

  public getPathIds(startId: string, endId: string): string[] {
    if (!startId || !endId) {
      return [];
    }

    if (startId === endId) {
      return [startId];
    }

    const rankedStartIndex = this.state.rankedImageIds.indexOf(startId);
    const rankedEndIndex = this.state.rankedImageIds.indexOf(endId);
    if (rankedStartIndex >= 0 && rankedEndIndex >= 0) {
      return this.getRankedPathIds(rankedStartIndex, rankedEndIndex);
    }

    const activeInsertion = this.state.activeInsertion;
    if (!activeInsertion) {
      return [];
    }

    if (startId === activeInsertion.imageId && rankedEndIndex >= activeInsertion.high) {
      return [startId, ...this.state.rankedImageIds.slice(activeInsertion.high, rankedEndIndex + 1)];
    }

    if (endId === activeInsertion.imageId && rankedStartIndex >= 0 && rankedStartIndex < activeInsertion.low) {
      return [...this.state.rankedImageIds.slice(rankedStartIndex, activeInsertion.low), endId];
    }

    return [];
  }

  private advance(): void {
    while (true) {
      const activeInsertion = this.state.activeInsertion;
      if (activeInsertion && activeInsertion.low === activeInsertion.high) {
        this.state.rankedImageIds.splice(activeInsertion.low, 0, activeInsertion.imageId);
        this.state.activeInsertion = null;
        continue;
      }

      if (this.state.activeInsertion || !this.state.pendingImageIds.length) {
        return;
      }

      const nextImageId = this.state.pendingImageIds.shift();
      if (!nextImageId) {
        return;
      }

      if (!this.state.rankedImageIds.length) {
        this.state.rankedImageIds.push(nextImageId);
        continue;
      }

      this.state.activeInsertion = {
        imageId: nextImageId,
        low: 0,
        high: this.state.rankedImageIds.length
      };
    }
  }

  private normalizeState(state?: SortState | null): SortState {
    const validIds = new Set(this.imageIds);
    const rankedImageIds = this.uniqueIds(state?.rankedImageIds ?? []).filter(id => validIds.has(id));
    const usedIds = new Set(rankedImageIds);

    let activeInsertion: ActiveInsertion | null = null;
    if (state?.activeInsertion?.imageId && validIds.has(state.activeInsertion.imageId) && !usedIds.has(state.activeInsertion.imageId)) {
      activeInsertion = {
        imageId: state.activeInsertion.imageId,
        low: this.clampIndex(state.activeInsertion.low ?? 0, rankedImageIds.length),
        high: this.clampIndex(state.activeInsertion.high ?? rankedImageIds.length, rankedImageIds.length)
      };

      if (activeInsertion.low > activeInsertion.high) {
        activeInsertion.low = activeInsertion.high;
      }

      usedIds.add(activeInsertion.imageId);
    }

    const pendingImageIds = this.uniqueIds(state?.pendingImageIds ?? []).filter(id => validIds.has(id) && !usedIds.has(id));
    pendingImageIds.forEach(id => usedIds.add(id));

    const missingIds = this.imageIds.filter(id => !usedIds.has(id));
    return {
      rankedImageIds,
      pendingImageIds: missingIds.length ? ArrayUtils.shuffle([...pendingImageIds, ...missingIds]) : pendingImageIds,
      activeInsertion
    };
  }

  private restartActiveInsertion(): void {
    if (!this.state.activeInsertion) {
      return;
    }

    this.state.activeInsertion = {
      imageId: this.state.activeInsertion.imageId,
      low: 0,
      high: this.state.rankedImageIds.length
    };
  }

  private insertAtRandomPendingPosition(imageId: string): void {
    const index = Math.floor(Math.random() * (this.state.pendingImageIds.length + 1));
    this.state.pendingImageIds.splice(index, 0, imageId);
  }

  private getRankedPathIds(startIndex: number, endIndex: number): string[] {
    if (startIndex <= endIndex) {
      return this.state.rankedImageIds.slice(startIndex, endIndex + 1);
    }

    return this.state.rankedImageIds.slice(endIndex, startIndex + 1).reverse();
  }

  private getCurrentMid(): number {
    const activeInsertion = this.state.activeInsertion;
    return Math.floor((activeInsertion.low + activeInsertion.high) / 2);
  }

  private getKnownIdSet(): Set<string> {
    const ids = new Set(this.state.rankedImageIds);
    this.state.pendingImageIds.forEach(id => ids.add(id));
    if (this.state.activeInsertion) {
      ids.add(this.state.activeInsertion.imageId);
    }
    return ids;
  }

  private uniqueIds(imageIds: string[]): string[] {
    return ArrayUtils.distinct((imageIds ?? []).filter(Boolean), id => id);
  }

  private clampIndex(index: number, length: number): number {
    return Math.max(0, Math.min(length, Number.isFinite(index) ? index : 0));
  }

  private removeFromArray(array: string[], imageId: string): boolean {
    const index = array.indexOf(imageId);
    if (index === -1) {
      return false;
    }

    array.splice(index, 1);
    return true;
  }

  private createEmptyState(): SortState {
    return {
      rankedImageIds: [],
      pendingImageIds: [],
      activeInsertion: null
    };
  }

  private cloneState(state: SortState): SortState {
    return {
      rankedImageIds: [...state.rankedImageIds],
      pendingImageIds: [...state.pendingImageIds],
      activeInsertion: state.activeInsertion ? { ...state.activeInsertion } : null
    };
  }

  private notify(): void {
    this.stateVersion.update(version => version + 1);
  }
}
