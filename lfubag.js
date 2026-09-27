// lfubag.js：频次增减与淘汰位
export function bumpFreq(cache, page) {
  cache[page] = (cache[page] || 0) + 1;
  return cache[page];
}

export function victimOf(cache, capacity) {
  const pages = Object.keys(cache);
  if (!Number.isInteger(capacity) || capacity <= 0 || pages.length < capacity) {
    return null;
  }
  let victim = null;
  for (const page of pages) {
    if (victim === null ||
        cache[page] < cache[victim] ||
        (cache[page] === cache[victim] && page < victim)) {
      victim = page;
    }
  }
  return victim;
}
