# 階層化ブランチ戦略：ビジュアルガイド

**作成日**: 2025-10-17  
**用途**: ビジュアル理解用・アーキテクチャ図

---

## 📊 全体構成図

```
┌─────────────────────────────────────────────────────────────────────┐
│                            GitHub Repository                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  【Level 0: Production】                                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ main (stable version only)                                  │    │
│  │ - 本番環境にリリースされる                                    │    │
│  │ - 直接 commit 禁止                                           │    │
│  │ - PR からのみ merge                                         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                           ▲                                           │
│                           │ Final Merge                              │
│                                                                       │
│  【Level 1: Main Development】                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ feature/unified-link-migration-and-tdd                      │    │
│  │ - 複数フィーチャーの統合先                                    │    │
│  │ - 中期開発目標                                                │    │
│  │ - 複数開発者による同時開発                                    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                           ▲                                           │
│                           │ Final Integration                        │
│                                                                       │
│  【Level 2: Epic/Integration】                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ refactor/form-library-unification                           │    │
│  │ - 1つの大規模テーマの統合点                                   │    │
│  │ - 複数フェーズの成果を集約                                    │    │
│  │ - 各フェーズ成果がマージされる場所                            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│    ▲           ▲           ▲           ▲                             │
│    │           │           │           │                             │
│    │ PR        │ PR        │ PR        │ PR                          │
│    │ Merge     │ Merge     │ Merge     │ Merge                       │
│                                                                       │
│  【Level 3: Working Branches】                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Phase 1-a       │  │  Phase 1-b       │  │  Phase 2         │  │
│  │ refactor/form-   │  │ refactor/form-   │  │ refactor/form-   │  │
│  │ create-page-     │  │ deck-page        │  │ page-profile     │  │
│  │ dialog           │  │                  │  │                  │  │
│  │                  │  │                  │  │                  │  │
│  │ Developer: A     │  │ Developer: B     │  │ Developer: A     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Emergency                                                   │   │
│  │ fix/urgent-bug-name                                          │   │
│  │ (作業中に発見した緊急タスク)                                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 通常のワークフロー図

```
【Phase 1-a: create-page-dialog 移行】
┌────────────────────────────────────────────────┐
│ 1. Branch Creation                             │
│    $ git checkout refactor/form-library-unif.  │
│    $ git checkout -b refactor/form-create-page │
│    $ git push -u origin refactor/form-create.. │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ 2. Implementation                              │
│    $ vim components/create-page-dialog.tsx     │
│    - useState → useForm                        │
│    - バリデーション実装                         │
│    - テスト追加                                │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ 3. Testing                                     │
│    $ bun run test -- create-page-dialog        │
│    $ bun run lint                              │
│    ✅ All tests pass                           │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ 4. Commit & Push                               │
│    $ git add .                                 │
│    $ git commit -m "refactor: migrate..."      │
│    $ git push origin refactor/form-create-page │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ 5. Pull Request                                │
│    Base: refactor/form-library-unification    │
│    Compare: refactor/form-create-page-dialog   │
│    ✅ CI passes (lint, test, build)           │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ 6. Code Review                                 │
│    👤 Reviewer A: Approved ✅                  │
│    ✅ Ready to merge                           │
└────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────┐
│ 7. Merge & Cleanup                             │
│    ✅ Merged to refactor/form-library-unif.   │
│    🗑️  Branch deleted                         │
└────────────────────────────────────────────────┘
```

---

## 🚨 緊急タスク対応フロー

```
【作業中に緊急バグ発見】

Current State:
  Branch: refactor/form-create-page-dialog
  Modified: 3 files (uncommitted)
  
                          ↓ [緊急バグ発見]
  
Step 1: Work Stashing
  $ git stash
  ✅ 作業が一時保存される
  
                          ↓
  
Step 2: Switch to Integration Branch
  $ git checkout refactor/form-library-unification
  $ git pull origin refactor/form-library-unification
  
                          ↓
  
Step 3: Create Emergency Branch
  $ git checkout -b fix/urgent-validation-bug
  
                          ↓
  
Step 4: Fix Implementation
  $ vim app/(public)/inquiry/_components/inquiry-form.tsx
  $ bun run test -- inquiry-form
  ✅ Tests pass
  
                          ↓
  
Step 5: Commit & Push
  $ git add .
  $ git commit -m "fix: validation error in inquiry form"
  $ git push -u origin fix/urgent-validation-bug
  
                          ↓
  
Step 6: Pull Request
  Base: refactor/form-library-unification
  ✅ CI passes
  ✅ Approve & Merge
  
                          ↓
  
