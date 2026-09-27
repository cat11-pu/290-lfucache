// lfurun.js：按访问预算处理并留账，收尾不限预算清账
import { bumpFreq, victimOf } from "./lfubag.js";

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function errorCodes(spec) {
  return {
    capacity: spec.capacity_error_code || "E_BAD_CAPACITY",
    page: spec.page_error_code || "E_BAD_PAGE",
    event: spec.event_error_code || "E_BAD_EVENT"
  };
}

function checkCapacity(spec) {
  const capacity = spec.capacity;
  if (!Number.isInteger(capacity) || capacity <= 0) {
    fail(errorCodes(spec).capacity);
  }
  return capacity;
}

function checkEvents(spec, events) {
  const codes = errorCodes(spec);
  events.forEach(function (event) {
    if (!event || typeof event !== "object" || event.kind !== "access") {
      fail(codes.event);
    }
    if (typeof event.page !== "string" || event.page.length === 0) {
      fail(codes.page);
    }
  });
}

function cloneState(state) {
  const source = state || {};
  return {
    cache: Object.assign({}, source.cache),
    hits: source.hits || 0,
    misses: source.misses || 0,
    ledger: (source.ledger || []).slice(),
    applied: (source.applied || []).slice()
  };
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
  const events = spec.events || [];
  const capacity = checkCapacity(spec);
  checkEvents(spec, events);
  const state = cloneState(spec.state);
  let budget = Number.isFinite(spec.budget) ? spec.budget : 0;
  let served = 0;
  while (budget > 0 && state.ledger.length > 0) {
    access(state, capacity, state.ledger.shift());
    budget -= 1;
    served += 1;
  }
  events.forEach(function (event, index) {
    const id = event.id !== undefined ? event.id : index;
    if (state.applied.indexOf(id) !== -1) {
      return;
    }
    if (budget > 0) {
      access(state, capacity, event.page);
      budget -= 1;
      served += 1;
    } else {
      state.ledger.push(event.page);
    }
    state.applied.push(id);
  });
  const pending = spec.state && spec.state.ledger ? spec.state.ledger.length : 0;
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.slice(),
    judged: served,
    judged_bound: events.length + pending
  };
}

export function close(spec) {
  const capacity = checkCapacity(spec);
  const state = cloneState(spec.state);
  let catchup = 0;
  while (state.ledger.length > 0) {
    access(state, capacity, state.ledger.shift());
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
