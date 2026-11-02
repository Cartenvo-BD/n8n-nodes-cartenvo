import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CartenvoApi implements ICredentialType {
	name = 'cartenvoApi';

	displayName = 'Cartenvo Integration Hub API';

	icon: Icon = { light: 'file:../icons/cartenvo.svg', dark: 'file:../icons/cartenvo.dark.svg' };

	documentationUrl = 'https://github.com/Cartenvo-BD/n8n-nodes-cartenvo#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Store URL',
			name: 'storeUrl',
			type: 'string',
			default: '',
			placeholder: 'https://shop.example.com',
			description: 'The address of the nopCommerce store, without /api',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Made in the store admin under Configuration → Integration Hub → API keys. It starts with cih_.',
			required: true,
		},
		{
			displayName: 'Ignore SSL Issues (Insecure)',
			name: 'ignoreSslIssues',
			type: 'boolean',
			default: false,
			description:
				'Whether to connect even if the store’s certificate can’t be checked. Only for test stores.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.storeUrl.replace(/\\/+$/, "")}}/api/cartenvo/v1',
			url: '/me',
			method: 'GET',
			skipSslCertificateValidation: '={{$credentials.ignoreSslIssues}}',
		},
	};
}
