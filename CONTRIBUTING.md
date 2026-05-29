# Contributing to AgentStack SDK

Thank you for your interest in contributing to AgentStack SDK!

## Getting Started

### Prerequisites

- Node.js >= 20
- npm >= 10

### Setup

```bash
# Clone the repository
git clone https://github.com/agentstacktech/agentstack-sdk.git
cd agentstack-sdk

# Install dependencies (from repo root)
npm install

# Build the core package
npm run build
```

### Running Tests

```bash
npm run test
```

### Linting

```bash
npm run lint
```

## Development Workflow

1. Create a branch from `main`: `git checkout -b feature/your-feature-name`
2. Make your changes in `packages/core/src/`
3. Run `npm run build` and `npm run test`
4. Commit with [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: add new method`
   - `fix: resolve retry logic`
   - `docs: update README`
5. Push and open a Pull Request

## Code Style

- Follow the project's [.cursorrules](.cursorrules) for code style
- Use TypeScript strict mode
- Include type hints for all public APIs
- Add docstrings for exported functions and classes

## Pull Request Guidelines

- Keep PRs focused and reasonably sized
- Ensure all tests pass
- Update documentation if needed
- Reference any related issues

## Questions?

- [GitHub Issues](https://github.com/agentstacktech/agentstack-sdk/issues)
- [Platform docs (Swagger)](https://agentstack.tech/swagger)
- [SDK AGENTS.md](./AGENTS.md)
- [Mirror runbook](../docs/sdk/SDK_MIRROR_PUBLISH_RUNBOOK.md) (monorepo maintainers)
