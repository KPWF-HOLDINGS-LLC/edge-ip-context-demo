const MAX_BODY_BYTES = 4096;

const CONTEXT = Object.freeze({
  "192.0.2.10": { network: "Documentation network A", region: "Example region" },
  "198.51.100.20": { network: "Documentation network B", region: "Example region" },
  "2001:db8::10": { network: "Documentation IPv6 network", region: "Example region" }
});

export function isValidIp(value) {
  if (typeof value !== "string" || value.length > 45 || value !== value.trim()) return false;
  if (value.includes(":")) {
    if (!/^[0-9a-fA-F:]+$/.test(value) || value.includes(":::")) return false;
    const halves = value.split("::");
    if (halves.length > 2) return false;
    const groups = halves.flatMap(part => part ? part.split(":") : []);
    if (groups.some(group => !/^[0-9a-fA-F]{1,4}$/.test(group))) return false;
    return halves.length === 2 ? groups.length < 8 : groups.length === 8;
  }
  const octets = value.split(".");
  return octets.length === 4 && octets.every(part =>
    /^(0|[1-9][0-9]{0,2})$/.test(part) && Number(part) <= 255
  );
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

async function readSmallJson(request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return { error: "content_type_required", status: 415 };
  }
  const reader = request.body?.getReader();
  if (!reader) return { error: "body_required", status: 400 };
  const parts = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        return { error: "body_too_large", status: 413 };
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  try { return { data: JSON.parse(new TextDecoder().decode(bytes)) }; }
  catch { return { error: "invalid_json", status: 400 }; }
}

export default {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (request.method === "GET" && path === "/health") return json({ ok: true });
    if (path !== "/enrich") return json({ error: "not_found" }, 404);
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    const input = await readSmallJson(request);
    if (input.error) return json({ error: input.error }, input.status);
    const event = input.data;
    if (!event || typeof event !== "object" || Array.isArray(event) || !isValidIp(event.ip)) {
      return json({ error: "valid_ip_required" }, 400);
    }
    if (event.type !== undefined && (typeof event.type !== "string" || !/^[a-z_]{1,32}$/.test(event.type))) {
      return json({ error: "invalid_event_type" }, 400);
    }

    return json({
      event: { type: event.type || "sample_event", ip: event.ip },
      context: CONTEXT[event.ip] || null,
      data_source: "synthetic_documentation_fixtures",
      note: "Network context is not a person's identity."
    });
  }
};
