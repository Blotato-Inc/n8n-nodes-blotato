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

export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'facebook';

export async function getAccountsTwitter(
	this: ILoadOptionsFunctions,
	// filter?: { name?: string },
): Promise<INodeListSearchResult> {
	const options: IRequestOptions = {};

	options.qs = { platform: 'twitter' };
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
