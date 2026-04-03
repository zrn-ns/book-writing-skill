# プロジェクト初期化フェーズ

新しい技術書プロジェクトのディレクトリ構造、設定ファイル、ビルドパイプラインを生成する。

## 手順

### 1. 前提ツールの確認

以下のコマンドでツールのインストール状態を確認する:

```bash
which pandoc && pandoc --version | head -1
which deno && deno --version | head -1
which magick && magick --version | head -1
```

いずれかが未インストールの場合、以下を案内する:
```bash
brew install pandoc deno imagemagick
```

### 2. ヒアリング

以下の項目をユーザーに確認する:

| 項目 | 説明 | 例 |
|------|------|-----|
| タイトル | 書籍のタイトル | 「実践 Claude API 入門」 |
| サブタイトル | 任意 | 「AIアプリケーション開発ガイド」 |
| 著者 | 著者名（デフォルト: `claude /book-writing`） | 「山田太郎」 |
| 言語 | 書籍の言語コード | `ja`（デフォルト） |
| 概要 | 書籍の簡単な説明 | description フィールドに使用 |
| プロジェクトルート | ディレクトリの配置先 | 下記参照 |
| 表紙API | 画像生成プロバイダ | `openai`（デフォルト）/ `stability` / `なし` |
| イラストモチーフ | 表紙イラストの題材（任意） | `an astrolabe with intricate gears` |
| テーマカラー | 表紙の帯やボーダーの色 | `#5B4FCF`（デフォルト） |

**プロジェクトルートの選択**:
- **カレントディレクトリ**: 現在のディレクトリをそのまま書籍プロジェクトのルートにする
- **新規ディレクトリ**: カレントディレクトリ配下に書籍タイトルベースのディレクトリを作成する（例: `practical-claude-api/`）

### 3. ディレクトリ構造の生成

```
<project-root>/
├── src/                  # Markdownソース
├── assets/               # 表紙画像等のアセット
├── dist/                 # EPUB出力先
├── book.yaml             # Pandocメタデータ
├── epub.css              # EPUB用CSS
├── CLAUDE.md             # Claude Code設定
└── .gitignore
```

### 4. 各ファイルの生成

#### book.yaml

```yaml
---
title: "<タイトル>"
subtitle: "<サブタイトル>"
author: "claude /book-writing"       # デフォルト著者名（ユーザー指定があれば上書き）
lang: <言語コード>
date: "<YYYY年M月>"
rights: "All rights reserved"
description: |
  <概要>
css: epub.css
toc: true
toc-depth: 3
epub-chapter-level: 1
number-sections: false
editions:
  - name: "初版"
    date: "<YYYY-MM-DD>"       # 今日の日付を設定
cover:
  provider: openai             # openai | stability | none
  subject: ""                  # イラストのモチーフ（空なら概要から提案）
  color: "#5B4FCF"             # テーマカラー（帯・ボーダーに使用）
  custom_prompt: ""            # 完全カスタムプロンプト（空なら自動構築）
...
```

#### ビルド・表紙生成スクリプト

`scripts/build.ts` と `scripts/generate-cover.ts` はこのスキルの `scripts/` ディレクトリに用意されている。プロジェクトにコピーする必要はなく、プロジェクトルートから直接実行する:

```bash
# EPUB ビルド
deno run --allow-run --allow-read --allow-write <このスキルの scripts/build.ts の絶対パス>

# 表紙生成
deno run --allow-net --allow-read --allow-write --allow-run --allow-env <このスキルの scripts/generate-cover.ts の絶対パス>
```

スクリプトは `Deno.cwd()` をプロジェクトルートとして扱い、`src/` 配下の `.md` ファイルを自動検出してファイル名順にソートする。`sourceFiles` 配列の手動管理は不要。

#### epub.css

このスキルの `templates/epub.css` を Read で読み込み、テーマカラー（デフォルト `#5B4FCF`）をヒアリングで決まった色に置換してから、プロジェクトルートに `epub.css` として Write する。

置換対象箇所（すべて同じテーマカラー値）:
- `h1` の `border-bottom`
- `h2` の `color` 系（派生色は手動調整）
- `th` の `background-color`
- `blockquote` の `border-left`

#### CLAUDE.md

プロジェクト固有のClaude Code設定ファイル:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

<書籍の概要を記載>

## ビルド

\```bash
# EPUB生成（Deno + Pandoc が必要）
deno run --allow-run --allow-read --allow-write <book-writingスキルの scripts/build.ts の絶対パス>
\```

出力: `dist/<タイトルから自動生成>.epub`

前提ツール: `brew install pandoc deno imagemagick`

## アーキテクチャ

- `src/` — 原稿Markdownファイル（`NN-chapter-name.md` 形式）。ファイル名順に自動検出される
- `book.yaml` — Pandocメタデータ（タイトル、言語、目次設定等）
- `epub.css` — EPUB用CSS（日本語フォント、見出し、テーブル、コードブロック）
- `assets/` — 表紙画像等のアセット。`cover.jpg`（最終表紙）、`cover-illustration.png`（AI生成イラスト）

新しい章を追加する場合は、`src/` にMarkdownファイルを作成するだけでよい（自動検出される）。

## コンテンツ規約

- **EPUB互換のMarkdownのみ使用**: `<details>`, `<summary>` 等のHTMLタグは使用禁止（EPUBリーダーで非対応）
- **コード例**: コードブロックには必ず言語指定を付与
- **図・ダイアグラム**: ASCIIアートではなくMermaid記法（```mermaid）で記述。ビルド時にSVGに自動変換される
- **技術用語**: 初出時は英語併記（例: エージェントループ（Agent Loop））
```

#### .gitignore

```
dist/
.DS_Store
*.swp
*.swo
*~
```

### 5. Git初期化とコミット

```bash
git init
git add -A
git commit -m "✨ プロジェクト初期化: ビルドパイプライン構築"
```

### 6. 完了メッセージ

プロジェクトの初期化が完了したことを報告し、次のステップ（`/book-writing plan` で目次・構成の企画）を案内する。
