import { GalleryImage } from '../models/gallery-image.class';
import { Tag } from '../models/tag.class';
import { FilterService } from './filter.service';
import { GallerySerializationService } from './gallery-serialization.service';
import { GalleryStateService } from './gallery-state.service';
import { TagService } from './tag.service';

describe('Tag group filtering', () => {
  let state: GalleryStateService;
  let tags: TagService;
  let filters: FilterService;
  let animals: Tag;
  let cats: Tag;
  let dogs: Tag;
  let clouds: Tag;

  function add(name: string, group = false, parent?: Tag): Tag {
    const tag = Object.assign(new Tag(), { id: name, name, group, parent, children: [] });
    parent?.children.push(tag);
    tags.tags.push(tag);
    return tag;
  }

  function image(id: string, ...imageTags: Tag[]): GalleryImage {
    const result = Object.assign(new GalleryImage(), { id, tags: imageTags, mimeType: 'image/jpeg' });
    state.images.push(result);
    return result;
  }

  function visible(): string[] {
    filters.updateFilters();
    return filters.images().map(image => image.id);
  }

  beforeEach(() => {
    state = { images: [], settings: {} } as GalleryStateService;
    tags = new TagService(null, null, state, null);
    filters = new FilterService(state, tags);
    animals = add('Animals', true);
    cats = add('Cats', false, animals);
    dogs = add('Dogs', false, animals);
    clouds = add('Clouds');
    image('cat', cats);
    image('dog', dogs);
    image('both', cats, dogs);
    image('cloud', clouds);
    image('untagged');
  });

  it('includes any animal and excludes all cat images when Cats is red', () => {
    expect(visible()).toEqual(['cat', 'dog', 'both', 'cloud', 'untagged']);
    animals.state = 1;
    expect(visible()).toEqual(['cat', 'dog', 'both']);
    cats.state = -1;
    expect(visible()).toEqual(['dog']);
    expect(state.images.map(image => image.passesFilters)).toEqual([false, true, false, false, false]);
  });

  it('lets an explicit green tag override a red group and narrows to that tag', () => {
    animals.state = -1;
    expect(visible()).toEqual(['cloud', 'untagged']);
    cats.state = 1;
    expect(visible()).toEqual(['cat', 'both']);
    animals.state = 0;
    expect(visible()).toEqual(['cat', 'both']);
  });

  it('lets green tags narrow a green group and preserves ordinary tag AND semantics', () => {
    animals.state = 1;
    cats.state = 1;
    expect(visible()).toEqual(['cat', 'both']);
    dogs.state = 1;
    expect(visible()).toEqual(['both']);
  });

  it('includes nested descendants and applies nested group exclusions', () => {
    const birds = add('Birds', true, animals);
    const sparrows = add('Sparrows', false, birds);
    image('sparrow', sparrows);
    animals.state = 1;
    expect(visible()).toEqual(['cat', 'dog', 'both', 'sparrow']);
    birds.state = -1;
    expect(visible()).toEqual(['cat', 'dog', 'both']);
    birds.state = 1;
    expect(visible()).toEqual(['sparrow']);
    sparrows.state = -1;
    expect(visible()).toEqual([]);
  });

  it('matches any green group', () => {
    const vehicles = add('Vehicles', true);
    const cars = add('Cars', false, vehicles);
    image('car', cars);
    image('dog-in-car', dogs, cars);
    animals.state = vehicles.state = 1;
    expect(visible()).toEqual(['cat', 'dog', 'both', 'car', 'dog-in-car']);
  });

  it('shows all dogs under red Animals, unless an explicit red tag excludes them', () => {
    animals.state = -1;
    dogs.state = 1;
    expect(visible()).toEqual(['dog', 'both']);
    cats.state = -1;
    expect(visible()).toEqual(['dog']);
    dogs.state = 0;
    expect(visible()).toEqual(['cloud', 'untagged']);
  });

  it('lets explicit green tags override group inclusion as well as exclusion', () => {
    animals.state = 1;
    clouds.state = 1;
    expect(visible()).toEqual(['cloud']);
    animals.state = -1;
    expect(visible()).toEqual(['cloud']);
  });

  it('excludes red group matches from the union of green groups', () => {
    const vehicles = add('Vehicles', true);
    const cars = add('Cars', false, vehicles);
    image('car', cars);
    image('dog-in-car', dogs, cars);
    animals.state = 1;
    vehicles.state = -1;
    expect(visible()).toEqual(['cat', 'dog', 'both']);
  });

  it('does not let an empty green group block matches in other green groups', () => {
    const empty = add('Empty', true);
    animals.state = empty.state = 1;
    expect(visible()).toEqual(['cat', 'dog', 'both']);
  });

  it('lets a green subgroup override red ancestors and narrow green ancestors', () => {
    const birds = add('Birds', true, animals);
    const sparrows = add('Sparrows', false, birds);
    image('sparrow', sparrows);
    image('cat-and-sparrow', cats, sparrows);
    animals.state = -1;
    birds.state = 1;
    expect(visible()).toEqual(['sparrow', 'cat-and-sparrow']);
    animals.state = 1;
    expect(visible()).toEqual(['sparrow', 'cat-and-sparrow']);
    cats.state = -1;
    expect(visible()).toEqual(['sparrow']);
  });

  it('honors exclusions below included subgroups and green exceptions further down', () => {
    const birds = add('Birds', true, animals);
    const sparrows = add('Sparrows', true, birds);
    const small = add('Small', true, sparrows);
    const littleSparrow = add('Little sparrow', false, small);
    const bigSparrow = add('Big sparrow', false, sparrows);
    const eagle = add('Eagle', false, birds);
    image('little-sparrow', littleSparrow);
    image('big-sparrow', bigSparrow);
    image('eagle', eagle);
    animals.state = -1;
    birds.state = 1;
    sparrows.state = -1;
    expect(visible()).toEqual(['eagle']);
    small.state = 1;
    expect(visible()).toEqual(['little-sparrow']);
    littleSparrow.state = -1;
    expect(visible()).toEqual([]);
  });

  it('combines green subgroups with independent green branches without bypassing unrelated red groups', () => {
    const birds = add('Birds', true, animals);
    const sparrows = add('Sparrows', false, birds);
    const vehicles = add('Vehicles', true);
    const cars = add('Cars', false, vehicles);
    image('sparrow', sparrows);
    image('car', cars);
    image('sparrow-in-car', sparrows, cars);
    animals.state = -1;
    birds.state = vehicles.state = 1;
    expect(visible()).toEqual(['sparrow', 'car', 'sparrow-in-car']);
    vehicles.state = -1;
    expect(visible()).toEqual(['sparrow']);
  });

  it('handles empty groups without treating folders as assignable tags', () => {
    const empty = add('Empty', true);
    image('invalid-folder-tag', empty);
    empty.state = 1;
    expect(visible()).toEqual([]);
    empty.state = -1;
    expect(visible()).toEqual(['cat', 'dog', 'both', 'cloud', 'untagged', 'invalid-folder-tag']);
  });

  it('does not extend group membership through pseudo-tag references', () => {
    const alias = add('Alias', false, animals);
    alias.children = [clouds];
    animals.state = 1;
    expect(visible()).toEqual(['cat', 'dog', 'both']);
    alias.state = 1;
    expect(visible()).toEqual(['cloud']);
    animals.state = 0;
    expect(visible()).toEqual(['cloud']);
    alias.state = -1;
    expect(visible()).toEqual(['cat', 'dog', 'both', 'untagged']);
  });

  it('inverts the combined tag result while preserving other filters', () => {
    animals.state = 1;
    cats.state = -1;
    filters.invertTagFilters(true);
    expect(visible()).toEqual(['cat', 'both', 'cloud', 'untagged']);
    filters.favoritesFilter.state = 1;
    state.images.find(image => image.id === 'cloud').heart = true;
    expect(visible()).toEqual(['cloud']);
  });

  it('recomputes group membership after an image is tagged', () => {
    animals.state = 1;
    expect(visible()).toEqual(['cat', 'dog', 'both']);
    const target = state.images.find(image => image.id === 'untagged');
    target.tags.push(dogs);
    filters.updateFilters(target);
    expect(filters.images().map(image => image.id)).toEqual(['cat', 'dog', 'both', 'untagged']);
  });

  it('restores group and child filter states through the existing tag serialization', () => {
    animals.state = 1;
    cats.state = -1;
    const serializer = new GallerySerializationService(null, null, null, null);
    const saved = JSON.parse(JSON.stringify(tags.tags.map(tag => serializer.serializeTag(tag))));
    const restored: Tag[] = saved.map(data => serializer['parseTag'](data));
    serializer['hydrateTagHierarchy'](restored, saved);
    for (const image of state.images) image.tags = image.tags.map(tag => restored.find(item => item.id === tag.id));
    tags.tags.splice(0, tags.tags.length, ...restored);
    expect(visible()).toEqual(['dog']);
    expect(tags.getRootTags()[0].state).toBe(1);
  });
});
