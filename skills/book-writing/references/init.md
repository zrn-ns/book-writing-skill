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
├── scripts/
│   ├── build.ts          # Denoビルドスクリプト
│   └── generate-cover.ts # 表紙生成スクリプト
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
cover:
  provider: openai             # openai | stability | none
  subject: ""                  # イラストのモチーフ（空なら概要から提案）
  color: "#5B4FCF"             # テーマカラー（帯・ボーダーに使用）
  custom_prompt: ""            # 完全カスタムプロンプト（空なら自動構築）
...
```

#### scripts/build.ts

Deno製のPandocラッパースクリプト。以下の機能を持つ:
- `src/` 配下のMarkdownファイルを順番に結合
- 存在しないファイルはスキップ（警告を表示）
- `dist/` にEPUBを出力
- ファイルサイズを報告

**テンプレート**（タイトル等をヒアリング結果で置換）:

```typescript
#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write

/**
 * <タイトル> ビルドスクリプト
 *
 * 使い方:
 *   deno run --allow-run --allow-read --allow-write scripts/build.ts
 *
 * Markdownファイルを結合してPandocでEPUBを生成する。
 */

const ROOT = new URL("..", import.meta.url).pathname;
const SRC_DIR = `${ROOT}src`;
const DIST_DIR = `${ROOT}dist`;
const METADATA = `${ROOT}book.yaml`;
const CSS = `${ROOT}epub.css`;

// src/配下のMarkdownファイルを順番に列挙
// plan フェーズで章を追加する際にここを更新する
const sourceFiles: string[] = [];

