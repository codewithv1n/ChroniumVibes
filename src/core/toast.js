/**
 * VinVibes — Unobtrusive toast/snackbar messages.
 */

import { createStore } from './store';

export const toastStore = createStore({ toast: null });

let hideTimer = null;
let nextId = 1;

export function showToast(message, { icon = 'checkmark-circle', duration = 2200 } = {}) {
  if (hideTimer) clearTimeout(hideTimer);
  toastStore.setState({ toast: { id: nextId++, message, icon } });
  hideTimer = setTimeout(() => toastStore.setState({ toast: null }), duration);
}
