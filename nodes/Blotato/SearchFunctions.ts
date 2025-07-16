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

export async function getAccounts(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const platform = this.getNodeParameter('platform', 0) as string;
	const options: IRequestOptions = {};

	options.qs = { platform };
	options.method = `GET`;

	const credentials = await this.getCredentials('blotatoApi');
	options.uri = credentials.server + '/v2/users/me/accounts';
	const responseData = await this.helpers.requestWithAuthentication.call(
		this,
		'blotatoApi',
		options,
	);

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
		const responseData = await this.helpers.requestWithAuthentication.call(
			this,
			'blotatoApi',
			options,
		);

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
