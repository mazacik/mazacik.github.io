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
  private comparisonOpponentIndexOverride: number | null = null;

  public start(imageIds: string[], state?: SortState | null): void {
    this.imageIds = this.uniqueIds(imageIds);
    this.state = this.normalizeState(state);
    this.clearComparisonOpponentIndexOverride();
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

    const opponentIndex = this.getCurrentComparisonIndex();
    const opponentId = this.state.rankedImageIds[opponentIndex];
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
    const opponentIndex = this.getCurrentComparisonIndex();
    if (winnerImageId === activeImageId) {
      activeInsertion.high = opponentIndex;
    } else if (winnerImageId === opponentId) {
      activeInsertion.low = opponentIndex + 1;
    } else {
      return;
    }

    this.clearComparisonOpponentIndexOverride();
    this.advance();
    this.notify();
  }

  public canCompareAgainstRankedImage(imageId: string): boolean {
    return this.isValidComparisonOpponentIndex(this.state.rankedImageIds.indexOf(imageId));
  }

  public setComparisonOpponent(imageId: string): boolean {
    const opponentIndex = this.state.rankedImageIds.indexOf(imageId);
    if (!this.isValidComparisonOpponentIndex(opponentIndex)) {
      return false;
    }

    if (this.comparisonOpponentIndexOverride === opponentIndex) {
      return true;
    }

    this.comparisonOpponentIndexOverride = opponentIndex;
    this.notify();
    return true;
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

    this.clearComparisonOpponentIndexOverride();
    this.advance();
    this.notify();
  }

  public resetActiveInsertion(): void {
    if (!this.state.activeInsertion) {
      return;
    }

    this.restartActiveInsertion();
    this.clearComparisonOpponentIndexOverride();
    this.advance();
    this.notify();
  }

  public skipActiveInsertion(): void {
    const activeInsertion = this.state.activeInsertion;
    if (!activeInsertion) {
      return;
    }

    this.state.activeInsertion = null;
    this.state.pendingImageIds.push(activeInsertion.imageId);
    this.clearComparisonOpponentIndexOverride();
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
    this.clearComparisonOpponentIndexOverride();
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

  private advance(): void {
    while (true) {
      const activeInsertion = this.state.activeInsertion;
      if (activeInsertion && activeInsertion.low === activeInsertion.high) {
        this.state.rankedImageIds.splice(activeInsertion.low, 0, activeInsertion.imageId);
        this.state.activeInsertion = null;
        this.clearComparisonOpponentIndexOverride();
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
      this.clearComparisonOpponentIndexOverride();
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

  private getCurrentMid(): number {
    const activeInsertion = this.state.activeInsertion;
    return Math.floor((activeInsertion.low + activeInsertion.high) / 2);
  }

  private getCurrentComparisonIndex(): number {
    return this.isValidComparisonOpponentIndex(this.comparisonOpponentIndexOverride)
      ? this.comparisonOpponentIndexOverride
      : this.getCurrentMid();
  }

  private isValidComparisonOpponentIndex(index: number | null): boolean {
    const activeInsertion = this.state.activeInsertion;
    return !!activeInsertion
      && index !== null
      && index >= activeInsertion.low
      && index < activeInsertion.high
      && !!this.state.rankedImageIds[index];
  }

  private clearComparisonOpponentIndexOverride(): void {
    this.comparisonOpponentIndexOverride = null;
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
