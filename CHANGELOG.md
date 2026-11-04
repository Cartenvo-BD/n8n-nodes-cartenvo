# Changelog

## 0.1.0 — unreleased

- **Cartenvo Integration Hub Trigger:** starts a workflow on store events. Registers its own webhook when the
  workflow is published and removes it when unpublished. Checks every delivery's signature and refuses those signed
  more than 5 minutes ago.
- **Cartenvo Integration Hub:** Order → Get, Get Many (by order number, oldest or newest first), Update Status,
  Add Shipment, Add Note, Set External Reference; Product → Set External Reference, Update Stock, Update Price (in bulk, up to 1,000 lines a call, with dry runs). Writes carry an idempotency key, so Retry On Fail
  is safe.
- Get Many's order number filter and newest-first sort need Integration Hub release 5.
- Example workflows: paid order → Google Sheets, new order → Slack, stock from Google Sheets.
