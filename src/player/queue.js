export function shuffleArray(items, random = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createQueue(ids, startIndex = 0, shuffle = false, random) {
  const start = Math.min(Math.max(startIndex, 0), Math.max(ids.length - 1, 0));
  if (!shuffle || ids.length < 2) {
    return { order: [...ids], original: shuffle ? [...ids] : null, index: start };
  }
  const rest = ids.filter((_, i) => i !== start);
  return { order: [ids[start], ...shuffleArray(rest, random)], original: [...ids], index: 0 };
}

export function currentId(queue) {
  return queue.order[queue.index] ?? null;
}

export function setShuffle(queue, enabled, random) {
  if (queue.order.length === 0) return { ...queue, original: enabled ? [] : null };
  const current = currentId(queue);
  if (enabled) {
    if (queue.original) return queue;
    const rest = queue.order.filter((_, i) => i !== queue.index);
    return { order: [current, ...shuffleArray(rest, random)], original: [...queue.order], index: 0 };
  }
  if (!queue.original) return queue;
  const index = Math.max(queue.original.indexOf(current), 0);
  return { order: [...queue.original], original: null, index };
}


export function playNext(queue, id) {
  const order = [...queue.order];
  order.splice(queue.index + 1, 0, id);
  let original = queue.original;
  if (original) {
    original = [...original];
    const pos = original.indexOf(currentId(queue));
    original.splice(pos + 1, 0, id);
  }
  return { order, original, index: queue.order.length === 0 ? 0 : queue.index };
}

export function addToQueue(queue, ids) {
  const list = Array.isArray(ids) ? ids : [ids];
  return {
    order: [...queue.order, ...list],
    original: queue.original ? [...queue.original, ...list] : null,
    index: queue.order.length === 0 ? 0 : queue.index,
  };
}

export function removeAt(queue, position) {
  if (position === queue.index || position < 0 || position >= queue.order.length) return queue;
  const order = [...queue.order];
  const [removed] = order.splice(position, 1);
  let original = queue.original;
  if (original) {
    original = [...original];
    const pos = original.lastIndexOf(removed);
    if (pos >= 0) original.splice(pos, 1);
  }
  return { order, original, index: position < queue.index ? queue.index - 1 : queue.index };
}

export function move(queue, from, to) {
  const length = queue.order.length;
  if (from === to || from < 0 || to < 0 || from >= length || to >= length) return queue;
  const order = [...queue.order];
  const [item] = order.splice(from, 1);
  order.splice(to, 0, item);
  let index = queue.index;
  if (from === index) index = to;
  else if (from < index && to >= index) index -= 1;
  else if (from > index && to <= index) index += 1;
  return { order, original: queue.original, index };
}


export function clearUpcoming(queue) {
  const order = queue.order.slice(0, queue.index + 1);
  return { order, original: queue.original ? [...order] : null, index: queue.index };
}

export function nextIndex(queue, repeat) {
  if (queue.order.length === 0) return null;
  if (queue.index + 1 < queue.order.length) return queue.index + 1;
  return repeat === 'all' ? 0 : null;
}

export function previousIndex(queue, repeat) {
  if (queue.order.length === 0) return null;
  if (queue.index > 0) return queue.index - 1;
  return repeat === 'all' ? queue.order.length - 1 : 0;
}

export function pruneQueue(queue, exists) {
  const current = currentId(queue);
  const order = queue.order.filter(exists);
  const original = queue.original ? queue.original.filter(exists) : null;
  let index = current && exists(current) ? order.indexOf(current) : Math.min(queue.index, order.length - 1);
  if (index < 0) index = 0;
  return { order, original, index };
}
