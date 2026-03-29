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

## ライセンス

MIT
