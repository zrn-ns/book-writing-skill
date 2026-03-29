---
name: book-writing
description: 技術書の執筆を支援する。プロジェクト初期化、目次・構成の企画、章の執筆、表紙生成、レビュー＆EPUB ビルドの全工程をカバー。「本を書きたい」「技術書」「執筆」「章を書いて」「表紙を生成して」「レビューして」「ビルドして」等で発動。
---

# 技術書執筆スキル

Markdown で技術書を執筆し、Pandoc で EPUB に変換するワークフローを支援するスキル。

## フェーズ判断

ユーザーの意図とプロジェクトの状態からフェーズを判断し、対応する references ファイルを Read ツールで読み込んで従う。

引数が明示されている場合（例: `/book-writing init`）はそのフェーズを直接実行する。引数がない場合は以下のロジックで判断する:

```
1. book.yaml が存在しない → init（references/init.md を読み込み）
2. src/ に本文のないMarkdownしかない → plan（references/plan.md を読み込み）
3. 「第N章を書いて」等の執筆指示 → write（references/write.md を読み込み）
4. 「表紙を生成して」「カバーを作って」「表紙を変えたい」「表紙を再生成」 → cover（references/cover.md を読み込み）
5. 「レビューして」「ビルドして」 → review（references/review.md を読み込み）
```

### 包括的な執筆指示への対応

「本を書いて」「全部書いて」のように、特定のフェーズではなく書籍全体の執筆を依頼された場合は、以下のフェーズを順番にすべて実行する:

```
init → plan → write（全章） → cover → review
```

各フェーズ完了後、次のフェーズの references ファイルを読み込んで継続すること。途中のフェーズをスキップしてはならない。

**重要**: 各フェーズの詳細手順は references/ 配下のファイルに記載されている。フェーズを判断したら必ず対応する references ファイルを Read ツールで読み込み、その指示に従うこと。

references ファイルのパスは、このスキルファイルからの相対パスで以下の通り:
- `references/init.md`
- `references/plan.md`
- `references/write.md`
- `references/cover.md`
- `references/review.md`

## 共通ルール

### EPUB互換 Markdown 記法

以下のルールはすべてのフェーズで適用する:

- **HTML禁止**: `<details>`, `<summary>`, `<iframe>`, `<object>` 等のHTMLタグは使用しない（EPUBリーダーで非対応）
- **使用可能な記法のみ**: 見出し、リスト、テーブル、コードブロック（言語指定付き）、Blockquote、水平線（`---`）、強調（`**太字**`）、インラインコード
- **コードブロック**: 必ず言語を指定する（```python, ```typescript 等）
- **図・ダイアグラム**: ASCIIアートではなく Mermaid 記法（```mermaid コードブロック）で記述する。ビルド時に自動的にSVG画像に変換される。EPUBリーダーの画面幅に依存しないレイアウトを実現するため
- **技術用語**: 初出時は英語併記する（例: エージェントループ（Agent Loop））
- **見出し体系**: H1 = 章タイトル、H2 = セクション、H3 = サブセクション

### ファイル命名規則

- ソースファイル: `src/NN-slug.md`（00始まり、2桁のゼロ埋め番号 + ハイフン + 英語スラッグ）
- 例: `src/00-preface.md`, `src/01-introduction.md`, `src/appendix-a-glossary.md`

### コミット規則

- 意味のある単位でこまめにコミットする
- コミットメッセージは日本語で記述
- gitmoji を使用: ✨（新規ファイル追加）、👍（挙動変更）、🎨（リファクタ）、🐛（バグ修正）、✏️（軽微な修正）

### 表紙画像

- **生成方式**: 外部画像生成API（OpenAI gpt-image-1 / Stability AI）でエッチング風イラストを生成し、ImageMagick で O'Reilly 風レイアウトに合成
- **ファイル構成**: `assets/cover-illustration.png`（AI生成イラスト）、`assets/cover.jpg`（最終表紙）
- **モチーフ**: 書籍テーマに応じたオブジェクト（動物モチーフは O'Reilly との混同を避けるため原則不使用）
- **生成コマンド**: プロジェクトルートで `deno run --allow-net --allow-read --allow-write --allow-run --allow-env <このスキルの scripts/generate-cover.ts の絶対パス>` を実行（カレントディレクトリの.envを自動読み込み）
- **設定**: `book.yaml` の `cover` セクションで provider, subject, color, custom_prompt を指定

### ビルドパイプライン

- **ツールチェーン**: Pandoc（EPUB変換）+ Deno（ビルドスクリプト）+ ImageMagick（表紙合成）
- **ビルドコマンド**: プロジェクトルートで `deno run --allow-run --allow-read --allow-write <このスキルの scripts/build.ts の絶対パス>` を実行
- **出力先**: `dist/` ディレクトリ
- **表紙統合**: `assets/cover.jpg` が存在すれば自動的に `--epub-cover-image` でEPUBに組み込む
