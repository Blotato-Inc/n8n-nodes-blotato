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

export async function getAccounts(
	this: ILoadOptionsFunctions,
	// filter?: { name?: string },
): Promise<INodeListSearchResult> {
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

	// TODO: filtering
	// for (const account of accounts) {
	// 	if (filter?.name && !account.fullname.toLowerCase().includes(filter.name.toLowerCase())) {
	// 		continue;
	// 	}
	// 	returnData.push({
	// 		name: `${account.fullname} (@${account.username}) [${account.platform}]`,
	// 		value: account.id,
	// 		description: `Platform: ${account.platform}, Username: @${account.username}`,
	// 	});
	// }

	return { results };
}

type SubaccountSearchItem = {
	id: string;
	accountId: string;
	name: string;
};

export async function getSubaccounts(
	this: ILoadOptionsFunctions,
	// filter?: { name?: string },
): Promise<INodeListSearchResult> {
	const platform = this.getNodeParameter('platform', 0) as string;
	const accountId = (this.getNodeParameter('accountId', 0) as { value: string }).value;
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

	// TODO: filtering
	// for (const account of accounts) {
	// 	if (filter?.name && !account.fullname.toLowerCase().includes(filter.name.toLowerCase())) {
	// 		continue;
	// 	}
	// 	returnData.push({
	// 		name: `${account.fullname} (@${account.username}) [${account.platform}]`,
	// 		value: account.id,
	// 		description: `Platform: ${account.platform}, Username: @${account.username}`,
	// 	});
	// }

	return { results };
}
