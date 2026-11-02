import type { INodeProperties } from 'n8n-workflow';

const forProduct = (operation: string[]) => ({ show: { resource: ['product'], operation } });
const both = forProduct(['updateStock', 'updatePrice']);

export const productOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['product'] } },
		options: [
			{
				name: 'Update Price',
				value: 'updatePrice',
				description: 'Set prices by SKU. Each input item is one line; up to 1,000 go in one call.',
				action: 'Update product prices',
			},
			{
				name: 'Update Stock',
				value: 'updateStock',
				description:
					'Set or adjust stock by SKU. Each input item is one line; up to 1,000 go in one call.',
				action: 'Update product stock',
			},
		],
		default: 'updateStock',
	},
];

export const productFields: INodeProperties[] = [
	{
		displayName: 'Find Product By',
		name: 'identifyBy',
		type: 'options',
		options: [
			{
				name: 'SKU',
				value: 'sku',
				description: 'A product’s SKU, or an attribute combination’s',
			},
			{ name: 'Product ID', value: 'productId' },
		],
		default: 'sku',
		displayOptions: both,
	},
	{
		displayName: 'SKU',
		name: 'sku',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['product'], identifyBy: ['sku'] } },
	},
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'number',
		required: true,
		default: 0,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['product'], identifyBy: ['productId'] } },
	},
	{
		displayName: 'Combination ID',
		name: 'combinationId',
		type: 'number',
		default: 0,
		displayOptions: { show: { resource: ['product'], identifyBy: ['productId'] } },
		description: 'For products whose stock or price is kept per attribute combination',
	},

	// Stock
	{
		displayName: 'Mode',
		name: 'stockMode',
		type: 'options',
		options: [
			{ name: 'Set Quantity', value: 'set', description: 'The new stock quantity' },
			{
				name: 'Adjust Quantity',
				value: 'adjust',
				description: 'Add (or with a minus sign, remove) this many',
			},
		],
		default: 'set',
		displayOptions: forProduct(['updateStock']),
	},
	{
		displayName: 'Quantity',
		name: 'quantity',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: forProduct(['updateStock']),
	},
	{
		displayName: 'Warehouse ID',
		name: 'warehouseId',
		type: 'number',
		default: 0,
		displayOptions: forProduct(['updateStock']),
		description: 'Only for products stocked in several warehouses',
	},
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		default: 'n8n',
		displayOptions: forProduct(['updateStock']),
		description:
			'Kept in nopCommerce’s stock history. The first item’s value is used for the whole call.',
	},

	// Price
	{
		displayName: 'Price',
		name: 'price',
		type: 'number',
		required: true,
		default: 0,
		typeOptions: { minValue: 0, numberPrecision: 4 },
		displayOptions: forProduct(['updatePrice']),
	},
	{
		displayName: 'Options',
		name: 'priceOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: forProduct(['updatePrice']),
		options: [
			{
				displayName: 'Old Price',
				name: 'oldPrice',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0, numberPrecision: 4 },
				description: 'The crossed-out “was” price. Products only, not combinations.',
			},
			{
				displayName: 'Product Cost',
				name: 'productCost',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0, numberPrecision: 4 },
				description: 'Products only, not combinations',
			},
		],
	},

	{
		displayName: 'Dry Run',
		name: 'dryRun',
		type: 'boolean',
		default: false,
		displayOptions: both,
		description:
			'Whether to only check the lines and report what would change, without changing anything. The first item’s value is used for the whole call.',
	},
];
