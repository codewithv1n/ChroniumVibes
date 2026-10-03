/**
 * VinVibes — Song sorting.
 */

export const SONG_SORT_OPTIONS = [
  { key: 'title', label: 'Title', icon: 'text-outline', defaultAscending: true },
  { key: 'artist', label: 'Artist', icon: 'person-outline', defaultAscending: true },
  { key: 'album', label: 'Album', icon: 'disc-outline', defaultAscending: true },
  { key: 'dateAdded', label: 'Date added', icon: 'calendar-outline', defaultAscending: false },
  { key: 'duration', label: 'Duration', icon: 'time-outline', defaultAscending: false },
  { key: 'plays', label: 'Most played', icon: 'stats-chart-outline', defaultAscending: false },
  { key: 'lastPlayed', label: 'Recently played', icon: 'play-back-outline', defaultAscending: false },
];

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

export function sortTracks(tracks, { key, ascending }, stats = {}) {
  const dir = ascending ? 1 : -1;
  const stat = id => stats[id] || { plays: 0, lastPlayed: 0 };
  let compare;
  switch (key) {
    case 'artist':
      compare = (a, b) => collator.compare(a.artist, b.artist) || collator.compare(a.title, b.title);
      break;
    case 'album':
      compare = (a, b) => collator.compare(a.album, b.album) || a.trackNumber - b.trackNumber;
      break;
    case 'dateAdded':
      compare = (a, b) => a.dateAdded - b.dateAdded;
      break;
    case 'duration':
      compare = (a, b) => a.duration - b.duration;
      break;
    case 'plays':
      compare = (a, b) => stat(a.id).plays - stat(b.id).plays;
      break;
    case 'lastPlayed':
      compare = (a, b) => stat(a.id).lastPlayed - stat(b.id).lastPlayed;
      break;
    default:
      compare = (a, b) => collator.compare(a.title, b.title);
  }
  return [...tracks].sort((a, b) => dir * compare(a, b) || collator.compare(a.title, b.title));
}

/** Album track order: disc/track number, then title. */
export function sortAlbumTracks(tracks) {
  return [...tracks].sort(
    (a, b) => (a.trackNumber || 999) - (b.trackNumber || 999) || collator.compare(a.title, b.title)
  );
}
