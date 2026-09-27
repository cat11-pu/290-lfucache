import assert from "node:assert";
import { bumpFreq, victimOf } from "../lfubag.js";
import { step, close } from "../lfurun.js";
import { render } from "../app.js";

const base = {
  budget: 2, capacity: 2,
  state: { cache: {}, hits: 0, misses: 0, ledger: [], applied: [] },
  events: [],
  capacity_error_code: "E_BAD_CAPACITY", page_error_code: "E_BAD_PAGE",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("bumpFreq returns a number", () => {
  assert.strictEqual(typeof bumpFreq({}, "p"), "number");
});

check("victimOf returns a number or empty", () => {
  const value = victimOf({}, 1);
  assert.ok(typeof value === "number" || value === null);
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