/** book.yaml の title からファイルシステム安全なファイル名を生成する */
function titleToSlug(title: string): string {
  return title
    .replace(/[\/\\:*?"<>|–—]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

async function readTitle(): Promise<string> {
  const yaml = await Deno.readTextFile(METADATA);
  const match = yaml.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  if (!match) {
    console.error("❌ book.yaml に title が見つかりません");
    Deno.exit(1);
  }
  return match[1];
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pandoc生成後のEPUBを後処理し、表紙の互換性を改善する。
 * - cover.xhtml の SVGラッパーを <img> タグに置換
 * - カバー画像を media/cover.jpg にリネーム
 * - content.opf の参照を更新
 */
async function patchEpubCover(epubPath: string): Promise<void> {
  const tmpDir = `${epubPath}.tmp`;
  try {
    await Deno.mkdir(tmpDir, { recursive: true });
    const unzip = new Deno.Command("unzip", {
      args: ["-o", "-q", epubPath, "-d", tmpDir],
      stdout: "piped",
      stderr: "piped",
    });
    const unzipResult = await unzip.output();
    if (unzipResult.code !== 0) {
      console.warn("⚠️  EPUB展開に失敗、表紙パッチをスキップ");
      return;
    }

    const opfPath = `${tmpDir}/EPUB/content.opf`;
    let opf = await Deno.readTextFile(opfPath);

    const coverItemMatch = opf.match(
      /properties="cover-image"\s+id="([^"]+)"\s+href="([^"]+)"/,
    ) ?? opf.match(
      /id="([^"]+)"\s+href="([^"]+)"\s+[^>]*properties="cover-image"/,
    );
    if (!coverItemMatch) {
      console.log("   表紙画像がOPFに見つかりません、パッチをスキップ");
      return;
    }

    const oldId = coverItemMatch[1];
    const oldHref = coverItemMatch[2];
    const newHref = "media/cover.jpg";
    const newId = "cover_jpg";

    if (oldHref !== newHref) {
      await Deno.rename(
        `${tmpDir}/EPUB/${oldHref}`,
        `${tmpDir}/EPUB/${newHref}`,
      );
    }

    opf = opf.replace(new RegExp(`id="${oldId}"`), `id="${newId}"`);
    opf = opf.replace(
      new RegExp(`href="${oldHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`),
      `href="${newHref}"`,
    );
    opf = opf.replace(new RegExp(`content="${oldId}"`), `content="${newId}"`);
    opf = opf.replace(
      /(<item\s+id="cover_xhtml"[^>]*)\s+properties="svg"/,
      "$1",
    );
    await Deno.writeTextFile(opfPath, opf);

    const coverXhtmlPath = `${tmpDir}/EPUB/text/cover.xhtml`;
    try {
      let coverXhtml = await Deno.readTextFile(coverXhtmlPath);
      coverXhtml = coverXhtml.replace(
        /<svg[^>]*>[\s\S]*?<\/svg>/,
        `<img src="../${newHref}" alt="Cover" style="width:100%;height:100%" />`,
      );
      await Deno.writeTextFile(coverXhtmlPath, coverXhtml);
    } catch {
      // cover.xhtml が存在しない場合は無視
    }

    await Deno.remove(epubPath);
    const zipMimetype = new Deno.Command("zip", {
      args: ["-0", "-X", epubPath, "mimetype"],
      cwd: tmpDir,
      stdout: "piped",
      stderr: "piped",
    });
    await zipMimetype.output();

    const zipRest = new Deno.Command("zip", {
      args: ["-r", "-X", epubPath, ".", "-x", "mimetype"],
      cwd: tmpDir,
      stdout: "piped",
      stderr: "piped",
    });
    await zipRest.output();

    console.log("🔧 表紙の互換パッチを適用しました");
  } finally {
    try {
      await Deno.remove(tmpDir, { recursive: true });
    } catch {
      // クリーンアップ失敗は無視
    }
  }
}

async function build() {
  const title = await readTitle();
  const OUTPUT = `${DIST_DIR}/${titleToSlug(title)}.epub`;

  console.log(`📚 ${title} をビルドします...\n`);

  // distディレクトリの作成
  await Deno.mkdir(DIST_DIR, { recursive: true });

  // 存在するソースファイルを確認
  const existingFiles: string[] = [];
  const missingFiles: string[] = [];

  for (const file of sourceFiles) {
    const path = `${SRC_DIR}/${file}`;
    if (await fileExists(path)) {
      existingFiles.push(path);
    } else {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    console.log(`⚠️  以下のファイルが未作成です（スキップ）:`);
    for (const f of missingFiles) {
      console.log(`   - src/${f}`);
    }
    console.log();
  }

  if (existingFiles.length === 0) {
    console.error("❌ ソースファイルが1つも見つかりません。src/ にMarkdownファイルを配置してください。");
    Deno.exit(1);
  }

  console.log(`📄 ${existingFiles.length}/${sourceFiles.length} ファイルをビルドに含めます\n`);

  // Pandocコマンドの構築
  const coverPath = `${ROOT}assets/cover.jpg`;
  const hasCover = await fileExists(coverPath);

  const args = [
    "pandoc",
    "--metadata-file", METADATA,
    "--css", CSS,
    "--epub-embed-font", CSS,
    "--toc",
    "--toc-depth=3",
    ...(hasCover ? ["--epub-cover-image", coverPath] : []),
    "-o", OUTPUT,
    ...existingFiles,
  ];

  if (hasCover) {
    console.log("🖼️  表紙画像を検出しました\n");
  }

  console.log(`🔨 Pandocを実行中...\n`);

  const command = new Deno.Command(args[0], {
    args: args.slice(1),
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();

  if (code !== 0) {
    console.error("❌ ビルドに失敗しました:");
    console.error(new TextDecoder().decode(stderr));
    Deno.exit(1);
  }

  const stdoutText = new TextDecoder().decode(stdout);
  if (stdoutText) console.log(stdoutText);

  const stderrText = new TextDecoder().decode(stderr);
  if (stderrText) console.warn(stderrText);

  // 表紙の互換パッチ
  if (hasCover) {
    await patchEpubCover(OUTPUT);
  }

  // ファイルサイズの確認
  const stat = await Deno.stat(OUTPUT);
  const sizeMB = (stat.size / 1024 / 1024).toFixed(2);

  console.log(`✅ ビルド完了！`);
  console.log(`📖 出力: ${OUTPUT}`);
  console.log(`📏 サイズ: ${sizeMB} MB`);
}

build();
```

#### scripts/generate-cover.ts

表紙画像を生成するスクリプト。画像生成APIでエッチング風イラストを生成し、ImageMagickでレイアウトを合成する:

```typescript
#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-run --allow-env

/**
 * 表紙画像生成スクリプト
 *
 * 使い方:
 *   deno run --env-file=<プロジェクトルート>/.env --allow-net --allow-read --allow-write --allow-run --allow-env scripts/generate-cover.ts
 *
 * 画像生成APIでイラストを生成し、ImageMagickでO'Reilly風レイアウトに合成する。
 * API キーは --env-file フラグまたは環境変数で渡す。
 */

import { parse } from "jsr:@std/yaml@1";

const ROOT = new URL("..", import.meta.url).pathname;
const METADATA = `${ROOT}book.yaml`;
const ASSETS_DIR = `${ROOT}assets`;
const ILLUSTRATION_PATH = `${ASSETS_DIR}/cover-illustration.png`;
const COVER_PATH = `${ASSETS_DIR}/cover.jpg`;

// EPUB推奨サイズ (2:3 比率)
const WIDTH = 1600;
const HEIGHT = 2400;

interface BookMetadata {
  title: string;
  subtitle?: string;
  author: string;
  description?: string;
  cover?: {
    provider?: string;
    subject?: string;
    color?: string;
    custom_prompt?: string;
  };
}

async function loadMetadata(): Promise<BookMetadata> {
  const text = await Deno.readTextFile(METADATA);
  return parse(text) as BookMetadata;
}

function buildPrompt(meta: BookMetadata): string {
  const cover = meta.cover ?? {};

  if (cover.custom_prompt) {
    return cover.custom_prompt;
  }

  const subject = cover.subject || "a mechanical compass with intricate gears";

  return [
    `Detailed black and white etching illustration of ${subject}.`,
    "Style: vintage engraving, fine crosshatching, scientific illustration.",
    "White background, no text, no border, no frame.",
    "IMPORTANT: The illustration must be small and centered, occupying only about 60% of the image area. Leave at least 20% white space margin on every side. The subject must NOT touch or extend beyond any edge of the image.",
    "High contrast, intricate line work, copper plate print style.",
  ].join("\n");
}

async function generateWithOpenAI(prompt: string): Promise<Uint8Array> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY が設定されていません");
  }

  console.log("🎨 OpenAI gpt-image-1 でイラストを生成中...\n");

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "high",
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI API エラー: ${res.status} ${error}`);
  }

  const data = await res.json();
  const item = data.data[0];

  // gpt-image-1 は b64_json または url で返す
  if (item.b64_json) {
    return Uint8Array.from(atob(item.b64_json), (c) => c.charCodeAt(0));
  } else if (item.url) {
    const imgRes = await fetch(item.url);
    return new Uint8Array(await imgRes.arrayBuffer());
  } else {
    throw new Error("APIレスポンスに画像データが含まれていません");
  }
}

async function generateWithStability(prompt: string): Promise<Uint8Array> {
  const apiKey = Deno.env.get("STABILITY_API_KEY");
  if (!apiKey) {
    throw new Error("STABILITY_API_KEY が設定されていません");
  }

  console.log("🎨 Stability AI でイラストを生成中...\n");

  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("negative_prompt", "color, text, letters, words, border, frame, signature");
  formData.append("output_format", "png");
  formData.append("aspect_ratio", "1:1");

  const res = await fetch(
    "https://api.stability.ai/v2beta/stable-image/generate/core",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "image/*",
      },
      body: formData,
    },
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Stability API エラー: ${res.status} ${error}`);
  }

  return new Uint8Array(await res.arrayBuffer());
}

async function detectFont(): Promise<{ bold: string; regular: string }> {
  // フォントファイルパスの候補（優先順）
  const candidates = [
    // macOS ヒラギノ角ゴシック
    {
      bold: "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
      regular: "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
    },
    // Linux Noto Sans CJK
    {
      bold: "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
      regular: "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    },
    // macOS Arial Unicode（フォールバック）
    {
      bold: "/Library/Fonts/Arial Unicode.ttf",
      regular: "/Library/Fonts/Arial Unicode.ttf",
    },
  ];

  for (const fonts of candidates) {
    try {
      await Deno.stat(fonts.bold);
      await Deno.stat(fonts.regular);
      return fonts;
    } catch {
      continue;
    }
  }

  console.warn("⚠️  日本語フォントが見つかりません。ImageMagick のデフォルトフォントを使用します。");
  return { bold: "sans-serif", regular: "sans-serif" };
}

async function composeCover(meta: BookMetadata): Promise<void> {
  const cover = meta.cover ?? {};
  const color = cover.color || "#5B4FCF";
  const title = meta.title || "Untitled";
  const subtitle = meta.subtitle || "";
  const author = meta.author || "Unknown";
  const fonts = await detectFont();

  console.log("🔨 ImageMagick で表紙レイアウトを合成中...\n");
  console.log(`📝 使用フォント: ${fonts.bold} / ${fonts.regular}\n`);

  // レイアウト定数
  const MARGIN = 60; // テキスト左右マージン
  const TEXT_WIDTH = WIDTH - MARGIN * 2; // テキスト描画幅
  const TOP_BAND = 500; // 上部帯の高さ
  const BOTTOM_BAND = 300; // 下部帯の高さ

  // サブタイトルの有無でタイトルの高さ配分を決定
  const TITLE_HEIGHT = subtitle ? 280 : TOP_BAND - 60;
  const SUBTITLE_HEIGHT = 120;

  // caption: を使ってテキストを帯内に自動フィットさせる
  const args = [
    "magick",
    "-size", `${WIDTH}x${HEIGHT}`, "xc:white",
    "-fill", color, "-draw", `rectangle 0,0 ${WIDTH},${TOP_BAND}`,
    "-fill", color, "-draw", `rectangle 0,${HEIGHT - BOTTOM_BAND} ${WIDTH},${HEIGHT}`,
    "(", ILLUSTRATION_PATH, "-fuzz", "15%", "-transparent", "#F5F5F0", "-resize", "1200x1400", ")",
    "-gravity", "center", "-geometry", "+0+0", "-composite",
    // タイトル（caption: で自動フィット）
    "(", "-background", "none", "-fill", "white", "-font", fonts.bold,
      "-gravity", "center", "-size", `${TEXT_WIDTH}x${TITLE_HEIGHT}`,
      `caption:${title}`,
    ")",
    "-gravity", "North", "-geometry", `+0+${subtitle ? 40 : 30}`, "-composite",
  ];

  if (subtitle) {
    args.push(
      "(", "-background", "none", "-fill", "white", "-font", fonts.regular,
        "-gravity", "center", "-size", `${TEXT_WIDTH}x${SUBTITLE_HEIGHT}`,
        `caption:${subtitle}`,
      ")",
      "-gravity", "North", "-geometry", `+0+${TITLE_HEIGHT + 40}`, "-composite",
    );
  }

  // 著者名（下部帯に自動フィット、高さを120に制限して控えめに）
  args.push(
    "(", "-background", "none", "-fill", "white", "-font", fonts.regular,
      "-gravity", "center", "-size", `${TEXT_WIDTH}x120`,
      `caption:${author}`,
    ")",
    "-gravity", "South", "-geometry", "+0+80", "-composite",
    "-quality", "45",
    COVER_PATH,
  );

  const command = new Deno.Command(args[0], {
    args: args.slice(1),
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stderr } = await command.output();
  if (code !== 0) {
    const errText = new TextDecoder().decode(stderr);
    throw new Error(`ImageMagick エラー: ${errText}`);
  }
}

async function main() {
  console.log("📚 表紙画像を生成します...\n");

  // assetsディレクトリ作成
  await Deno.mkdir(ASSETS_DIR, { recursive: true });

  // メタデータ読み込み
  const meta = await loadMetadata();
  const cover = meta.cover ?? {};
  const provider = cover.provider || "openai";

  if (provider === "none") {
    console.log("ℹ️  表紙生成はスキップされました（provider: none）");
    return;
  }

  // プロンプト構築
  const prompt = buildPrompt(meta);
  console.log(`📝 プロンプト:\n${prompt}\n`);

  // イラスト生成
  let imageData: Uint8Array;
  if (provider === "stability") {
    imageData = await generateWithStability(prompt);
  } else {
    imageData = await generateWithOpenAI(prompt);
  }

  // イラスト保存
  await Deno.writeFile(ILLUSTRATION_PATH, imageData);
  console.log(`✅ イラスト生成完了: ${ILLUSTRATION_PATH}\n`);

  // レイアウト合成
  await composeCover(meta);

  // 結果報告
  const stat = await Deno.stat(COVER_PATH);
  const sizeKB = (stat.size / 1024).toFixed(1);
  console.log(`✅ 表紙生成完了！`);
  console.log(`🖼️  出力: ${COVER_PATH}`);
  console.log(`📏 サイズ: ${WIDTH}x${HEIGHT}px (${sizeKB} KB)`);
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  Deno.exit(1);
});
```

#### epub.css

日本語フォント対応のEPUB用スタイルシート:

```css
/* 技術書 EPUB CSS */

/* 基本設定 */
body {
  font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Noto Sans CJK JP", "Yu Gothic", sans-serif;
  line-height: 1.8;
  font-size: 1em;
  color: #333;
}

/* 見出し */
h1 {
  font-size: 1.6em;
  border-bottom: 3px solid #5B4FCF;
  padding-bottom: 0.3em;
  margin-top: 1.5em;
  margin-bottom: 0.8em;
  color: #2D2560;
}

h2 {
  font-size: 1.3em;
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.2em;
  margin-top: 1.2em;
  margin-bottom: 0.6em;
  color: #3D3580;
}

h3 {
  font-size: 1.15em;
  margin-top: 1em;
  margin-bottom: 0.4em;
  color: #4D4590;
}

h4 {
  font-size: 1.05em;
  margin-top: 0.8em;
  margin-bottom: 0.3em;
}

/* コードブロック */
pre {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.8em;
  overflow-x: auto;
  font-size: 0.85em;
  line-height: 1.5;
}

code {
  font-family: "SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace;
  font-size: 0.9em;
}

p code, li code {
  background-color: #f0f0f0;
  padding: 0.1em 0.3em;
  border-radius: 3px;
  color: #c7254e;
}

/* テーブル */
table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
  font-size: 0.9em;
}

th, td {
  border: 1px solid #ccc;
  padding: 0.5em 0.8em;
  text-align: left;
}

th {
  background-color: #5B4FCF;
  color: white;
  font-weight: bold;
}

tr:nth-child(even) {
  background-color: #f9f9f9;
}

/* 引用ブロック */
blockquote {
  border-left: 4px solid #5B4FCF;
  margin: 1em 0;
  padding: 0.5em 1em;
  background-color: #f8f7ff;
}

/* 強調 */
strong {
  color: #c7254e;
}

/* リスト */
ul, ol {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

li {
  margin: 0.3em 0;
}

/* 水平線（セクション区切り） */
hr {
  border: none;
  border-top: 2px solid #e0e0e0;
  margin: 2em 0;
}
```

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
deno run --allow-run --allow-read --allow-write scripts/build.ts
\```

出力: `dist/<タイトルから自動生成>.epub`

前提ツール: `brew install pandoc deno node imagemagick`（Mermaid図のSVG変換にnpx、表紙合成にImageMagickが必要）

## アーキテクチャ

- `src/` — 原稿Markdownファイル（`NN-chapter-name.md` 形式）。ビルド順序は `scripts/build.ts` の `sourceFiles` 配列で制御
- `book.yaml` — Pandocメタデータ（タイトル、言語、目次設定等）
- `epub.css` — EPUB用CSS（日本語フォント、見出し、テーブル、コードブロック）
- `assets/` — 表紙画像等のアセット。`cover.png`（最終表紙）、`cover-illustration.png`（AI生成イラスト）
- `scripts/build.ts` — Denoビルドスクリプト。存在するファイルのみビルドに含め、欠落ファイルはスキップ
- `scripts/generate-cover.ts` — 表紙生成スクリプト。画像生成APIとImageMagickで表紙を合成

新しい章を追加する場合は、`src/` にMarkdownファイルを作成し、`scripts/build.ts` の `sourceFiles` 配列に追加する。

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
