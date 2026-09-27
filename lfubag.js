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
  pages.forEach(function (page) {
    if (victim === null) { victim = page; return; }
    if (cache[page] < cache[victim] ||
        (cache[page] === cache[victim] && page < victim)) {
      victim = page;
    }
  });
  return victim;
}
