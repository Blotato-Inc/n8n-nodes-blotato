import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	IRequestOptions,
} from 'n8n-workflow';

type AccountSearchItem = {
	id: string;
	platform: string;
	fullname: string;
	username: string;
};

type TemplateSearchItem = {
	id: string;
	name: string;
	description: string;
	type: string;
	inputs?: Record<string, any>;
};

export async function getAccounts(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const platform = this.getNodeParameter('platform', 0) as string;
	const options: IRequestOptions = {};

	options.qs = { platform };
	options.method = `GET`;

	const credentials = await this.getCredentials('blotatoApi');
	options.uri = credentials.server + '/v2/users/me/accounts';
	
	let responseData;
	try {
		responseData = await this.helpers.requestWithAuthentication.call(
			this,
			'blotatoApi',
			options,
		);
	} catch (error) {
		return { results: [] };
	}

	const results: INodeListSearchItems[] = JSON.parse(responseData).items.map(
		(item: AccountSearchItem) => ({
			name: item.fullname || item.username,
			value: item.id,
			url: `${credentials.server}/v2/accounts/${item.id}`,
		}),
	);

	return { results };
}

type SubaccountSearchItem = {
	id: string;
	accountId: string;
	name: string;
};

export async function getSubaccounts(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const platform = this.getNodeParameter('platform', 0) as string;

	// Check if account is selected
	try {
		const accountIdParam = this.getNodeParameter('accountId', 0) as { value: string } | string;
		const accountId = typeof accountIdParam === 'object' ? accountIdParam.value : accountIdParam;

		if (!accountId) {
			return {
				results: [
					{
						// used for displaying a message in the dropdown
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Please select an account above first',
						value: '',
					},
				],
			};
		}

		const options: IRequestOptions = {};

		options.qs = { platform };
		options.method = `GET`;

		const credentials = await this.getCredentials('blotatoApi');
		options.uri = credentials.server + `/v2/users/me/accounts/${accountId}/subaccounts`;
		
		let responseData;
		try {
			responseData = await this.helpers.requestWithAuthentication.call(
				this,
				'blotatoApi',
				options,
			);
		} catch (error) {
			// For list search functions, return empty results on error
			// This prevents blocking the UI when credentials are invalid
			return { results: [] };
		}

		const results: INodeListSearchItems[] = JSON.parse(responseData).items.map(
			(item: SubaccountSearchItem) => ({
				name: item.name,
				value: item.id,
				url: `${credentials.server}/v2/accounts/${item.accountId}/subaccounts/${item.id}`,
			}),
		);

		return { results };
	} catch (error) {
		// Return helpful message if there's an error
		return {
			results: [
				{
					// used for displaying a message in the dropdown
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'Please select an account above first',
					value: '',
				},
			],
		};
	}
}

export async function getTemplates(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const options: IRequestOptions = {};

	options.method = `GET`;

	const credentials = await this.getCredentials('blotatoApi');
	options.uri = credentials.server + '/v2/videos/templates';
	
	let responseData;
	try {
		responseData = await this.helpers.requestWithAuthentication.call(
			this,
			'blotatoApi',
			options,
		);
	} catch (error) {
		return { results: [] };
	}

	const templates = JSON.parse(responseData).items || JSON.parse(responseData);

	const results: INodeListSearchItems[] = templates.map(
		(item: TemplateSearchItem) => ({
			name: `${item.description}`,
			value: item.id,
			description: item.type ? `Type: ${item.type}` : undefined,
		}),
	);

	return { results };
}
