import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

type HubContext = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions;

export const API_PATH = '/api/cartenvo/v1';

/** The longest list the store returns in one call, and the most lines in one stock or price call. */
export const MAX_LIST = 100;
export const MAX_LINES = 1000;

/** An answer from the store's sync API, or a problem (RFC 9457) turned into an n8n error. */
export async function hubRequest(
	this: HubContext,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
	headers?: IDataObject,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('cartenvoApi');
	const base = String(credentials.storeUrl ?? '')
		.trim()
		.replace(/\/+$/, '');

	const options: IHttpRequestOptions = {
		method,
		url: `${base}${API_PATH}${path}`,
		qs: cleanQuery(qs),
		headers: { Accept: 'application/json', ...(headers ?? {}) },
		json: true,
		ignoreHttpStatusErrors: true,
		returnFullResponse: true,
		skipSslCertificateValidation: credentials.ignoreSslIssues === true,
	};
	if (body !== undefined) options.body = body;

	const response = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		'cartenvoApi',
		options,
	)) as { statusCode: number; body: unknown };

	const answer = parse(response.body);
	if (response.statusCode >= 400) {
		const problem = (answer ?? {}) as IDataObject;
		const errors = problem.errors as IDataObject | undefined;
		const details = [
			problem.detail,
			errors &&
				Object.entries(errors)
					.map(([field, message]) => `${field}: ${message}`)
					.join('; '),
		]
			.filter(Boolean)
			.join(' ');
		throw new NodeApiError(this.getNode(), problem as JsonObject, {
			httpCode: String(response.statusCode),
			message: String(problem.title ?? `The store answered ${response.statusCode}.`),
			description: details || undefined,
		});
	}
	return (answer ?? {}) as IDataObject;
}

function parse(body: unknown): unknown {
	if (typeof body !== 'string') return body;
	if (body.length === 0) return {};
	try {
		return JSON.parse(body);
	} catch {
		return { title: body };
	}
}

function cleanQuery(qs?: IDataObject): IDataObject | undefined {
	if (!qs) return undefined;
	const result: IDataObject = {};
	for (const [key, value] of Object.entries(qs))
		if (value !== undefined && value !== null && value !== '') result[key] = value;
	return result;
}
