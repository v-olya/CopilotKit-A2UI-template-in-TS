# CopilotKit <> A2A + A2UI Starter

TS-written brother of https://github.com/CopilotKit/with-a2a-a2ui.

This is a starter template for building AI agents that use [A2UI](https://a2ui.org) and [CopilotKit](https://copilotkit.ai). It provides a modern Next.js application with an integrated restaurant finder agent that can find restaurants and book reservations

![Demo](Demo.gif)

## Prerequisites

- [OpenRouter](https://openrouter.ai) API key (for the A2A agent server)
- Node.js 20+
- Any of the following package managers:
  - pnpm (recommended)
  - npm
  - yarn
  - bun

> **Note:** This repository ignores lock files (package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb) to avoid conflicts between different package managers. Each developer should generate their own lock file using their preferred package manager. After that, make sure to delete it from the .gitignore.

## Getting Started

1. Install dependencies using your preferred package manager:
```bash
# Using pnpm (recommended)
pnpm install

# Using npm
npm install

# Using yarn
yarn install

# Using bun
bun install
```

3. Set up your OpenRouter API key:

Create a `.env` or `.env.local` file in the project root (or copy from `.env.example`):

```
OPENROUTER_API_KEY=sk-or-v1-...your-openrouter-key-here...
```

Get a key at [OpenRouter Keys](https://openrouter.ai/keys).

4. Start the development server:
```bash
# Using pnpm
pnpm dev

# Using npm
npm run dev

# Using yarn
yarn dev

# Using bun
bun run dev
```

This will start both the Next.js app and the **TypeScript A2A agent server** (port 10002). The agent server uses OpenRouter for the LLM and generates A2UI JSON for the restaurant finder UI.

**First-time setup:** Install the agent server dependencies once:
```bash
cd agent-server && npm install && cd ..
```

## Available Scripts
- `dev` - Starts the Next.js UI and the A2A agent server (both required for A2UI)
- `dev:ui` - Starts only the Next.js UI (chat will work but A2UI needs the agent)
- `dev:agent` - Builds and runs only the A2A agent server
- `build:agent` - Builds the agent server
- `build` - Builds the Next.js application for production
- `start` - Starts the production server
- `lint` - Runs ESLint for code linting

## Architecture

- **Next.js app** (`app/`) – CopilotKit UI and A2UI message renderer. Talks to the A2A agent via `A2AAgent` + `A2AClient`.
- **Agent server** (`agent-server/`) – TypeScript A2A server (Express). Uses OpenRouter for the LLM, no Vercel AI SDK. Implements the restaurant finder: `get_restaurants` tool, A2UI prompt, and multi-part responses (text + A2UI JSON) so the frontend can render rich UI.

## Documentation

The main UI is in `app/page.tsx`. A2UI surfaces are produced by the agent server and rendered by `@copilotkit/a2ui-renderer`. For building new A2UI flows, see [A2UI Composer](https://a2ui-editor.ag-ui.com).

- [A2UI + CopilotKit Documentation](https://docs.copilotkit.ai/a2a) - Learn more about how to use A2UI with CopilotKit
- [A2UI Documentation](https://a2ui.org) - Learn more about A2UI and its capabilities
- [CopilotKit Documentation](https://docs.copilotkit.ai) - Explore CopilotKit's capabilities
- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API

## Contributing

Feel free to submit issues and enhancement requests! This starter is designed to be easily extensible.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Troubleshooting

### Agent / API issues
1. Ensure `OPENROUTER_API_KEY` is set in `.env` or `.env.local` (root). The agent server loads it from there.
2. Run `npm run dev` so both the UI and the agent server start (agent on port 10002).
3. If the agent fails to build, run `cd agent-server && npm install && npm run build`.
