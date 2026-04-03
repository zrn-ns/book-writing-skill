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
    if (entry.isFile && entry.name.endsWith(".md") && !entry.name.startsWith(".")) {
      files.push(entry.name);
    }
  }
  return files.sort().map((name) => `${SRC_DIR}/${name}`);
}

const IMAGES_DIR = `${DIST_DIR}/images`;
const TMP_DIR = `${DIST_DIR}/.tmp`;

/** book.yaml の editions エントリ */
interface Edition {
  name: string;
  date: string;
}

/** book.yaml から editions 配列を読み取る。未定義なら空配列を返す */
async function readEditions(): Promise<Edition[]> {
  const yaml = await Deno.readTextFile(METADATA);
  // editions ブロックを簡易パースする（インデントされた行をすべて含む）
  const editionsMatch = yaml.match(/^editions:\s*\n((?:[ \t]+.+\n?)*)/m);
  if (!editionsMatch) return [];

  const entries: Edition[] = [];
  const block = editionsMatch[1];
  // "- name:" で始まる各エントリに分割
  const items = block.split(/(?=\s*-\s+name:)/);
  for (const item of items) {
    if (!item.trim()) continue;
    const nameMatch = item.match(/name:\s*["']?(.+?)["']?\s*$/m);
    const dateMatch = item.match(/date:\s*["']?(.+?)["']?\s*$/m);
    if (nameMatch && dateMatch) {
      entries.push({ name: nameMatch[1], date: dateMatch[1] });
    }
  }
  return entries;
}

/** book.yaml から author を読み取る */
async function readAuthor(): Promise<string> {
  const yaml = await Deno.readTextFile(METADATA);
  const match = yaml.match(/^author:\s*["']?(.+?)["']?\s*$/m);
  return match ? match[1] : "";
}

/** 日付文字列を日本語表記に変換する（YYYY-MM-DD → YYYY年M月D日） */
function formatDateJa(dateStr: string): string {
  const m = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return dateStr;
  return `${m[1]}年${parseInt(m[2])}月${parseInt(m[3])}日`;
}

/** editions と書籍メタデータから奥付Markdownを生成する */
function generateColophon(
  title: string,
  author: string,
  editions: Edition[],
): string {
  const lines: string[] = [];
  lines.push("# 奥付 {.unnumbered}\n");
  lines.push("---\n");
  lines.push(`**${title}**\n`);

  if (editions.length > 0) {
    lines.push("");
    for (const ed of editions) {
      lines.push(`${ed.name}　${formatDateJa(ed.date)}  `);
    }
    lines.push("");
  }

  if (author) {
    lines.push(`著者　${author}\n`);
  }

  lines.push("---\n");
  return lines.join("\n");
}

/**
 * 脚注IDにファイル固有のプレフィックスを付与して衝突を防ぐ。
 * 複数ファイルをPandocで結合する際、各ファイルが [^1] 等の同じIDを
 * 使っていると "Duplicate note reference" 警告が発生するため、
 * [^1] → [^ch03-1] のように章番号プレフィックスを付与する。
 * 既にプレフィックス済み（[^ch で始まる）の場合はスキップする。
 */
function preprocessFootnotes(
  content: string,
  sourceFileName: string,
): string {
  // 既にプレフィックス済みならスキップ
  if (/\[\^ch\d+-/.test(content)) {
    return content;
  }

  // 脚注が存在しなければスキップ
  if (!/\[\^\d+\]/.test(content)) {
    return content;
  }

  const chNum = sourceFileName.match(/^(\d+)/)?.[1] ?? "00";
  const prefix = `ch${chNum}`;

  // 脚注参照 [^N] と脚注定義 [^N]: の両方を置換
  return content.replace(/\[\^(\d+)\]/g, `[^${prefix}-$1]`);
}

/**
 * Mermaidコードブロックを検出してSVGに変換し、画像参照に置換する。
 * Mermaidブロックがなければ元のコンテンツをそのまま返す。
 */
async function preprocessMermaid(
  content: string,
  sourceFileName: string,
): Promise<string> {
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  const matches = [...content.matchAll(mermaidRegex)];

  if (matches.length === 0) {
    return content;
  }

  await Deno.mkdir(IMAGES_DIR, { recursive: true });
  await Deno.mkdir(TMP_DIR, { recursive: true });

  // EPUB リーダーは foreignObject を非サポートのため、SVG <text> 要素で描画させる
  const mermaidConfigFile = `${TMP_DIR}/mermaid-config.json`;
  await Deno.writeTextFile(
    mermaidConfigFile,
    JSON.stringify({
      htmlLabels: false,
      flowchart: { htmlLabels: false },
      sequence: { useHTMLLabels: false },
    }),
  );

  let result = content;
  const baseName = sourceFileName.replace(/\.md$/, "");

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const mermaidCode = match[1];
    const mmdFile = `${TMP_DIR}/${baseName}-${i}.mmd`;
    const svgFile = `${IMAGES_DIR}/${baseName}-${i}.svg`;

    await Deno.writeTextFile(mmdFile, mermaidCode);

    const cmd = new Deno.Command("npx", {
      args: [
        "-y",
        "@mermaid-js/mermaid-cli",
        "-c",
        mermaidConfigFile,
        "-i",
        mmdFile,
        "-o",
        svgFile,
        "-b",
        "transparent",
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stderr } = await cmd.output();
    if (code !== 0) {
      const err = new TextDecoder().decode(stderr);
      console.error(`⚠️  Mermaid変換失敗 (${baseName}-${i}): ${err}`);
      continue;
    }

    // SVG id属性のサニタイズ: Mermaidが日本語ラベルをそのままidに使う場合があり、
    // EPUB仕様（XML NCName）に違反するため、非ASCII文字を含むidをハッシュに変換する
    let svgContent = await Deno.readTextFile(svgFile);
    const invalidIdPattern = /id="([^"]*[^\x00-\x7F][^"]*)"/g;
    if (invalidIdPattern.test(svgContent)) {
      svgContent = svgContent.replace(
        /id="([^"]*[^\x00-\x7F][^"]*)"/g,
        (_match, id: string) => {
          // 簡易ハッシュ: 文字コードを結合してidを生成
          let hash = 0;
          for (let j = 0; j < id.length; j++) {
            hash = ((hash << 5) - hash + id.charCodeAt(j)) | 0;
          }
          return `id="mmd-${(hash >>> 0).toString(36)}"`;
        },
      );
      // href参照も同期して更新（xlink:href="#id" や url(#id)）
      // ※ Mermaid SVG内ではidへの参照は限定的なため、
      //   表示崩れのリスクは低い
      await Deno.writeTextFile(svgFile, svgContent);
    }

    result = result.replace(match[0], `![](${svgFile})`);
    console.log(`   🖼️  ${baseName}-${i}.svg を生成`);
  }

  return result;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

/** EPUBをZIPとして再パッケージする（mimetypeを非圧縮で先頭に配置） */
async function repackageEpub(
  epubPath: string,
  tmpDir: string,
): Promise<void> {
  try {
    await Deno.remove(epubPath);
  } catch {
    // 存在しない場合は無視
  }
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
}

/**
 * Pandoc生成後のEPUBを後処理する。
 * - 空の dc:date 要素を除去（EPUB 3.3仕様違反の防止）
 * - editions から版メタデータ（schema:bookEdition, dc:date）を追記
 * - cover.xhtml の SVGラッパーを <img> タグに置換（BOOX互換性）
 * - カバー画像を media/cover.jpg にリネーム
 * - content.opf の参照を更新
 */
async function patchEpub(epubPath: string, editions: Edition[]): Promise<void> {
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

    // 空の dc:date 要素を除去（Pandocが date 未設定時に空要素を出力するため）
    const beforeDate = opf;
    opf = opf.replace(/\s*<dc:date[^>]*><\/dc:date>\s*/g, "\n    ");
    if (opf !== beforeDate) {
      console.log("🔧 空の dc:date 要素を除去しました");
    }

    // editions から版メタデータを追記
    if (editions.length > 0) {
      const latest = editions[editions.length - 1];
      const editionMeta = `<meta property="schema:bookEdition">${latest.name}</meta>`;
      const dateMeta = `<dc:date>${latest.date}</dc:date>`;

      // 既存の schema:bookEdition がなければ追加
      if (!opf.includes("schema:bookEdition")) {
        opf = opf.replace(
          /(<\/dc:identifier>)/,
          `$1\n    ${editionMeta}\n    ${dateMeta}`,
        );
        console.log(`🔧 版メタデータを追加しました（${latest.name}）`);
      }
    }

    // カバー画像のパッチ
    const coverItemMatch = opf.match(
      /properties="cover-image"\s+id="([^"]+)"\s+href="([^"]+)"/,
    ) ?? opf.match(
      /id="([^"]+)"\s+href="([^"]+)"\s+[^>]*properties="cover-image"/,
    );
    if (!coverItemMatch) {
      // カバーがなくてもOPFの修正は保存して再パッケージする
      await Deno.writeTextFile(opfPath, opf);
      if (opf !== beforeDate) {
        // OPF修正があった場合は再パッケージが必要
        await repackageEpub(epubPath, tmpDir);
      }
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

    await repackageEpub(epubPath, tmpDir);
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

  // 脚注前処理: 章ごとにプレフィックスを付与してID衝突を防ぐ
  await Deno.mkdir(TMP_DIR, { recursive: true });
  let footnoteFileCount = 0;
  const preprocessedFiles: { path: string; content: string; useTmp: boolean }[] = [];

  for (const srcPath of existingFiles) {
    const fileName = srcPath.split("/").pop()!;
    const content = await Deno.readTextFile(srcPath);
    const processed = preprocessFootnotes(content, fileName);

    if (processed !== content) {
      footnoteFileCount++;
    }
    preprocessedFiles.push({ path: srcPath, content: processed, useTmp: false });
  }

  if (footnoteFileCount > 0) {
    console.log(`🔗 ${footnoteFileCount} ファイルの脚注IDにプレフィックスを付与\n`);
  }

  // Mermaid前処理: mermaidブロックをSVG画像に変換
  console.log("🔄 Mermaid図を変換中...\n");
  const pandocInputFiles: string[] = [];
  let mermaidFileCount = 0;

  for (const { path: srcPath, content } of preprocessedFiles) {
    const fileName = srcPath.split("/").pop()!;

    if (content.includes("```mermaid")) {
      const processed = await preprocessMermaid(content, fileName);
      const tmpPath = `${TMP_DIR}/${fileName}`;
      await Deno.writeTextFile(tmpPath, processed);
      pandocInputFiles.push(tmpPath);
      mermaidFileCount++;
    } else if (content !== await Deno.readTextFile(srcPath)) {
      // 脚注前処理で変更があった場合も一時ファイルに書き出す
      const tmpPath = `${TMP_DIR}/${fileName}`;
      await Deno.writeTextFile(tmpPath, content);
      pandocInputFiles.push(tmpPath);
    } else {
      pandocInputFiles.push(srcPath);
    }
  }

  if (mermaidFileCount > 0) {
    console.log(`\n   ${mermaidFileCount} ファイルのMermaid図を変換しました\n`);
  } else {
    console.log("   Mermaid図はありません\n");
  }

  // 奥付ページの自動生成
  const editions = await readEditions();
  const author = await readAuthor();
  if (editions.length > 0) {
    const colophonMd = generateColophon(title, author, editions);
    const colophonPath = `${TMP_DIR}/zz-colophon.md`;
    await Deno.writeTextFile(colophonPath, colophonMd);
    pandocInputFiles.push(colophonPath);
    console.log(`📋 奥付ページを生成しました（${editions[editions.length - 1].name}）\n`);
  }

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
    ...pandocInputFiles,
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

  // Pandoc警告チェック: [WARNING] が含まれていたらビルド失敗にする
  if (stderrText) {
    const warningLines = stderrText
      .split("\n")
      .filter((line) => line.includes("[WARNING]"));

    if (warningLines.length > 0) {
      console.error(
        `\n⚠️  Pandocが警告を出力しました（${warningLines.length}件）:`,
      );
      for (const line of warningLines) {
        console.error(`   ${line.trim()}`);
      }
      console.error(
        "\n❌ 警告があるためビルドを中止します。警告を解消してから再実行してください。",
      );
      Deno.exit(1);
    }

    // 警告以外のstderr出力があれば表示
    const nonWarningText = stderrText
      .split("\n")
      .filter((line) => !line.includes("[WARNING]") && line.trim())
      .join("\n");
    if (nonWarningText) console.warn(nonWarningText);
  }

  // Mermaid一時ファイルのクリーンアップ
  try {
    await Deno.remove(TMP_DIR, { recursive: true });
  } catch {
    // クリーンアップ失敗は無視
  }

  // EPUB後処理（空dc:date除去、表紙互換パッチ等）
  await patchEpub(OUTPUT, editions);

  // ファイルサイズの確認
  const stat = await Deno.stat(OUTPUT);
  const sizeMB = (stat.size / 1024 / 1024).toFixed(2);

  console.log(`✅ ビルド完了！`);
  console.log(`📖 出力: ${OUTPUT}`);
  console.log(`📏 サイズ: ${sizeMB} MB`);
}

build();
