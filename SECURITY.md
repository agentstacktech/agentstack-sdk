# Security Policy

## Supported versions

Security fixes are published for the current platform line aligned with `AGENTSTACK_CORE_VERSION` in the AgentStack monorepo (`shared/constants.py`).

## Reporting a vulnerability

Please report security issues privately:

- GitHub: https://github.com/agentstacktech/agentstack-sdk/security/advisories (preferred)
- Do not open public issues for exploitable vulnerabilities.

Include: affected package/version, reproduction steps, and impact assessment.

## Secrets

Never commit API keys, JWTs, or ecosystem default keys. Use environment variables (`AGENTSTACK_API_BASE`, session tokens via `sdk.platform.auth.login`).
