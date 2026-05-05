> ## Documentation Index
> Fetch the complete documentation index at: https://docs.trytrellis.app/llms.txt
> Use this file to discover all available pages before exploring further.

# Cloudflare Workers + Hono + Turso

> Full-stack spec template for Cloudflare Workers apps with Hono framework and Turso database

A complete coding convention template for production Cloudflare Workers applications with Hono framework, Drizzle ORM, and Turso edge database.

<Card title="Download Template" icon="download" href="https://download-directory.github.io/?url=https://github.com/mindfold-ai/Trellis/tree/main/marketplace/specs/cf-workers-fullstack">
  Download as ZIP and extract to `.trellis/spec/`
</Card>

## What's Included

| Category | Files              | Coverage                                             |
| -------- | ------------------ | ---------------------------------------------------- |
| Backend  | 11 files           | Hono, Drizzle/Turso, API patterns, security, storage |
| Frontend | 7 files + examples | Components, hooks, auth, design templates            |
| Shared   | 5 files            | TypeScript, code quality, dependencies, timestamps   |
| Guides   | 3 files            | OAuth consent flow, serverless connections           |
| Pitfalls | 6 files            | Workers compat, cross-layer, env config, CSS         |

## Template Structure

```
spec/
├── backend/
│   ├── index.md
│   ├── hono-framework.md
│   ├── database.md
│   ├── api-module.md
│   ├── api-patterns.md
│   ├── security.md
│   ├── storage.md
│   └── ...
│
├── frontend/
│   ├── index.md
│   ├── authentication.md
│   ├── components.md
│   ├── hooks.md
│   ├── directory-structure.md
│   ├── examples/frontend-design/
│   └── ...
│
├── guides/
│   ├── oauth-consent-flow.md
│   ├── serverless-connection-guide.md
│   └── ...
│
├── shared/
│   ├── typescript.md
│   ├── code-quality.md
│   ├── dependency-versions.md
│   └── ...
│
├── big-question/
│   ├── workers-nodejs-compat.md
│   ├── cross-layer-contract.md
│   ├── env-configuration.md
│   └── ...
│
└── README.md
```

## Key Topics

### Backend

* Hono framework patterns (type-safe bindings, middleware, WebSocket)
* Drizzle ORM + Turso/libSQL (batch ops, N+1 prevention, Workers pitfalls)
* Cloudflare storage (R2, KV, Cache API for session caching)
* Security (token generation, timing-safe comparison, OAuth redirect validation)
* Structured JSON logging with request context

### Frontend

* React 19 + React Router v7 with Vite
* Better Auth UI v3.x integration (SSR-safe, Cloudflare Workers considerations)
* shadcn/ui components + Tailwind CSS v4
* Design example templates (minimalist hero, maximalist dashboard, animations)

### Guides

* OAuth 2.1 consent flow with resource selection
* Serverless connection debugging (stale connections, subrequest limits)

### Common Pitfalls

* Workers Node.js compatibility (`nodejs_compat` flag)
* Cross-layer contract violations (data flows but never reaches client)
* Build-time vs runtime environment variables
* CSS debugging in Tailwind v4

## Usage

1. Download the ZIP file
2. Extract to your project's `.trellis/spec/` directory
3. Replace generic env var names with your actual bindings
4. Customize for your specific conventions
5. Remove sections that don't apply

<Card title="View on GitHub" icon="github" href="https://github.com/mindfold-ai/Trellis/tree/main/marketplace/specs/cf-workers-fullstack">
  Browse the template source code
</Card>
