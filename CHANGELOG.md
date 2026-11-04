# Changelog

## 0.2.0 — unreleased

- **Customer** resource: Get, Get Many (by email, date or external reference, oldest or newest first), Set External
  Reference, and Update Roles. Update Roles adds and removes customer roles, with a dry run; it needs Integration Hub
  Pro release 4 in the store and a key with `customers:write`. The node stays free and checks no licence.
- Order → Add Note and Set External Reference; Product → Set External Reference.
- Order → Get Many filters by order number and can list newest first (needs Integration Hub release 5).
- Workflow templates.

## 0.1.0 — 2026-11-02

- **Cartenvo Integration Hub Trigger:** starts a workflow on store events. Registers its own webhook when the
  workflow is published and removes it when unpublished. Checks every delivery's signature and refuses those signed
  more than 5 minutes ago.
- **Cartenvo Integration Hub:** Order → Get, Get Many, Update Status, Add Shipment; Product → Update Stock,
  Update Price (in bulk, up to 1,000 lines a call, with dry runs). Writes carry an idempotency key, so Retry On Fail
  is safe.
- Example workflows: paid order → Google Sheets, new order → Slack, stock from Google Sheets.
