# n8n-nodes-blotato

This is an n8n community node. It lets you use Blotato in your n8n workflows.

Blotato is an AI-powered content engine that enables content creation, publishing, and scheduling across multiple social media platforms through a unified API.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)
[Compatibility](#compatibility)  
[Usage](#usage) 
[Resources](#resources)  
[Support](#support)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

This node provides three main resources for interacting with Blotato:

### Video Resource
Create AI-generated visuals from templates, such as videos, carousels, slideshows, infographics, and images.
- **Create Visual**: Generate visuals from pre-built templates with a prompt and optional inputs
- **Get Visual**: Retrieve visual status and details by ID
- **Delete**: Remove a viusal by ID
- **Features**:
  - Template-based generation of visual assets
  - Dynamic input fields based on template requirements
  - Support for leading AI image and video models
  - Automatic rendering upon creation

### Media Upload
Upload media files (e.g. images and videos) for your social media content using the Media resource.
- **Upload from URL**: Upload media files from a URL
- **Upload from Binary**: Upload media files from binary data
- **Size limit**: 60MB for binary uploads, larger files should use URL upload
- **Rate limit**: 10 requests per minute

### Post Publish
Post content across multiple social media platforms using the Post resource.
- **Platforms supported**: Twitter, Linkedin, Facebook, Instagram, Pinterest, Tiktok, Threads, Bluesky, Youtube
- **Operations**:
  - **Create**: Publish content to social media platforms
  - **Get**: Check post status and details by submission ID
- **Features**:
  - Multi-platform publishing with a single workflow
  - Schedule posts for later or use the next available free slot
  - Add captions, hashtags, and media
  - Platform-specific options, such as, but not limited to:
    - Youtube: Privacy settings, subscriber notifications, Made for Kids setting, Contains Synthetic Media
    - Pinterest: Board selection, pin title, alt text, and link
    - Tiktok: Privacy levels, comment/duet settings, Post as Draft, Slideshow Title, Image Cover Index, Video Cover Timestamp
    - Instagram: Post, Reel, or Story options, Audio Name (for Reels), Collaborators
    - Linkedin: Personal profile or Company page
    - Facebook: Page selection, Video/Reel options
    - Threads: Reply control settings
  - **Note**: Instagram, Tiktok, Pinterest, and Youtube require at least one media file (image or video) to be included in posts.
  - Rate limit: 30 requests per minute

## Credentials

To use this node, you need to create credentials in n8n:

1. **Get your Blotato API Key**:
   - Log in to your [Blotato account](https://my.blotato.com)
   - Navigate to Settings → API Keys
   - Click "Generate API Key"
   - **Important**: API access is only available to paying subscribers.

2. **Configure in n8n**:
   - Go to **Credentials** → **New** → **Blotato API**
   - Enter your API key

3. **Connect Social Media Accounts**:
   - In Blotato, navigate to Settings → Connected Accounts
   - Click "Login with <platform>" to connect your social media account.

## Compatibility

- **n8n version**: 1.80.0 and above
- **Node.js version**: 18.10 or higher

## Usage

### Example: AI Video to Multi-Platform Publishing

1. **Create AI video/carousel** using the Video resource where you select a template
2. **Wait for generation** by checking status with Video Get operation
3. **Publish to multiple platforms** using the Post resource with the generated media URL
4. **Check post status** using the Post Get operation to verify successful publishing

### Example: Upload and Publish

1. **Upload your media** using the Media resource and Upload operation
2. **Publish to multiple platforms** using the Post resource and Create operation
3. **Track publishing progress** using the Post Get operation with the submission ID

### Tips

- **Video Templates**: Browse available templates at [Blotato Templates](https://my.blotato.com/videos/new)
- **Rate Limits**: Blotato has a rate limit of 10 media uploads per minute
- **Media Requirements**: Each platform has specific [media requirements](https://help.blotato.com/api/media)
- **Scheduling**: Use the `scheduledTime` parameter to schedule posts in ISO 8601 format, or enable `Schedule Next Free Slot` to automatically schedule posts in the next available time slot
- **Instagram Collaborators**: Add up to 3 Instagram usernames as collaborators on your posts
- **Debugging**: To view all your API requests, responses, and error messages, go to your [Blotato API Dashboard](https://my.blotato.com/api-dashboard)
- **Error Handling**: The node supports n8n's error output paths - use "Continue (using error output)" to handle errors gracefully

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [Blotato API Reference](https://help.blotato.com/api-reference)
* [Blotato Help Center](https://help.blotato.com)

## About Blotato

Blotato is your all-in-one AI content engine to create and distribute social media posts. It solves the problem of producing and distributing high-quality content consistently while growing on multiple platforms, without paying for multiple tools that don't integrate with each other.

### Key Features
- **Multi-Platform Publishing**: Schedule and publish to all major social platforms
- **Viral Templates**: Create social media videos and carousels using prebuilt viral templates
- **Access to AI Models**: Access the leading AI image and video models, all in one unified tool
- **Content Remixing**: Transform content between platforms (e.g., Youtube videos to Linkedin posts)

### Who is Blotato For?
- Solopreneurs
- Content creators
- Small business owners
- Social media marketers
- Digital marketing agencies

## Support

For issues and feature requests related to this n8n node, please use the [GitHub issue tracker](https://github.com/Blotato-Inc/n8n-nodes-blotato/issues).

For Blotato-specific questions, visit [Blotato Help Center](https://help.blotato.com/).

## Development

- Install n8n (if you want faster development and don't wanna use docker)

```sh
npm i -g n8n
```

- Create necessary directories

```sh
export N8N_BLOTATO_WORKDIR=$HOME/dev/n8n-blotato-work
mkdir -p $N8N_BLOTATO_WORKDIR/n8n-selfhost
cd $N8N_BLOTATO_WORKDIR
git clone git@github.com:Blotato-Inc/n8n-nodes-blotato.git
```

- Build the custom node code

```sh
cd $N8N_BLOTATO_WORKDIR/n8n-nodes-blotato
npm i
# rebuilding the code and n8n restart is required
# on every change
npm run build
```

- Run locally with `n8n` npm package

```sh
export N8N_BLOTATO_WORKDIR=$HOME/dev/n8n-blotato-work
export N8N_CUSTOM_EXTENSIONS=$N8N_BLOTATO_WORKDIR/n8n-nodes-blotato
n8n
```

- Or, alternatively, start n8n instance docker instance (might be slower than native)

```sh
export N8N_BLOTATO_WORKDIR=$HOME/dev/n8n-blotato-work

docker run -it --rm --name n8n -p 5678:5678 \
           -e N8N_CUSTOM_EXTENSIONS=/mnt/custom-nodes/n8n-nodes-blotato \
           -v $N8N_BLOTATO_WORKDIR/n8n-nodes-blotato:/mnt/custom-nodes/n8n-nodes-blotato \
           -v $N8N_BLOTATO_WORKDIR/n8n-selfhost/data:/home/node \
           docker.n8n.io/n8nio/n8n
```

- NOTE: When you create Blotato API credentials, use http://127.0.0.1:8000 to avoid ipv6 issues
