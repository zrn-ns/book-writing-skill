# 表紙生成フェーズ

書籍の表紙画像を外部画像生成 API で自動生成し、EPUB に組み込む。

## 手順

### 1. 設定確認

`book.yaml` の `cover` セクションを確認する:

```yaml
cover:
  provider: openai             # openai | stability | none
  subject: ""                  # イラストのモチーフ（空なら提案する）
  color: "#5B4FCF"             # テーマカラー（帯・ボーダー）
  custom_prompt: ""            # 完全カスタムプロンプト（空なら自動構築）
```

`cover` セクションが存在しない場合は追加を案内する。

`cover.provider` が `none` の場合は、表紙生成を使用するにはプロバイダの設定が必要であることを案内し、`openai` または `stability` への変更を提案する。

### 2. 前提ツールの確認

```bash
which magick && magick --version | head -1
```

未インストールの場合:
```bash
brew install imagemagick
```

### 3. API キーの確認

`cover.provider` に応じた環境変数が設定されているか確認する:

| provider | 環境変数 |
|----------|---------|
| openai | `OPENAI_API_KEY` |
| stability | `STABILITY_API_KEY` |

未設定の場合は、プロジェクトルートの `.env` ファイルに記載するよう案内する:
```bash
# <プロジェクトルート>/.env
OPENAI_API_KEY=sk-...
```
`.env.example` があればコピーして使用できる: `cp .env.example .env`

スクリプトは以下の順で `.env` を探索し、最初に見つかったものを読み込む:
1. カレントディレクトリの `.env`
2. `~/.config/book-writing/.env`（グローバル設定）

いずれも見つからない場合は環境変数に依存する。初回セットアップ時は `~/.config/book-writing/.env` に API キーを設定するよう案内する。

### 4. モチーフの決定

`cover.subject` が空の場合、書籍のテーマ（`book.yaml` の `title`, `description`）からモチーフを3案提案する。

**提案ルール:**
- **動物モチーフは使用しない**（O'Reilly の表紙スタイルとの混同を避けるため）
- 書籍テーマに関連するオブジェクトを選ぶ
- カテゴリ例:
  - 建築・構造物: 橋、灯台、時計塔、歯車機構
  - 植物・ボタニカル: 花の解剖図、葉脈パターン、樹木の断面
  - 天文・航海: 天球儀、羅針盤、六分儀、星座早見盤
  - 工具・道具: 活版印刷機、製図道具、顕微鏡、計測器
  - 幾何学・数理: 多面体、フラクタル図形、結び目理論の図

提案フォーマット:
```
表紙イラストのモチーフを3案提案します:

1. **天球儀と歯車** — APIの「つなぐ」役割を天体観測装置の精密さで表現
2. **活版印刷機** — コードを「組み立てる」プロセスを活字の組版に重ねる
3. **羅針盤と航海図** — 技術の海を「ナビゲートする」ガイドブックのイメージ

どれがお好みですか？またはご自身のアイデアがあればお聞かせください。
```

ユーザーが選択・決定したら `book.yaml` の `cover.subject` を更新する。

### 5. 表紙の生成

```bash
deno run --allow-net --allow-read --allow-write --allow-run --allow-env <このスキルの scripts/generate-cover.ts の絶対パス>
```

プロジェクトルートで実行すること。`.env` はカレントディレクトリ → `~/.config/book-writing/.env` の順で自動探索される。

スクリプトが以下を実行する:
1. `book.yaml` から設定読み取り
2. イラスト生成プロンプトの構築（後述）
3. 画像生成 API 呼び出し → `assets/cover-illustration.png`
4. ImageMagick でレイアウト合成 → `assets/cover.jpg`

### 6. プロンプト構築ロジック

`cover.custom_prompt` が空の場合、以下のテンプレートから自動構築する:

```
Detailed black and white etching illustration of {cover.subject}.
Style: vintage engraving, fine crosshatching, scientific illustration.
White background, no text, no border, no frame.
IMPORTANT: The illustration must be small and centered, occupying only about 60% of the image area. Leave at least 20% white space margin on every side. The subject must NOT touch or extend beyond any edge of the image.
High contrast, intricate line work, copper plate print style.
```

`cover.custom_prompt` が設定されている場合はそれをそのまま使用する。

### 7. 結果確認

生成完了後に報告する:

```
表紙を生成しました:

- イラスト: assets/cover-illustration.png
- 最終表紙: assets/cover.jpg
- サイズ: 1600x2400px
- モチーフ: {subject}
- 使用プロンプト: {prompt}
```

### 8. 再生成・調整

ユーザーが結果に満足しない場合:

- **モチーフを変えたい** → `cover.subject` を更新してステップ5から再実行
- **プロンプトを微調整したい** → `cover.custom_prompt` を設定してステップ5から再実行
- **テーマカラーを変えたい** → `cover.color` を更新してステップ5から再実行
- **レイアウトはそのままでイラストだけ変えたい** → ステップ5を再実行（イラストのみ再生成）

### 9. コミット

表紙が確定したらコミットする:

```bash
git add assets/cover-illustration.png assets/cover.jpg book.yaml
git commit -m "✨ 表紙画像を生成"
```

再生成の場合:
```bash
git add assets/cover-illustration.png assets/cover.jpg
git commit -m "👍 表紙画像を再生成"
```
