/**
 * VinVibes — Sleep timer.
 */

import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../styles/theme';
import { useStore } from '../../core/store';
import { formatTime } from '../../core/format';
import { playerStore, setSleepTimer } from '../../player/playerService';
import { closeSheet } from '../../navigation/navigation';
import BottomSheet, { SheetAction } from './BottomSheet';

const OPTIONS = [5, 10, 15, 30, 45, 60];

/** Live "mm:ss" until the timer fires (re-renders once per second). */
export function useSleepRemaining() {
  const sleep = useStore(playerStore, s => s.sleep);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!sleep?.endsAt) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sleep]);
  if (!sleep) return null;
  if (sleep.endOfTrack) return 'End of track';
  return formatTime(Math.max(0, (sleep.endsAt - now) / 1000));
}

export default function SleepTimerSheet() {
  const sleep = useStore(playerStore, s => s.sleep);
  const remaining = useSleepRemaining();
  const choose = (value) => {
    setSleepTimer(value);
    closeSheet();
  };

  return (
    <BottomSheet title="Sleep timer">
      {remaining ? <Text style={styles.remaining}>Stops in {remaining}</Text> : null}
      <SheetAction icon="close-circle-outline" label="Off" active={!sleep} onPress={() => choose(null)} />
      {OPTIONS.map(minutes => (
        <SheetAction key={minutes} icon="time-outline" label={`${minutes} minutes`} onPress={() => choose(minutes)} />
      ))}
      <SheetAction icon="musical-note-outline" label="End of track" active={!!sleep?.endOfTrack} onPress={() => choose('end')} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  remaining: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accentLight,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    fontVariant: ['tabular-nums'],
  },
});
