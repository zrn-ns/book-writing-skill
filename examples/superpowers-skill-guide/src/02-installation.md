# 第2章 インストールとセットアップ

## 2.1 Claude Codeへのインストール

Claude Codeは、Superpowersが最初にサポートしたプラットフォームであり、最も統合度の高い環境です。インストール方法は複数用意されています。

### 前提条件

Claude Codeへのインストールを始める前に、以下の環境が整っていることを確認してください。

- **Claude Codeがインストール済み**であること
- **Node.js 18以上**がインストールされていること（Claude Codeの動作要件）
- **Git**がインストールされていること
- **インターネット接続**が利用可能であること（スキルのダウンロードに必要）

Claude Codeのバージョンは、以下のコマンドで確認できます。

```bash
claude --version
```

Superpowers v5.0.6を利用するためには、Claude Codeの比較的新しいバージョンが必要です。バージョンが古い場合は、まずClaude Code自体を更新してください。

```bash
npm update -g @anthropic-ai/claude-code
```

### 方法1: 公式マーケットプレイス経由

Claude Codeには、スキルを検索・インストールできるマーケットプレイス（Marketplace）が組み込まれています。これが最も簡単なインストール方法です。

Claude Codeを起動した状態で、以下のスラッシュコマンド（Slash Command）を実行します。

```bash
/install-skill obra/superpowers
```

このコマンドにより、Superpowersのすべてのスキルが自動的にダウンロードされ、プロジェクトの設定に追加されます。

インストールが完了すると、以下のようなメッセージが表示されます。

```
Installed skill: obra/superpowers (v5.0.6)
Skills added:
  - brainstorming
  - using-git-worktrees
  - writing-plans
  - subagent-driven-development
  - executing-plans
  - test-driven-development
  - requesting-code-review
  - receiving-code-review
  - systematic-debugging
  - verification-before-completion
  - finishing-a-development-branch
  - dispatching-parallel-agents
  - writing-skills
  - using-superpowers
```

> **ヒント**: `/install-skill`コマンドは、デフォルトで最新の安定版をインストールします。特定のバージョンを指定したい場合は、`/install-skill obra/superpowers@v5.0.6`のようにバージョンを明示できます。

### 方法2: Superpowersマーケットプレイス経由

Superpowersプロジェクトは、独自のスキルマーケットプレイス（Superpowers Marketplace）も提供しています。このマーケットプレイスでは、コミュニティが作成したスキルも含めて、より幅広いスキルを閲覧・インストールできます。

```bash
# マーケットプレイスからスキルを検索
/search-skills superpowers

# 個別のスキルをインストール
/install-skill obra/superpowers:test-driven-development
```

個別のスキルをインストールできることは、Superpowersマーケットプレイスの大きな利点です。全スキルを一括導入するのではなく、必要なスキルだけを選択してインストールできます。

マーケットプレイスのWebインターフェースは、以下のURLからアクセスできます。

```
https://superpowers.dev/marketplace
```

Webインターフェースでは、各スキルの説明、バージョン履歴、ユーザーレビューを確認できます。インストール前にスキルの内容を吟味したい場合に便利です。

### 方法3: 手動インストール

より細かい制御が必要な場合や、カスタマイズしたスキルを使用したい場合は、手動でインストールすることもできます。

まず、Superpowersのリポジトリをクローンまたはダウンロードします。

```bash
git clone https://github.com/obra/superpowers.git /tmp/superpowers
```

次に、プロジェクトの`.claude/skills/`ディレクトリにスキルファイルをコピーします。

```bash
# プロジェクトのスキルディレクトリを作成
mkdir -p .claude/skills/superpowers

# スキルファイルをコピー
cp /tmp/superpowers/skills/*.md .claude/skills/superpowers/
```

手動インストールの利点は、以下の通りです。

- スキルファイルを直接編集してカスタマイズできる
- ネットワーク接続なしでインストールできる（事前にクローン済みの場合）
- 特定のコミットやブランチのスキルを利用できる
- スキルファイルをプロジェクトのリポジトリに含めてチームで共有できる

> **注意**: 手動インストールの場合、バージョンの更新は自動的には行われません。定期的にリポジトリの最新版を確認し、必要に応じてスキルファイルを更新してください。

### インストール先のディレクトリ構造

