# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

「Superpowers完全ガイド」— AIコーディングエージェントの振る舞いを変えるスキルフレームワーク
Superpowersの設計思想から各スキルの詳細な活用法まで、実践的なノウハウを体系的に解説する技術書。

## ビルド

```bash
# EPUB生成（Deno + Pandoc が必要）
deno run --allow-run --allow-read --allow-write scripts/build.ts
```

出力: `dist/superpowers-skill-guide.epub`

前提ツール: `brew install pandoc deno node imagemagick`

## アーキテクチャ

- `src/` — 原稿Markdownファイル（`NN-chapter-name.md` 形式）。ビルド順序は `scripts/build.ts` の `sourceFiles` 配列で制御
- `book.yaml` — Pandocメタデータ（タイトル、言語、目次設定等）
- `epub.css` — EPUB用CSS（日本語フォント、見出し、テーブル、コードブロック）
- `assets/` — 表紙画像等のアセット。`cover.jpg`（最終表紙）、`cover-illustration.png`（AI生成イラスト）
- `scripts/build.ts` — Denoビルドスクリプト。存在するファイルのみビルドに含め、欠落ファイルはスキップ
- `scripts/generate-cover.ts` — 表紙生成スクリプト。画像生成APIとImageMagickで表紙を合成

新しい章を追加する場合は、`src/` にMarkdownファイルを作成し、`scripts/build.ts` の `sourceFiles` 配列に追加する。

## コンテンツ規約

- **EPUB互換のMarkdownのみ使用**: `<details>`, `<summary>` 等のHTMLタグは使用禁止（EPUBリーダーで非対応）
- **コード例**: コードブロックには必ず言語指定を付与
- **図・ダイアグラム**: ASCIIアートではなくMermaid記法（```mermaid）で記述。ビルド時にSVGに自動変換される
- **技術用語**: 初出時は英語併記（例: エージェントループ（Agent Loop））
