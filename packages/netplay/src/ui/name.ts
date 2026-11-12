/**
 * Who am I in a room: a stable per-tab **id** (transport user on local / dev-relay transports) and a **display name**
 * the player can change (remembered across visits). Kept apart so two friends both called «Саша» never share a seat.
 *
 *   const me = localName('tribute');            // { id: 'P-7K2M', name: 'P-7K2M' | 'Саша' }
 *   createSession(game, { transport: hub.transport(me.id), name: me.name, … });
 *   mountLobby(el, lobby, { nameField: me });    // «Your name» field on the first screen
 */
export interface LocalName { readonly id: string; name: string }
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const safe = (get: () => Store | undefined): Store | undefined => { try { return get(); } catch { return undefined; } };
/** Display names: trimmed, control characters removed, at most 24 characters; empty → the id. */
export const cleanName = (v: string, fallback: string): string => v.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24) || fallback;

export function localName(game: string, o: { params?: URLSearchParams; local?: Store; session?: Store } = {}): LocalName {
  const local = o.local ?? safe(() => globalThis.localStorage), session = o.session ?? safe(() => globalThis.sessionStorage);
  const fromUrl = o.params?.get('user');
  const idKey = `netplay:id:${game}`, nameKey = 'netplay:name';
  let id = fromUrl ? fromUrl.slice(0, 24) : session?.getItem(idKey) ?? '';
  if (!id) { id = 'P-' + Math.random().toString(36).slice(2, 6).toUpperCase(); session?.setItem(idKey, id); }
  let name = fromUrl ? id : cleanName(local?.getItem(nameKey) ?? '', id);
  return {
    id,
    get name() { return name; },
    set name(v: string) { name = cleanName(v, id); if (!fromUrl) try { local?.setItem(nameKey, name === id ? '' : name); } catch { /* storage blocked */ } },
  };
}
