/**

 * Assets workspace URL state (`sdk.commerce.assets.gen1`).

 */

import type { AssetsWizardStep } from './schemas';



export type AssetsWorkspaceMode = 'catalog' | 'import' | 'commerce';

export type CommerceHubTab = 'listings' | 'orders' | 'tools';



export type AssetsCatalogView = 'grid' | 'table' | 'kanban';



export type AssetLifecycleFilter = 'draft' | 'published' | 'archived';



export type AssetsUrlState = {

  create: boolean;

  presetId: string | null;

  step: AssetsWizardStep;

  assetId: string | null;

  mode: AssetsWorkspaceMode;

  draftKey: string | null;

  view: AssetsCatalogView;

  expert: boolean;

  listingId: string | null;

  q: string | null;

  type: string | null;

  lifecycle: AssetLifecycleFilter | null;

  crossProject: boolean;

  tradeable: boolean | null;

  rarity: string | null;

  commerceTab: CommerceHubTab;

  commerceAssetId: string | null;

};



const STEPS: AssetsWizardStep[] = ['intent', 'basics', 'media', 'publish', 'review'];

const VIEWS: AssetsCatalogView[] = ['grid', 'table', 'kanban'];

const LIFECYCLES: AssetLifecycleFilter[] = ['draft', 'published', 'archived'];

const COMMERCE_TABS: CommerceHubTab[] = ['listings', 'orders', 'tools'];

function parseCommerceTab(raw: string | null): CommerceHubTab {
  if (raw && COMMERCE_TABS.includes(raw as CommerceHubTab)) return raw as CommerceHubTab;
  return 'listings';
}



function parseStep(raw: string | null): AssetsWizardStep {

  if (raw && STEPS.includes(raw as AssetsWizardStep)) return raw as AssetsWizardStep;

  return 'intent';

}



function parseView(raw: string | null): AssetsCatalogView {

  if (raw && VIEWS.includes(raw as AssetsCatalogView)) return raw as AssetsCatalogView;

  return 'grid';

}



function parseLifecycle(raw: string | null): AssetLifecycleFilter | null {

  if (raw && LIFECYCLES.includes(raw as AssetLifecycleFilter)) return raw as AssetLifecycleFilter;

  return null;

}



export function parseAssetsSearchParams(sp: URLSearchParams): AssetsUrlState {

  const tradeableRaw = sp.get('tradeable');

  return {

    create: sp.get('create') === '1',

    presetId: sp.get('preset'),

    step: parseStep(sp.get('step')),

    assetId: sp.get('assetId'),

    mode:
      sp.get('mode') === 'import'
        ? 'import'
        : sp.get('mode') === 'commerce'
          ? 'commerce'
          : 'catalog',

    draftKey: sp.get('draftKey'),

    view: parseView(sp.get('view')),

    expert: sp.get('expert') === '1',

    listingId: sp.get('listing'),

    q: sp.get('q'),

    type: sp.get('type'),

    lifecycle: parseLifecycle(sp.get('lifecycle')),

    crossProject: sp.get('crossProject') === '1',

    tradeable: tradeableRaw === '1' ? true : tradeableRaw === '0' ? false : null,

    rarity: sp.get('rarity'),

    commerceTab: parseCommerceTab(sp.get('tab')),

    commerceAssetId: sp.get('assetId'),

  };

}



function setOrDelete(sp: URLSearchParams, key: string, value: string | null | undefined): void {

  if (value) sp.set(key, value);

  else sp.delete(key);

}



export function writeAssetsSearchParams(

  base: URLSearchParams,

  patch: Partial<AssetsUrlState>,

): URLSearchParams {

  const sp = new URLSearchParams(base.toString());



  if (patch.create !== undefined) {

    if (patch.create) sp.set('create', '1');

    else sp.delete('create');

  }

  if (patch.presetId !== undefined) {

    setOrDelete(sp, 'preset', patch.presetId);

  }

  if (patch.step !== undefined) {

    if (patch.step === 'intent' && !sp.get('preset')) sp.delete('step');

    else sp.set('step', patch.step);

  }

  if (patch.assetId !== undefined) {

    setOrDelete(sp, 'assetId', patch.assetId);

  }

  if (patch.mode !== undefined) {

    if (patch.mode === 'catalog') sp.delete('mode');

    else sp.set('mode', patch.mode);

  }

  if (patch.draftKey !== undefined) {

    setOrDelete(sp, 'draftKey', patch.draftKey);

  }

  if (patch.view !== undefined) {

    if (patch.view === 'grid') sp.delete('view');

    else sp.set('view', patch.view);

  }

  if (patch.expert !== undefined) {

    if (patch.expert) sp.set('expert', '1');

    else sp.delete('expert');

  }

  if (patch.listingId !== undefined) {

    setOrDelete(sp, 'listing', patch.listingId);

  }

  if (patch.q !== undefined) {

    setOrDelete(sp, 'q', patch.q);

  }

  if (patch.type !== undefined) {

    setOrDelete(sp, 'type', patch.type);

  }

  if (patch.lifecycle !== undefined) {

    setOrDelete(sp, 'lifecycle', patch.lifecycle);

  }

  if (patch.crossProject !== undefined) {

    if (patch.crossProject) sp.set('crossProject', '1');

    else sp.delete('crossProject');

  }

  if (patch.tradeable !== undefined) {

    if (patch.tradeable === true) sp.set('tradeable', '1');

    else if (patch.tradeable === false) sp.set('tradeable', '0');

    else sp.delete('tradeable');

  }

  if (patch.rarity !== undefined) {

    setOrDelete(sp, 'rarity', patch.rarity);

  }

  if (patch.commerceTab !== undefined) {
    if (patch.mode === 'commerce' || sp.get('mode') === 'commerce') {
      if (patch.commerceTab === 'listings') sp.delete('tab');
      else sp.set('tab', patch.commerceTab);
    }
  }

  if (patch.commerceAssetId !== undefined) {
    setOrDelete(sp, 'assetId', patch.commerceAssetId);
  }

  return sp;

}



export function buildAssetsModuleSearchParams(

  projectId: number,

  patch: Partial<AssetsUrlState> & { module?: string },

): URLSearchParams {

  const sp = new URLSearchParams();

  sp.set('module', 'assets');

  if (projectId > 0) sp.set('project_id', String(projectId));

  return writeAssetsSearchParams(sp, patch);

}


