# Live Order Tracking — API contract v1 (proposal)

Shared contract for Quy (Frontend) and Hung (Backend). Flask serves HTML and API on the same origin. Local base URL: http://127.0.0.1:5000.

## Data
`data/orders.json` contains an array of orders. Each order has `id` (unique integer), `customer` (string), `status` (Pending, Processing, Shipping, Delivered), `updated_at` (string YYYY-MM-DD HH:mm:ss, local Vietnam time). All names and dates in the seed are fictional demo data.

## GET /
200 text/html: Flask renders `templates/index.html` with the current `orders` array. Used for Full-Page Reload. Reload via `window.location.reload()` or normal navigation, not Fetch.

## GET /api/orders
200 application/json: array of order objects, same shape as orders.json. Empty result: `[]`.

## PUT /api/orders/{id}
Request Content-Type: application/json
```json
{"status":"Shipping"}
```
200: updated order object. Server sets updated_at, persists the change and increments the revision only when status changes. 400 invalid JSON/status; 404 unknown ID. Error shape: `{"error":"Invalid status"}` (message varies).

## GET /api/orders/poll?since=0
Long polling, planned for day 3. `since` is an integer revision, not a timestamp. Server revision starts at 1 for a running demo session. If current revision > since, return immediately. Otherwise wait until a change or 20 seconds. On change, return 200 JSON: `{"changed":true,"version":2,"orders":[...]}` (full current list, real objects). On timeout: `{"changed":false,"version":2,"orders":[]}`. Client retains existing rows on timeout, then reconnects with the returned version. First request uses since=0. Reset since=0 after a server restart; server may also return a full snapshot when since exceeds its current revision. 400 for invalid since. Stop/abort polling when switching methods. Backend must allow concurrent requests and must not hold the data lock while waiting.

## Shared benchmark rules
Same order dataset, same state change, same browser and network/cache settings. Compare full document response vs Fetch list response vs Long Polling response containing the same current list. Record transferred/payload bytes consistently, TTFB and DOM behavior. For Long Polling separately record intentional wait and timeout; do not interpret waiting as server processing time. Save actual DevTools evidence; do not invent measurements.

## Ownership and schedule
Day 1: Quy builds static HTML/CSS; Hung creates Flask, data/orders.json and GET /api/orders. Agree on GET / rendering route (can use temporary HTML initially). Day 2: Full-Page Reload and PUT. Day 3: Fetch and Long Polling. Day 4: integrate. Day 5: measure.
This is a proposed interface, not a running server. Hung implements the routes. Any contract changes must be agreed by both members.
