# book-writing-skill

Markdown で技術書を執筆し、Pandoc で EPUB に変換するワークフローを支援する Claude Code プラグイン。

## 機能

プロジェクトの状態を自動判定し、適切なフェーズを実行します:

| フェーズ | 説明 |
|---------|------|
| **init** | プロジェクト初期化（ディレクトリ構造、ビルドスクリプト、設定ファイルの生成） |
| **plan** | 目次・構成の企画（章立て、各章のアウトライン作成） |
| **write** | 章の執筆（EPUB互換Markdown、品質チェック付き） |
| **cover** | 表紙画像の生成（AI画像生成API + ImageMagickによるO'Reilly風レイアウト） |
| **review** | レビューとEPUBビルド（クロスチェック、Pandocビルド） |

## 前提ツール

```bash
brew install pandoc deno imagemagick
```

表紙生成を使用する場合は、OpenAI API キーまたは Stability AI API キーが必要です。
グローバル設定ファイルに API キーを設定してください（初回のみ）:

```bash
mkdir -p ~/.config/book-writing
cat > ~/.config/book-writing/.env << 'EOF'
# OpenAI を使用する場合
OPENAI_API_KEY=sk-...

# Stability AI を使用する場合
STABILITY_API_KEY=sk-...
EOF
```

`.env` は以下の順で自動探索されます:
1. カレントディレクトリ（プロジェクト固有の設定がある場合）
2. `~/.config/book-writing/.env`（グローバル設定）

## インストール

Claude Code で以下を実行:

```
/plugins add github:zrn-ns/book-writing-skill
```

## 使い方

```
/book-writing              # 状態に応じて自動でフェーズを選択
/book-writing init         # プロジェクト初期化
/book-writing plan         # 目次・構成の企画
/book-writing write        # 章の執筆
/book-writing cover        # 表紙生成
/book-writing review       # レビュー＆ビルド
```

「本を書いて」のように包括的に指示すると、init から review まで全フェーズを順に実行します。

## サンプル

[`examples/superpowers-skill-guide/`](examples/superpowers-skill-guide/) に、このスキルで生成した技術書のサンプルプロジェクトが含まれています。

- **タイトル**: Superpowers完全ガイド
- **内容**: Claude Codeのスキルフレームワーク「Superpowers」の設計思想から各スキルの詳細な活用法まで体系的に解説した全12章の技術書
- **ビルド済みEPUB**: [`examples/superpowers-skill-guide/dist/`](examples/superpowers-skill-guide/dist/)

EPUBを再ビルドするには:

```bash
cd examples/superpowers-skill-guide
deno run --allow-run --allow-read --allow-write ../../skills/book-writing/scripts/build.ts
```

## ライセンス

MIT