Claude Codeにおけるスキルの格納場所は、適用範囲によって異なります。

```
~/.claude/skills/          # ユーザーグローバル（全プロジェクト共通）
.claude/skills/            # プロジェクトローカル（現在のプロジェクトのみ）
```

**ユーザーグローバル**にインストールすると、すべてのプロジェクトでSuperpowersが有効になります。自分が関わるすべてのプロジェクトでSuperpowersを使いたい場合に適しています。

**プロジェクトローカル**にインストールすると、特定のプロジェクトでのみ有効になります。チームでスキルファイルを共有したい場合や、プロジェクト固有のカスタマイズを行いたい場合に適しています。

推奨は**ユーザーグローバル**へのインストールです。Superpowersの基本スキル（TDD、デバッグ、コードレビューなど）は、プロジェクトの種類を問わず有効です。プロジェクト固有のカスタマイズが必要な場合のみ、プロジェクトローカルにオーバーライド用のスキルを配置します。

```bash
# ユーザーグローバルにインストール
/install-skill --global obra/superpowers

# プロジェクトローカルにインストール
/install-skill obra/superpowers
```

> **ヒント**: ユーザーグローバルとプロジェクトローカルの両方に同名のスキルが存在する場合、**プロジェクトローカルが優先**されます。この仕組みを利用して、特定のプロジェクトでスキルの動作をオーバーライドできます。

### スキルの優先順位

スキルが複数の場所に存在する場合の優先順位は以下の通りです（上が最優先）。

1. プロジェクトローカル（`.claude/skills/`）
2. ユーザーグローバル（`~/.claude/skills/`）
3. マーケットプレイスからインストールされたスキル

この優先順位を理解しておくことで、スキルのカスタマイズを効果的に行えます。

## 2.2 他のプラットフォームへのインストール

### Cursorへのインストール

Cursorでは、ルール（Rules）機能を通じてSuperpowersを利用します。CursorのルールはClaude Codeのスキルに相当する仕組みで、エージェントの振る舞いを制御するためのMarkdownファイルです。

まず、プロジェクトのルートディレクトリに`.cursor/rules/`ディレクトリを作成します。

```bash
mkdir -p .cursor/rules/
```

次に、Superpowersのスキルファイルをルールとして配置します。

```bash
# Superpowersリポジトリをクローン（まだの場合）
git clone https://github.com/obra/superpowers.git /tmp/superpowers

# スキルファイルをCursorのルールディレクトリにコピー
cp /tmp/superpowers/skills/*.md .cursor/rules/
```

Cursorの設定画面（Settings）から、ルールの読み込みが有効になっていることを確認してください。

```
Settings > Features > Rules > Enable Rules: ON
```

> **注意**: Cursorのルール機能は、ファイルサイズに上限がある場合があります。大きなスキルファイルは、複数のファイルに分割する必要があるかもしれません。スキルファイルが読み込まれない場合は、ファイルサイズを確認してください。

Cursorでの利用時の注意点として、Cursorはサブエージェントの起動をネイティブにサポートしていない場合があります。そのため、`subagent-driven-development`や`dispatching-parallel-agents`スキルは、Claude Codeほど効果的に動作しない可能性があります。ただし、TDD、デバッグ、コードレビューなどの基本的なスキルは問題なく動作します。

### Gemini CLIへのインストール

Gemini CLIでは、設定ファイルを通じてSuperpowersを利用します。

Gemini CLIの設定ディレクトリにスキルファイルを配置します。

```bash
# Gemini CLIの設定ディレクトリ
mkdir -p ~/.gemini/skills/

# スキルファイルをコピー
cp /tmp/superpowers/skills/*.md ~/.gemini/skills/
```

Gemini CLIの設定ファイル（`~/.gemini/config.yaml`）に、スキルの読み込みパスを追加します。

```yaml
skills:
  paths:
    - ~/.gemini/skills/
  enabled: true
```

Gemini CLIは、Googleの大規模言語モデルGeminiをベースとしています。モデルの特性がClaude Codeのベースモデルとは異なるため、スキルの効果の程度が異なる場合があります。特に、ハードゲートの遵守度合いについては、実際に試して効果を確認することを推奨します。

### Codexへのインストール

