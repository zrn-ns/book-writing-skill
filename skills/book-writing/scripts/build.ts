#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write

/**
 * 技術書 EPUB ビルドスクリプト
 *
 * 使い方:
 *   cd <プロジェクトルート>
 *   deno run --allow-run --allow-read --allow-write <このスクリプトのパス>
 *
 * カレントディレクトリをプロジェクトルートとして扱い、
 * src/ 配下のMarkdownファイルを自動検出してPandocでEPUBを生成する。
 */

const ROOT = `${Deno.cwd()}/`;
const SRC_DIR = `${ROOT}src`;
const DIST_DIR = `${ROOT}dist`;
const METADATA = `${ROOT}book.yaml`;
const CSS = `${ROOT}epub.css`;

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

/** src/ 配下の .md ファイルをファイル名順に自動検出する */
async function scanSourceFiles(): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(SRC_DIR)) {
    if (entry.isFile && entry.name.endsWith(".md")) {
      files.push(entry.name);
    }
  }
  return files.sort().map((name) => `${SRC_DIR}/${name}`);
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

  // src/ からMarkdownファイルを自動検出
  const existingFiles = await scanSourceFiles();

  if (existingFiles.length === 0) {
    console.error(
      "❌ ソースファイルが1つも見つかりません。src/ にMarkdownファイルを配置してください。",
    );
    Deno.exit(1);
  }

  console.log(`📄 ${existingFiles.length} ファイルをビルドに含めます\n`);

  // Pandocコマンドの構築
  const coverPath = `${ROOT}assets/cover.jpg`;
  const hasCover = await fileExists(coverPath);

  const args = [
    "pandoc",
    "--metadata-file",
    METADATA,
    "--css",
    CSS,
    "--epub-embed-font",
    CSS,
    "--toc",
    "--toc-depth=3",
    ...(hasCover ? ["--epub-cover-image", coverPath] : []),
    "-o",
    OUTPUT,
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
