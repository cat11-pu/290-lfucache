// lfurun.js：按访问预算处理并留账
import { bumpFreq, victimOf } from "./lfubag.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function freshState(state) {
  const source = state || {};
  return {
    cache: Object.assign({}, source.cache),
    hits: source.hits || 0,
    misses: source.misses || 0,
    ledger: (source.ledger || []).slice(),
    applied: (source.applied || []).slice()
  };
}

function checkCapacity(spec) {
  if (!Number.isInteger(spec.capacity) || spec.capacity <= 0) {
    fail(spec.capacity_error_code || "E_BAD_CAPACITY", "capacity 必须是正整数");
  }
}

function checkEvent(spec, event) {
  if (!event || typeof event !== "object" || event.kind !== "access" ||
      (typeof event.id !== "number" && typeof event.id !== "string")) {
    fail(spec.event_error_code || "E_BAD_EVENT", "事件不合法");
  }
  if (typeof event.page !== "string" || event.page.length === 0) {
    fail(spec.page_error_code || "E_BAD_PAGE", "页名为空");
  }
}

function access(state, capacity, page) {
  if (Object.prototype.hasOwnProperty.call(state.cache, page)) {
    state.hits += 1;
    bumpFreq(state.cache, page);
    return;
  }
  state.misses += 1;
  const victim = victimOf(state.cache, capacity);
  if (victim !== null) {
    delete state.cache[victim];
  }
  state.cache[page] = 1;
}

export function step(spec) {
  checkCapacity(spec);
  const events = spec.events || [];
  for (const event of events) {
    checkEvent(spec, event);
  }
  const state = freshState(spec.state);
  let budget = Number.isInteger(spec.budget) && spec.budget > 0 ? spec.budget : 0;
  let served = 0;
  let judged = 0;
  while (budget > 0 && state.ledger.length > 0) {
    access(state, spec.capacity, state.ledger.shift());
    budget -= 1;
    served += 1;
  }
  for (const event of events) {
    if (state.applied.indexOf(event.id) !== -1) {
      continue;
    }
    judged += 1;
    state.applied.push(event.id);
    if (budget > 0) {
      access(state, spec.capacity, event.page);
      budget -= 1;
      served += 1;
    } else {
      state.ledger.push(event.page);
    }
  }
  return { state: state, served: served, ledger_before: state.ledger.length,
           ledger: state.ledger.slice(), judged: judged, judged_bound: events.length };
}

export function close(spec) {
  checkCapacity(spec);
  const state = freshState(spec.state);
  let catchup = 0;
  while (state.ledger.length > 0) {
    access(state, spec.capacity, state.ledger.shift());
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
