import { DialogService } from 'src/app/shared/services/dialog.service';
import { TagCreateComponent, TagCreateInputs } from '../dialogs/tag-create/tag-create.component';
import { Tag } from '../models/tag.class';
import { GallerySerializationService } from './gallery-serialization.service';
import { TagService } from './tag.service';

describe('Gallery tag creation', () => {
  let service: TagService;
  let create: jasmine.Spy;
  let save: jasmine.Spy;
  let animals: Tag;
  let dogs: Tag;

  function add(name: string, group: boolean, parent: Tag | null = null): Tag {
    const tag = Object.assign(new Tag(), { id: name + service.tags.length, name, group, parent, children: [], state: 0 });
    parent?.children.push(tag);
    service.tags.push(tag);
    return tag;
  }

  beforeEach(() => {
    create = jasmine.createSpy('create').and.resolveTo(undefined);
    save = jasmine.createSpy('save');
    service = new TagService(null, { create } as unknown as DialogService, null, { save } as unknown as GallerySerializationService);
    animals = add('Animals', true);
    dogs = add('Dogs', true, animals);
  });

  for (const group of [false, true]) {
    const label = group ? 'tag group' : 'tag';
    const open = (parent?: Tag) => group ? service.openTagGroupCreate(parent) : service.openTagCreate(parent);

    it(`creates a ${label} under the selected nested parent and saves once`, async () => {
      add('Zebra', group, dogs);
      create.and.resolveTo({ name: 'Small', parent: dogs });
      await open(animals);
      const created = service.tags.find(tag => tag.name === 'Small');
      expect(create.calls.mostRecent().args[0]).toBe(TagCreateComponent);
      expect(create.calls.mostRecent().args[1].initialParent).toBe(animals);
      expect(created.parent).toBe(dogs);
      expect(created.group).toBe(group);
      expect(created.id).toBeTruthy();
      expect(created.state).toBe(0);
      expect(created.children).toEqual([]);
      if (group) expect(created.open).toBeTrue();
      expect(dogs.children.map(tag => tag.name)).toEqual(['Small', 'Zebra']);
      expect(animals.children).not.toContain(created);
      expect(service.tags.map(tag => tag.name)).toEqual(['Animals', 'Dogs', 'Small', 'Zebra']);
      expect(save).toHaveBeenCalledTimes(1);
    });

    it(`can create a ${label} at Root even when opened from a group`, async () => {
      create.and.resolveTo({ name: 'Root item', parent: null });
      await open(dogs);
      const created = service.tags.find(tag => tag.name === 'Root item');
      expect(created.parent).toBeNull();
      expect(service.getRootTags()).toContain(created);
      expect(dogs.children).not.toContain(created);
      expect(save).toHaveBeenCalledTimes(1);
    });

    it(`defaults a ${label} to Root and makes cancellation a no-op`, async () => {
      const before = [...service.tags];
      await open();
      expect(create.calls.mostRecent().args[1].initialParent).toBeNull();
      expect(service.tags).toEqual(before);
      expect(save).not.toHaveBeenCalled();
    });

    it(`validates ${label} names against the selected parent using existing rules`, async () => {
      add('Taken', group, dogs);
      add('Other type', !group, dogs);
      await open();
      const inputs: TagCreateInputs = create.calls.mostRecent().args[1];
      expect(inputs.validateName('', dogs)).toBeNull();
      expect(inputs.validateName('   ', dogs)).toBeNull();
      expect(inputs.validateName('Taken', dogs)).toBeTruthy();
      expect(inputs.validateName('Taken', animals)).toBeNull();
      expect(inputs.validateName('taken', dogs)).toBeNull();
      expect(inputs.validateName('Other type', dogs)).toBeNull();
      expect(inputs.validateName('Animals', null)).toBeTruthy();
      add('Root tag', false);
      expect(inputs.validateName('Root tag', null)).toBeTruthy();
    });
  }

  it('offers every group sorted by full path and excludes normal and pseudo tags', async () => {
    const vehicles = add('Vehicles', true);
    const vehicleDogs = add('Dogs', true, vehicles);
    const leaf = add('Small', false, dogs);
    add('Pseudo', false).children = [leaf];
    await service.openTagCreate();
    const inputs: TagCreateInputs = create.calls.mostRecent().args[1];
    expect(inputs.parentGroups).toEqual([animals, dogs, vehicles, vehicleDogs]);
    expect(inputs.parentGroups.map(tag => tag.getNameWithParents())).toEqual(['Animals', 'Animals | Dogs', 'Vehicles', 'Vehicles | Dogs']);
  });

  it('rejects a now-invalid submission without mutating or saving', async () => {
    const before = [...service.tags];
    create.and.resolveTo({ name: 'Animals', parent: null });
    await service.openTagCreate();
    expect(service.tags).toEqual(before);
    expect(save).not.toHaveBeenCalled();
  });

  it('does not create or save a blank name', async () => {
    const before = [...service.tags];
    create.and.resolveTo({ name: '   ', parent: dogs });
    await service.openTagCreate();
    expect(service.tags).toEqual(before);
    expect(save).not.toHaveBeenCalled();
  });

  it('preserves the entered name without trimming it', async () => {
    create.and.resolveTo({ name: '  New tag  ', parent: dogs });
    await service.openTagCreate();
    expect(dogs.children[0].name).toBe('  New tag  ');
  });
});
