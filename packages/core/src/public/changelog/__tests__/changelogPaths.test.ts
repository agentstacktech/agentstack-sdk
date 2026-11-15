import { changelogPaths, unseenItems } from '../PublicChangelogClient';

describe('changelogPaths', () => {
  it('builds prod and dev slugs', () => {
    expect(changelogPaths(1, 'frontend', false)).toEqual({
      json: '/s/1/frontend/changelog.json',
      html: '/s/1/frontend/changelog.html',
    });
    expect(changelogPaths(1, 'frontend', true).html).toBe('/s/1/frontend--dev/changelog.html');
  });
});

describe('unseenItems', () => {
  it('stops at lastSeenId', () => {
    const feed = { items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] } as const;
    expect(unseenItems(feed, 'b')).toEqual([{ id: 'a' }]);
  });
});