---
name: install-renovate-action
description: Install or update the shared Renovate GitHub Action from mi2ku39/configs in a target repository. Use when a coding agent is asked to set up Renovate, create or update .github/workflows/renovate.yaml, renovate.global.json, or renovate.json, migrate an existing Renovate workflow to the shared action, or adapt Renovate settings for a repository.
---

# Install Renovate Action

Use this skill to modify a target repository so Renovate runs through
`mi2ku39/configs/.github/actions/renovate@main`.

The skill installs:

- `.github/workflows/renovate.yaml`
- `renovate.global.json`
- `renovate.json`

Prefer editing the target repository directly. Ask questions only when the secret
name, repository slug, or Renovate policy cannot be inferred safely.

## Workflow

1. Inspect the target repository.
   - Identify the repository slug from `git remote -v` when available.
   - Check for existing Renovate files: `.github/workflows/*renovate*`,
     `renovate.json`, `.github/renovate.json`, `renovate.global.json`, and
     package-manager-specific Renovate hints.
   - Preserve useful existing Renovate policy unless it is duplicated by the shared
     config.

2. Choose the Renovate secret name.
   - If the user provided a secret name, use it.
   - Otherwise default to `GH_PAT_FOR_RENOVATE`.
   - Mention the expected secret name in the final response.

3. Create or update `.github/workflows/renovate.yaml`.
   - Use `mi2ku39/configs/.github/actions/renovate@main`.
   - Preserve intentional existing triggers or schedules when updating an existing
     workflow.
   - Use `renovate.global.json` as the config file unless the user asks otherwise.

4. Create or update `renovate.global.json`.
   - Set `repositories` to the target repository slug.
   - Keep existing additional repositories if the file intentionally manages
     multiple repositories.

5. Create or update `renovate.json`.
   - Extend `github>mi2ku39/configs:renovate`.
   - Add target-specific settings only when already present or clearly requested.

6. Validate.
   - Confirm generated JSON parses.
   - Inspect generated YAML for obvious indentation and expression mistakes.
   - Run repository formatting or lint checks only when cheap and already available.

## Workflow File

Create `.github/workflows/renovate.yaml` like this, replacing the secret name when
the target repository uses a different one:

```yaml
# yaml-language-server: $schema=https://www.schemastore.org/github-workflow.json
name: Run Renovate

on:
  workflow_dispatch:
  schedule:
    - cron: "0 10 * * 5"

jobs:
  renovate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6

      - name: Execute Renovate
        uses: mi2ku39/configs/.github/actions/renovate@main
        with:
          renovate-token: ${{ secrets.GH_PAT_FOR_RENOVATE }}
          renovate-config-file: renovate.global.json
```

If the repository manages Renovate as a local pnpm dependency, add:

```yaml
          using-local-renovate: "true"
```

Use `dry-run: "true"` only when the user explicitly asks for dry-run behavior.

## Global Config

Create `renovate.global.json` for the target repository:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-global-schema.json",
  "onboarding": false,
  "platform": "github",
  "repositories": [
    "owner/repo"
  ],
  "username": "renovate"
}
```

Use the actual target repository slug in `repositories`. If the slug cannot be
determined, ask the user instead of guessing.

## Repository Config

Create `renovate.json` as the repository-local policy:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "github>mi2ku39/configs:renovate"
  ],
  "platformAutomerge": true
}
```

When an existing `renovate.json` exists:

- Keep useful local package rules, labels, schedules, and automerge settings.
- Remove or avoid duplicating rules already supplied by
  `github>mi2ku39/configs:renovate`.
- Preserve repo-specific disabled packages, custom grouping, or scheduling that
  looks intentional.
- Prefer root `renovate.json` unless the target repository already standardizes on
  `.github/renovate.json`.

## Existing File Rules

- Do not overwrite existing Renovate workflows blindly.
- Convert the Renovate execution step to the shared action while preserving
  intentional triggers and permissions.
- Keep `renovate.global.json` `repositories` accurate for the target repository.
- Avoid changing package manager versions or installing dependencies just to set up
  Renovate.
- The shared action injects `RENOVATE_HOST_RULES` for GitHub Packages using the
  Renovate token.

## Final Response

After editing, tell the user:

- Which Renovate files were created or updated.
- Which secret name the workflow expects.
- Whether local Renovate mode or npx Renovate mode is used.
- Any validation performed or skipped.
