# Workflow templates

Ready-made n8n workflows for nopCommerce stores with the Cartenvo Integration Hub plugin. Each one uses the
**Cartenvo Integration Hub Trigger** (and, for ShipStation, the **Cartenvo Integration Hub** node) with n8n's own nodes.

| File | What it does | Other app |
|---|---|---|
| [new-order-to-quickbooks-invoice.json](new-order-to-quickbooks-invoice.json) | New order → QuickBooks Online invoice. Finds the customer by email, or makes them. | QuickBooks Online |
| [new-order-to-xero-invoice.json](new-order-to-xero-invoice.json) | New order → draft Xero sales invoice. Finds the contact by email, or makes them. | Xero |
| [new-order-to-google-sheets.json](new-order-to-google-sheets.json) | New order → a row in Google Sheets, with customer, items and totals. | Google Sheets |
| [order-alerts-to-slack.json](order-alerts-to-slack.json) | New order, cancelled order or voided payment → Slack message. | Slack |
| [new-customer-to-hubspot.json](new-customer-to-hubspot.json) | New customer → HubSpot contact (created or updated). | HubSpot |
| [new-customer-to-mailchimp.json](new-customer-to-mailchimp.json) | New customer → Mailchimp subscriber, with double opt-in. | Mailchimp |
| [shipstation-orders-and-shipments.json](shipstation-orders-and-shipments.json) | Paid order → ShipStation order. ShipStation shipment → shipment with tracking on the nopCommerce order. | ShipStation |

## How to use one

1. Install the community node `n8n-nodes-cartenvo` (**Settings → Community nodes**).
2. In n8n, open **Workflows → Import from file** (or paste the file's text into an empty workflow).
3. Open each node that shows a warning and choose a credential. For the store, make an API key in the store admin
   under **Configuration → Integration Hub → API keys** with `webhooks:manage`, plus `orders:write` for ShipStation.
4. Read the yellow note in the workflow. It lists what to change, such as the QuickBooks item or the Slack channel.
5. Activate the workflow. The trigger registers its webhook in the store by itself.

## Good to know

- Amounts are in the store's primary currency.
- nopCommerce has no "payment failed" event of its own: a failed online payment leaves the order **Pending**. The
  Slack workflow marks such orders, and posts `order.cancelled`, `order.voided` and `order.payment_failed`
  (Integration Hub release 5: a failed recurring payment, or an order still unpaid after the hours set in Settings).
- The ShipStation workflow uses n8n's HTTP Request node, because n8n has no ShipStation node. It links orders with
  the order key `nop-` + the nopCommerce order ID.
- Each file was checked by importing it into n8n 2.45.