OpenAIのCodexでは、設定ファイルにスキルの内容を組み込む形で利用します。

```bash
# Codexの設定ディレクトリ
mkdir -p ~/.codex/skills/

# スキルファイルをコピー
cp /tmp/superpowers/skills/*.md ~/.codex/skills/
```

Codexの設定ファイル（`~/.codex/config.json`）で、スキルの読み込みを有効にします。

```json
{
  "skills": {
    "directory": "~/.codex/skills/",
    "enabled": true
  }
}
```

Codexは独自のサンドボックス（Sandbox）機構を持っており、コマンドの実行がサンドボックス内に限定される場合があります。この制約は、Superpowersの`verification-before-completion`スキルが要求するコマンド実行に影響を与える可能性があります。Codex固有の設定で、必要なコマンドの実行を許可してください。

### OpenCodeへのインストール

OpenCodeでは、設定ファイルにスキルの読み込みパスを指定します。

```bash
# OpenCodeの設定ディレクトリ
mkdir -p ~/.opencode/skills/

# スキルファイルをコピー
cp /tmp/superpowers/skills/*.md ~/.opencode/skills/
```

OpenCodeの設定ファイル（`~/.opencode/config.toml`）で、スキルを有効化します。

```toml
[skills]
directory = "~/.opencode/skills/"
enabled = true
```

OpenCodeはオープンソースプロジェクトであるため、スキルの読み込み機構がバージョンによって異なる場合があります。公式ドキュメントで最新の設定方法を確認してください。

### プラットフォーム比較

各プラットフォームにおけるSuperpowersの対応状況を比較します。

| 機能 | Claude Code | Cursor | Gemini CLI | Codex | OpenCode |
|---|---|---|---|---|---|
| マーケットプレイス対応 | 対応 | 非対応 | 非対応 | 非対応 | 非対応 |
| スキルの自動更新 | 対応 | 非対応 | 非対応 | 非対応 | 非対応 |
| サブエージェント対応 | 対応 | 限定的 | 限定的 | 対応 | 限定的 |
| ワークツリー対応 | 対応 | 対応 | 対応 | 対応 | 対応 |
| TDDスキルの効果 | 高い | 高い | 中程度 | 高い | 中程度 |

> **注意**: この比較は2026年3月時点のものです。各プラットフォームはアクティブに開発されているため、対応状況は変化する可能性があります。

## 2.3 スキルの有効化確認

インストールが完了したら、スキルが正しく読み込まれているかを確認しましょう。確認は2段階で行います。第1段階がスキル一覧の確認、第2段階が動作確認です。

### 第1段階: スキル一覧の確認

#### Claude Codeでの確認方法

Claude Codeでは、以下のコマンドでインストール済みスキルの一覧を確認できます。

```bash
/skills
```

以下のような出力が表示されれば、正しくインストールされています。

```
Installed Skills:
  obra/superpowers (v5.0.6)
    brainstorming
    using-git-worktrees
    writing-plans
    subagent-driven-development
    executing-plans
    test-driven-development
    requesting-code-review
    receiving-code-review
    systematic-debugging
    verification-before-completion
    finishing-a-development-branch
    dispatching-parallel-agents
    writing-skills
    using-superpowers
```

14個のスキルがすべて表示されていることを確認してください。一部のスキルが表示されない場合は、インストールが不完全な可能性があります。

#### 他のプラットフォームでの確認方法

Cursorの場合は、Settings画面のRulesセクションで読み込まれたルールファイルの一覧を確認できます。

Gemini CLI、Codex、OpenCodeの場合は、設定ファイルの内容を確認し、スキルファイルが正しいディレクトリに配置されていることをファイルシステム上で確認します。

```bash
# ファイルの存在確認
ls -la ~/.gemini/skills/*.md    # Gemini CLI
ls -la ~/.codex/skills/*.md     # Codex
ls -la ~/.opencode/skills/*.md  # OpenCode
```

### 第2段階: 動作確認

スキルが正しく動作しているかを確認する最も簡単な方法は、実際にスキルを呼び出してみることです。

Claude Codeで以下のように入力してみましょう。

```
このプロジェクトに新しい機能を追加したいのですが、
まずブレインストーミングから始めてください。
```

Superpowersが正しくインストールされていれば、エージェントは`brainstorming`スキルを自動的に適用し、以下のような体系的なアプローチを取るはずです。

