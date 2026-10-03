/**
 * VinVibes — Renders whichever bottom sheet is open.
 */

import React from 'react';
import { useStore } from '../../core/store';
import { sheetStore } from '../../navigation/navigation';
import SongActionsSheet from './SongActionsSheet';
import AddToPlaylistSheet from './AddToPlaylistSheet';
import SongInfoSheet from './SongInfoSheet';
import { SortSheet, PromptSheet, ConfirmSheet, LyricsSheet } from './SimpleSheets';

const SHEETS = {
  songActions: SongActionsSheet,
  addToPlaylist: AddToPlaylistSheet,
  songInfo: SongInfoSheet,
  sort: SortSheet,
  prompt: PromptSheet,
  confirm: ConfirmSheet,
  lyrics: LyricsSheet,
};

export default function SheetHost() {
  const sheet = useStore(sheetStore, s => s.sheet);
  if (!sheet) return null;
  const Component = SHEETS[sheet.type];
  return Component ? <Component key={sheet.key} {...sheet.props} /> : null;
}
