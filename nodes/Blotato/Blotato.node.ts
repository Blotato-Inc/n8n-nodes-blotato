import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { getAccounts, getSubaccounts } from './SearchFunctions';

export class Blotato implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Blotato',
		name: 'blotato',
		icon: 'file:blotato.svg',
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
			// ----------------------------------
			//         Top Level Resources
			// ----------------------------------
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
			//         Operations
			// ----------------------------------

			// ------------- media --------------

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
						value: 'upload',
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
				displayOptions: {
					show: {
						resource: ['media'],
						operation: ['upload'],
					},
				},
				description: 'URL of the media to upload',
			},

			// ------------- post --------------
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
						name: 'Create',
						value: 'create',
						description: 'Create new post',
						action: 'Create new post',
					},
				],
				default: 'create',
			},

			// platform
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'options',
				options: [
					{ name: 'Bluesky', value: 'bluesky' },
					{ name: 'Facebook', value: 'facebook' },
					{ name: 'Instagram', value: 'instagram' },
					{ name: 'LinkedIn', value: 'linkedin' },
					{ name: 'Pinterest', value: 'pinterest' },
					{ name: 'Threads', value: 'threads' },
					{ name: 'TikTok', value: 'tiktok' },
					{ name: 'Twitter', value: 'twitter' },
					{ name: 'YouTube', value: 'youtube' },
				],
				default: 'instagram',
				description: 'Social media platform',
				required: true,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
					},
				},
			},

			// post.content.text
			{
				displayName: 'Post Contents',
				name: 'postContentText',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
					},
				},
				description: 'Post contents or description for media upload',
			},

			// isWebhook
			// {
			// 	displayName: 'Webhook',
			// 	name: 'platform',
			// 	type: 'boolean',
			// 	default: false,
			// 	description: 'Use webhook?',
			// 	displayOptions: {
			// 		show: {
			// 			resource: ['post'],
			// 			operation: ['create'],
			// 		},
			// 	},
			// },

			// post.content.mediaUrls
			{
				displayName: 'Attached Media URLs',
				name: 'postContentMediaUrls',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
					},
				},
				description: 'Comma separate list of media URLs',
				placeholder:
					'https://database.blotato.com/image1.jpg, https://database.blotato.com/image2.jpg',
			},

			// post.content.additionalPosts
			{
				displayName: 'Thread-like Additional Posts',
				name: 'postContentAdditionalPosts',
				placeholder: 'Add New Post',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['twitter', 'threads', 'bluesky'],
					},
				},
				options: [
					{
						name: 'posts',
						displayName: 'Posts',
						values: [
							{
								displayName: 'Text',
								name: 'text',
								type: 'string',
								typeOptions: {
									rows: 3,
								},
								default: '',
								description: 'The text content of the additional post',
								required: true,
							},
							{
								displayName: 'Media URLs',
								name: 'mediaUrls',
								type: 'string',
								default: '',
								description: 'Comma separate list of media URLs',
								placeholder:
									'https://database.blotato.com/image1.jpg, https://database.blotato.com/image2.jpg',
							},
						],
					},
				],
			},

			// post.accountId
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
							searchListMethod: 'getAccounts',
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
						operation: ['create'],
					},
				},
				description: 'Your Blotato social media account ID',
			},

			// post.target - tiktok
			{
				displayName: 'Privacy Level',
				name: 'postCreateTiktokOptionPrivacyLevel',
				type: 'options',
				default: 'PUBLIC_TO_EVERYONE',
				options: [
					{
						name: 'Self Only',
						value: 'SELF_ONLY',
					},
					{
						name: 'Public to Everyone',
						value: 'PUBLIC_TO_EVERYONE',
					},
					{
						name: 'Mutual Follow Friends',
						value: 'MUTUAL_FOLLOW_FRIENDS',
					},
					{
						name: 'Follower of Creator',
						value: 'FOLLOWER_OF_CREATOR',
					},
				],
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['tiktok'],
					},
				},
				description: 'Set the privacy level for the TikTok post',
			},
			{
				displayName: 'Disable Comments',
				name: 'postCreateTiktokOptionDisabledComments',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['tiktok'],
					},
				},
				description: 'Whether to disable comments on this post',
			},
			{
				displayName: 'Disable Duet',
				name: 'postCreateTiktokOptionDisabledDuet',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['tiktok'],
					},
				},
				description: 'Whether to disable duet for this post',
			},
			{
				displayName: 'Disable Stitch',
				name: 'postCreateTiktokOptionDisabledStitch',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['tiktok'],
					},
				},
				description: 'Whether to disable stitch for this post',
			},
			{
				displayName: 'Is Branded Content',
				name: 'postCreateTiktokOptionIsBrandedContent',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['tiktok'],
					},
				},
				description: 'Whether this post contains branded content',
			},
			{
				displayName: 'Is Your Brand',
				name: 'postCreateTiktokOptionIsYourBrand',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['tiktok'],
					},
				},
				description: 'Whether this post is about your own brand',
			},
			{
				displayName: 'Is AI Generated',
				name: 'postCreateTiktokOptionIsAiGenerated',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['tiktok'],
					},
				},
				description: 'Whether this content is AI generated',
			},
			{
				displayName: 'Auto Add Music',
				name: 'postCreateTiktokOptionAutoAddMusic',
				type: 'boolean',
				default: false,
				required: false,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['tiktok'],
					},
				},
				description: 'Whether to automatically add music to the post',
			},

			// post.target - facebook
			{
				displayName: 'Facebook Page',
				name: 'facebookPageId',
				type: 'resourceLocator',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a Facebook Page...',
						typeOptions: {
							searchListMethod: 'getSubaccounts',
							// searchable: false,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. 123456789012345',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^[0-9]+$',
									errorMessage: 'Not a valid Facebook Page ID (only numbers)',
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
						operation: ['create'],
						platform: ['facebook'],
					},
				},
				description: 'The Facebook Page ID to post to',
			},
		],
	};

	methods = {
		listSearch: {
			getAccounts,
			getSubaccounts,
		},
	};

	// TODO: add methods like listing your account id
	// methods = {
	// };

	// async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
	// 	// TODO:
	// }

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputItems = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < inputItems.length; i++) {
			const resource = this.getNodeParameter('resource', i);
			const operation = this.getNodeParameter('operation', i);

			const options: IRequestOptions = {};

			if (resource === 'media') {
				options.json = true;
				options.method = 'POST';
				options.uri = '/v2/media';

				if (operation === 'uploadMediaUrl') {
					options.body = { url: this.getNodeParameter('mediaUrl', i) };
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Operation "${operation}" is not supported for resource "media".`,
						{ itemIndex: i },
					);
				}
			} else if (resource === 'post') {
				options.json = true;
				options.method = 'POST';
				options.uri = '/v2/posts';

				const platform = this.getNodeParameter('platform', i) as string;
				// common options
				options.body = {
					post: {
						target: {
							targetType: platform,
						},
						content: {
							platform: platform,
							text: this.getNodeParameter('postContentText', i),
							mediaUrls: (this.getNodeParameter('postContentMediaUrls', i) as string)
								.split(',')
								.map((url) => url.trim())
								.filter(Boolean),
						},
						accountId: (this.getNodeParameter('accountId', i) as { value: string }).value,
					},
				};

				// multipost
				if (['twitter'].includes(platform)) {
					options.body.post.content.additionalPosts =
						(
							this.getNodeParameter('postContentAdditionalPosts', i, { posts: [] }) as {
								posts: { text: string; mediaUrls: string }[];
							}
						).posts.map((post) => ({
							text: post.text,
							mediaUrls: post.mediaUrls
								.split(',')
								.map((url) => url.trim())
								.filter(Boolean),
						})) || undefined;
				}

				// platform specific
				switch (platform) {
					case 'facebook':
						options.body.post.target.pageId = (
							this.getNodeParameter('facebookPageId', i) as { value: string }
						).value;
						break;
					case 'tiktok':
						options.body.post.target = {
							...options.body.post.target,
							privacyLevel: this.getNodeParameter(
								'postCreateTiktokOptionPrivacyLevel',
								i,
							) as string,
							disabledComments: this.getNodeParameter(
								'postCreateTiktokOptionDisabledComments',
								i,
							) as boolean,
							disabledDuet: this.getNodeParameter(
								'postCreateTiktokOptionDisabledDuet',
								i,
							) as boolean,
							disabledStitch: this.getNodeParameter(
								'postCreateTiktokOptionDisabledStitch',
								i,
							) as boolean,
							isBrandedContent: this.getNodeParameter(
								'postCreateTiktokOptionIsBrandedContent',
								i,
							) as boolean,
							isYourBrand: this.getNodeParameter('postCreateTiktokOptionIsYourBrand', i) as boolean,
							isAiGenerated: this.getNodeParameter(
								'postCreateTiktokOptionIsAiGenerated',
								i,
							) as boolean,
							autoAddMusic: this.getNodeParameter(
								'postCreateTiktokOptionAutoAddMusic',
								i,
								undefined,
							) as boolean | undefined,
						};
						break;
					// TODO: other
					case 'instagram':
					case 'linkedin':
					case 'twitter':
					case 'bluesky':
					case 'threads':
					case 'pinterest':
					case 'youtube':
						break;
					default:
						throw new NodeOperationError(
							this.getNode(),
							`Platform "${platform}" is not supported for resource "post".`,
						);
				}
			} else {
				throw new NodeOperationError(this.getNode(), `Resource "${resource}" is not supported.`);
			}

			this.logger.debug(`Blotato API Request body:\n${JSON.stringify(options.body, null, 2)}`);

			const credentials = await this.getCredentials('blotatoApi');
			// prepend server to path
			options.uri = credentials.server + options.uri!;
			const response = await this.helpers.requestWithAuthentication.call(
				this,
				'blotatoApi',
				options,
			);
			returnData.push({ json: response });
		}

		return [returnData];
	}
}
