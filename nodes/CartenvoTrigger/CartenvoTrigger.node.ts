import { createHmac, timingSafeEqual } from 'crypto';
import type {
	IDataObject,
	IHookFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

import { hubRequest } from '../../shared/transport';

/** Deliveries signed longer ago than this are refused, as the Hub's docs advise. */
const MAX_AGE_SECONDS = 5 * 60;

export class CartenvoTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cartenvo Integration Hub Trigger',
		name: 'cartenvoTrigger',
		icon: { light: 'file:../../icons/cartenvo.svg', dark: 'file:../../icons/cartenvo.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{($parameter["events"] || []).join(", ")}}',
		description:
			'Starts the workflow when a nopCommerce store sends an event, such as a new order or a stock change',
		defaults: {
			name: 'Cartenvo Integration Hub Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'cartenvoApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'The API key needs the "webhooks:manage" scope. n8n registers the webhook in the store when the workflow is activated and removes it when it is deactivated.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Event Names or IDs',
				name: 'events',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getEvents',
				},
				required: true,
				default: [],
				description:
					'The store events that start the workflow. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Payload',
				name: 'format',
				type: 'options',
				options: [
					{
						name: 'Full',
						value: 'full',
						description: 'The whole order, product, stock line or customer',
					},
					{
						name: 'Thin',
						value: 'thin',
						description: 'Only the type and ID, for workflows that read the rest themselves',
					},
				],
				default: 'full',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Check Signature',
						name: 'checkSignature',
						type: 'boolean',
						default: true,
						description:
							'Whether to refuse deliveries that aren’t signed with the webhook’s secret, or were signed more than 5 minutes ago',
					},
					{
						displayName: 'Include Headers',
						name: 'includeHeaders',
						type: 'boolean',
						default: false,
						description:
							'Whether to add the delivery’s headers (event ID, attempt, delivery ID) to the output as "delivery"',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getEvents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const events = (await hubRequest.call(
					this,
					'GET',
					'/webhooks/events',
				)) as unknown as Array<{
					type: string;
					group: string;
				}>;
				return [
					{
						name: 'All Events',
						value: '*',
						description: 'Every event, including ones added later',
					},
					...events.map((event) => ({
						name: event.type,
						value: event.type,
						description: event.group,
					})),
				];
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				if (data.targetId === undefined) return false;
				const url = this.getNodeWebhookUrl('default');
				const targets = (await hubRequest.call(
					this,
					'GET',
					'/webhooks/targets',
				)) as unknown as Array<{
					id: number;
					url: string;
				}>;
				if (targets.some((target) => target.id === data.targetId && target.url === url))
					return true;
				delete data.targetId;
				delete data.secret;
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const url = this.getNodeWebhookUrl('default') as string;
				const events = this.getNodeParameter('events') as string[];
				const format = this.getNodeParameter('format') as string;
				const target = await hubRequest.call(this, 'POST', '/webhooks/targets', {
					name: `n8n: ${this.getWorkflow().name ?? 'workflow'}`.slice(0, 200),
					url,
					events: events.includes('*') ? ['*'] : events,
					format,
				});
				const data = this.getWorkflowStaticData('node');
				data.targetId = target.id;
				data.secret = target.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const data = this.getWorkflowStaticData('node');
				if (data.targetId !== undefined) {
					try {
						await hubRequest.call(this, 'DELETE', `/webhooks/targets/${data.targetId}`);
					} catch (error) {
						// Already removed in the store (404) is fine; anything else is reported.
						if (!(error instanceof NodeApiError) || error.httpCode !== '404') return false;
					}
				}
				delete data.targetId;
				delete data.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const request = this.getRequestObject();
		const options = this.getNodeParameter('options', {}) as {
			checkSignature?: boolean;
			includeHeaders?: boolean;
		};
		const headers = this.getHeaderData() as IDataObject;
		const header = (name: string) => {
			const value = headers[name];
			return Array.isArray(value) ? String(value[0]) : value === undefined ? '' : String(value);
		};

		if (options.checkSignature !== false) {
			const secret = this.getWorkflowStaticData('node').secret as string | undefined;
			const raw = (request as unknown as { rawBody?: Buffer }).rawBody;
			const problem = checkSignature(
				secret,
				raw ? raw.toString('utf8') : JSON.stringify(this.getBodyData()),
				header('x-cartenvo-timestamp'),
				header('x-cartenvo-signature'),
			);
			if (problem) {
				const response = this.getResponseObject();
				response.status(401).json({ error: problem });
				return { noWebhookResponse: true };
			}
		}

		const body = this.getBodyData();
		const json: IDataObject = { ...body };
		if (options.includeHeaders)
			json.delivery = {
				eventId: header('x-cartenvo-event-id'),
				eventType: header('x-cartenvo-event-type'),
				deliveryId: header('x-cartenvo-delivery-id'),
				attempt: Number(header('x-cartenvo-attempt')) || 1,
				timestamp: Number(header('x-cartenvo-timestamp')) || null,
			};

		return { workflowData: [this.helpers.returnJsonArray(json)] };
	}
}

/** Null when the delivery is genuine, or what is wrong with it. */
export function checkSignature(
	secret: string | undefined,
	rawBody: string,
	timestamp: string,
	signature: string,
	now = Math.floor(Date.now() / 1000),
): string | null {
	if (!secret)
		return 'This trigger has no signing secret. Deactivate and activate the workflow to register its webhook again.';
	const seconds = Number(timestamp);
	if (!Number.isFinite(seconds) || Math.abs(now - seconds) > MAX_AGE_SECONDS)
		return 'The delivery’s timestamp is missing or more than 5 minutes off.';
	const expected =
		'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
	const given = Buffer.from(signature);
	const wanted = Buffer.from(expected);
	if (given.length !== wanted.length || !timingSafeEqual(given, wanted))
		return 'The signature doesn’t match.';
	return null;
}
