# テンプレートスクリプトの外部化設計

## Context

`references/init.md` に `build.ts`（~170行）、`generate-cover.ts`（~290行）、`epub.css`（~120行）のテンプレートがMarkdownコードブロックとして埋め込まれている。initフェーズ実行のたびにClaude がこれらを読み込んでプロジェクトに書き出しており、トークン効率が悪い。

スクリプトはスキルディレクトリから直接実行可能にし、コピーを廃止する。`epub.css` のみプロジェクトごとのテーマカラーが異なるためコピーが必要。

## 構造変更

```
skills/book-writing/
├── SKILL.md
├── references/
│   ├── init.md          ← ~820行 → ~300行に軽量化
│   ├── plan.md          ← sourceFiles管理手順を削除
│   ├── write.md         ← 変更なし
│   ├── cover.md         ← 表紙生成コマンドを更新
│   └── review.md        ← ビルドコマンドを更新
├── scripts/
│   ├── build.ts         ← プロジェクトから直接実行（コピー不要）
│   └── generate-cover.ts
└── templates/
    └── epub.css         ← プロジェクトにコピー（テーマカラー置換あり）
```

## scripts/build.ts の変更

- `ROOT` を `new URL("..", import.meta.url).pathname` → `Deno.cwd()` に変更
- `sourceFiles` のハードコード配列を廃止 → `src/` ディレクトリを自動スキャンし、ファイル名順にソート
- `METADATA`, `CSS` 等のパスも `Deno.cwd()` 基準に

## scripts/generate-cover.ts の変更

- `ROOT` を同様に `Deno.cwd()` に変更

## templates/epub.css

- 現在の `init.md` 内テンプレートをそのまま独立ファイル化
- テーマカラー部分はプレースホルダー（`#5B4FCF`）のまま保持
- init フェーズで Claude が Read → テーマカラー置換 → プロジェクトに Write

## references/init.md の変更

- `build.ts` テンプレート（~170行）を削除
- `generate-cover.ts` テンプレート（~290行）を削除
- `epub.css` テンプレート（~120行）を削除
- 代わりに以下を記載:
  - `templates/epub.css` を Read し、テーマカラーを置換してプロジェクトに Write する手順
  - ビルドコマンドとしてスキルディレクトリの `scripts/build.ts` を直接実行する説明
  - CLAUDE.md テンプレート内のビルドコマンドもスキルスクリプト直接実行に更新

## references/plan.md の変更

- `sourceFiles` 配列を更新する手順を削除（自動スキャンになるため）

## SKILL.md, cover.md, review.md の変更

- ビルド/表紙生成コマンドをスキルディレクトリ内スクリプトへの参照に更新

## 検証

- 既存の bookshelf プロジェクトで `scripts/build.ts` を直接実行し、EPUBが正常に生成されることを確認
- `src/` 自動スキャンが既存のファイル命名規則と互換であることを確認
- init フェーズで新規プロジェクトを初期化し、スクリプトのコピーなしでビルドが通ることを確認
