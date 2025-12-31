import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IRequestOptions,
	ResourceMapperFields,
	ResourceMapperField,
	FieldType,
	JsonObject,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError, NodeApiError } from 'n8n-workflow';
import { getAccounts, getSubaccounts, getTemplates } from './SearchFunctions';

// Type definitions
interface TemplateInput {
	name: string;
	label?: string;
	type?: {
		t: 'text' | 'image' | 'boolean' | 'enum' | 'array';
		default?: any;
		values?: string[];
		itemType?: {
			t: 'text' | 'number' | 'boolean' | 'object';
		};
	};
}

interface TemplateData {
	id: string;
	name?: string;
	description?: string;
	inputs?: TemplateInput[];
}


// Constants
const THREAD_SUPPORTED_PLATFORMS = ['twitter', 'threads', 'bluesky'];

// Binary upload constants
const BINARY_UPLOAD_MAX_SIZE_MB = 15;
const BINARY_UPLOAD_MAX_SIZE_BYTES = BINARY_UPLOAD_MAX_SIZE_MB * 1024 * 1024;

// API endpoint constants
const API_ENDPOINTS = {
	VIDEO_TEMPLATES: '/v2/videos/templates',
	VIDEO_FROM_TEMPLATES: '/v2/videos/from-templates',
	VIDEO_GET: '/v2/videos/creations',
	VIDEO_DELETE: '/v2/videos',
	POST_GET: '/v2/posts',
};

// Blotato URLs for hint messages
const BLOTATO_URLS = {
	VIDEO_TEMPLATES: 'https://my.blotato.com/videos/new',
	API_DASHBOARD: 'https://my.blotato.com/api-dashboard',
	MEDIA_REQUIREMENTS: 'https://help.blotato.com/api/media',
	AUTOMATION_TEMPLATES: 'https://help.blotato.com/api/templates',
	BILLING: 'https://my.blotato.com/settings/billing',
};

