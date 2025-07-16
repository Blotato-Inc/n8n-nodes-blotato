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

This package includes three nodes for interacting with Blotato:

### Media Upload Node
Upload media files (e.g. images and videos) for your social media content.
- **Upload from URL**: Upload media files from a URL (required for Blotato API)
- **Size limit**: 200MB maximum file size
- **Rate limit**: 10 requests per minute

### Post Publish Node  
Post content across multiple social media platforms.
- **Platforms supported**: Twitter, LinkedIn, Facebook, Instagram, Pinterest, TikTok, Threads, Bluesky, YouTube
- **Features**:
  - Multi-platform publishing with a single workflow
  - Schedule posts for later
  - Add captions, hashtags, and media
  - Platform-specific options, such as:
    - YouTube: Privacy settings, subscriber notifications
    - Pinterest: Board selection, pin title and link
    - TikTok: Privacy levels, comment/duet settings
    - Instagram: Reel/story options
    - LinkedIn: Company pages
    - Facebook: Reel option
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

### Example: Multi-Platform Publishing

1. **Upload your media** using the Media Upload node
2. **Publish to multiple platforms** using separate Post Publish nodes or a loop

### Tips

- **Rate Limits**: Blotato has a rate limit of 10 media uploads per minute
- **Media Requirements**: Each platform has specific [media requirements](https://help.blotato.com/tips-and-tricks/social-platform-requirements)
- **Scheduling**: Use the `scheduledTime` parameter to schedule posts in ISO 8601

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [Blotato API Reference](https://help.blotato.com/api-reference)
* [Blotato Help Center](https://help.blotato.com)

## About Blotato

Blotato is your all-in-one AI content engine to create and distribute social media posts. It solves the problem of producing and distributing high-quality content consistently while growing on multiple platforms, without paying for multiple tools that don't integrate with each other.

### Key Features
- **Content Remixing**: Transform content between platforms (e.g., Youtube videos to Linkedin posts)
- **AI Generation**: Create AI images, videos, and voices using the best AI models available
- **Multi-Platform Publishing**: Schedule and publish to all major social platforms

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
