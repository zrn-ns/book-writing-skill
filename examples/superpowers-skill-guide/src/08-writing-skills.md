# 第8章 スキルの自作と拡張

writing-skillsスキルによるカスタムスキルの作成方法、dispatching-parallel-agentsの仕組み、スキルファイルの構造仕様。

## 8.1 writing-skills: スキル作成ガイド

writing-skillsは「プロセスドキュメントに対するTDD」という位置づけです。コードにTDDを適用するのと同じサイクルで、スキルドキュメントの品質を保証します。

### TDDマッピング

| TDDの概念 | スキル作成での対応 |
|-----------|-------------------|
| テストケース | サブエージェントへのプレッシャーシナリオ |
| 本番コード | SKILL.md |
| RED（テスト失敗） | スキルなしでエージェントがルールに違反する（ベースライン） |
| GREEN（テスト成功） | スキルありでエージェントが準拠する |
| REFACTOR | 新たな抜け穴を塞ぎ、再テスト |

### RED-GREEN-REFACTORサイクル

1. RED --- スキルなしでプレッシャーシナリオを実行し、エージェントの自然な振る舞いを記録する。使われた合理化を逐語的にメモする
2. GREEN --- 記録された具体的な違反に対処する最小限のスキルを書く。同じシナリオで準拠を確認する
3. REFACTOR --- テストで見つかった新しい合理化パターンに対する明示的な反論を追加し、再テストする

スキルを先に書いてからテストすることは、コードを先に書いてからテストすることと同じ違反です。

### スキルを作るべき場面

- 直感的に明らかでなかったテクニック
- プロジェクト横断で再利用する手法
- 広く適用可能なパターン

作るべきでない場面は、一度きりの解決策、広く文書化済みの標準的手法、プロジェクト固有の規約（CLAUDE.mdに書く）です。

## 8.2 dispatching-parallel-agents

2つ以上の独立したタスクがあり、共有状態も順序依存もない場合に発動するスキルです。

### 発動条件

- 2つ以上の独立したタスクがある（典型例: 3つ以上のテストファイルが異なる根本原因で失敗している）
- 複数のサブシステムが独立して壊れている
- 調査対象間に相互依存がない

関連する障害（1つ直せば他も直る可能性がある場合）、全体の状態理解が必要な場合、エージェント同士がリソースを競合する場合には使いません。

### パターン

1. 独立したドメインの特定 --- 障害をグループ化する
2. 各エージェントへのタスク設計 --- スコープ、ゴール、制約、期待する出力を明示
3. 並行ディスパッチ --- Task toolで同時に発行
4. 結果のレビューと統合 --- 各サマリーを読み、変更の競合がないか確認し、全体テストを実行

エージェントへのプロンプトは、スコープが狭く、コンテキストが自己完結し、出力形式が明確であることが重要です。

## 8.3 スキルファイルの構造

### ディレクトリ構造

```
skills/
  skill-name/
    SKILL.md              # メインリファレンス（必須）
    supporting-file.*     # 必要な場合のみ
```

フラットな名前空間で、全スキルが1つの検索可能な空間に並びます。

### SKILL.mdのフロントマター

YAMLフロントマターに `name` と `description` の2フィールドが必須です（合計1024文字以内）。詳細な仕様は agentskills.io/specification を参照してください。

```yaml
---
name: skill-name-with-hyphens
description: Use when [具体的な発動条件と症状]
---
```

`name` にはアルファベット、数字、ハイフンのみ使用可能です。

`description` は三人称で、発動条件のみを記述します。スキルの処理フローを要約してはいけません。テストの結果、descriptionにワークフローの要約を含めると、Claudeがスキル本文を読まずにdescriptionだけで行動するショートカットを取ることが判明しています。

```yaml
# 悪い例: ワークフローを要約している
description: Use when executing plans - dispatches subagent per task
            with code review between tasks

# 良い例: 発動条件のみ
description: Use when executing implementation plans with independent
            tasks in the current session
```

### 本文構造

```markdown
# Skill Name

## Overview
核心原則を1--2文で。

## When to Use
発動条件の箇条書き。判断が非自明な場合のみフローチャート。

## Core Pattern / The Process
テクニックやパターンの本体。

## Quick Reference
スキャン用のテーブルまたは箇条書き。

## Common Mistakes
よくある誤りと修正方法。
```

### 補助ファイルの使い分け

- 100行超の重いリファレンス → 別ファイルに分離
- 再利用可能なスクリプトやテンプレート → 別ファイル
- 50行未満のコードパターンや原則 → SKILL.md内にインライン

### Claude Search Optimization（CSO）

スキルが発見されるかどうかはdescriptionとキーワードの設計にかかっています。

- エラーメッセージ、症状（flaky, hanging, zombie等）、ツール名などの具体的なキーワードを本文に散りばめる
- 命名は能動態・動詞先頭（`creating-skills` > `skill-creation`、`condition-based-waiting` > `async-test-helpers`）
- 他スキルへの参照は `**REQUIRED SUB-SKILL:** Use superpowers:skill-name` 形式。`@` リンクはコンテキストを即座に消費するため使わない

### トークン効率

頻繁にロードされるスキルは全会話に読み込まれるため、ワード数を意識します。getting-startedワークフローは150語以内、頻繁にロードされるスキルは200語以内が目安です。`--help` への誘導やクロスリファレンスを活用して、本文を圧縮します。

---

**要約**: writing-skillsはスキル作成にTDDサイクルを適用する（ベースライン測定→最小限のスキル作成→抜け穴の封鎖）。dispatching-parallel-agentsは独立タスクの並行処理を実現する。スキルファイルはYAMLフロントマター（name, description）とMarkdown本文で構成し、descriptionには発動条件のみ記述する。

---

# 本書のまとめ

- **Superpowersとは**: Claude Codeに開発規律を注入するスキルフレームワーク。Skill toolで呼び出され、プロンプトとしてコンテキストに展開される（第1章）
- **コアワークフロー**: brainstorming→worktree→writing-plans→executing→TDD→code-review→finishingの7段階（第1章）
- **brainstorming**: 実装前に設計ドキュメントを作成。9ステップのチェックリスト。ユーザー承認まで実装禁止（第3章）
- **writing-plans / executing-plans**: タスクをステップに分解した実装プラン。subagent-driven-developmentではタスクごとにサブエージェント＋2段階レビュー（第4章）
- **test-driven-development**: RED-GREEN-REFACTORを強制。合理化パターンを列挙して違反を検出（第5章）
- **systematic-debugging**: 根本原因の調査→パターン分析→仮説検証→実装の4フェーズ。修正前に原因を特定する鉄則（第6章）
- **verification-before-completion**: 完了宣言前にビルド・テスト・lintの検証を実行し、出力を確認してから成功を主張する（第6章）
- **コードレビュー**: requesting-code-reviewでサブエージェントをディスパッチ。receiving-code-reviewでは盲目的に従わず技術的に検証する（第7章）
- **Git操作**: using-git-worktreesで隔離ワークツリーを作成。finishing-a-development-branchでマージ/PR/保持/破棄の4択を提示（第7章）
- **スキル自作**: writing-skillsでTDDサイクルを適用。descriptionには発動条件のみ記述し、ワークフロー要約を入れない（第8章）
