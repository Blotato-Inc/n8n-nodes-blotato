import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BlotatoApi implements ICredentialType {
	name = 'blotatoApi';

	displayName = 'Blotato API';

	documentationUrl = 'blotato';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Your Blotato API key',
		},
		{
			displayName: 'Blotato Server',
			name: 'server',
			type: 'string',
			default: 'https://backend.blotato.com',
			description: 'The server to connect to. Just leave is as a default',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'blotato-api-key': '={{$credentials?.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.server}}',
			url: '/v2/users/me',
			method: 'GET',
		},
	};
}
