# 第2章 インストールとセットアップ

Superpowersプラグインの導入手順と動作確認。

## 2.1 前提条件

Claude Codeがインストール済みであること。Superpowersは Claude Code公式プラグイン として配布されており、Claude Codeの Skill tool 基盤の上で動作します。

Gemini CLIやCodexでも利用可能ですが、本書ではClaude Codeを前提に解説します。

## 2.2 インストール

ターミナルで以下を実行します。

```bash
claude plugins add claude-plugins-official/superpowers
```

プラグインのファイルは `~/.claude/plugins/cache/claude-plugins-official/superpowers/<version>/` にダウンロードされます。スキル定義ファイル群は `skills/` ディレクトリ配下に格納されます。

## 2.3 設定の確認

インストール後、Claude Codeを起動すると、システムリマインダーにSuperpowersのスキル一覧が表示されます。以下のような行が確認できれば正常です。

```
The following skills are available for use with the Skill tool:
- superpowers:brainstorming
- superpowers:writing-plans
- superpowers:executing-plans
...
```

Skill toolでスキルを呼び出せる状態になっていれば、セットアップは完了です。特別な `settings.json` への設定は不要で、プラグインの追加だけで全スキルが有効化されます。

Superpowersは `using-superpowers` スキルによって「該当するスキルが1%でも適用可能なら必ず呼び出す」というルールをClaude自身に課します。つまりユーザーが明示的にスキルを指定しなくても、タスクに応じてスキルが自動的に発動します。

---

**要約**: `claude plugins add` コマンド一発でインストール完了。追加設定不要。起動時のシステムリマインダーにスキル一覧が表示されれば動作確認OK。
