import test from "node:test";
import assert from "node:assert/strict";
import worker, { isValidIp } from "../src/index.js";

const call = (path, init) => worker.fetch(new Request(`https://example.invalid${path}`, init));

test("accepts strict IPv4 and IPv6 documentation addresses", () => {
  assert.equal(isValidIp("192.0.2.10"), true);
  assert.equal(isValidIp("2001:db8::10"), true);
  for (const value of ["001.2.3.4", "256.1.1.1", "2001:::1", "2001:db8", "x"]) {
    assert.equal(isValidIp(value), false, value);
  }
});

test("enriches a fixture without a live lookup", async () => {
  const response = await call("/enrich", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ ip: "192.0.2.10", type: "sample_login" })
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).context.network, "Documentation network A");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("rejects malformed and oversized input", async () => {
  const bad = await call("/enrich", { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
  assert.equal(bad.status, 400);
  const large = await call("/enrich", { method: "POST", headers: { "content-type": "application/json" }, body: "x".repeat(4097) });
  assert.equal(large.status, 413);
});

test("unknown valid addresses do not trigger external requests", async () => {
  const response = await call("/enrich", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ip: "203.0.113.7" }) });
  assert.equal((await response.json()).context, null);
});
