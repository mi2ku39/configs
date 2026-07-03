# Renovate

リポジトリ共通のグローバル設定を使って Renovate を実行します。デフォルトでは、このアクションは `npx -y renovate@^43` を実行します。`using-local-renovate` を `true` に設定した場合は、代わりに pnpm 依存関係をインストールし、`pnpm exec renovate` を実行します。

## 使い方

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

## ローカルの Renovate

対象リポジトリが Renovate をパッケージ依存関係として管理している場合は、`using-local-renovate` を使用します。

```yaml
- uses: owner/repo/.github/actions/renovate@v1
  with:
    using-local-renovate: "true"
    renovate-token: ${{ secrets.GH_PAT_FOR_RENOVATE }}
    renovate-config-file: renovate.global.json
```

有効にすると、このアクションは pnpm をセットアップし、`actions/setup-node` で pnpm キャッシュを有効化し、`pnpm install --frozen-lockfile` を実行してから `pnpm exec renovate` を実行します。

## 入力

| 名前 | デフォルト | 説明 |
| --- | --- | --- |
| `node-version` | `24` | Renovate の実行に使用する Node.js バージョン。 |
| `using-local-renovate` | `false` | 依存関係をインストールし、リポジトリ内の `pnpm exec renovate` を実行するかどうか。 |
| `renovate-config-file` | `.github/renovate.global.json` | `RENOVATE_CONFIG_FILE` に渡すパス。 |
| `renovate-token` | 必須 | `RENOVATE_TOKEN` に渡し、GitHub Packages の npm ホストルールにも使用する GitHub トークン。 |
| `dry-run` | `false` | `RENOVATE_DRY_RUN` に渡す値。 |

## トークン

`renovate-token` には、対象リポジトリを読み取り、Renovate のブランチとプルリクエストを作成できるトークンを設定してください。同じトークンは、`https://npm.pkg.github.com/` でホストされている npm パッケージにも使用されます。

## 動作

このアクションは、次の Renovate 環境変数を設定します。

| 変数 | 値 |
| --- | --- |
| `RENOVATE_CONFIG_FILE` | `renovate-config-file` 入力 |
| `RENOVATE_TOKEN` | `renovate-token` 入力 |
| `RENOVATE_HOST_RULES` | `renovate-token` を使った GitHub Packages 用の npm ホストルール |
| `RENOVATE_DRY_RUN` | `dry-run` 入力 |
| `RENOVATE_GIT_AUTHOR` | `github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>` |
