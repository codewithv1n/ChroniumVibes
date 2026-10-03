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

export function recentlyPlayed(tracks, stats, limit = 12) {
  return tracks
    .filter(t => statOf(stats, t.id).lastPlayed > 0)
    .sort((a, b) => statOf(stats, b.id).lastPlayed - statOf(stats, a.id).lastPlayed)
    .slice(0, limit);
}

export function mostPlayed(tracks, stats, limit = 50) {
  return tracks
    .filter(t => statOf(stats, t.id).plays > 0)
    .sort((a, b) => statOf(stats, b.id).plays - statOf(stats, a.id).plays || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function recentlyAdded(tracks, limit = 50) {
  return [...tracks].sort((a, b) => b.dateAdded - a.dateAdded).slice(0, limit);
}

export function neverPlayed(tracks, stats, limit = 50) {
  return tracks.filter(t => !statOf(stats, t.id).lastPlayed).slice(0, limit);
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

/** Artist the user played most in the last 14 days. */
export function topRecentArtist(tracks, stats, now = Date.now()) {
  const counts = new Map();
  for (const track of tracks) {
    const s = statOf(stats, track.id);
    if (!s.lastPlayed || now - s.lastPlayed > 14 * DAY) continue;
    counts.set(track.artist, (counts.get(track.artist) || 0) + 1 + s.plays);
  }
  let best = null;
  for (const [artist, count] of counts) {
    if (!best || count > best.count) best = { artist, count };
  }
  return best?.artist || null;
}

/** "Because you listened to <artist>": their songs you haven't heard lately. */
export function becauseYouListened(tracks, stats, artist, limit = 12, now = Date.now()) {
  if (!artist) return [];
  return tracks
    .filter(t => t.artist === artist)
    .sort((a, b) => statOf(stats, a.id).lastPlayed - statOf(stats, b.id).lastPlayed || a.title.localeCompare(b.title))
    .filter(t => now - statOf(stats, t.id).lastPlayed > DAY)
    .slice(0, limit);
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

/**
 * "Made from your library" mixes: one per top artist, padded with songs
 * that share the artist's genre. Ranked by play count, or by number of
 * songs when there is no history yet.
 */
export function libraryMixes(tracks, artists, stats, limit = 4) {
  const byId = new Map(tracks.map(t => [t.id, t]));
  const ranked = artists
    .filter(a => a.trackIds.length >= 2)
    .map(a => ({
      artist: a,
      weight: a.trackIds.reduce((sum, id) => sum + statOf(stats, id).plays, 0) * 10 + a.trackIds.length,
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);

  return ranked.map(({ artist }) => {
    const own = artist.trackIds.map(id => byId.get(id)).filter(Boolean);
    const genres = new Set(own.map(t => t.genre).filter(Boolean));
    const extra = genres.size
      ? tracks.filter(t => t.artist !== artist.name && genres.has(t.genre)).slice(0, 20)
      : [];
    return {
      id: `mix:${artist.id}`,
      name: `${artist.name} Mix`,
      artwork: artist.artwork,
      trackIds: [...own, ...extra].slice(0, 40).map(t => t.id),
    };
  });
}
