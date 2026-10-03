/**
 * VinVibes — Offline recommendations
 *
 * Simple, deterministic suggestions computed only from the local library
 * and local listening history. No network, no "AI" — just counting.
 */

const DAY = 24 * 60 * 60 * 1000;

function statOf(stats, id) {
  return stats[id] || { plays: 0, lastPlayed: 0, listened: 0 };
}

function recentlyAdded(tracks, limit = 50) {
  return [...tracks].sort((a, b) => b.dateAdded - a.dateAdded).slice(0, limit);
}

/**
 * Quick picks: favorites, frequently played and recently played songs,
 * scored deterministically. Falls back to recently added songs.
 */
export function quickPicks(tracks, stats, favorites, limit = 12, now = Date.now()) {
  const scored = [];
  for (const track of tracks) {
    const s = statOf(stats, track.id);
    let score = Math.min(s.plays, 20) * 2;
    if (favorites[track.id]) score += 6;
    if (s.lastPlayed && now - s.lastPlayed < 7 * DAY) score += 4;
    if (score > 0) scored.push({ track, score });
  }
  scored.sort((a, b) => b.score - a.score || a.track.title.localeCompare(b.track.title));
  const picks = scored.slice(0, limit).map(s => s.track);
  if (picks.length >= 4) return picks;
  const seen = new Set(picks.map(t => t.id));
  return [...picks, ...recentlyAdded(tracks, limit).filter(t => !seen.has(t.id))].slice(0, limit);
}

/** Songs you used to play but haven't heard in 30+ days. */
export function rediscover(tracks, stats, limit = 12, now = Date.now()) {
  return tracks
    .filter(t => {
      const s = statOf(stats, t.id);
      return s.plays > 0 && now - s.lastPlayed > 30 * DAY;
    })
    .sort((a, b) => statOf(stats, b.id).plays - statOf(stats, a.id).plays)
    .slice(0, limit);
}
