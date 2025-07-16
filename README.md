# n8n-nodes-_node-name_

This is an n8n community node. It lets you use _app/service name_ in your n8n workflows.

_App/service name_ is _one or two sentences describing the service this node integrates with_.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  <!-- delete if no auth needed -->  
[Compatibility](#compatibility)  
[Usage](#usage)  <!-- delete if not using this section -->  
[Resources](#resources)  
[Version history](#version-history)  <!-- delete if not using this section -->  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

_List the operations supported by your node._

## Credentials

_If users need to authenticate with the app/service, provide details here. You should include prerequisites (such as signing up with the service), available authentication methods, and how to set them up._

## Compatibility

_State the minimum n8n version, as well as which versions you test against. You can also include any known version incompatibility issues._

## Usage

_This is an optional section. Use it to help users with any difficult or confusing aspects of the node._

_By the time users are looking for community nodes, they probably already know n8n basics. But if you expect new users, you can link to the [Try it out](https://docs.n8n.io/try-it-out/) documentation to help them get started._

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* _Link to app/service documentation._

## Version history

_This is another optional section. If your node has multiple versions, include a short description of available versions and what changed, as well as any compatibility impact._

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