1. 要件の明確化のための質問（「どのような機能ですか？」「既存の機能との関連は？」）
2. 既存コードの調査（関連するファイルやモジュールの確認）
3. 設計上の選択肢の列挙（複数のアプローチの比較）
4. 各選択肢のトレードオフの分析（メリット・デメリットの整理）

逆に、スキルが有効でない場合は、エージェントはいきなりコードを書き始めようとするでしょう。この振る舞いの違いが、Superpowersが正しく動作しているかどうかの最も分かりやすい指標です。

もう一つの確認方法として、テスト駆動開発スキルの動作を確認する方法があります。

```
この関数にバリデーション機能を追加してください。
```

Superpowersが有効であれば、エージェントは「まずテストを書きましょう」と応答するはずです。いきなり実装コードを書き始める場合は、TDDスキルが正しく読み込まれていない可能性があります。

### トラブルシューティング

スキルが正しく読み込まれない場合、以下の点を順番に確認してください。

**ステップ1: ファイルパスの確認**

スキルファイルが正しいディレクトリに配置されているか確認します。

```bash
# Claude Codeの場合
ls ~/.claude/skills/superpowers/
# または
ls .claude/skills/superpowers/
```

ファイルが存在しない場合は、インストール手順を再度実行してください。

**ステップ2: ファイル形式の確認**

スキルファイルがUTF-8のMarkdown形式であることを確認します。特に、WindowsからコピーしたファイルはBOM（Byte Order Mark）が付いている場合があり、問題を引き起こすことがあります。

```bash
file ~/.claude/skills/superpowers/*.md
```

すべてのファイルが「UTF-8 Unicode text」と表示されれば問題ありません。「UTF-8 Unicode (with BOM) text」と表示される場合は、BOMを除去する必要があります。

```bash
# BOMの除去（macOS/Linux）
sed -i '1s/^\xEF\xBB\xBF//' ~/.claude/skills/superpowers/*.md
```

**ステップ3: バージョンの互換性**

使用しているエージェントのバージョンが、Superpowersの対象バージョンと互換性があるか確認します。

```bash
claude --version
```

**ステップ4: スキルの競合**

他のスキルやカスタムインストラクションと競合している可能性があります。一度他のスキルを無効にして、Superpowersのみで動作を確認してみてください。

特に、`CLAUDE.md`ファイルに記述された指示がSuperpowersのスキルと矛盾している場合、予期しない動作が発生することがあります。

**ステップ5: キャッシュのクリア**

一部のプラットフォームでは、スキルファイルがキャッシュされている場合があります。キャッシュをクリアして再読み込みを試みてください。

```bash
# Claude Codeの場合、新しいセッションを開始
claude  # 新しいセッションで起動
```

## 2.4 設定のカスタマイズ

Superpowersは、そのまま使っても効果的ですが、プロジェクトや開発スタイルに合わせてカスタマイズすることで、さらに効果を高められます。

### スキルの選択的有効化

すべてのスキルを一度に有効にする必要はありません。チームやプロジェクトの状況に応じて、段階的に導入することを推奨します。

**最小構成（推奨開始セット）**

まず以下の3つのスキルから始めることを推奨します。

```
test-driven-development     # テスト駆動開発
verification-before-completion  # 完了前の検証
systematic-debugging        # 体系的デバッグ
```

この3つは、エージェントの出力品質に最も直接的な影響を与えるスキルです。導入直後から効果を実感できます。

**標準構成**

最小構成に慣れたら、以下を追加します。

```
brainstorming              # ブレインストーミング
writing-plans              # 計画立案
requesting-code-review     # コードレビュー依頼
```

この6つのスキルで、開発の主要なフェーズ（要件定義→計画→実装→レビュー）をカバーできます。

**フル構成**

すべてのスキルを有効にする構成です。チーム全体でSuperpowersを採用し、ワークフロー全体を管理する場合に適しています。

```
brainstorming
using-git-worktrees
writing-plans
subagent-driven-development
executing-plans
test-driven-development
requesting-code-review
receiving-code-review
systematic-debugging
verification-before-completion
finishing-a-development-branch
dispatching-parallel-agents
writing-skills
using-superpowers
```

