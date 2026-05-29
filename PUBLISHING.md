# Publishing Guide

**RU:** [PUBLISHING_ru.md](./PUBLISHING_ru.md)

Full mirror runbook: [../docs/sdk/SDK_MIRROR_PUBLISH_RUNBOOK.md](../docs/sdk/SDK_MIRROR_PUBLISH_RUNBOOK.md)

## After First npm Publish

Once `@agentstack/sdk` is published to npm:

1. **agentstack-frontend**: Update `package.json`:
   ```json
   "@agentstack/sdk": "^0.4.13"
   ```
   Replace the `file:../agentstack-unified-sdk/packages/core` reference.

2. **Local development**: Use `npm link` for SDK development:
   ```bash
   cd agentstack-unified-sdk/packages/core && npm link
   cd agentstack-frontend && npm link @agentstack/sdk
   ```

## npm Publish Steps

1. Bump version: `npm version patch -w @agentstack/sdk`
2. Create GitHub release (triggers publish workflow)
3. Or manually: `npm publish -w @agentstack/sdk` (with NPM_TOKEN)
