import { copy, copyEntity, Entity, referenceEntities, resolveEquipment, variableKey } from '../models/story.model';
import { inventoryFixture } from '../engine/story-inventory-fixture';
import { locksFixture } from '../engine/story-locks-fixture';
import { initialState, startGame, attemptPlayerUnlock } from '../engine/story-engine';
import { copyDefinition, unlockContextStory } from '../engine/story-locks';
import { inventoryIssues } from '../engine/story-inventory';
import { playableFingerprint } from '../engine/story-order';
import { parseDocument } from './story-document';
import { upgradeEquipmentTypes } from './equipment-types';

describe('Equipment types and variants', () => {
  it('flattens legacy chains under one type while preserving effective settings and physical copies', () => {
    const story = inventoryFixture(),
      root = story.entities.find((e) => e.id === 'dagger');
    story.entities.push(
      {
        ...copy(root),
        id: 'iron',
        name: 'Iron sword',
        parentId: root.id,
        properties: [],
        requiredSlots: undefined,
        propertyOverrides: { durability: 75 },
        flagGrants: [{ flag: 'armed', when: 'equipped', suppressed: true }],
      },
      {
        ...copy(root),
        id: 'silver',
        name: 'Silver sword',
        parentId: 'iron',
        properties: [{ id: 'charge', name: 'Charge', type: 'number', initial: 20, known: true }],
        requiredSlots: undefined,
        flagGrants: [],
        propertyOverrides: { durability: 50 },
      },
    );
    story.copies[0].definition = 'silver';
    story.copies[0].values = { durability: 17, charge: 9 };
    const copies = copy(story.copies),
      state = initialState(story),
      fingerprint = playableFingerprint(story);
    const values = story.entities.filter((e) => e.kind === 'equipment').map((e) => resolveEquipment(story, e.id));
    upgradeEquipmentTypes(story);
    expect(story.entities.filter((e) => e.equipmentRole === 'type').length).toBe(1);
    const type = story.entities.find((e) => e.equipmentRole === 'type');
    expect(type.parentId).toBeUndefined();
    for (const before of values) {
      const variant = story.entities.find((e) => e.id === before.id),
        resolved = resolveEquipment(story, before.id);
      expect(variant.equipmentRole).toBe('variant');
      expect(variant.parentId).toBe(type.id);
      expect(resolved.properties).toEqual(before.properties);
      expect(resolved.flagGrants).toEqual(before.flagGrants);
      expect(resolved.requiredSlots).toEqual(before.requiredSlots);
    }
    expect(story.copies).toEqual(copies);
    expect(initialState(story)).toEqual(state);
    expect(playableFingerprint(story)).toBe(fingerprint);
    const once = copy(story);
    upgradeEquipmentTypes(story);
    expect(story).toEqual(once);
    type.properties[0].initial = 120;
    expect(resolveEquipment(story, root.id).properties[0].initial).toBe(120);
    expect(resolveEquipment(story, 'silver').properties[0].initial).toBe(50);
  });

  it('rejects copies of types and variant-to-variant or type-to-type inheritance', () => {
    const story = inventoryFixture();
    upgradeEquipmentTypes(story);
    const type = story.entities.find((e) => e.equipmentRole === 'type'),
      variant = story.entities.find((e) => e.id === 'dagger');
    story.copies[0].definition = type.id;
    expect(inventoryIssues(story).some((i) => i.message.includes('equipment, not a type'))).toBeTrue();
    expect(() => initialState(story)).toThrowError(/equipment, not a type/);
    expect(() => copyDefinition(story, story.copies[0].id)).toThrowError(/equipment, not a type/);
    expect(() => copyEntity(story, story.copies[0])).toThrowError(/equipment, not a type/);
    expect(referenceEntities(story).some((e) => e.id === type.id)).toBeFalse();
    variant.parentId = variant.id;
    expect(() => resolveEquipment(story, variant.id)).toThrowError(/Choose a type for this equipment/);
    type.parentId = variant.id;
    expect(() => resolveEquipment(story, type.id)).toThrowError(/cannot inherit/);
  });

  it('moves old type locks onto equipment without changing copies, saved games or method references', () => {
    const story = locksFixture();
    const equipment = story.entities.find((e) => e.id === 'dagger');
    const game = startGame(story, 'Saved');
    const type = { ...copy(equipment), id: 'old-type', equipmentRole: 'type' as const };
    equipment.equipmentRole = 'variant';
    equipment.parentId = type.id;
    equipment.properties = [];
    for (const field of ['lockable', 'lockOnEquip', 'keyItems', 'unlockMethods'] as const) delete equipment[field];
    story.entities.push(type);
    const plain = { ...copy(equipment), id: 'plain', lockable: false, lockOnEquip: false, keyItems: [], unlockMethods: [] };
    story.entities.push(plain);
    const source = { version: 4, articles: [], stories: [story], playthroughs: [game] };
    const loaded = parseDocument(source).data;
    const loadedType = loaded.stories[0].entities.find((e) => e.id === type.id);
    const loadedEquipment = loaded.stories[0].entities.find((e) => e.id === equipment.id);
    expect(loadedType.lockable).toBeUndefined();
    expect(loadedType.lockOnEquip).toBeUndefined();
    expect(loadedType.keyItems).toBeUndefined();
    expect(loadedType.unlockMethods).toBeUndefined();
    expect(loadedEquipment.lockable).toBeTrue();
    expect(loadedEquipment.unlockMethods).toEqual(type.unlockMethods);
    expect(loadedEquipment.keyItems).toEqual(type.keyItems);
    expect(loaded.stories[0].entities.find((e) => e.id === 'plain')).toEqual(plain);
    expect(loaded.stories[0].copies).toEqual(story.copies);
    expect(loaded.stories[0].revision).toBe(story.revision);
    expect(loaded.playthroughs).toEqual(source.playthroughs);
    expect(attemptPlayerUnlock(loaded.stories[0], loaded.playthroughs[0], 'dagger-1', 'key-method').state.copyStates['dagger-1'].locked).toBeFalse();
    expect(parseDocument(loaded).data).toEqual(loaded);
    loadedType.lockable = true;
    loadedType.unlockMethods = copy(type.unlockMethods);
    delete loadedEquipment.lockable;
    delete loadedEquipment.unlockMethods;
    expect(resolveEquipment(loaded.stories[0], loadedEquipment.id).lockable).toBeFalse();
    expect(resolveEquipment(loaded.stories[0], loadedEquipment.id).unlockMethods).toEqual([]);
    expect(resolveEquipment(loaded.stories[0], loadedType.id).lockable).toBeFalse();
  });

  it('keeps unlock configuration and saved attempts working after document conversion', () => {
    const story = locksFixture(),
      game = startGame(story, 'Saved');
    const source = { version: 4, articles: [], stories: [story], playthroughs: [game] },
      before = copy(source);
    const loaded = parseDocument(source).data;
    expect(loaded.playthroughs).toEqual(before.playthroughs);
    expect(loaded.stories[0].revision).toBe(story.revision);
    expect(loaded.stories[0].copies).toEqual(story.copies);
    expect(attemptPlayerUnlock(loaded.stories[0], loaded.playthroughs[0], 'dagger-1', 'key-method').state.copyStates['dagger-1'].locked).toBeFalse();
    expect(source).toEqual(before);
    expect(parseDocument(loaded).data).toEqual(loaded);
    const type = loaded.stories[0].entities.find((e) => e.id === 'dagger-type');
    const context = unlockContextStory(loaded.stories[0], type.id);
    const contextualCopy = copyEntity(
      context,
      context.copies.find((c) => c.id === '@equipment'),
    );
    expect(contextualCopy.properties.some((p) => p.id === variableKey('copy', '@equipment', 'durability'))).toBeTrue();
  });
});
