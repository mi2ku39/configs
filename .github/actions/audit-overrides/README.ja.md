# pnpm overrides の監査

削除できる可能性がある pnpm audit overrides を検出します。このアクションは、`pnpm-workspace.yaml` の `overrides` ブロック内にある `# audit` マーカーを探し、マーカー付きの overrides を一時的に削除し、ロックファイルを更新し、`pnpm audit --json` の出力を比較して Markdown レポートを書き出します。

## 使い方

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

プルリクエストでは、`issues: write` を省略し、`create-issue` は `false` のままにしてください。

## 想定するワークスペース構成

```yaml
overrides:
  react: $react
  # audit
  fast-xml-parser@<5.7.0: ">=5.7.0"
```

`# audit` マーカーより下、かつ次のトップレベル YAML キーより前にある override エントリのみがチェックされます。

## 入力

| 名前 | デフォルト | 説明 |
| --- | --- | --- |
| `node-version` | `24` | pnpm audit の実行に使用する Node.js バージョン。 |
| `pnpm-version` | `10` | install コマンドと audit コマンドの実行に使用する pnpm バージョン。 |
| `workspace-file` | `pnpm-workspace.yaml` | audit override ブロックを含む pnpm ワークスペースファイルへのパス。 |
| `report-path` | `audit-overrides-report.md` | Markdown レポートを書き出すパス。 |
| `install-dependencies` | `true` | 監査前に pnpm install を実行するかどうか。 |
| `install-command` | `pnpm install --frozen-lockfile` | `install-dependencies` が true の場合に使用するコマンド。 |
| `append-summary` | `true` | GitHub Actions のステップサマリーにレポートを追記するかどうか。 |
| `create-issue` | `false` | レポートを含む GitHub Issue を作成するかどうか。 |
| `issue-title-prefix` | `Audit overrides report` | 作成するレポート Issue のタイトル接頭辞。 |
| `github-token` | ワークフローコンテキストの GitHub トークン | `create-issue` が true の場合に使用するトークン。 |

## 出力

| 名前 | 説明 |
| --- | --- |
| `report-path` | 生成された Markdown レポートへのパス。 |
| `removable-count` | 削除できる可能性がある overrides の数。 |
| `review-count` | まだレビューが必要な overrides の数。 |
| `failed-count` | チェックできなかった overrides の数。 |
| `baseline-count` | ベースライン監査に含まれる advisory の数。 |
| `has-removable` | 削除できる可能性がある override が 1 つ以上あるかどうか。 |
