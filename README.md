# Edge IP Context Demo

A small edge Worker that validates an event IP address and adds network context from synthetic documentation fixtures. It shows input bounds, strict address parsing, predictable JSON responses, and privacy-aware output.

## Try it

With Node.js 18 or newer, run `node --test`. To run the Worker locally, install Wrangler in your own development environment and run `wrangler dev`. No account binding or secret is needed for the demo.

Send `POST /enrich` with `Content-Type: application/json` and a body such as:

```json
{"ip":"192.0.2.10","type":"sample_login"}
```

`GET /health` returns a minimal status. Addresses outside the three fixtures return `context: null`; the Worker never calls an external service. The sample addresses are reserved for documentation.

## Security and scope

The request body is capped at 4 KiB. There is no user account, live lookup, private data, logging, or production route. The configuration disables the default public Worker subdomain. Review authentication, abuse controls, and deployment settings before adapting this example for a real data source. Network context should never be treated as proof of a person's identity.
