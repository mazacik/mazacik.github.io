import { Injectable, Signal, signal, WritableSignal } from "@angular/core";
import { AppConstants } from "../constants/app.constants";
import { DialogService } from "./dialog.service";

export type HeaderClasses = string | string[];
export const HEADER_SECTIONS = ['start', 'start-center', 'center', 'center-end', 'end'] as const;
export type HeaderSection = typeof HEADER_SECTIONS[number];

export interface HeaderAction {
  id: string;
  classes: HeaderClasses | (() => HeaderClasses);
  tooltip?: string | (() => string);
  count?: () => number;
  onClick?: () => void;
  onContextMenu?: () => void;
  disabled?: boolean | (() => boolean);
  hidden?: boolean | (() => boolean);
}

export type HeaderConfig = Partial<Record<HeaderSection, HeaderAction[]>>;

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
  darkTheme: boolean;
  reduceDataUsage: boolean;
  mobileHeaderAtBottom: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ApplicationService {

  private headerState: HeaderConfig = {};
  private readonly headerCollector: WritableSignal<HeaderConfig> = signal({});
  public readonly header: Signal<HeaderConfig> = this.headerCollector.asReadonly();
  public readonly mobileSettingsOpen = this.dialogService.mobileSettingsOpen;

  private readonly appSettings: WritableSignal<ApplicationSettingsState> = signal(this.loadAppSettings());
  private readonly applicationSettings: ApplicationSettings = {
    id: 'app',
    label: 'Application',
    items: [{
      id: 'dark-theme',
      type: 'toggle',
      label: 'Dark Theme',
      getValue: () => this.darkTheme,
      onChange: value => this.darkTheme = value
    }, {
      id: 'reduce-data-usage',
      type: 'toggle',
      label: 'Reduce Data Usage',
      getValue: () => this.reduceDataUsage,
      onChange: value => this.reduceDataUsage = value
    }, {
      id: 'mobile-header-at-bottom',
      type: 'toggle',
      label: 'Show Header at Bottom on Mobile',
      getValue: () => this.mobileHeaderAtBottom,
      onChange: value => this.setAppSettings({ mobileHeaderAtBottom: value })
    }, {
      id: 'reset-dialog-positions',
      type: 'action',
      label: 'Reset Dialog Positions',
      onClick: () => this.resetDialogPositions()
    }]
  };
  private readonly moduleSettingsProviders: ModuleSettingsProvider[] = [];

  public loading: WritableSignal<boolean> = signal(true);
  public changes: WritableSignal<boolean> = signal(undefined);
  public errors: WritableSignal<boolean> = signal(undefined);

  constructor(
    private dialogService: DialogService
  ) {
    this.applyTheme(this.appSettings().darkTheme);
    this.persistSettings(this.appSettings());
    this.updateHeader();
  }

  public get darkTheme(): boolean {
    return this.appSettings().darkTheme;
  }

  public set darkTheme(darkTheme: boolean) {
    this.setAppSettings({ darkTheme: darkTheme });
  }

  public toggleTheme(): void {
    this.setAppSettings({ darkTheme: !this.appSettings().darkTheme });
  }

  public get reduceDataUsage(): boolean {
    return this.appSettings().reduceDataUsage;
  }

  public set reduceDataUsage(reduceDataUsage: boolean) {
    this.setAppSettings({ reduceDataUsage });
  }

  public get mobileHeaderAtBottom(): boolean {
    return this.appSettings().mobileHeaderAtBottom;
  }

  public addHeaderButton(section: HeaderSection, action: HeaderAction, position: 'first' | 'last' = 'last'): void {
    this.addHeaderButtons(section, [action], position);
  }

  public addHeaderButtons(section: HeaderSection, actions: HeaderAction[], position: 'first' | 'last' = section === 'end' ? 'first' : 'last'): () => void {
    const existing = this.headerState[section] ?? [];
    const filteredExisting = existing.filter(action => !actions.some(newAction => newAction.id === action.id));

    if (position === 'first') {
      this.headerState[section] = [...actions, ...filteredExisting];
    } else {
      this.headerState[section] = [...filteredExisting, ...actions];
    }

    this.updateHeader();
    return () => {
      this.headerState[section] = this.headerState[section].filter(action => !actions.includes(action));
      this.updateHeader();
    };
  }

  public removeHeaderButtons(ids: string[]): void {
    let headerChanged: boolean = false;

    HEADER_SECTIONS.forEach(currentSection => {
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
    const header: HeaderConfig = {};
    for (const section of HEADER_SECTIONS) {
      header[section] = [...(this.headerState[section] ?? [])];
    }
    this.headerCollector.set(header);
  }

  private setAppSettings(settings: Partial<ApplicationSettingsState>): void {
    const merged: ApplicationSettingsState = { ...this.appSettings(), ...settings };
    this.appSettings.set(merged);
    this.persistSettings(merged);
    this.applyTheme(merged.darkTheme);
  }

  private loadAppSettings(): ApplicationSettingsState {
    const stored: string = localStorage.getItem(AppConstants.KEY_SETTINGS);
    const fallbackDarkTheme: boolean = window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;

    if (stored) {
      try {
        const parsed: Partial<ApplicationSettingsState> = JSON.parse(stored);
        if (parsed) {
          return {
            darkTheme: typeof parsed.darkTheme === 'boolean' ? parsed.darkTheme : fallbackDarkTheme,
            reduceDataUsage: typeof parsed.reduceDataUsage === 'boolean' ? parsed.reduceDataUsage : false,
            mobileHeaderAtBottom: parsed.mobileHeaderAtBottom === true
          };
        }
      } catch { /* ignore */ }
    }

    return { darkTheme: fallbackDarkTheme, reduceDataUsage: false, mobileHeaderAtBottom: false };
  }

  private persistSettings(settings: ApplicationSettingsState): void {
    localStorage.setItem(AppConstants.KEY_SETTINGS, JSON.stringify(settings));
  }

  private applyTheme(darkTheme: boolean): void {
    document.documentElement.classList.toggle('dark-theme', darkTheme);
    document.documentElement.classList.toggle('light-theme', !darkTheme);
    document.documentElement.style.colorScheme = darkTheme ? 'dark' : 'light';
  }

  private resetDialogPositions(): void {
    for (let i = 0; i < localStorage.length; i++) {
      const key: string = localStorage.key(i);
      if (key.endsWith('.centerX') || key.endsWith('.centerY')) {
        localStorage.removeItem(key);
      }
    }

    this.dialogService.containerComponentInstances.forEach(instance => instance.resetPosition());
  }

}
