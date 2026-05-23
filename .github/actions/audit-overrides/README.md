# Audit pnpm overrides

Detects pnpm audit overrides that may be removable. The action looks for a `# audit` marker inside the `overrides` block of `pnpm-workspace.yaml`, temporarily removes the marked overrides, refreshes lockfiles, compares `pnpm audit --json` output, and writes a Markdown report.

## Usage

```yaml
name: Audit overrides

on:
  schedule:
    - cron: "0 0 * * 1"
  workflow_dispatch:

permissions:
  contents: read
  issues: write

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: owner/repo/.github/actions/audit-overrides@v1
        with:
          create-issue: "true"
```

For pull requests, omit `issues: write` and keep `create-issue` as `false`.

## Expected workspace shape

```yaml
overrides:
  react: $react
  # audit
  fast-xml-parser@<5.7.0: ">=5.7.0"
```

Only override entries below the `# audit` marker and before the next top-level YAML key are checked.

## Inputs

| Name | Default | Description |
| --- | --- | --- |
| `node-version` | `24` | Node.js version used to run pnpm audit. |
| `pnpm-version` | `10` | pnpm version used to run install and audit commands. |
| `workspace-file` | `pnpm-workspace.yaml` | Path to the pnpm workspace file that contains the audit override block. |
| `report-path` | `audit-overrides-report.md` | Path where the Markdown report is written. |
| `install-dependencies` | `true` | Whether to run pnpm install before auditing. |
| `install-command` | `pnpm install --frozen-lockfile` | Command used when `install-dependencies` is true. |
| `append-summary` | `true` | Whether to append the report to the GitHub Actions step summary. |
| `create-issue` | `false` | Whether to create a GitHub issue with the report. |
| `issue-title-prefix` | `Audit overrides report` | Prefix for created report issue titles. |
| `github-token` | GitHub token from the workflow context | Token used when `create-issue` is true. |

## Outputs

| Name | Description |
| --- | --- |
| `report-path` | Path to the generated Markdown report. |
| `removable-count` | Number of overrides that appear removable. |
| `review-count` | Number of overrides that still need review. |
| `failed-count` | Number of overrides that could not be checked. |
| `baseline-count` | Number of advisories in the baseline audit. |
| `has-removable` | Whether at least one override appears removable. |
