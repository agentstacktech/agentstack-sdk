# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.13] - 2026-05-28

### Added

- **Project context:** `sdk.getProjectId()`, `requireProjectId()`, `updateProjectId()`, login → HTTPClient sync, [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md)
- **Integrator scope:** `SDKConfig.sdkAudience` (`integrator` default, `platform_operator` for AgentStack ops); guards on `sdk.admin`, `sdk.platform.adminData`, `/api/admin/*` HTTP; admin modules omitted from `getModuleCatalog()` for integrators; [docs/INTEGRATOR_SCOPE.md](docs/INTEGRATOR_SCOPE.md); `assertIntegratorModule()` in AI preflight
- `resolveAgentStackApiBase()` and production URL constants (`agentstack.tech`)
- `AGENTS.md`, AI Application Factory / integrator guides, `llms.txt`
- `getModuleCatalog()` documentation (`docs/SDK_MODULE_CATALOG.md`)
- Subpath exports: `@agentstack/sdk/capability-tasks`, `@agentstack/sdk/manifest`
- AI preflight: `validateAppManifest`, `assertModuleEnabled`, `listRegisteredTaskPorts`
- CI guards: `check:docs-urls`, `check:package-exports`, `check:docs-api-symbols`
- Examples under `examples/ai/`
- Mirror runbook: `docs/sdk/SDK_MIRROR_PUBLISH_RUNBOOK.md`

### Changed

- Docs/examples: production API `https://agentstack.tech/api` everywhere; removed misleading Docker deployment section; legacy hosts and broken doc TOC links fixed; `check-docs-urls` guards legacy hosts, bare `localhost:8000`, and missing `/api` on production origin
- Default integrator API base is production (`https://agentstack.tech/api`)
- GitHub repository metadata → `agentstacktech/agentstack-sdk`
- README project API examples use `sdk.platform.api` (not misleading `sdk.projects.get`)

## [1.1.0] - 2025-02-23

### Added

- AgentStackSDK core class with modular architecture
- AgentAuth, AgentAPI, AgentNeural, AgentDocs, AgentPayments, AgentAnalytics
- AgentWebhooks, AgentScheduler, AgentNotifications, AgentWallets
- AgentInvoices, AgentBilling, AgentRBAC, AgentI18n
- AgentDNA, AgentLogic, AgentCommand, AgentMarketplace
- AgentAssets, AgentGlobalAssets, AgentBuffs
- Protein system: AgentProtein, ProteinResponseProcessor, PageCompositionSystem, GameDataSystem
- FileStorageIntegration for DNA and Protein
- ESM and CJS builds with TypeScript declarations
- React peer dependencies (optional)

### Changed

- Unified Python SDK naming: `pip install agentstack`, `from agentstack import AgentStackSDK`

### Fixed

- N/A

## [1.0.0] - 2025-01-15

### Added

- Initial release
- Core HTTP client with retry and caching
- Basic auth and API modules

[1.1.0]: https://github.com/agentstacktech/agentstack-sdk/releases/tag/v1.1.0
[1.0.0]: https://github.com/agentstacktech/agentstack-sdk/releases/tag/v1.0.0
