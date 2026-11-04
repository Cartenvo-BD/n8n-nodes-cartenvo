import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { hubRequest, MAX_LINES, MAX_LIST } from '../../shared/transport';
import { orderFields, orderOperations } from './OrderDescription';
import { productFields, productOperations } from './ProductDescription';

export class Cartenvo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cartenvo Integration Hub',
		name: 'cartenvo',
		icon: { light: 'file:../../icons/cartenvo.svg', dark: 'file:../../icons/cartenvo.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Read orders, change their status, add shipments, and set stock and prices in a nopCommerce store',
		defaults: {
			name: 'Cartenvo Integration Hub',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'cartenvoApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Order', value: 'order' },
					{ name: 'Product', value: 'product' },
				],
				default: 'order',
			},
			...orderOperations,
			...orderFields,
			...productOperations,
			...productFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		if (resource === 'product' && operation !== 'setExternalReference')
			return [await bulkWrite.call(this, operation)];

		const items = this.getInputData();
		const output: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			try {
				const results =
					resource === 'product'
						? [await setReference.call(this, 'products', this.getNodeParameter('referenceProductId', i) as number, i)]
						: await orderOperation.call(this, operation, i);
				output.push(...results.map((json) => ({ json, pairedItem: { item: i } })));
			} catch (error) {
				if (this.continueOnFail()) {
					output.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				if (error instanceof NodeApiError) {
					error.context.itemIndex = i;
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}
		return [output];
	}
}

/** A key that makes n8n's "Retry On Fail" safe: a repeat in the same execution gets the first answer. */
function idempotencyKey(this: IExecuteFunctions, part: string | number): IDataObject {
	const execution = this.getExecutionId();
	if (!execution) return {};
	return { 'Idempotency-Key': `n8n-${execution}-${this.getNode().id}-${part}` };
}

async function orderOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject[]> {
	if (operation === 'get') {
		const orderId = this.getNodeParameter('orderId', i) as number;
		return [await hubRequest.call(this, 'GET', `/orders/${orderId}`)];
	}

	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const limit = returnAll ? Infinity : (this.getNodeParameter('limit', i) as number);
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const newest = this.getNodeParameter('sort', i, 'oldest') === 'newest';
		const orders: IDataObject[] = [];
		let next: number | undefined;
		do {
			const page = await hubRequest.call(this, 'GET', '/orders', undefined, {
				...filters,
				sort: newest ? 'newest' : undefined,
				[newest ? 'beforeId' : 'afterId']: next,
				limit: Math.min(MAX_LIST, limit - orders.length),
			});
			orders.push(...((page.items as IDataObject[]) ?? []));
			next = ((newest ? page.nextBeforeId : page.nextAfterId) as number | null) ?? undefined;
		} while (next !== undefined && orders.length < limit);
		return orders;
	}

	if (operation === 'addNote') {
		const orderId = this.getNodeParameter('orderId', i) as number;
		const note = (this.getNodeParameter('note', i) as string).trim();
		if (!note) throw new NodeOperationError(this.getNode(), 'The note is empty.', { itemIndex: i });
		return [
			await hubRequest.call(
				this,
				'POST',
				`/orders/${orderId}/notes`,
				{ note, displayToCustomer: this.getNodeParameter('displayToCustomer', i) as boolean },
				undefined,
				idempotencyKey.call(this, i),
			),
		];
	}

	if (operation === 'setExternalReference')
		return [await setReference.call(this, 'orders', this.getNodeParameter('orderId', i) as number, i)];

	if (operation === 'updateStatus') {
		const orderId = this.getNodeParameter('orderId', i) as number;
		const orderStatus = this.getNodeParameter('orderStatus', i) as string;
		const paymentStatus = this.getNodeParameter('paymentStatus', i) as string;
		if (!orderStatus && !paymentStatus)
			throw new NodeOperationError(
				this.getNode(),
				'Choose an order status, a payment status, or both.',
				{
					itemIndex: i,
				},
			);
		const body: IDataObject = {
			notifyCustomer: this.getNodeParameter('notifyCustomer', i) as boolean,
		};
		if (orderStatus) body.orderStatus = orderStatus;
		if (paymentStatus) body.paymentStatus = paymentStatus;
		return [
			await hubRequest.call(
				this,
				'POST',
				`/orders/${orderId}/status`,
				body,
				undefined,
				idempotencyKey.call(this, i),
			),
		];
	}

	if (operation === 'addShipment') {
		const orderId = this.getNodeParameter('orderId', i) as number;
		const lines = (this.getNodeParameter('items', i, {}) as IDataObject).item as
			| IDataObject[]
			| undefined;
		const extra = this.getNodeParameter('shipmentOptions', i, {}) as IDataObject;
		const body: IDataObject = {
			ship: this.getNodeParameter('ship', i) as boolean,
			deliver: this.getNodeParameter('deliver', i) as boolean,
			notifyCustomer: this.getNodeParameter('notifyCustomer', i) as boolean,
		};
		const tracking = this.getNodeParameter('trackingNumber', i) as string;
		if (tracking) body.trackingNumber = tracking;
		if (extra.adminComment) body.adminComment = extra.adminComment;
		if (lines?.length)
			body.items = lines.map((line) => {
				const result: IDataObject = { quantity: line.quantity };
				if (line.sku) result.sku = line.sku;
				if (line.orderItemId) result.orderItemId = line.orderItemId;
				if (line.warehouseId) result.warehouseId = line.warehouseId;
				return result;
			});
		return [
			await hubRequest.call(
				this,
				'POST',
				`/orders/${orderId}/shipments`,
				body,
				undefined,
				idempotencyKey.call(this, i),
			),
		];
	}

	throw new NodeOperationError(this.getNode(), `The operation "${operation}" isn't known.`);
}

