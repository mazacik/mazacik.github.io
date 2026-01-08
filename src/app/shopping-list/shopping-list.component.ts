import { CommonModule } from '@angular/common';
import { Component, computed, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../shared/services/application.service';
import { ApplicationSettingsComponent } from '../shared/dialogs/application-settings/application-settings.component';
import { DialogService } from '../shared/services/dialog.service';
import { ShoppingListItem, ShoppingListService } from './shopping-list.service';

@Component({
  selector: 'app-shopping-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './shopping-list.component.html',
  styleUrls: ['./shopping-list.component.scss']
})
export class ShoppingListComponent implements OnInit, OnDestroy {

  protected draft: string = '';
  protected readonly items = this.shoppingListService.items;
  protected readonly connectionState = this.shoppingListService.connectionState;
  protected readonly completedCount = computed(() => this.items().filter(item => item.check).length);

  constructor(
    private shoppingListService: ShoppingListService,
    private applicationService: ApplicationService,
    private dialogService: DialogService
  ) {
    this.applicationService.loading.set(false);
  }

  ngOnInit(): void {
    this.shoppingListService.connect();
    this.configureHeader();
  }

  ngOnDestroy(): void {
    this.shoppingListService.disconnect();
    this.applicationService.removeHeaderButtons(['shopping-reset', 'shopping-status']);
  }

  protected addItem(): void {
    const trimmed = this.draft.trim();
    if (!trimmed) {
      return;
    }

    this.shoppingListService.addItem(trimmed);
    this.draft = '';
  }

  protected toggleItem(item: ShoppingListItem): void {
    this.shoppingListService.toggleItem(item.text);
  }

  protected removeItem(item: ShoppingListItem): void {
    this.shoppingListService.removeItem(item.text);
  }

  protected clearCompleted(): void {
    this.shoppingListService.clearCompleted();
  }

  protected getConnectionLabel(): string {
    switch (this.connectionState()) {
      case 'connected':
        return 'Live';
      case 'connecting':
        return 'Connecting';
      default:
        return 'Offline';
    }
  }

  private getConnectionClass(): string {
    switch (this.connectionState()) {
      case 'connected':
        return 'positive';
      case 'connecting':
        return 'highlight';
      default:
        return 'negative';
    }
  }

  private configureHeader(): void {
    this.applicationService.addHeaderButtons('center', [{
      id: 'shopping-status',
      tooltip: () => this.getConnectionLabel(),
      classes: () => ['fa-solid', 'fa-circle', 'fa-sm', 'border-transparent', 'pointer-events-none', this.getConnectionClass()]
    }]);

    this.applicationService.addHeaderButtons('end', [{
      id: 'shopping-reset',
      tooltip: 'Reset',
      classes: ['fa-solid', 'fa-trash'],
      onClick: () => this.clearCompleted(),
      disabled: () => this.completedCount() === 0
    }, {
      id: 'open-settings',
      tooltip: 'Settings',
      classes: ['fa-solid', 'fa-gear'],
      onClick: () => this.dialogService.create(ApplicationSettingsComponent)
    }]);
  }

}
