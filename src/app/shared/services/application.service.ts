import { Injectable, Signal, signal, WritableSignal } from "@angular/core";

export type HeaderClasses = string | string[] | Set<string> | { [key: string]: boolean | number | string };

export interface HeaderAction {
  id: string;
  classes: HeaderClasses | (() => HeaderClasses);
  tooltip?: string;
  onClick?: () => void;
  containerClasses?: HeaderClasses | (() => HeaderClasses);
  hidden?: boolean | (() => boolean);
}

export interface HeaderConfig {
  start?: HeaderAction[];
  center?: HeaderAction[];
  end?: HeaderAction[];
}

export interface ApplicationSettings {
  darkMode: boolean;
  lowBandwidth: boolean;
}

export interface ModuleSettingsProvider {
  id: string;
  label: string;
  items: SettingsItem[];
}

export type SettingsItem = SettingsToggle | SettingsAction;

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

@Injectable({
  providedIn: 'root',
})
export class ApplicationService {

  private readonly APP_SETTINGS_KEY: string = 'APPLICATION_SETTINGS';

  private persistentHeader: HeaderConfig = this.createEmptyHeader();
  private pageHeader: HeaderConfig = this.createEmptyHeader();
  private readonly headerCollector: WritableSignal<HeaderConfig> = signal(this.createEmptyHeader());
  public readonly header: Signal<HeaderConfig> = this.headerCollector.asReadonly();

  private readonly appSettings: WritableSignal<ApplicationSettings> = signal(this.loadAppSettings());
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

  public get reduceBandwidth(): boolean {
    return this.appSettings().lowBandwidth;
  }

  public set reduceBandwidth(reduceBandwidth: boolean) {
    this.setLowBandwidth(reduceBandwidth);
  }

  public setLowBandwidth(lowBandwidth: boolean): void {
    this.setAppSettings({ lowBandwidth });
  }

  public setPersistentHeader(config: HeaderConfig): void {
    this.persistentHeader = this.cloneHeader(config);
    this.updateHeader();
  }

  public setPageHeader(config: HeaderConfig): void {
    this.pageHeader = this.cloneHeader(config);
    this.updateHeader();
  }

  public clearPageHeader(): void {
    this.pageHeader = this.createEmptyHeader();
    this.updateHeader();
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

  public getApplicationSettings(): Signal<ApplicationSettings> {
    return this.appSettings.asReadonly();
  }

  public getApplicationSettingsItems(): SettingsItem[] {
    return [{
      id: 'dark-mode',
      type: 'toggle',
      label: 'Dark Mode',
      getValue: () => this.isDarkTheme(),
      onChange: value => this.setDarkMode(value)
    }, {
      id: 'low-bandwidth',
      type: 'toggle',
      label: 'Low Bandwidth Mode',
      getValue: () => this.reduceBandwidth,
      onChange: value => this.setLowBandwidth(value)
    }];
  }

  private updateHeader(): void {
    this.headerCollector.set({
      start: [...(this.persistentHeader.start ?? []), ...(this.pageHeader.start ?? [])],
      center: [...(this.persistentHeader.center ?? []), ...(this.pageHeader.center ?? [])],
      end: [...(this.pageHeader.end ?? []), ...(this.persistentHeader.end ?? [])]
    });
  }

  private cloneHeader(config: HeaderConfig): HeaderConfig {
    return {
      start: [...(config.start ?? [])],
      center: [...(config.center ?? [])],
      end: [...(config.end ?? [])]
    };
  }

  private createEmptyHeader(): HeaderConfig {
    return { start: [], center: [], end: [] };
  }

  private setAppSettings(settings: Partial<ApplicationSettings>): void {
    const merged: ApplicationSettings = { ...this.appSettings(), ...settings };
    this.appSettings.set(merged);
    this.persistSettings(merged);
    this.applyTheme(merged.darkMode);
  }

  private loadAppSettings(): ApplicationSettings {
    const stored: string = window.localStorage.getItem(this.APP_SETTINGS_KEY);
    if (stored) {
      try {
        const parsed: ApplicationSettings = JSON.parse(stored);
        if (parsed && typeof parsed.darkMode === 'boolean' && typeof parsed.lowBandwidth === 'boolean') {
          return parsed;
        }
      } catch { /* ignore */ }
    }

    const legacyLowBandwidth: boolean = window.localStorage.getItem('REDUCE_BANDWIDTH') == '1';
    return { darkMode: true, lowBandwidth: legacyLowBandwidth };
  }

  private persistSettings(settings: ApplicationSettings): void {
    window.localStorage.setItem(this.APP_SETTINGS_KEY, JSON.stringify(settings));
    window.localStorage.setItem('REDUCE_BANDWIDTH', settings.lowBandwidth ? '1' : '0');
  }

  private applyTheme(darkMode: boolean): void {
    document.body.classList.toggle('dark-theme', darkMode);
    document.body.classList.toggle('light-theme', !darkMode);
    document.body.style.colorScheme = darkMode ? 'dark' : 'light';
  }

}
