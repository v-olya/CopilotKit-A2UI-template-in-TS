# Restaurant Assistant with CopilotKit

A Next.js application with an AI-powered restaurant assistant using [CopilotKit](https://copilotkit.ai). TS-brother of https://github.com/CopilotKit/with-a2a-a2ui.

## Branches Overview

This repository contains 3 branches demonstrating different approaches to render custom UI components:

| Branch                     | Rendering Approach      |
| -------------------------- | ----------------------- |
| `main`                     | A2UI (standard catalog) |
| `wait-for-copilotkit-1.60` | A2UI (custom catalog)   |
| `ag-ui-version`            | Frontend Tools          |

### Common Features

All branches include:

- Restaurant search by cuisine/location
- Restaurant booking form
- Booking confirmation display
- CopilotKit chat interface

### Rendering Approaches

#### A2UI - Standard Catalog (main)

The LLM returns A2UI JSON using the standard A2UI component catalog with a custom theme:

```
LLM → A2UI JSON (standard) → createA2UIMessageRenderer → React Components
```

#### A2UI - Custom Catalog (wait-for-copilotkit-1.60)

The LLM returns A2UI JSON using a custom component catalog (`catalogId: "restaurant-app-v1"`):

```
LLM → A2UI JSON (custom) → @copilotkit/a2ui-renderer → React Components
```

#### Frontend Tools (ag-ui-version)

The LLM calls frontend tools defined with `useFrontendTool`. Each tool has a `handler` (runs on frontend) and `render` (displays UI):

```
LLM → Tool Call → useFrontendTool.handler → useFrontendTool.render
```

**Ollama Integration:** The ag-ui-branch uses a local [Ollama](https://ollama.com) LLM via CopilotKit's `BuiltInAgent`.

CopilotKit v1.51.3 uses an agent-based architecture where the runtime creates a `BuiltInAgent` to handle chat requests. By default, the runtime auto-creates this agent from the service adapter's `provider` and `model` properties and passes them through `resolveModel()`, which only supports `openai`, `anthropic`, and `google`.

To use Ollama, we bypass `resolveModel()` entirely:

1. **`@ai-sdk/openai`** creates an OpenAI-compatible provider pointed at Ollama's `/v1` endpoint (Ollama exposes this natively).
2. **`BuiltInAgent`** accepts either a model string (`"openai/gpt-4o"`) or a `LanguageModel` object. By passing the object directly, `resolveModel()` skips all string parsing.
3. **`EmptyAdapter`** satisfies the service adapter type requirement without interfering, since the agent handles all LLM communication.
4. **Agents provided directly** via `agents: { default: agent }` — the runtime sees agents already exist and never tries to auto-create one.

```
Ollama ← @ai-sdk/openai (baseURL: localhost:11434/v1) ← BuiltInAgent ← CopilotRuntime
```

## Getting Started

### Prerequisites

- Node.js 20+
- Ollama (for `wait-for-copilotkit-1.60` and `ag-ui-version`)
- OpenRouter API key (for `main` branch)

### Installation

```bash
npm install
```

### Environment Variables

Create `.env` or `.env.local` from `.env.example`

### Running

```bash
# main, wait-for-copilotkit-1.60

cd agent-server && npm install && npm run dev

# all branches

# main, wait-for-copilotkit-1.60

cd agent-server && npm install && npm run dev

# all branches

npm run dev
```

## Documentation

- [CopilotKit Documentation](https://docs.copilotkit.ai)
- [Frontend Tools Guide](https://docs.copilotkit.ai/frontend-actions)
- [A2UI Protocol](https://a2ui.org)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

