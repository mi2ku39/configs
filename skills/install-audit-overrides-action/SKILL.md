---
name: install-audit-overrides-action
description: Install or update the shared pnpm audit-overrides GitHub Action from mi2ku39/configs in a target repository. Use when a coding agent is asked to set up audit override checks, create or update .github/workflows/audit-overrides.yaml, prepare pnpm-workspace.yaml, add an overrides block, or add the # audit marker for pnpm audit overrides.
---

# Install Audit Overrides Action

Use this skill to modify a target repository so pnpm audit overrides are checked
through `mi2ku39/configs/.github/actions/audit-overrides@main`.

The skill installs:

- `.github/workflows/audit-overrides.yaml`
- `pnpm-workspace.yaml` when missing
- an `overrides` block and `# audit` marker when missing

Prefer editing the target repository directly. Ask questions only when issue
creation policy or pnpm workspace layout cannot be inferred safely.

## Workflow

1. Inspect the target repository.
   - Check for pnpm indicators: `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
     `packageManager: "pnpm@..."`, pnpm scripts, or existing `pnpm.overrides`.
   - Check existing workflows for audit, security, or override checks.
   - Check whether the repository already has issue-writing workflow permissions.

2. Decide whether to install.
   - Install when the repository is a pnpm project.
   - Also install when the user explicitly asks for audit-overrides, even if pnpm
     files need to be created.
   - Do not install for a clearly non-pnpm repository unless the user confirms.

3. Create or update `.github/workflows/audit-overrides.yaml`.
   - Use `mi2ku39/configs/.github/actions/audit-overrides@main`.
   - Default to creating GitHub issues for scheduled reports.
   - If issue creation is undesirable, set `create-issue: "false"` and omit
     `issues: write`.

4. Prepare `pnpm-workspace.yaml`.
   - If missing, create a minimal workspace file.
   - If present, preserve package globs and existing settings.
   - Ensure an `overrides` block exists.
   - Ensure `# audit` exists inside the `overrides` block.
   - Do not invent actual override entries unless the user provides advisories or
     package constraints.

5. Validate.
   - Inspect generated YAML for indentation and block placement.
   - If package scripts or lint checks exist and are cheap, run the relevant checks.
   - Report whether issue creation is enabled.

## Workflow File

Create `.github/workflows/audit-overrides.yaml` for pnpm repositories:

```yaml
# yaml-language-server: $schema=https://www.schemastore.org/github-workflow.json
name: Audit overrides

on:
  workflow_dispatch:
  schedule:
    - cron: "0 0 * * 1"

permissions:
  contents: read
  issues: write

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6

      - name: Audit pnpm overrides
        uses: mi2ku39/configs/.github/actions/audit-overrides@main
        with:
          create-issue: "true"
```

For pull-request-only checks or summary-only reporting, omit `issues: write` and
use:

```yaml
        with:
          create-issue: "false"
```

Common optional inputs:

```yaml
with:
  node-version: "24"
  pnpm-version: "10"
  workspace-file: pnpm-workspace.yaml
  report-path: audit-overrides-report.md
  install-dependencies: "true"
  install-command: pnpm install --frozen-lockfile
  append-summary: "true"
  create-issue: "true"
  issue-title-prefix: Audit overrides report
```

## pnpm Workspace Handling

If `pnpm-workspace.yaml` is missing, create:

```yaml
packages:
  - "."

overrides:
  # audit
```

If the repository is an existing workspace, preserve existing `packages` entries
and append only the missing audit structure:

```yaml
overrides:
  # audit
```

If an `overrides` block already exists, add `# audit` inside that block. The shared
action checks only override entries below the `# audit` marker and before the next
top-level YAML key.

Example:

```yaml
overrides:
  react: $react
  # audit
  fast-xml-parser@<5.7.0: ">=5.7.0"
```

When a pnpm project stores overrides in `package.json` under `pnpm.overrides`,
prefer leaving existing overrides untouched. Move audit-related overrides into
`pnpm-workspace.yaml` only when the user provides specific audit entries or asks for
that migration.

## Existing File Rules

- Do not overwrite existing audit workflows blindly.
- Preserve existing schedules and permissions when they look intentional.
- Add `issues: write` only when `create-issue: "true"` is used.
- Avoid changing pnpm or Node versions unless the repository already requires a
  different version or the user asks for one.
- Do not create fake audit override entries. The marker alone is enough to prepare
  the repository.

## Final Response

After editing, tell the user:

- Which audit-overrides files were created or updated.
- Whether `pnpm-workspace.yaml` was created or modified.
- Whether issue creation is enabled or summary-only mode is used.
- Any validation performed or skipped.