> **ヒント**: 段階的な導入を推奨する理由は、一度にすべてのスキルを有効にすると、エージェントの応答時間が長くなったり、ワークフローが冗長に感じられたりする場合があるためです。まず効果を実感し、その上で追加のスキルを導入する方が、スムーズな導入につながります。

### スキルのオーバーライド

特定のスキルの振る舞いをプロジェクト固有にカスタマイズしたい場合、スキルのオーバーライド（Override）が可能です。

ユーザーグローバルにインストールされたスキルは、プロジェクトローカルに同名のスキルファイルを配置することでオーバーライドできます。

```bash
# ユーザーグローバルのスキル（ベース）
~/.claude/skills/superpowers/test-driven-development.md

# プロジェクトローカルのオーバーライド
.claude/skills/superpowers/test-driven-development.md  # こちらが優先
```

オーバーライドの一般的なユースケースは以下の通りです。

- テストフレームワークの指定を変更する（pytest→Jest、など）
- プロジェクト固有のコーディング規約を追加する
- 特定のステップの条件を緩和または強化する
- プロジェクト固有の合理化防止テーブルを追加する

### CLAUDE.mdとの連携

Claude Codeでは、`CLAUDE.md`ファイルにプロジェクト固有の指示を記述できます。Superpowersのスキルと`CLAUDE.md`を組み合わせることで、より強力なエージェント制御が可能になります。

```markdown
# CLAUDE.md

## テスト規約
- テストフレームワーク: pytest
- テストファイルの命名: test_*.py
- カバレッジ目標: 80%以上
- テスト実行コマンド: pytest --cov=src --cov-report=term-missing

## コーディング規約
- Python 3.12+
- 型ヒント必須
- docstring必須（Google Style）
- lintコマンド: ruff check .
- フォーマッタ: ruff format .

## アーキテクチャ
- レイヤードアーキテクチャ（Controller → Service → Repository）
- 依存注入（Dependency Injection）パターンを使用
- 設定は環境変数から読み込む
```

`CLAUDE.md`でプロジェクト固有の規約を定義し、Superpowersのスキルがその規約に沿った行動を取るようにする——これが最も効果的な使い方です。

例えば、Superpowersの`test-driven-development`スキルが「テストを書け」と指示し、`CLAUDE.md`が「pytestで書け、ファイル名はtest_*.pyにせよ」と具体化する。抽象的な原則と具体的な規約が組み合わさることで、エージェントの出力品質が大幅に向上します。

> **ヒント**: `CLAUDE.md`はプロジェクトの「文化」を定義するファイルです。Superpowersが「何をすべきか」（テストを書く、計画を立てるなど）を規定し、`CLAUDE.md`が「どのように行うか」（どのフレームワークで、どのスタイルで）を規定する。この役割分担を意識すると、効果的な設定ができます。

### チーム共有の設定

チームでSuperpowersを使用する場合、設定をリポジトリに含めて共有することを推奨します。

```
project/
├── .claude/
│   ├── skills/
│   │   └── superpowers/     # Superpowersスキル
│   └── settings.json        # Claude Code設定
├── CLAUDE.md                # プロジェクト規約
└── src/
    └── ...
```

`.claude/skills/`ディレクトリをGitで管理することで、チーム全員が同じスキルセットを使用できます。これにより、以下のメリットが得られます。

- チーム全員が同じスキルセットを使用するため、エージェントの振る舞いが統一される
- スキルの変更がGitで追跡され、変更の理由やタイミングが記録される
- スキルの変更をPull Requestでレビューできる
- 新しいメンバーがプロジェクトに参加した際、自動的に同じスキルセットが適用される

> **注意**: `.claude/settings.json`にはAPIキーなどの機密情報が含まれる可能性があります。`.gitignore`で適切に制御してください。

```bash
# .gitignore
.claude/settings.json
.claude/credentials/
# スキルファイルはコミットする
!.claude/skills/
```

### 環境変数による制御

一部の設定は、環境変数で制御することもできます。これは、CI/CD環境やチーム内での設定の統一に便利です。

```bash
# Superpowersのスキルディレクトリを指定
export SUPERPOWERS_SKILLS_DIR=~/.claude/skills/superpowers

# 特定のスキルを無効化
export SUPERPOWERS_DISABLED_SKILLS="dispatching-parallel-agents,writing-skills"

# デバッグモード（スキルの適用状況をログ出力）
export SUPERPOWERS_DEBUG=true
```

