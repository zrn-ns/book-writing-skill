# 第4章 writing-plans / executing-plans --- 計画と実行

brainstormingで確定した設計を実装計画に落とし込むwriting-plans、それを実行するexecuting-plansとsubagent-driven-development。

## 4.1 writing-plansの出力形式

### プランの保存先

```
docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md
```

### ヘッダー

全プランは以下のヘッダーで始まります。

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 1文で何を作るか
**Architecture:** 2--3文でアプローチ
**Tech Stack:** 主要技術/ライブラリ
```

### タスク構造

各タスクは以下の形式です。

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**
  （テストコード）
- [ ] **Step 2: Run test to verify it fails**
  Run: `pytest tests/...` / Expected: FAIL
- [ ] **Step 3: Write minimal implementation**
  （実装コード）
- [ ] **Step 4: Run test to verify it passes**
  Run: `pytest tests/...` / Expected: PASS
- [ ] **Step 5: Commit**
```

各ステップは2--5分で完了する粒度で、1アクション=1ステップです。TDDサイクル（テスト→失敗確認→実装→成功確認→コミット）がステップに直接埋め込まれています。

### プレースホルダーの禁止

以下はプラン上の欠陥として扱われます。

- TBD / TODO / 「後で実装」
- 「適切なエラーハンドリングを追加」（コード無し）
- 「Task Nと同様」（コード省略）
- 型・関数・メソッドの定義がどのタスクにもない参照

### セルフレビュー

プラン完成後に3つの観点で自己レビューします。

- スペックカバレッジ: スペックの各要件に対応するタスクがあるか
- プレースホルダースキャン: 上記の禁止パターンが残っていないか
- 型の一貫性: Task 3で `clearLayers()` と書いてTask 7で `clearFullLayers()` になっていないか

### 実行ハンドオフ

プラン保存後、2つの実行方式を提示します。

1. Subagent-Driven（推奨）--- タスクごとにサブエージェントをディスパッチ、タスク間でレビュー
2. Inline Execution --- executing-plansによる同セッション内バッチ実行

## 4.2 executing-plansのチェックポイント

executing-plansは、プランをロードして同一セッション内で順次実行するスキルです。

### プロセス

1. プランの読み込みとレビュー --- 懸念があればユーザーに報告
2. タスクの順次実行 --- 各タスクのステップを忠実に実行し、検証コマンドも省略しない
3. 開発完了 --- 全タスク完了後、finishing-a-development-branchスキルへ遷移

ブロッカーに遭遇した場合（依存関係の欠如、テスト失敗、手順不明）は即座に停止してユーザーに確認します。推測で突き進むことは禁止です。

### 前提

実行前にusing-git-worktreesスキルで隔離ワークスペースを作成することが必須とされています。mainブランチ上での直接実装はユーザーの明示的同意なしには行いません。

## 4.3 subagent-driven-development

subagent-driven-developmentは、サブエージェントが利用可能な環境におけるexecuting-plansの推奨代替スキルです。

### executing-plansとの違い

| 観点 | executing-plans | subagent-driven-development |
|------|----------------|----------------------------|
| 実行方式 | 同一セッションで順次実行 | タスクごとに新規サブエージェントをディスパッチ |
| コンテキスト | セッション内に蓄積 | タスクごとにクリーン |
| レビュー | 完了時のみ（finishing-a-development-branch） | 2段階（スペック準拠 → コード品質） |
| 人的介入 | ブロッカー時に停止 | BLOCKED時に人的介入、それ以外は自動進行 |

### 2段階レビュー

各タスクの完了後に、2種類のレビューサブエージェントが順次ディスパッチされます。

1. スペック準拠レビュー --- 実装がスペックの要件を過不足なく満たしているか確認。不足や余分な機能があれば差し戻し
2. コード品質レビュー --- スペック準拠を通過した後、コードの品質（マジックナンバー、命名、構造等）を確認

順序は厳守で、スペック準拠が通る前にコード品質レビューに進むことは禁止です。レビューで指摘があれば実装サブエージェントが修正し、再レビューを受けます。

### 実装サブエージェントのステータス

実装サブエージェントは4種類のステータスを返します。

- DONE --- スペック準拠レビューへ進む
- DONE_WITH_CONCERNS --- 懸念内容を確認してから判断
- NEEDS_CONTEXT --- 不足情報を提供して再ディスパッチ
- BLOCKED --- ブロッカーの種類に応じて対処（コンテキスト不足→補足、推論力不足→上位モデルで再試行、タスク過大→分割、プラン自体の問題→ユーザーに報告）

### モデル選択

コスト効率のため、タスクの複雑度に応じてモデルを使い分けます。

- 1--2ファイルのスペックが明確な機械的タスク → 安価なモデル
- 複数ファイルにまたがる統合タスク → 標準モデル
- 設計判断やレビュー → 最高性能モデル

---

**要約**: writing-plansはTDDサイクルを埋め込んだ2--5分粒度のステップでプランを作成する。executing-plansは順次実行、subagent-driven-developmentはタスクごとにサブエージェントをディスパッチして2段階レビュー（スペック準拠→品質）を回す。後者が推奨。
