import { Injectable, Signal, signal, WritableSignal } from "@angular/core";
import { AppConstants } from "../constants/app.constants";

export type HeaderClasses = string | string[] | Set<string> | { [key: string]: boolean | number | string };
export type HeaderSection = 'start' | 'center' | 'end';

export interface HeaderAction {
  id: string;
  classes: HeaderClasses | (() => HeaderClasses);
  tooltip?: string | (() => string);
  onClick?: () => void;
  disabled?: boolean | (() => boolean);
  hidden?: boolean | (() => boolean);
}

export interface HeaderConfig {
  start?: HeaderAction[];
  center?: HeaderAction[];
  end?: HeaderAction[];
}

export interface SettingsToggle {
  id: string;
  type: 'toggle';
  label: string;
  getValue: () => boolean;
  onChange: (value: boolean) => void;
}

export interface SettingsAction {
  id: string;
  type: 'action';
  label: string;
  onClick: () => void;
}

export type SettingsItem = SettingsToggle | SettingsAction;

export interface ModuleSettingsProvider {
  id: string;
  label: string;
  items: SettingsItem[];
}

export interface ApplicationSettings extends ModuleSettingsProvider {
}

export interface ApplicationSettingsState {
  darkMode: boolean;
  reduceDataUsage: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ApplicationService {

  private readonly headerSections: HeaderSection[] = ['start', 'center', 'end'];
  private headerState: HeaderConfig = this.createEmptyHeader();
  private readonly headerCollector: WritableSignal<HeaderConfig> = signal(this.createEmptyHeader());
  public readonly header: Signal<HeaderConfig> = this.headerCollector.asReadonly();

  private readonly appSettings: WritableSignal<ApplicationSettingsState> = signal(this.loadAppSettings());
  private readonly applicationSettings: ApplicationSettings = {
    id: 'app',
    label: 'Application',
    items: [{
      id: 'dark-mode',
      type: 'toggle',
      label: 'Dark Mode',
      getValue: () => this.isDarkTheme(),
      onChange: value => this.setDarkMode(value)
    }, {
      id: 'reduce-data-usage',
      type: 'toggle',
      label: 'Reduce Data Usage',
      getValue: () => this.reduceDataUsage,
      onChange: value => this.reduceDataUsage = value
    }]
  };
  private readonly moduleSettingsProviders: ModuleSettingsProvider[] = [];

  public loading: WritableSignal<boolean> = signal(true);
  public changes: WritableSignal<boolean> = signal(undefined);
  public errors: WritableSignal<boolean> = signal(undefined);

  constructor() {
    this.applyTheme(this.appSettings().darkMode);
    this.persistSettings(this.appSettings());
    this.updateHeader();
  }

  public isDarkTheme(): boolean {
    return this.appSettings().darkMode;
  }

  public setDarkMode(darkMode: boolean): void {
    this.setAppSettings({ darkMode });
  }

  public toggleTheme(): void {
    this.setAppSettings({ darkMode: !this.appSettings().darkMode });
  }

  public get reduceDataUsage(): boolean {
    return this.appSettings().reduceDataUsage;
  }

  public set reduceDataUsage(reduceDataUsage: boolean) {
    this.setAppSettings({ reduceDataUsage });
  }

  public addHeaderButton(section: HeaderSection, action: HeaderAction, position: 'first' | 'last' = 'last'): void {
    this.addHeaderButtons(section, [action], position);
  }

  public addHeaderButtons(section: HeaderSection, actions: HeaderAction[], position: 'first' | 'last' = section === 'end' ? 'first' : 'last'): void {
    const existing = this.headerState[section] ?? [];
    const filteredExisting = existing.filter(action => !actions.some(newAction => newAction.id === action.id));

    if (position === 'first') {
      this.headerState[section] = [...actions, ...filteredExisting];
    } else {
      this.headerState[section] = [...filteredExisting, ...actions];
    }

    this.updateHeader();
  }

  public removeHeaderButtons(ids: string[]): void {
    let headerChanged: boolean = false;

    this.headerSections.forEach(currentSection => {
      const existing = this.headerState[currentSection] ?? [];
      const filtered = existing.filter(action => !ids.includes(action.id));

      if (filtered.length !== existing.length) {
        this.headerState[currentSection] = filtered;
        headerChanged = true;
      }
    });

    if (headerChanged) {
      this.updateHeader();
    }
  }

  public registerModuleSettings(provider: ModuleSettingsProvider): void {
    const index: number = this.moduleSettingsProviders.findIndex(p => p.id === provider.id);
    if (index >= 0) {
      this.moduleSettingsProviders[index] = provider;
    } else {
      this.moduleSettingsProviders.push(provider);
    }
  }

  public getRegisteredModuleSettings(): ModuleSettingsProvider[] {
    return this.moduleSettingsProviders;
  }

  public getApplicationSettings(): ApplicationSettings {
    return this.applicationSettings;
  }

  public getApplicationSettingsState(): Signal<ApplicationSettingsState> {
    return this.appSettings.asReadonly();
  }

  public getApplicationSettingsItems(): SettingsItem[] {
    return this.applicationSettings.items;
  }

  private updateHeader(): void {
    this.headerCollector.set({
      start: [...(this.headerState.start ?? [])],
      center: [...(this.headerState.center ?? [])],
      end: [...(this.headerState.end ?? [])]
    });
  }

  private createEmptyHeader(): HeaderConfig {
    return { start: [], center: [], end: [] };
  }

  private setAppSettings(settings: Partial<ApplicationSettingsState>): void {
    const merged: ApplicationSettingsState = { ...this.appSettings(), ...settings };
    this.appSettings.set(merged);
    this.persistSettings(merged);
    this.applyTheme(merged.darkMode);
  }

  private loadAppSettings(): ApplicationSettingsState {
    const stored: string = localStorage.getItem(AppConstants.KEY_SETTINGS);
    if (stored) {
      try {
        const parsed: ApplicationSettingsState = JSON.parse(stored);
        if (parsed && typeof parsed.darkMode === 'boolean' && typeof parsed.reduceDataUsage === 'boolean') {
          return parsed;
        }
      } catch { /* ignore */ }
    }

    return { darkMode: true, reduceDataUsage: false };
  }

  private persistSettings(settings: ApplicationSettingsState): void {
    localStorage.setItem(AppConstants.KEY_SETTINGS, JSON.stringify(settings));
  }

  private applyTheme(darkMode: boolean): void {
    document.body.classList.toggle('dark-theme', darkMode);
    document.body.classList.toggle('light-theme', !darkMode);
    document.body.style.colorScheme = darkMode ? 'dark' : 'light';
  }

}
