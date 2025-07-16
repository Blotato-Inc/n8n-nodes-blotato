import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { getAccounts, getSubaccounts } from './SearchFunctions';

// Constants
const THREAD_SUPPORTED_PLATFORMS = ['twitter', 'threads', 'bluesky'];

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
						description: 'Upload image or video',
						action: 'Upload media',
					},
				],
				default: 'upload',
			},

			// upload media
			// Use Binary Data toggle
			{
				displayName: 'Use Binary Data',
				name: 'useBinaryData',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['media'],
						operation: ['upload'],
					},
				},
				description: 'Upload binary data instead of URL',
			},

			// Media URL field
			{
				displayName: 'Media URL',
				name: 'mediaUrl',
				type: 'string',
				default: '',
				validateType: 'url',
				displayOptions: {
					show: {
						resource: ['media'],
						operation: ['upload'],
						useBinaryData: [false],
					},
				},
				description: 'public URL of image or video',
			},

			// Binary property field
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				displayOptions: {
					show: {
						resource: ['media'],
						operation: ['upload'],
						useBinaryData: [true],
					},
				},
				description: 'Name of the binary property which contains the media to upload',
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
						description: 'Create post',
						action: 'Create post',
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
					{ name: 'Linkedin', value: 'linkedin' },
					{ name: 'Pinterest', value: 'pinterest' },
					{ name: 'Threads', value: 'threads' },
					{ name: 'Tiktok', value: 'tiktok' },
					{ name: 'Twitter', value: 'twitter' },
					{ name: 'Youtube', value: 'youtube' },
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
						placeholder: 'Select an account for the chosen platform',
						typeOptions: {
							searchListMethod: 'getAccounts',
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
				default: { mode: 'list', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
					},
				},
				description: 'Your Blotato social media account ID',
			},

			// post.content.text
			{
				displayName: 'Text',
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
				description: 'The main text for your post',
			},

			// post.content.mediaUrls
			{
				displayName: 'Media URLs',
				name: 'postContentMediaUrls',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
					},
				},
				description: 'Comma-separated list of media URLs',
				placeholder:
					'https://database.blotato.com/image1.jpg, https://database.blotato.com/image2.jpg',
			},

			// Thread input method toggle
			{
				displayName: 'Thread (Optional)',
				name: 'threadInputMethod',
				type: 'options',
				options: [
					{
						name: 'Manual',
						value: 'manual',
						description: 'Add each post manually',
					},
					{
						name: 'From Data',
						value: 'array',
						description: 'Use array data from previous node',
					},
				],
				default: 'manual',
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: THREAD_SUPPORTED_PLATFORMS,
					},
				},
				description: 'Choose how to create a long-form thread',
			},

			// post.content.additionalPosts (manual method)
			{
				displayName: 'Thread Posts',
				name: 'postContentAdditionalPosts',
				placeholder: 'Add Thread',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: THREAD_SUPPORTED_PLATFORMS,
						threadInputMethod: ['manual'],
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
								description: 'Text content of additional thread',
								required: true,
							},
							{
								displayName: 'Media URLs (Optional)',
								name: 'mediaUrls',
								type: 'string',
								default: '',
								description: 'Comma-separated list of media URLs',
								placeholder:
									'https://database.blotato.com/image1.jpg, https://database.blotato.com/image2.jpg',
							},
						],
					},
				],
			},

			// Thread posts array input (array method)
			{
				displayName: 'Thread Posts',
				name: 'threadPostsArray',
				type: 'string',
				default: '[]',
				description: 'Array of posts from previous node. Each item must have "text" (string) and optionally "mediaUrls" (array of strings) properties.',
				placeholder: '[{"text": "Post 1", "mediaUrls": []}, {"text": "Post 2", "mediaUrls": []}]',
				hint: 'Correct format: [{"text": "Post 1", "mediaUrls": []}, {"text": "Post 2", "mediaUrls": []}]',
				validateType: 'array',
				ignoreValidationDuringExecution: true,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: THREAD_SUPPORTED_PLATFORMS,
						threadInputMethod: ['array'],
					},
				},
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
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['tiktok'],
					},
				},
				description: 'Whether to automatically add music. Only works for Tiktok slideshows.',
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
						placeholder: 'Select a Facebook Page for this account',
						typeOptions: {
							searchListMethod: 'getSubaccounts',
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
				default: { mode: 'list', value: '' },
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

			// post.target - pinterest
			{
				displayName: 'Pinterest Board',
				name: 'pinterestBoardId',
				type: 'resourceLocator',
				modes: [
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
									errorMessage: 'Not a valid Pinterest Board ID (only numbers)',
								},
							},
						],
					},
				],
				default: { mode: 'id', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['pinterest'],
					},
				},
				description: 'The Pinterest Board ID to pin to. Pinterest requires at least one image in mediaUrls',
			},
			{
				displayName: 'Pin Title (Optional)',
				name: 'postCreatePinterestOptionTitle',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['pinterest'],
					},
				},
				description: 'Optional title for the Pinterest pin',
			},

			// post.target - youtube
			{
				displayName: 'Video Title',
				name: 'postCreateYoutubeOptionTitle',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['youtube'],
					},
				},
				description: 'Title of the Youtube video',
			},
			{
				displayName: 'Privacy Status',
				name: 'postCreateYoutubeOptionPrivacyStatus',
				type: 'options',
				default: 'public',
				options: [
					{
						name: 'Public',
						value: 'public',
					},
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Unlisted',
						value: 'unlisted',
					},
				],
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['youtube'],
					},
				},
				description: 'Privacy setting for the Youtube video',
			},
			{
				displayName: 'Notify Subscribers',
				name: 'postCreateYoutubeOptionShouldNotifySubscribers',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['youtube'],
					},
				},
				description: 'Whether to notify subscribers about this video',
			},

			// Options collection - placed last so users see required fields first
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Scheduled Time',
						name: 'scheduledTime',
						type: 'dateTime',
						default: '',
						description: 'Schedule the post for a future time. For example: "2024-12-31T23:59:59Z" for UTC time.',
					},
					{
						displayName: 'Linkedin Page',
						name: 'linkedinPageId',
						type: 'resourceLocator',
						modes: [
							{
								displayName: 'From List',
								name: 'list',
								type: 'list',
								placeholder: 'Select a Linkedin Page',
								typeOptions: {
									searchListMethod: 'getSubaccounts',
								},
							},
							{
								displayName: 'By ID',
								name: 'id',
								type: 'string',
								placeholder: 'e.g. 104410867',
								validation: [
									{
										type: 'regex',
										properties: {
											regex: '^[0-9]+$',
											errorMessage: 'Not a valid Linkedin Page ID (only numbers)',
										},
									},
								],
							},
						],
						default: '',
						displayOptions: {
							show: {
								'/platform': ['linkedin'],
							},
						},
						description: 'Post to a Linkedin Company Page instead of your personal profile',
					},
					{
						displayName: 'Media Type',
						name: 'facebookMediaType',
						type: 'options',
						default: 'reel',
						options: [
							{
								name: 'Video',
								value: 'video',
							},
							{
								name: 'Reel',
								value: 'reel',
							},
						],
						displayOptions: {
							show: {
								'/platform': ['facebook'],
							},
						},
						description: 'Type of Facebook video post - regular video or reel. Only applies for video posts. Ignored for text and image posts.',
					},
					{
						displayName: 'Media Type',
						name: 'instagramMediaType',
						type: 'options',
						default: 'reel',
						options: [
							{
								name: 'Reel',
								value: 'reel',
							},
							{
								name: 'Story',
								value: 'story',
							},
						],
						displayOptions: {
							show: {
								'/platform': ['instagram'],
							},
						},
						description: 'Type of Instagram video post - reel or story. Only applies for video posts. Ignored for image-only posts.',
					},
					{
						displayName: 'Pinterest Alt Text',
						name: 'pinterestAltText',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								'/platform': ['pinterest'],
							},
						},
						description: 'Alternative text for accessibility',
					},
					{
						displayName: 'Pinterest Link',
						name: 'pinterestLink',
						type: 'string',
						default: '',
						validateType: 'url',
						displayOptions: {
							show: {
								'/platform': ['pinterest'],
							},
						},
						description: 'URL the pin should link to',
					},
					{
						displayName: 'Reply Control',
						name: 'threadsReplyControl',
						type: 'options',
						default: 'everyone',
						options: [
							{
								name: 'Everyone',
								value: 'everyone',
							},
							{
								name: 'Accounts You Follow',
								value: 'accounts_you_follow',
							},
							{
								name: 'Mentioned Only',
								value: 'mentioned_only',
							},
						],
						displayOptions: {
							show: {
								'/platform': ['threads'],
							},
						},
						description: 'Control who can reply to your Threads post',
					},
					{
						displayName: 'Made for Kids',
						name: 'youtubeMadeForKids',
						type: 'boolean',
						default: false,
						displayOptions: {
							show: {
								'/platform': ['youtube'],
							},
						},
						description: 'Whether this video is made for kids',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			getAccounts,
			getSubaccounts,
		},
	};

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

				if (operation === 'upload') {
					const useBinaryData = this.getNodeParameter('useBinaryData', i) as boolean;

					if (useBinaryData) {
						// Handle binary data upload
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

						// Convert binary data to data URI
						const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
						const base64 = dataBuffer.toString('base64');
						const mimeType = binaryData.mimeType || 'application/octet-stream';
						const dataUri = `data:${mimeType};base64,${base64}`;

						options.body = { url: dataUri };
					} else {
						// Handle URL upload
						options.body = { url: this.getNodeParameter('mediaUrl', i) };
					}
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
				const accountId = (this.getNodeParameter('accountId', i) as { value: string }).value;

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
						accountId: accountId,
					},
				};

				// Validate media requirements for specific platforms
				const mediaUrls = options.body.post.content.mediaUrls as string[];
				const requiresMedia = ['instagram', 'tiktok', 'pinterest', 'youtube'].includes(platform);

				if (requiresMedia && mediaUrls.length === 0) {
					throw new NodeOperationError(
						this.getNode(),
						`${platform.charAt(0).toUpperCase() + platform.slice(1)} requires you to post an image or video.`,
						{ itemIndex: i }
					);
				}

				// Handle options collection
				const postOptions = this.getNodeParameter('options', i, {}) as {
					scheduledTime?: string;
					linkedinPageId?: string | { value?: string };
					facebookMediaType?: string;
					instagramMediaType?: string;
					pinterestAltText?: string;
					pinterestLink?: string;
					threadsReplyControl?: string;
					youtubeMadeForKids?: boolean;
				};

				this.logger.debug(`PostOptions: ${JSON.stringify(postOptions)}`);

				if (postOptions.scheduledTime) {
					// Ensure scheduledTime has timezone - append 'Z' for UTC if no timezone specified
					let scheduledTime = postOptions.scheduledTime;
					const hasTimezone = scheduledTime.includes('Z') ||
						scheduledTime.includes('+') ||
						scheduledTime.match(/[+-]\d{2}:\d{2}$/);

					if (!hasTimezone) {
						scheduledTime += 'Z'; // Assume UTC if no timezone specified
					}
					// Place scheduledTime at root level, not inside post object
					options.body.scheduledTime = scheduledTime;
				}

				// thread handling for platforms that support threads
				if (THREAD_SUPPORTED_PLATFORMS.includes(platform)) {
					const threadInputMethod = this.getNodeParameter('threadInputMethod', i, 'manual') as string;

					if (threadInputMethod === 'manual') {
						// Manual input method - use fixedCollection
						const additionalPostsData = this.getNodeParameter('postContentAdditionalPosts', i, { posts: [] }) as {
							posts: Array<{ text: string; mediaUrls: string }>;
						};

						if (additionalPostsData.posts && additionalPostsData.posts.length > 0) {
							options.body.post.content.additionalPosts = additionalPostsData.posts.map((post) => ({
								text: post.text,
								mediaUrls: post.mediaUrls
									? post.mediaUrls
										.split(',')
										.map((url) => url.trim())
										.filter(Boolean)
									: [],
							}));
						}
					} else if (threadInputMethod === 'array') {
						// Array input method - use dynamic data
						let threadPostsArray = this.getNodeParameter('threadPostsArray', i) as any;

						// Handle both string (from Fixed mode) and array (from Expression mode) inputs
						if (typeof threadPostsArray === 'string' && threadPostsArray.trim() !== '') {
							try {
								threadPostsArray = JSON.parse(threadPostsArray);
							} catch (error) {
								throw new NodeOperationError(
									this.getNode(),
									'Thread Posts must be a valid JSON array. Example: [{"text": "Post 1", "mediaUrls": []}, {"text": "Post 2", "mediaUrls": ["https://database.blotato.io/image.jpg"]}]',
									{ itemIndex: i }
								);
							}
						}

						if (Array.isArray(threadPostsArray) && threadPostsArray.length > 0) {
							options.body.post.content.additionalPosts = threadPostsArray.map((post: any) => ({
								text: post.text || '',
								mediaUrls: post.mediaUrls
									? (Array.isArray(post.mediaUrls)
										? post.mediaUrls
										: typeof post.mediaUrls === 'string'
											? post.mediaUrls.split(',').map((url: string) => url.trim()).filter(Boolean)
											: [])
									: [],
							}));
						}
					}
				}

				// platform specific
				switch (platform) {
					case 'facebook':
						options.body.post.target.pageId = (
							this.getNodeParameter('facebookPageId', i) as { value: string }
						).value;
						// Add media type option from options if specified (only for videos)
						if (postOptions.facebookMediaType) {
							options.body.post.target.mediaType = postOptions.facebookMediaType;
						}
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
					case 'bluesky':
						// Bluesky requires no additional configuration
						break;
					case 'threads':
						// Add reply control option from options if specified
						if (postOptions.threadsReplyControl) {
							options.body.post.target.replyControl = postOptions.threadsReplyControl;
						}
						break;
					case 'linkedin':
						// Add optional LinkedIn page ID from options
						if (postOptions.linkedinPageId) {
							const pageIdValue = typeof postOptions.linkedinPageId === 'object'
								? postOptions.linkedinPageId.value
								: postOptions.linkedinPageId;
							if (pageIdValue) {
								options.body.post.target.pageId = pageIdValue;
							}
						}
						break;
					case 'instagram':
						// Add media type option from options (reel or story)
						if (postOptions.instagramMediaType) {
							options.body.post.target.mediaType = postOptions.instagramMediaType;
						}
						break;
					case 'pinterest':
						// Required board ID
						options.body.post.target.boardId = (
							this.getNodeParameter('pinterestBoardId', i) as { value: string }
						).value;
						// Optional fields
						const pinTitle = this.getNodeParameter('postCreatePinterestOptionTitle', i, '') as string;
						if (pinTitle) {
							options.body.post.target.title = pinTitle;
						}
						// Get alt text and link from options
						if (postOptions.pinterestAltText) {
							options.body.post.target.altText = postOptions.pinterestAltText;
						}
						if (postOptions.pinterestLink) {
							options.body.post.target.link = postOptions.pinterestLink;
						}
						break;
					case 'youtube':
						// YouTube requires several fields
						options.body.post.target.title = this.getNodeParameter(
							'postCreateYoutubeOptionTitle',
							i,
						) as string;
						options.body.post.target.privacyStatus = this.getNodeParameter(
							'postCreateYoutubeOptionPrivacyStatus',
							i,
						) as string;
						options.body.post.target.shouldNotifySubscribers = this.getNodeParameter(
							'postCreateYoutubeOptionShouldNotifySubscribers',
							i,
						) as boolean;
						// Optional field from options
						if (postOptions.youtubeMadeForKids !== undefined) {
							options.body.post.target.isMadeForKids = postOptions.youtubeMadeForKids;
						}
						break;
					case 'twitter':
						// Twitter requires no additional configuration
						// Only targetType is needed, which is already set above
						// Thread support is handled via additionalPosts
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
