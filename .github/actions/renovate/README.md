# Renovate

Runs Renovate with the repository's shared global config. By default, the action executes `npx -y renovate@^43`. If `using-local-renovate` is set to `true`, it installs pnpm dependencies and runs `pnpm exec renovate` instead.

## Usage

```yaml
name: Run Renovate

on:
  schedule:
    - cron: "0 10 * * 5"
  workflow_dispatch:

jobs:
  renovate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: owner/repo/.github/actions/renovate@v1
        with:
          renovate-token: ${{ secrets.GH_PAT_FOR_RENOVATE }}
          renovate-config-file: renovate.global.json
```

## Local Renovate

Use `using-local-renovate` when the target repository manages Renovate as a package dependency.

```yaml
- uses: owner/repo/.github/actions/renovate@v1
  with:
    using-local-renovate: "true"
    renovate-token: ${{ secrets.GH_PAT_FOR_RENOVATE }}
    renovate-config-file: renovate.global.json
```

When enabled, the action sets up pnpm, enables the pnpm cache through `actions/setup-node`, runs `pnpm install --frozen-lockfile`, and then runs `pnpm exec renovate`.

## Inputs

| Name | Default | Description |
| --- | --- | --- |
| `node-version` | `24` | Node.js version used to run Renovate. |
| `using-local-renovate` | `false` | Whether to install dependencies and run `pnpm exec renovate` from the repository. |
| `renovate-config-file` | `.github/renovate.global.json` | Path passed to `RENOVATE_CONFIG_FILE`. |
| `renovate-token` | Required | GitHub token passed to `RENOVATE_TOKEN` and used for GitHub Packages npm host rules. |
| `dry-run` | `false` | Value passed to `RENOVATE_DRY_RUN`. |

## Token

Set `renovate-token` to a token that can read the target repositories and create Renovate branches and pull requests. The same token is also used for npm packages hosted on `https://npm.pkg.github.com/`.

## Behavior

The action sets these Renovate environment variables:

| Variable | Value |
| --- | --- |
| `RENOVATE_CONFIG_FILE` | `renovate-config-file` input |
| `RENOVATE_TOKEN` | `renovate-token` input |
| `RENOVATE_HOST_RULES` | npm host rule for GitHub Packages using `renovate-token` |
| `RENOVATE_DRY_RUN` | `dry-run` input |
| `RENOVATE_GIT_AUTHOR` | `github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>` |