Step 7: Return to Original Work
  $ git checkout refactor/form-create-page-dialog
  $ git stash pop
  ✅ 作業が復元される
  
                          ↓
  
Step 8: Continue Working
  [作業継続...]
```

**タイムライン**:
```
12:00 - Phase 1-a 作業開始
  |
  └─ 12:30: 緊急バグ発見
       |
       ├─ 12:35-12:50: 緊急修正（15分）
       │    └─ PR created, reviewed, merged
       │
       └─ 12:51: 元の作業に戻る
           └─ 12:55-: 作業継続
```

---

## 📈 複数フェーズの並行実行

```
Day 1-3: Phase 1 Development
┌─────────────────────────────────────────┐
│ Developer A: refactor/form-create-page- │  👤 A
│ Developer B: refactor/form-deck-page    │  👤 B
│                                         │
│ ✅ Parallel working (no conflicts)      │
│ ✅ Independent PR reviews               │
│ ✅ Different merge timings ok           │
└─────────────────────────────────────────┘
         │                │
         ↓                ↓
    PR #13a          PR #13b
      ✅ Merge         ✅ Merge
         │                │
         └────────┬───────┘
                  ↓
         refactor/form-library-unification
         (Phase 1 統合完了)

Day 4-6: Phase 2 Development
┌─────────────────────────────────────────┐
│ Developer C: refactor/form-page-profile │  👤 C
│                                         │
│ (Phase 1 の変更を自動で含む)              │
│ ✅ No conflict with Phase 1             │
└─────────────────────────────────────────┘
         │
         ↓
    PR #13c
      ✅ Merge
         │
         ↓
 refactor/form-library-unification
 (Phase 1 + Phase 2)

After All Phases Complete
┌─────────────────────────────────────────┐
│ refactor/form-library-unification       │
│ Ready for final merge to main dev       │
│                                         │
│    PR #13: Merge to main dev branch    │
│    ✅ Final integration complete       │
└─────────────────────────────────────────┘
         │
         ↓
feature/unified-link-migration-and-tdd
```

---

## 🔀 ブランチ間の関係図

```
【理想的な階層構造】

refactor/form-library-unification
  ↑
  │ merge
  │
┌─┴──────────────────────────────────┐
│                                    │
Phase 1-a                      Phase 1-b
refactor/form-create-page-dialog    refactor/form-deck-page
                                    
Developer A: Complete ✅      Developer B: Complete ✅
PR #13a                       PR #13b
                              
        Both merged to Integration Branch
                ↓
        Phase 1 Completion ✅
        
Next iteration: Phase 2 start
                ↓
        refactor/form-page-profile
        Developer A: Starting...
```

---

## ⚠️ アンチパターン（避けるべき）

### ❌ 直列ブランチ（非推奨）

```
refactor/form-library-unification
  ↑
  │ merge
  │
refactor/form-deck-page
  ↑
  │ merge
  │
refactor/form-create-page-dialog

❌ 問題:
  - Phase 1-a が完了するまで Phase 1-b が開始できない
  - コンフリクト管理が複雑
  - 進捗追跡が困難
  - 緊急タスク対応が難しい
```

### ❌ 共有ブランチへの直接 push（非推奨）

```
❌ 直接 push
$ git checkout refactor/form-library-unification
$ git add .
$ git commit -m "...changes..."
$ git push origin refactor/form-library-unification

✅ 正しい方法
$ git checkout -b refactor/form-xxx
$ git add . && git commit
$ git push -u origin refactor/form-xxx
# GitHub から PR 作成 & review & merge
```

### ❌ main へのマージ前の統合ブランチに直接 push（非推奨）

```
❌ 統合ブランチへの直接 commit
❌ Force push を統合ブランチに実施
❌ Rebase を統合ブランチに実施

✅ 正しい方法
- 作業ブランチで全ての作業
- PR → review → merge の流れを厳守
```

---

## 📋 チェックリスト：ビジュアル版

```
【セットアップ】
□ 統合ブランチを作成
  refactor/form-library-unification ← from feature/unified-link-...
  
□ 作業ブランチを作成
  refactor/form-create-page-dialog ← from refactor/form-library-...
  
【開発】
□ Lint: bun run lint ✅
□ Test: bun run test ✅
□ Type: bun run build ✅
  
【PR】
□ Base: refactor/form-library-unification
□ CI: すべてパス ✅
□ Review: 最低1人承認 ✅
□ Merge: Squash merge
  
【クリーンアップ】
□ GitHub からブランチ削除
□ ローカルから削除: git branch -d ...
```

---

**最終更新**: 2025-10-17