/** Sets (or, with an empty reference, removes) the link to another system. Answers with all the entity's links. */
async function setReference(
	this: IExecuteFunctions,
	kind: 'orders' | 'products',
	id: number,
	i: number,
): Promise<IDataObject> {
	const system = (this.getNodeParameter('externalSystem', i) as string).trim().toLowerCase();
	const reference = (this.getNodeParameter('externalReference', i, '') as string).trim();
	if (!system)
		throw new NodeOperationError(this.getNode(), 'The external system is empty.', { itemIndex: i });
	const path = `/${kind}/${id}/external-references/${encodeURIComponent(system)}`;
	const references = reference
		? await hubRequest.call(this, 'PUT', path, { reference }, undefined, idempotencyKey.call(this, i))
		: await hubRequest.call(this, 'DELETE', path, undefined, undefined, idempotencyKey.call(this, i));
	return { id, system, reference: reference || null, externalReferences: references };
}

/**
 * Stock and prices: every input item is one line, sent together (up to 1,000 lines a call), so a sync of a
 * whole catalog takes a few calls. Each output item is what happened to its line.
 */
async function bulkWrite(
	this: IExecuteFunctions,
	operation: string,
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const isStock = operation === 'updateStock';
	const path = isStock ? '/stock' : '/prices';
	const dryRun = this.getNodeParameter('dryRun', 0) as boolean;
	const reason = isStock
		? (this.getNodeParameter('reason', 0, '') as string) || undefined
		: undefined;

	const lines: IDataObject[] = [];
	const output: INodeExecutionData[] = new Array(items.length);
	for (let i = 0; i < items.length; i++) {
		try {
			lines.push(isStock ? stockLine.call(this, i) : priceLine.call(this, i));
		} catch (error) {
			if (!this.continueOnFail())
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			lines.push({});
			output[i] = { json: { error: (error as Error).message }, pairedItem: { item: i } };
		}
	}

	const failures: string[] = [];
	for (let start = 0; start < lines.length; start += MAX_LINES) {
		const chunk = lines.slice(start, start + MAX_LINES);
		const sendable = chunk.map((line, n) => ({ line, i: start + n })).filter(({ i }) => !output[i]);
		if (sendable.length === 0) continue;
		const body: IDataObject = { lines: sendable.map(({ line }) => line), dryRun };
		if (reason) body.reason = reason;
		const result = await hubRequest.call(
			this,
			'POST',
			path,
			body,
			undefined,
			idempotencyKey.call(this, `${operation}-${start}`),
		);
		for (const line of (result.lines as IDataObject[]) ?? []) {
			const i = sendable[line.index as number]?.i;
			if (i === undefined) continue;
			const json: IDataObject = { ...line, dryRun: result.dryRun };
			delete json.index;
			if (line.status === 'failed') {
				failures.push(`item ${i + 1}: ${line.message ?? line.error}`);
				if (this.continueOnFail()) json.error = line.message ?? line.error;
			}
			output[i] = { json, pairedItem: { item: i } };
		}
	}

	if (failures.length > 0 && !this.continueOnFail())
		throw new NodeOperationError(
			this.getNode(),
			`${failures.length} of ${items.length} lines failed: ${failures.slice(0, 3).join('; ')}${failures.length > 3 ? '; …' : ''}`,
			{
				description: dryRun
					? 'Nothing was changed (dry run).'
					: 'The other lines were applied. Set "On Error" to "Continue" in the node settings to get every line as an item instead.',
			},
		);
	return output.filter(Boolean);
}

function identify(this: IExecuteFunctions, i: number): IDataObject {
	const by = this.getNodeParameter('identifyBy', i) as string;
	if (by === 'sku') {
		const sku = (this.getNodeParameter('sku', i) as string).trim();
		if (!sku) throw new NodeOperationError(this.getNode(), 'The SKU is empty.', { itemIndex: i });
		return { sku };
	}
	const line: IDataObject = { productId: this.getNodeParameter('productId', i) as number };
	const combinationId = this.getNodeParameter('combinationId', i, 0) as number;
	if (combinationId) line.combinationId = combinationId;
	return line;
}

function stockLine(this: IExecuteFunctions, i: number): IDataObject {
	const line = identify.call(this, i);
	const mode = this.getNodeParameter('stockMode', i) as string;
	const quantity = this.getNodeParameter('quantity', i) as number;
	line[mode === 'adjust' ? 'adjustment' : 'quantity'] = quantity;
	const warehouseId = this.getNodeParameter('warehouseId', i, 0) as number;
	if (warehouseId) line.warehouseId = warehouseId;
	return line;
}

function priceLine(this: IExecuteFunctions, i: number): IDataObject {
	const line = identify.call(this, i);
	line.price = this.getNodeParameter('price', i) as number;
	const extra = this.getNodeParameter('priceOptions', i, {}) as IDataObject;
	if (extra.oldPrice !== undefined) line.oldPrice = extra.oldPrice;
	if (extra.productCost !== undefined) line.productCost = extra.productCost;
	return line;
}
