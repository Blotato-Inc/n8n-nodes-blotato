import type {
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { getAccountsTwitter } from './SearchFunctions';

export class Blotato implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Blotato',
		name: 'blotato',
		icon: 'file:blotato.png',
		group: ['input'],
		version: [2],
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Use Blotato API',
		defaults: {
			name: 'Blotato',
		},
		usableAsTool: true,
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		// TODO: use webhooks when the post is done
		webhooks: [],
		credentials: [
			{
				name: 'blotatoApi',
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
					{
						name: 'Media',
						value: 'media',
					},
					{
						name: 'Post',
						value: 'post',
					},
				],
				default: 'post',
			},

			// ----------------------------------
			//         operations
			// ----------------------------------

			// media

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['media'],
					},
				},
				options: [
					{
						name: 'Upload',
						value: 'uploadMediaUrl',
						description: 'Upload an image or video from a URL',
						action: 'Upload media to Blotato',
					},
				],
				default: 'uploadMediaUrl',
			},

			// upload media
			// body.url
			{
				displayName: 'Media URL',
				name: 'mediaUrl',
				type: 'string',
				default: 'paste a valid url here',
				validateType: 'url',
				required: true,
				displayOptions: {
					show: {
						resource: ['media'],
						operation: ['uploadMediaUrl'],
					},
				},
				description: 'URL of the media to upload',
			},

			// publishing

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['post'],
					},
				},
				options: [
					{
						name: 'Post to Twitter',
						value: 'postTwitter',
						description: 'Post content to Twitter',
						action: 'Post to twitter',
					},
				],
				default: 'postTwitter',
			},

			// request.post.body
			{
				displayName: 'Post Contents',
				name: 'postBody',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['post'],
					},
				},
				description: 'Post contents or description for media upload',
			},

			// request.post.accountId
			{
				displayName: 'Account',
				name: 'accountId',
				type: 'resourceLocator',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Choose account to post to',
						typeOptions: {
							searchListMethod: 'getAccountsTwitter',
							// TODO: searchable
							searchable: false,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. 1234',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^[1-9]+[0-9]*$',
									errorMessage: 'Not a valid account ID',
								},
							},
						],
					},
				],
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['post'],
					},
				},
				description: 'Your Blotato social media account ID',
			},
		],
	};

	methods = {
		listSearch: {
			getAccountsTwitter,
		},
	};

	// TODO: add methods like listing your account id
	// methods = {
	// };

	// async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
	// 	// TODO:
	// }

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		const operationMap: Record<
			`${string}/${string}`,
			{
				path: string;
				method: IHttpRequestMethods;
				getBody: () => IRequestOptions['body'];
			}
		> = {
			'media/uploadMediaUrl': {
				path: '/v2/media',
				method: 'POST',
				getBody: () => {
					return { url: this.getNodeParameter('mediaUrl', 0) };
				},
			},
			'post/postTwitter': {
				path: '/v2/posts',
				method: 'POST',
				getBody: () => {
					return {
						post: {
							target: {
								targetType: 'twitter',
							},
							content: {
								text: this.getNodeParameter('postBody', 0),
								platform: 'twitter',
								mediaUrls: [],
							},
							accountId: (this.getNodeParameter('accountId', 0) as { value: string }).value,
						},
					};
				},
			},
		};

		const options: IRequestOptions = {};

		const op = operationMap[`${resource}/${operation}`];
		if (!op) {
			throw new NodeOperationError(
				this.getNode(),
				`The resource "${resource}" with operation "${operation}" is not supported!`,
			);
		}
		options.method = op.method;
		options.body = op.getBody();

		this.logger.debug(`Blotato API Request body:\n${JSON.stringify(options.body, null, 2)}`);

		const credentials = await this.getCredentials('blotatoApi');
		options.uri = credentials.server + op.path;
		const response = await this.helpers.requestWithAuthentication.call(this, 'blotatoApi', options);
		return [[{ json: JSON.parse(response) }]];
	}
}
