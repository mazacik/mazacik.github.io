import { StoryRecovery } from './story-recovery';
import { uid } from '../models/story.model';
describe('IndexedDB story checkpoints', () => {
  it('durably round-trips checkpoints and isolates accounts/documents', async () => {
    const key = uid(),
      first = new StoryRecovery('first:' + key),
      second = new StoryRecovery('second:' + key);
    const value = { base: 'original', data: { articles: [], saveId: 'saved-result' } };
    await first.write(value);
    expect(await new StoryRecovery('first:' + key).read()).toEqual(value);
    expect(await second.read()).toBeUndefined();
    await first.clear();
    expect(await first.read()).toBeUndefined();
  });
});