// Helper functions
function extractTemplateId(param: { value: string } | string): string {
	return typeof param === 'object' ? param.value : param;
}

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
		credentials: [
			{
				name: 'blotatoApi',
				required: true,
			},
		],
		hints: [
			{
				message: `View all video/carousel templates: <a href="${BLOTATO_URLS.VIDEO_TEMPLATES}" target="_blank" style="color: #0088cc;">${BLOTATO_URLS.VIDEO_TEMPLATES}</a><br><br>API Dashboard for debugging: <a href="${BLOTATO_URLS.API_DASHBOARD}" target="_blank" style="color: #0088cc;">${BLOTATO_URLS.API_DASHBOARD}</a>`,
				type: 'info',
				displayCondition: '={{$parameter["resource"] === "video" && $parameter["operation"] === "create" && $parameter["templateId"] && $parameter["templateId"].value !== ""}}',
			},
			{
				message: `API Dashboard for debugging: <a href="${BLOTATO_URLS.API_DASHBOARD}" target="_blank" style="color: #0088cc;">${BLOTATO_URLS.API_DASHBOARD}</a>`,
				type: 'info',
				displayCondition: '={{$parameter["resource"] === "video" && $parameter["operation"] === "get"}}',
			},
			{
				message: `API Dashboard for debugging: <a href="${BLOTATO_URLS.API_DASHBOARD}" target="_blank" style="color: #0088cc;">${BLOTATO_URLS.API_DASHBOARD}</a>`,
				type: 'info',
				displayCondition: '={{$parameter["resource"] === "video" && $parameter["operation"] === "delete"}}',
			},
			{
				message: `View media requirements: <a href="${BLOTATO_URLS.MEDIA_REQUIREMENTS}" target="_blank" style="color: #0088cc;">${BLOTATO_URLS.MEDIA_REQUIREMENTS}</a><br><br>API Dashboard for debugging: <a href="${BLOTATO_URLS.API_DASHBOARD}" target="_blank" style="color: #0088cc;">${BLOTATO_URLS.API_DASHBOARD}</a>`,
				type: 'info',
				displayCondition: '={{$parameter["resource"] === "media" && $parameter["operation"] === "upload"}}',
			},
			{
				message: `View all automation templates: <a href="${BLOTATO_URLS.AUTOMATION_TEMPLATES}" target="_blank" style="color: #0088cc;">${BLOTATO_URLS.AUTOMATION_TEMPLATES}</a><br><br>View all video/carousel templates: <a href="${BLOTATO_URLS.VIDEO_TEMPLATES}" target="_blank" style="color: #0088cc;">${BLOTATO_URLS.VIDEO_TEMPLATES}</a><br><br>View media requirements: <a href="${BLOTATO_URLS.MEDIA_REQUIREMENTS}" target="_blank" style="color: #0088cc;">${BLOTATO_URLS.MEDIA_REQUIREMENTS}</a><br><br>API Dashboard for debugging: <a href="${BLOTATO_URLS.API_DASHBOARD}" target="_blank" style="color: #0088cc;">${BLOTATO_URLS.API_DASHBOARD}</a>`,
				type: 'info',
				displayCondition: '={{$parameter["resource"] === "post"}}',
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
						name: 'Video',
						value: 'video',
					},
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

			// ------------- video --------------

			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['video'],
					},
				},
				options: [
					{
						name: 'Create Visual',
						value: 'create',
						description: 'Create a visual (video, carousel, or infographic) from a template',
						action: 'Create visual',
					},
					{
						name: 'Get Visual',
						value: 'get',
						description: 'Get a visual by ID',
						action: 'Get visual',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a video by ID',
						action: 'Delete video',
					},
				],
				default: 'create',
			},

			// Template selection
			{
				displayName: 'Template',
				name: 'templateId',
				type: 'resourceLocator',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a template',
						typeOptions: {
							searchListMethod: 'getTemplates',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. template_123',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^[a-zA-Z0-9_-]+$',
									errorMessage: 'Not a valid template ID',
								},
							},
						],
					},
				],
				default: { mode: 'list', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['video'],
						operation: ['create'],
					},
				},
				description: 'The template to use to create the video',
			},

			// Prompt for template generation
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				placeholder: 'e.g. Regenerate this visual for a beginner audience',
				displayOptions: {
					show: {
						resource: ['video'],
						operation: ['create'],
					},
				},
				description: 'New prompt to generate template with',
			},

			// Template inputs - using Resource Mapper for dynamic fields
			{
				displayName: 'Template Inputs',
				name: 'templateInputs',
				type: 'resourceMapper',
				noDataExpression: true,
				default: {
					mappingMode: 'defineBelow',
					value: {},
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['video'],
						operation: ['create'],
					},
				},
				typeOptions: {
					loadOptionsDependsOn: ['templateId.value'],
					resourceMapper: {
						resourceMapperMethod: 'getTemplateInputSchema',
						mode: 'map',
						fieldWords: {
							singular: 'input',
							plural: 'inputs',
						},
						addAllFields: true,
						multiKeyMatch: false,
					},
				},
				description: 'Map the input fields required by the selected template',
			},

			// Video ID for Get and Delete operations
			{
				displayName: 'Video ID',
				name: 'videoId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['video'],
						operation: ['get', 'delete'],
					},
				},
				default: '',
				placeholder: 'e.g. 123e4567-e89b-12d3-a456-426614174000',
				description: 'The ID of the video',
			},

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
				description: `Whether to use binary data instead of URL. Note: Binary uploads are limited to ${BINARY_UPLOAD_MAX_SIZE_MB}MB. For larger files, use URL upload with services like Google Drive (up to 60MB), Dropbox, Frame.io, or S3/GCS buckets.`,
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
				description: 'Public URL of image or video',
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
					{
						name: 'Get',
						value: 'get',
						description: 'Get post status by submission ID',
						action: 'Get post',
					},
				],
				default: 'create',
			},

			// Post Submission ID for Get operation
			{
				displayName: 'Post Submission ID',
				name: 'postSubmissionId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['get'],
					},
				},
				default: '',
				placeholder: 'e.g. 123e4567-e89b-12d3-a456-426614174000',
				description: 'The ID of the post submission to check',
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

			// Schedule Next Free Slot
			{
				displayName: 'Schedule Next Free Slot',
				name: 'useNextFreeSlot',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
					},
				},
				description: 'Whether to schedule post in next free slot for this account. If Scheduled Time is provided, this option is ignored.',
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
				description:
					'Array of posts from previous node. Each item must have "text" (string) and optionally "mediaUrls" (array of strings) properties.',
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
				displayName: 'Slideshow Title',
				name: 'postCreateTiktokOptionTitle',
				type: 'string',
				default: '',
				typeOptions: {
					maxLength: 90,
				},
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['tiktok'],
					},
				},
				description: 'Title for Tiktok slideshow, less than 90 characters. Defaults to first 90 characters of the \'text\' field.',
				hint: 'Applies to Tiktok slideshows only.',
			},
			{
				displayName: 'Post As Draft',
				name: 'postCreateTiktokOptionIsDraft',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['tiktok'],
					},
				},
				description: 'Whether to post a DRAFT video/slideshow. It will go to your Tiktok Inbox > System Notifications. Finalize your publishing options in the Tiktok app.',
				hint: 'Post a DRAFT video/slideshow. It will go to your Tiktok Inbox > System Notifications. Finalize your publishing options in the Tiktok app.'
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
					hide: {
						postCreateTiktokOptionIsDraft: [true],
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
					hide: {
						postCreateTiktokOptionIsDraft: [true],
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
					hide: {
						postCreateTiktokOptionIsDraft: [true],
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
					hide: {
						postCreateTiktokOptionIsDraft: [true],
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
					hide: {
						postCreateTiktokOptionIsDraft: [true],
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
					hide: {
						postCreateTiktokOptionIsDraft: [true],
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
					hide: {
						postCreateTiktokOptionIsDraft: [true],
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
				description:
					'The Pinterest Board ID to pin to. Pinterest requires at least one image in mediaUrls.',
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
			{
				displayName: 'Made for Kids',
				name: 'postCreateYoutubeOptionMadeForKids',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['youtube'],
					},
				},
				description: 'Whether this video is made for kids',
			},
			{
				displayName: 'Contains Synthetic Media',
				name: 'postCreateYoutubeOptionContainsSyntheticMedia',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						platform: ['youtube'],
					},
				},
				description: 'Whether the media contains synthetic content, such as AI images, AI videos, or AI avatars',
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
						displayName: 'Alt Text',
						name: 'instagramAltText',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								'/platform': ['instagram'],
							},
						},
						description:
							'Alternative text for accessibility. Only supported on single images or carousel images (max 2200 characters).',
					},
					{
						displayName: 'Audio Name',
						name: 'instagramAudioName',
						type: 'string',
						default: '',
						typeOptions: {
							minLength: 1,
							maxLength: 2200,
						},
						displayOptions: {
							show: {
								'/platform': ['instagram'],
							},
						},
						description: 'For Reels only. Name of the audio of your Reels media. You can only rename once, either while creating a reel or after from the audio page.',
						placeholder: 'My Custom Audio Name',
					},
					{
						displayName: 'Collaborators',
						name: 'instagramCollaborators',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								'/platform': ['instagram'],
							},
						},
						description: 'Comma-separated list of Instagram usernames to add as collaborators (min: 1, max: 3)',
						placeholder: 'username1, username2, username3',
					},
					{
						displayName: 'Cover Image URL',
						name: 'instagramCoverImageUrl',
						type: 'string',
						default: '',
						validateType: 'url',
						displayOptions: {
							show: {
								'/platform': ['instagram'],
							},
						},
						description:
							'URL of cover image for Instagram Reels. Can be any publicly accessible URL. Max 8MB. Only applies to reels.',
					},
					{
						displayName: 'Image Cover Index',
						name: 'imageCoverIndex',
						type: 'number',
						default: 0,
						typeOptions: {
							minValue: 0,
						},
						displayOptions: {
							show: {
								'/platform': ['tiktok'],
							},
							hide: {
								'/postCreateTiktokOptionIsDraft': [true],
							},
						},
						description: 'Only applies to Tiktok slideshows with multiple images. The index of the image to use as thumbnail cover (starts at 0).',
						hint: 'Only applies to Tiktok slideshows with multiple images. The index of the image to use as thumbnail cover (starts at 0).',
					},
					{
						displayName: 'Link Preview',
						name: 'facebookLink',
						type: 'string',
						default: '',
						validateType: 'url',
						displayOptions: {
							show: {
								'/platform': ['facebook'],
							},
						},
						description: 'URL to attach as a link preview to the Facebook post',
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
						description:
							'Type of Facebook video post - regular video or reel. Only applies for video posts. Ignored for text and image posts.',
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
						description:
							'Type of Instagram video post - reel or story. Only applies for video posts. Ignored for image-only posts.',
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
						displayName: 'Scheduled Time',
						name: 'scheduledTime',
						type: 'dateTime',
						default: '',
						description:
							'Schedule the post for a future time. For example: "2024-12-31T23:59:59Z" for UTC time.',
					},
					{
						displayName: 'Video Cover Timestamp',
						name: 'videoCoverTimestamp',
						type: 'number',
						default: 0,
						typeOptions: {
							minValue: 0,
							numberPrecision: 2,
						},
						displayOptions: {
							show: {
								'/platform': ['tiktok'],
							},
							hide: {
								'/postCreateTiktokOptionIsDraft': [true],
							},
						},
						description: 'Only applies to Tiktok videos. Location in milliseconds of video to be used as thumbnail cover. Must be whole number (1000 for 1 second). If not provided, the frame at 0 milliseconds will be used.',
						hint: 'Only applies to Tiktok videos. Location in milliseconds of video to be used as thumbnail cover. Must be whole number (1000 for 1 second). If not provided, the frame at 0 milliseconds will be used.'
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			getAccounts,
			getSubaccounts,
			getTemplates,
		},
		resourceMapping: {
			async getTemplateInputSchema(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
				const templateIdParam = this.getNodeParameter('templateId', 0) as { value: string } | string;
				const templateId = extractTemplateId(templateIdParam);

				if (!templateId) {
					return {
						fields: [],
					};
				}

				try {
					// Call API to get template details including inputs
					const credentials = await this.getCredentials('blotatoApi');
					const options: IRequestOptions = {
						method: 'GET',
						uri: `${credentials.server}${API_ENDPOINTS.VIDEO_TEMPLATES}`,
						qs: {
							id: templateId,
							fields: 'id,name,description,inputs'
						},
						json: true,
					};

					let responseData;
					try {
						responseData = await this.helpers.requestWithAuthentication.call(
							this,
							'blotatoApi',
							options,
						);
					} catch (error) {
						// Return empty fields on error to prevent blocking the UI
						return {
							fields: [],
						};
					}

					// Parse the response
					const templatesData = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;

					// The API returns an array of templates when filtered by ID
					const templates = templatesData.items || templatesData;
					const templateData: TemplateData = Array.isArray(templates) ? templates[0] : templates;

					if (!templateData) {
						return {
							fields: [
								{
									id: 'error',
									displayName: `Template not found: ${templateId}`,
									required: false,
									defaultMatch: false,
									type: 'string',
									display: true,
									canBeUsedToMatch: false,
								},
							],
						};
					}

					if (!templateData.inputs || !Array.isArray(templateData.inputs)) {
						return {
							fields: [],
						};
					}

					// Convert template inputs to Resource Mapper schema format
					const fields: ResourceMapperField[] = [];
					const inputs: TemplateInput[] = templateData.inputs;

					// Inputs is an array of input definitions
					for (const input of inputs) {
						// Determine the n8n field type based on the template input type
						let fieldType: FieldType = 'string';

						if (input.type) {
							switch (input.type.t) {
								case 'text':
								case 'image':
									fieldType = 'string';
									break;
								case 'boolean':
									fieldType = 'boolean';
									break;
								case 'enum':
									fieldType = 'options';
									break;
								case 'array':
									// For arrays, we'll use string type and expect JSON input
									fieldType = 'string' as FieldType;
									break;
								default:
									fieldType = 'string';
							}
						}

						// Determine if field is required first
						// Field is optional if it has a 'default' property (even if empty string), required if no default property
						const isRequired = !input.type || !('default' in input.type);

						// Build the display name with required/optional indicator
						let displayName = input.label || input.name;

						// Add required indicator only
						if (isRequired) {
							// Required fields get an asterisk at the end
							displayName += ' *';
						}
						// Optional fields no longer get the (Optional) prefix

						// Add format hints
						if (input.type?.t === 'array') {
							// Check the itemType to determine array content type
							if (input.type.itemType?.t === 'number') {
								// Array of numbers
								displayName += ` (e.g. [1, 2])`;
							} else if (input.type.itemType?.t === 'boolean') {
								// Array of booleans
								displayName += ` (e.g. [true, false])`;
							} else if (input.type.itemType?.t === 'object') {
								// Array of objects
								displayName += ` (e.g. [{"key": "value"}])`;
							} else {
								// Default to array of strings (covers text, image, enum, etc.)
								displayName += ` (e.g. ["item 1", "item 2"])`;
							}
						} else if (input.type?.t === 'image') {
							// For image/URL fields
							displayName += ` (publicly accessible URL)`;
						}

						const field: ResourceMapperField = {
							id: input.name,
							displayName: displayName,
							required: isRequired,
							defaultMatch: false,
							type: fieldType,
							display: true,
							canBeUsedToMatch: false,
						};

						// For enum types, add the options
						if (input.type?.t === 'enum' && input.type.values) {
							field.options = input.type.values.map((value: string) => ({
								name: value.charAt(0).toUpperCase() + value.slice(1),
								value: value,
							}));
						}

						fields.push(field);
					}

					// Sort fields: required fields first, optional fields second
					fields.sort((a, b) => {
						// Required fields (true) should come before optional fields (false)
						if (a.required && !b.required) return -1;
						if (!a.required && b.required) return 1;
						return 0; // Keep original order for fields with same required status
					});

					return { fields };
				} catch (error) {
					// On error, return empty fields
					return {
						fields: [],
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputItems = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < inputItems.length; i++) {
			const resource = this.getNodeParameter('resource', i);
			const operation = this.getNodeParameter('operation', i);

			const options: IRequestOptions = {};

			if (resource === 'video') {
				options.json = true;

				if (operation === 'create') {
					options.method = 'POST';
					options.uri = API_ENDPOINTS.VIDEO_FROM_TEMPLATES;
					const templateIdParam = this.getNodeParameter('templateId', i) as { value: string } | string;
					const templateId = extractTemplateId(templateIdParam);

					// Get the template inputs from Resource Mapper
					const templateInputsData = this.getNodeParameter('templateInputs', i) as {
						mappingMode?: string;
						value?: Record<string, any>;
					};

					let inputs: Record<string, any> = {};

					// Handle Resource Mapper data format
					if (templateInputsData && templateInputsData.value) {
						inputs = templateInputsData.value;

						// Parse JSON strings for array-type inputs with improved error handling
						for (const [key, value] of Object.entries(inputs)) {
							if (typeof value === 'string') {
								const trimmedValue = value.trim();
								if (trimmedValue.startsWith('[') || trimmedValue.startsWith('{')) {
									try {
										inputs[key] = JSON.parse(trimmedValue);
									} catch (error) {
										// Log warning but keep as string if parsing fails
										this.logger.warn(
											`Failed to parse JSON for field '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`,
										);
									}
								}
							}
						}
					}

					const prompt = this.getNodeParameter('prompt', i, '') as string;

					options.body = {
						templateId,
						inputs,
						prompt,
						render: true, // Auto-render the visual
					};
				} else if (operation === 'get') {
					const videoId = this.getNodeParameter('videoId', i) as string;

					if (!videoId) {
						throw new NodeOperationError(
							this.getNode(),
							'Video ID is required',
							{ itemIndex: i },
						);
					}

					options.method = 'GET';
					options.uri = `${API_ENDPOINTS.VIDEO_GET}/${videoId}`;
				} else if (operation === 'delete') {
					const videoId = this.getNodeParameter('videoId', i) as string;

					if (!videoId) {
						throw new NodeOperationError(
							this.getNode(),
							'Video ID is required',
							{ itemIndex: i },
						);
					}

					options.method = 'DELETE';
					options.uri = `${API_ENDPOINTS.VIDEO_DELETE}/${videoId}`;
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Operation "${operation}" is not supported for resource "video".`,
						{ itemIndex: i },
					);
				}
			} else if (resource === 'media') {
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

						if (dataBuffer.length > BINARY_UPLOAD_MAX_SIZE_BYTES) {
							const sizeMB = (dataBuffer.length / (1024 * 1024)).toFixed(2);
							throw new NodeOperationError(
								this.getNode(),
								`File size (${sizeMB}MB) exceeds ${BINARY_UPLOAD_MAX_SIZE_MB}MB limit. Large files should be uploaded via URL instead of binary data. You can use Google Drive (up to 60MB), Dropbox, Frame.io, or similar services. S3/GCS buckets are recommended for very large files.`,
								{ itemIndex: i },
							);
						}

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

				if (operation === 'get') {
					const postSubmissionId = this.getNodeParameter('postSubmissionId', i) as string;

					if (!postSubmissionId) {
						throw new NodeOperationError(
							this.getNode(),
							'Post Submission ID is required',
							{ itemIndex: i },
						);
					}

					options.method = 'GET';
					options.uri = `${API_ENDPOINTS.POST_GET}/${postSubmissionId}`;
				} else if (operation === 'create') {
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
							mediaUrls: (() => {
								const mediaUrlsParam = this.getNodeParameter('postContentMediaUrls', i);
								// Handle both string (comma-separated) and array inputs
								if (Array.isArray(mediaUrlsParam)) {
									// If already an array (e.g., from GET VIDEO imageUrls), use it directly
									return mediaUrlsParam.filter(url => url && typeof url === 'string');
								} else if (typeof mediaUrlsParam === 'string') {
									// If string, split by comma (existing behavior)
									return mediaUrlsParam
										.split(',')
										.map((url) => url.trim())
										.filter(Boolean);
								}
								// If empty or other type, return empty array
								return [];
							})(),
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
						{ itemIndex: i },
					);
				}

				// Handle options collection
				const postOptions = this.getNodeParameter('options', i, {}) as {
					scheduledTime?: string;
					linkedinPageId?: string | { value?: string };
					facebookMediaType?: string;
					facebookLink?: string;
					instagramMediaType?: string;
					instagramAudioName?: string;
					instagramCollaborators?: string;
					instagramAltText?: string;
					instagramCoverImageUrl?: string;
					pinterestAltText?: string;
					pinterestLink?: string;
					threadsReplyControl?: string;
					imageCoverIndex?: number;
					videoCoverTimestamp?: number;
				};


				if (postOptions.scheduledTime) {
					// Ensure scheduledTime has timezone - append 'Z' for UTC if no timezone specified
					let scheduledTime = postOptions.scheduledTime;
					const hasTimezone =
						scheduledTime.includes('Z') ||
						scheduledTime.includes('+') ||
						scheduledTime.match(/[+-]\d{2}:\d{2}$/);

					if (!hasTimezone) {
						scheduledTime += 'Z'; // Assume UTC if no timezone specified
					}
					// Place scheduledTime at root level, not inside post object
					options.body.scheduledTime = scheduledTime;
				}

				// Add useNextFreeSlot if specified (ignored if scheduledTime is provided)
				const useNextFreeSlot = this.getNodeParameter('useNextFreeSlot', i, false) as boolean;
				options.body.useNextFreeSlot = useNextFreeSlot;

				// thread handling for platforms that support threads
				if (THREAD_SUPPORTED_PLATFORMS.includes(platform)) {
					const threadInputMethod = this.getNodeParameter(
						'threadInputMethod',
						i,
						'manual',
					) as string;

					if (threadInputMethod === 'manual') {
						// Manual input method - use fixedCollection
						const additionalPostsData = this.getNodeParameter('postContentAdditionalPosts', i, {
							posts: [],
						}) as {
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
									{ itemIndex: i },
								);
							}
						}

						if (Array.isArray(threadPostsArray) && threadPostsArray.length > 0) {
							options.body.post.content.additionalPosts = threadPostsArray.map((post: any) => ({
								text: post.text || '',
								mediaUrls: post.mediaUrls
									? Array.isArray(post.mediaUrls)
										? post.mediaUrls
										: typeof post.mediaUrls === 'string'
											? post.mediaUrls
													.split(',')
													.map((url: string) => url.trim())
													.filter(Boolean)
											: []
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
						// Add link preview if specified
						if (postOptions.facebookLink) {
							options.body.post.target.link = postOptions.facebookLink;
						}
						break;
					case 'tiktok':
						const isDraft = this.getNodeParameter(
							'postCreateTiktokOptionIsDraft',
							i,
							false,
						) as boolean;

						// Get optional title for slideshows
						const tiktokTitle = this.getNodeParameter(
							'postCreateTiktokOptionTitle',
							i,
							'',
						) as string;

						options.body.post.target = {
							...options.body.post.target,
							privacyLevel: this.getNodeParameter(
								'postCreateTiktokOptionPrivacyLevel',
								i,
							) as string,
							disabledComments: this.getNodeParameter(
								'postCreateTiktokOptionDisabledComments',
								i,
								false,
							) as boolean,
							disabledDuet: this.getNodeParameter(
								'postCreateTiktokOptionDisabledDuet',
								i,
								false,
							) as boolean,
							disabledStitch: this.getNodeParameter(
								'postCreateTiktokOptionDisabledStitch',
								i,
								false,
							) as boolean,
							isBrandedContent: this.getNodeParameter(
								'postCreateTiktokOptionIsBrandedContent',
								i,
								false,
							) as boolean,
							isYourBrand: this.getNodeParameter(
								'postCreateTiktokOptionIsYourBrand',
								i,
								false,
							) as boolean,
							isAiGenerated: this.getNodeParameter(
								'postCreateTiktokOptionIsAiGenerated',
								i,
								false,
							) as boolean,
							autoAddMusic: this.getNodeParameter(
								'postCreateTiktokOptionAutoAddMusic',
								i,
								false,
							) as boolean,
							isDraft: isDraft,
							// Optional title for slideshows (visible even in draft mode)
							...(tiktokTitle ? { title: tiktokTitle } : {}),
							// Cover settings should not be sent when posting as draft
							imageCoverIndex: isDraft ? undefined : postOptions.imageCoverIndex,
							videoCoverTimestamp: isDraft ? undefined : postOptions.videoCoverTimestamp,
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
							const pageIdValue =
								typeof postOptions.linkedinPageId === 'object'
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
						// Add audio name for Reels
						if (postOptions.instagramAudioName) {
							options.body.post.target.audioName = postOptions.instagramAudioName;
						}
						// Add collaborators
						if (postOptions.instagramCollaborators) {
							// Split comma-separated usernames and trim whitespace
							const collaborators = postOptions.instagramCollaborators
								.split(',')
								.map((username) => username.trim())
								.filter(Boolean)
								.slice(0, 3); // Ensure max 3 collaborators
							if (collaborators.length > 0) {
								options.body.post.target.collaborators = collaborators;
							}
						}
						// Add alt text for accessibility
						if (postOptions.instagramAltText) {
							options.body.post.target.altText = postOptions.instagramAltText;
						}
						// Add cover image URL for Reels
						if (postOptions.instagramCoverImageUrl) {
							options.body.post.target.coverImageUrl = postOptions.instagramCoverImageUrl;
						}
						break;
					case 'pinterest':
						// Required board ID
						options.body.post.target.boardId = (
							this.getNodeParameter('pinterestBoardId', i) as { value: string }
						).value;
						// Optional fields
						const pinTitle = this.getNodeParameter(
							'postCreatePinterestOptionTitle',
							i,
							'',
						) as string;
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
						options.body.post.target.isMadeForKids = this.getNodeParameter(
							'postCreateYoutubeOptionMadeForKids',
							i,
						) as boolean;
						options.body.post.target.containsSyntheticMedia = this.getNodeParameter(
							'postCreateYoutubeOptionContainsSyntheticMedia',
							i,
						) as boolean;
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
							{ itemIndex: i },
						);
				}
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Operation "${operation}" is not supported for resource "post".`,
						{ itemIndex: i },
					);
				}
			} else {
				throw new NodeOperationError(this.getNode(), `Resource "${resource}" is not supported.`, { itemIndex: i });
			}


			const credentials = await this.getCredentials('blotatoApi');
			// prepend server to path
			options.uri = credentials.server + options.uri!;

			let response;
			try {
				response = await this.helpers.requestWithAuthentication.call(
					this,
					'blotatoApi',
					options,
				);
			} catch (error) {
				if (this.continueOnFail()) {
					const errorMessage = error.message || 'An error occurred';
					const errorDescription = error.description || error.response?.data?.message || error.response?.data?.error || '';

					const combinedMessage = errorDescription && errorDescription !== errorMessage
						? `${errorMessage}: ${errorDescription}`
						: errorMessage;

					returnData.push({
						json: {
							error: combinedMessage,
							errorDetails: error,
						},
						pairedItem: { item: i },
						error: new NodeApiError(this.getNode(), error as JsonObject, {
							itemIndex: i,
						}),
					});
					continue;
				}

				throw new NodeApiError(this.getNode(), error as JsonObject, {
					itemIndex: i,
				});
			}

			// Handle different operations
			if (resource === 'video' && operation === 'get') {
				const responseData = typeof response === 'string' ? JSON.parse(response) : response;
				const status = responseData?.item?.status;

				if (status && ['generating-script', 'script-ready', 'queueing'].includes(status)) {
					// Add a hint message to the response
					const hintMessage = `⚠️ Your video/carousel is not done yet. Wait a little longer, and check you have sufficient credits if you are generating AI images or AI videos: ${BLOTATO_URLS.BILLING}`;

					// Add the hint as a property in the response
					if (responseData.item) {
						responseData.item._hint = hintMessage;
					}

					returnData.push({
						json: responseData,
						pairedItem: { item: i }
					});
				} else {
					returnData.push({ json: response, pairedItem: { item: i } });
				}
			} else if (resource === 'video' && operation === 'delete') {
				// DELETE returns 204 No Content, so we create a success message
				const videoId = this.getNodeParameter('videoId', i) as string;
				returnData.push({
					json: {
						success: true,
						message: `Video ID ${videoId} deleted successfully`
					},
					pairedItem: { item: i }
				});
			} else if (resource === 'post' && operation === 'get') {
				const responseData = typeof response === 'string' ? JSON.parse(response) : response;
				const status = responseData?.status;

				// Add helpful hints based on post status
				if (status === 'in-progress') {
					if (!responseData._hint) {
						responseData._hint = '⏳ Your post is still being processed. Check again in a moment.';
					}
				} else if (status === 'failed' && responseData.errorMessage) {
					if (!responseData._hint) {
						responseData._hint = `❌ Post failed: ${responseData.errorMessage}`;
					}
				} else if (status === 'published' && responseData.publicUrl) {
					if (!responseData._hint) {
						responseData._hint = `✅ Post published successfully! View it at: ${responseData.publicUrl}`;
					}
				}

				returnData.push({
					json: responseData,
					pairedItem: { item: i }
				});
			} else {
				returnData.push({ json: response, pairedItem: { item: i } });
			}
		}

		return [returnData];
	}
}
