#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-run --allow-env

/**
 * 表紙画像生成スクリプト
 *
 * 使い方:
 *   cd <プロジェクトルート>
 *   deno run --env-file=.env --allow-net --allow-read --allow-write --allow-run --allow-env <このスクリプトのパス>
 *
 * カレントディレクトリをプロジェクトルートとして扱い、
 * 画像生成APIでイラストを生成し、ImageMagickでO'Reilly風レイアウトに合成する。
 * API キーは --env-file フラグまたは環境変数で渡す。
 */

import { parse } from "jsr:@std/yaml@1";

const ROOT = `${Deno.cwd()}/`;
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
