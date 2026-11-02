import type { INodeProperties } from 'n8n-workflow';

const forOrder = (operation: string[]) => ({ show: { resource: ['order'], operation } });

export const orderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['order'] } },
		options: [
			{
				name: 'Add Shipment',
				value: 'addShipment',
				description: 'Ship some or all of an order’s items, with a tracking number',
				action: 'Add a shipment to an order',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an order with its items, addresses and totals',
				action: 'Get an order',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get orders, oldest first, by status or date',
				action: 'Get many orders',
			},
			{
				name: 'Update Status',
				value: 'updateStatus',
				description: 'Set the order status or the payment status',
				action: 'Update an order status',
			},
		],
		default: 'get',
	},
];

export const orderFields: INodeProperties[] = [
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'number',
		required: true,
		default: 0,
		typeOptions: { minValue: 1 },
		displayOptions: forOrder(['get', 'updateStatus', 'addShipment']),
		description:
			'The nopCommerce order ID (the number in the admin URL), not the custom order number',
	},

	// Get many
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: forOrder(['getAll']),
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['order'], operation: ['getAll'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: forOrder(['getAll']),
		options: [
			{
				displayName: 'Created Since',
				name: 'createdSince',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'External Reference',
				name: 'externalReference',
				type: 'string',
				default: '',
				description:
					'The order’s number in the other system, such as SO0042. Needs External System.',
			},
			{
				displayName: 'External System',
				name: 'externalSystem',
				type: 'string',
				default: '',
				placeholder: 'odoo',
				description: 'Find the order by its number in another system',
			},
			{
				displayName: 'Order Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Cancelled', value: 'Cancelled' },
					{ name: 'Complete', value: 'Complete' },
					{ name: 'Pending', value: 'Pending' },
					{ name: 'Processing', value: 'Processing' },
				],
				default: 'Pending',
			},
			{
				displayName: 'Paid Since',
				name: 'paidSince',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Payment Status',
				name: 'paymentStatus',
				type: 'options',
				options: [
					{ name: 'Authorized', value: 'Authorized' },
					{ name: 'Paid', value: 'Paid' },
					{ name: 'Partially Refunded', value: 'PartiallyRefunded' },
					{ name: 'Pending', value: 'Pending' },
					{ name: 'Refunded', value: 'Refunded' },
					{ name: 'Voided', value: 'Voided' },
				],
				default: 'Paid',
			},
			{
				displayName: 'Shipping Status',
				name: 'shippingStatus',
				type: 'options',
				options: [
					{ name: 'Delivered', value: 'Delivered' },
					{ name: 'Not Yet Shipped', value: 'NotYetShipped' },
					{ name: 'Partially Shipped', value: 'PartiallyShipped' },
					{ name: 'Shipped', value: 'Shipped' },
					{ name: 'Shipping Not Required', value: 'ShippingNotRequired' },
				],
				default: 'NotYetShipped',
			},
		],
	},

	// Update status
	{
		displayName: 'Order Status',
		name: 'orderStatus',
		type: 'options',
		options: [
			{
				name: 'Cancelled',
				value: 'Cancelled',
				description: 'Cancels the order the way admin does (stock goes back)',
			},
			{ name: 'Complete', value: 'Complete' },
			{ name: 'Don’t Change', value: '' },
			{ name: 'Pending', value: 'Pending' },
			{ name: 'Processing', value: 'Processing' },
		],
		default: '',
		displayOptions: forOrder(['updateStatus']),
	},
	{
		displayName: 'Payment Status',
		name: 'paymentStatus',
		type: 'options',
		options: [
			{ name: 'Don’t Change', value: '' },
			{ name: 'Paid', value: 'Paid' },
			{
				name: 'Refunded',
				value: 'Refunded',
				description: 'An offline refund of the whole order; no money is moved',
			},
			{ name: 'Voided', value: 'Voided' },
		],
		default: '',
		displayOptions: forOrder(['updateStatus']),
	},

	// Add shipment
	{
		displayName: 'Items',
		name: 'items',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add item',
		default: {},
		displayOptions: forOrder(['addShipment']),
		description: 'Leave empty to ship everything not yet in a shipment',
		options: [
			{
				displayName: 'Item',
				name: 'item',
				values: [
					{
						displayName: 'SKU',
						name: 'sku',
						type: 'string',
						default: '',
						description: 'The product’s SKU. Or give the order item ID.',
					},
					{
						displayName: 'Order Item ID',
						name: 'orderItemId',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Quantity',
						name: 'quantity',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 1 },
					},
					{
						displayName: 'Warehouse ID',
						name: 'warehouseId',
						type: 'number',
						default: 0,
						description: 'Only for products stocked in several warehouses',
					},
				],
			},
		],
	},
	{
		displayName: 'Tracking Number',
		name: 'trackingNumber',
		type: 'string',
		default: '',
		displayOptions: forOrder(['addShipment']),
	},
	{
		displayName: 'Mark as Shipped',
		name: 'ship',
		type: 'boolean',
		default: true,
		displayOptions: forOrder(['addShipment']),
		description: 'Whether to mark the shipment as shipped (or ready for pickup) at once',
	},
	{
		displayName: 'Mark as Delivered',
		name: 'deliver',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['order'], operation: ['addShipment'], ship: [true] } },
		description: 'Whether to also mark it as delivered',
	},
	{
		displayName: 'Notify Customer',
		name: 'notifyCustomer',
		type: 'boolean',
		default: true,
		displayOptions: forOrder(['addShipment']),
		description: 'Whether to send nopCommerce’s shipped and delivered emails',
	},
	{
		displayName: 'Notify Customer',
		name: 'notifyCustomer',
		type: 'boolean',
		default: false,
		displayOptions: forOrder(['updateStatus']),
		description: 'Whether to email the customer where nopCommerce would (paid, cancelled)',
	},
	{
		displayName: 'Options',
		name: 'shipmentOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: forOrder(['addShipment']),
		options: [
			{
				displayName: 'Admin Comment',
				name: 'adminComment',
				type: 'string',
				default: '',
				description: 'A note on the shipment, seen only in admin',
			},
		],
	},
];
