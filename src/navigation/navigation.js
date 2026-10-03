/**
 * VinVibes — Lightweight navigation
 *
 * Three tabs (Home, Search, Library), each with its own stack of pushed
 * screens, plus the full-screen player, queue and bottom sheets as
 * overlays. Android back closes the top-most layer first.
 */

import { createStore } from '../core/store';

export const TABS = ['home', 'search', 'library'];

export const navStore = createStore({
  tab: 'home',
  stacks: { home: [], search: [], library: [] },
  playerOpen: false,
  queueOpen: false,
});

// A single bottom sheet at a time: { type, props }.
export const sheetStore = createStore({ sheet: null });

// Which section the Library tab shows (songs, albums, artists, ...).
export const libraryViewStore = createStore({ view: 'songs' });

/** Open the Library tab on a given section (from Home shortcuts). */
export function openLibraryView(view) {
  const { stacks } = navStore.getState();
  libraryViewStore.setState({ view });
  navStore.setState({ tab: 'library', stacks: { ...stacks, library: [] } });
}

let routeKey = 1;

export function navigate(name, params = {}) {
  const { tab, stacks } = navStore.getState();
  navStore.setState({
    stacks: { ...stacks, [tab]: [...stacks[tab], { key: routeKey++, name, params }] },
    playerOpen: false,
    queueOpen: false,
  });
}

export function goBack() {
  const { tab, stacks } = navStore.getState();
  if (stacks[tab].length === 0) return false;
  navStore.setState({ stacks: { ...stacks, [tab]: stacks[tab].slice(0, -1) } });
  return true;
}

/** Switching to the active tab again pops it back to its root. */
export function switchTab(nextTab) {
  const { tab, stacks } = navStore.getState();
  if (nextTab === tab) {
    navStore.setState({ stacks: { ...stacks, [tab]: [] } });
  } else {
    navStore.setState({ tab: nextTab });
  }
}

/** Jump to a screen inside the Library tab (e.g. from the player). */
export function navigateInLibrary(name, params = {}) {
  const { stacks } = navStore.getState();
  navStore.setState({
    tab: 'library',
    stacks: { ...stacks, library: [...stacks.library, { key: routeKey++, name, params }] },
    playerOpen: false,
    queueOpen: false,
  });
}

export const openPlayer = () => navStore.setState({ playerOpen: true });
export const closePlayer = () => navStore.setState({ playerOpen: false, queueOpen: false });
export const openQueue = () => navStore.setState({ queueOpen: true });
export const closeQueue = () => navStore.setState({ queueOpen: false });

export function openSheet(type, props = {}) {
  sheetStore.setState({ sheet: { type, props, key: routeKey++ } });
}

export function closeSheet() {
  sheetStore.setState({ sheet: null });
}

/** Android hardware back: returns true when handled. */
export function handleBackPress() {
  if (sheetStore.getState().sheet) {
    closeSheet();
    return true;
  }
  const { queueOpen, playerOpen, tab } = navStore.getState();
  if (queueOpen) {
    closeQueue();
    return true;
  }
  if (playerOpen) {
    closePlayer();
    return true;
  }
  if (goBack()) return true;
  if (tab !== 'home') {
    navStore.setState({ tab: 'home' });
    return true;
  }
  return false;
}