環境変数による制御は、以下のような場面で特に有用です。

- CI/CD環境で、テスト実行時にはTDDスキルとverificationスキルのみを有効にしたい場合
- ペアプログラミング中に、一時的に特定のスキルを無効にしたい場合
- 新しいスキルの効果を検証する際に、他のスキルとの相互作用を排除したい場合

## 2.5 アップデート

Superpowersは活発に開発されており、定期的にスキルの改善や新規スキルの追加が行われます。最新の改善を取り入れるために、定期的なアップデートを推奨します。

### 自動アップデート

Claude Codeの公式マーケットプレイス経由でインストールした場合、スキルの自動アップデートが利用できます。

```bash
# アップデートの確認
/update-skills

# 特定のスキルをアップデート
/update-skill obra/superpowers
```

自動アップデートは、新しいバージョンが利用可能になった時点で通知が表示されます。アップデートを適用するかどうかは、ユーザーが判断できます。

### 手動アップデート

手動インストールの場合は、リポジトリから最新版を取得してファイルを上書きします。

```bash
cd /tmp/superpowers && git pull
cp /tmp/superpowers/skills/*.md ~/.claude/skills/superpowers/
```

> **ヒント**: 手動アップデートの前に、現在のスキルファイルをバックアップしておくことを推奨します。カスタマイズを行っている場合、上書きによって変更が失われる可能性があります。

```bash
# バックアップ
cp -r ~/.claude/skills/superpowers/ ~/.claude/skills/superpowers.bak/

# アップデート
cp /tmp/superpowers/skills/*.md ~/.claude/skills/superpowers/

# 差分の確認
diff -r ~/.claude/skills/superpowers.bak/ ~/.claude/skills/superpowers/
```

### バージョンの固定

プロジェクトで特定のバージョンを使い続けたい場合は、バージョンを固定できます。

```bash
# 特定のバージョンをインストール
/install-skill obra/superpowers@v5.0.6

# 手動の場合はタグを指定してチェックアウト
cd /tmp/superpowers && git checkout v5.0.6
```

> **ヒント**: チーム開発では、バージョンを固定することを推奨します。バージョンが異なると、エージェントの振る舞いが開発者間で一致しなくなる可能性があります。プロジェクトのドキュメント（`CLAUDE.md`など）にSuperpowersのバージョンを明記しておくと、チーム内の認識を合わせやすくなります。

### 変更履歴の確認

アップデートの前に、変更内容を確認することを推奨します。

```bash
# GitHubのリリースページで変更履歴を確認
# https://github.com/obra/superpowers/releases

# またはローカルでコミットログを確認
cd /tmp/superpowers && git log --oneline v5.0.5..v5.0.6
```

特に、以下の種類の変更には注意が必要です。

- ハードゲートの条件変更 — エージェントの振る舞いに直接影響する
- スキルの追加・削除 — ワークフロー全体に影響する可能性がある
- 合理化防止テーブルの更新 — エージェントのスキップ防止効果に影響する

## 2.6 本章のまとめ

本章では、Superpowersのインストールとセットアップについて解説しました。

- **Claude Code**には、公式マーケットプレイス、Superpowersマーケットプレイス、手動インストールの3つの方法がある。最も簡単なのは公式マーケットプレイス経由の`/install-skill obra/superpowers`
- **Cursor、Gemini CLI、Codex、OpenCode**にも、それぞれの設定機構を通じてインストール可能。ただし、サブエージェント対応など、プラットフォームによって機能差がある
- スキルの有効化確認は、**スキル一覧の確認**と**動作確認**の2段階で行う。動作確認では、エージェントが体系的なアプローチを取るかどうかを観察する
- カスタマイズでは、**スキルの選択的有効化**（最小→標準→フルの段階的導入）、**オーバーライド**（プロジェクト固有のカスタマイズ）、**CLAUDE.mdとの連携**（抽象原則と具体規約の組み合わせ）が重要
- チーム開発では、**スキルファイルをリポジトリに含めて共有**し、**バージョンを固定**することを推奨

次章では、Superpowersの中核であるコアワークフローについて解説します。
