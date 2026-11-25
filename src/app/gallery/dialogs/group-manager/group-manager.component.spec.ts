import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from '../../../app.component';
import { ApplicationSettingsComponent } from '../../../shared/dialogs/application-settings/application-settings.component';
import { DialogService } from '../../../shared/services/dialog.service';
import { GalleryImage } from '../../models/gallery-image.class';
import { FilterService } from '../../services/filter.service';
import { GallerySerializationService } from '../../services/gallery-serialization.service';
import { GalleryStateService } from '../../services/gallery-state.service';
import { GroupManagerComponent } from './group-manager.component';

describe('Group Manager layout', () => {
  it('shows new thumbnails at the right edge and preserves a manual scroll offset', async () => {
    await TestBed.configureTestingModule({
      imports: [GroupManagerComponent],
      providers: [
        { provide: FilterService, useValue: { updateFilters() {} } },
        { provide: GallerySerializationService, useValue: {} }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(GroupManagerComponent);
    const image = (id: string) => Object.assign(new GalleryImage(), { id, aspectRatio: 1 });
    fixture.componentInstance.inputs = { sourceGroup: { id: 'group', images: ['a', 'b', 'c', 'd'].map(image) } };
    fixture.nativeElement.style.width = '280px';
    fixture.detectChanges();
    const strip = fixture.nativeElement.querySelector('.order-container') as HTMLElement;
    expect(strip.scrollWidth).toBeGreaterThan(strip.clientWidth);
    expect(strip.scrollLeft).toBe(0);
    const images = TestBed.inject(GalleryStateService).groupEditorGroup.images;
    images.push(image('new'));
    fixture.detectChanges();
    const lastThumbnail = () => strip.querySelector('.image-container:last-child').getBoundingClientRect();
    expect(lastThumbnail().right).toBeCloseTo(strip.getBoundingClientRect().right, 0);
    expect(lastThumbnail().left).toBeGreaterThanOrEqual(strip.getBoundingClientRect().left);
    strip.scrollLeft = -160;
    images.push(image('another'));
    fixture.detectChanges();
    expect(strip.scrollLeft).toBe(-160);
    expect(lastThumbnail().left).toBeGreaterThan(strip.getBoundingClientRect().right);
  });

  it('reserves space below the gallery on mobile and releases it on close', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: FilterService, useValue: { updateFilters() {} } },
        { provide: GallerySerializationService, useValue: {} }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    const root: HTMLElement = fixture.nativeElement;
    document.body.prepend(root);
    root.style.height = '100dvh';
    fixture.detectChanges();
    const gallery = root.querySelector<HTMLElement>('.app-content');
    const galleryHeight = gallery.clientHeight;
    const closed = TestBed.inject(DialogService).create(GroupManagerComponent, { sourceGroup: null });
    TestBed.tick();
    const panel = root.querySelector<HTMLElement>('app-dialog-container .dialog-container');
    const mobile = matchMedia('(max-width: 1280px)').matches;
    expect(panel.querySelector('app-group-manager').textContent.trim()).toBe('No Images in Group');
    expect(getComputedStyle(panel.querySelector('.header')).display).toBe(mobile ? 'none' : 'flex');
    const expectDocked = () => {
      expect(panel.getBoundingClientRect().top).toBeCloseTo(gallery.getBoundingClientRect().bottom, 0);
      expect(panel.getBoundingClientRect().bottom).toBeCloseTo(root.getBoundingClientRect().bottom, 0);
      expect(gallery.clientHeight).toBeGreaterThan(root.clientHeight / 3);
    };
    if (mobile) {
      expectDocked();
      const style = getComputedStyle(panel);
      expect(style.borderWidth).toBe('1px 0px 0px');
      expect(style.borderRadius).toBe('0px');
      expect(getComputedStyle(panel.querySelector('app-group-manager')).minHeight).toBe('120px');
    }
    const emptyHeight = panel.clientHeight;
    const group = TestBed.inject(GalleryStateService).groupEditorGroup;
    group.images.push(Object.assign(new GalleryImage(), { id: 'selected', aspectRatio: 1 }));
    TestBed.tick();
    if (mobile) {
      expectDocked();
      expect(panel.clientHeight).toBe(emptyHeight);
    } else {
      expect(gallery.clientHeight).toBe(galleryHeight);
      expect(getComputedStyle(panel).position).toBe('absolute');
    }
    const cancel = Array.from(panel.querySelectorAll<HTMLElement>('.buttons .button'))
      .find(button => button.textContent.trim() === 'Cancel');
    expect(cancel.getBoundingClientRect().height).toBeGreaterThan(0);
    const settingsClosed = TestBed.inject(DialogService).create(ApplicationSettingsComponent);
    TestBed.tick();
    const settings = root.querySelector('app-application-settings').closest<HTMLElement>('app-dialog-container');
    expect(settings.inert).toBeFalse();
    expect(panel.closest<HTMLElement>('app-dialog-container').inert).toBe(mobile);
    if (mobile) {
      const rect = cancel.getBoundingClientRect();
      expect(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)).not.toBe(cancel);
    }
    settings.querySelector<HTMLElement>('.buttons .button').click();
    await settingsClosed;
    TestBed.tick();
    expect(panel.closest<HTMLElement>('app-dialog-container').inert).toBeFalse();
    cancel.click();
    await closed;
    expect(gallery.clientHeight).toBe(galleryHeight);
  });
});
