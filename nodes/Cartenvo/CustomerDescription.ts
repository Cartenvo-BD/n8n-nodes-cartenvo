import type { INodeProperties } from 'n8n-workflow';

const forCustomer = (operation: string[]) => ({ show: { resource: ['customer'], operation } });

export const customerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['customer'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a registered customer with their roles and addresses',
				action: 'Get a customer',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get registered customers by email, date or a number in another system',
				action: 'Get many customers',
			},
			{
				name: 'Set External Reference',
				value: 'setExternalReference',
				description: 'Link a customer to their number in another system, such as an ERP',
				action: 'Set a customer external reference',
			},
			{
				name: 'Update Roles',
				value: 'updateRoles',
				description:
					'Add and remove customer roles, such as a price group. Needs Integration Hub Pro.',
				action: 'Update customer roles',
			},
		],
		default: 'get',
	},
];

export const customerFields: INodeProperties[] = [
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'number',
		required: true,
		default: 0,
		typeOptions: { minValue: 1 },
		displayOptions: forCustomer(['get', 'setExternalReference', 'updateRoles']),
		description: 'The nopCommerce customer ID (the number in the admin URL)',
	},

	// Get many
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: forCustomer(['getAll']),
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['customer'], operation: ['getAll'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Sort',
		name: 'sort',
		type: 'options',
		options: [
			{ name: 'Oldest First', value: 'oldest' },
			{ name: 'Newest First', value: 'newest' },
		],
		default: 'oldest',
		displayOptions: forCustomer(['getAll']),
	},
	{
		displayName: 'Filters',
		name: 'customerFilters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: forCustomer(['getAll']),
		options: [
			{
				displayName: 'Created Since',
				name: 'createdSince',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'External Reference',
				name: 'externalReference',
				type: 'string',
				default: '',
				description: 'The customer’s number in the other system. Needs External System.',
			},
			{
				displayName: 'External System',
				name: 'externalSystem',
				type: 'string',
				default: '',
				placeholder: 'odoo',
				description: 'Find the customer by their number in another system',
			},
		],
	},

	// External reference
	{
		displayName: 'External System',
		name: 'externalSystem',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'odoo',
		displayOptions: forCustomer(['setExternalReference']),
		description:
			'A short name for the other system: lower-case letters, digits, dots, dashes and underscores, such as odoo or sap-b1',
	},
	{
		displayName: 'External Reference',
		name: 'externalReference',
		type: 'string',
		default: '',
		displayOptions: forCustomer(['setExternalReference']),
		description: 'The customer’s number in that system, such as C00042. Leave empty to remove the link.',
	},

	// Roles
	{
		displayName: 'This action needs Integration Hub Pro in the store and an API key with the customers:write scope.',
		name: 'proNotice',
		type: 'notice',
		default: '',
		displayOptions: forCustomer(['updateRoles']),
	},
	{
		displayName: 'Roles to Add',
		name: 'addRoles',
		type: 'string',
		default: '',
		placeholder: 'Wholesale, Gold',
		displayOptions: forCustomer(['updateRoles']),
		description:
			'Customer roles by system name or name, separated by commas, as in Customers → Customer roles',
	},
	{
		displayName: 'Roles to Remove',
		name: 'removeRoles',
		type: 'string',
		default: '',
		placeholder: 'Retail',
		displayOptions: forCustomer(['updateRoles']),
		description: 'Customer roles by system name or name, separated by commas',
	},
	{
		displayName: 'Dry Run',
		name: 'rolesDryRun',
		type: 'boolean',
		default: false,
		displayOptions: forCustomer(['updateRoles']),
		description: 'Whether to only check the roles and report what would change',
	},
];
