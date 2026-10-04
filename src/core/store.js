import { useCallback, useRef, useSyncExternalStore } from 'react';

export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState: () => state,
    setState(partial) {
      const next = typeof partial === 'function' ? partial(state) : partial;
      if (!next) return;
      let changed = false;
      for (const key of Object.keys(next)) {
        if (state[key] !== next[key]) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...next };
      listeners.forEach(listener => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every(key => Object.is(a[key], b[key]));
}

export function useStore(store, selector = s => s) {
  const cache = useRef({ state: undefined, selector: undefined, value: undefined, ready: false });

  const getSnapshot = useCallback(() => {
    const state = store.getState();
    const c = cache.current;
    if (c.ready && c.state === state && c.selector === selector) return c.value;
    const value = selector(state);
    if (c.ready && shallowEqual(c.value, value)) {
      cache.current = { state, selector, value: c.value, ready: true };
      return c.value;
    }
    cache.current = { state, selector, value, ready: true };
    return value;
  }, [store, selector]);

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
