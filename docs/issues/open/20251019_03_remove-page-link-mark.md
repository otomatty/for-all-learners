# Issue: PageLinkMark 削除（Phase 4）

**優先度**: 🟠 High  
**推定難度**: ⭐⭐ 中程度（1-2時間）  
**推奨期限**: 1-2日以内  
**関連計画**: Phase 4 Implementation Plan  
**作成日**: 2025-10-19

---

## 概要

`UnifiedLinkMark` が全機能を置換したため、レガシーの `PageLinkMark` を完全に削除することでコードベースを簡潔化し、保守性を向上させます。

---

## 削除対象

### 1. メインファイル

**ファイル**: `lib/tiptap-extensions/page-link-mark.ts`

**確認項目**:
- ファイルサイズ: 確認
- 依存関係: 別ファイルからの import がないか確認
- 使用状況: grep で参照を検索

### 2. ドキュメント内の参照削除

**対象ドキュメント**:
- `docs/02_requirements/features/page-link-mark-spec.md`（存在する場合）
- `docs/03_design/features/page-link-mark-design.md`（存在する場合）
- `docs/04_implementation/plans/unified-link-mark/` 配下のドキュメント（参照削除）
- `README.md` やその他ドキュメント（参照削除）

### 3. テストファイル

**検索対象**:
```bash
find . -name "*.test.ts" -o -name "*.spec.ts" | xargs grep -l "PageLinkMark"
```

削除またはコメント化：
- `lib/tiptap-extensions/__tests__/page-link-mark.test.ts`（存在する場合）

### 4. コード参照

**検索対象**:
```bash
grep -r "PageLinkMark\|page-link-mark\|pageLinkMark" --include="*.ts" --include="*.tsx" lib/
grep -r "PageLinkMark\|page-link-mark\|pageLinkMark" --include="*.ts" --include="*.tsx" app/
```

**特に確認すべき場所**:
- `lib/tiptap-extensions/index.ts` や他の index ファイル（export 宣言）
- Editor 設定ファイル（Extension 登録箇所）
- type definitions（型定義の参照）

---

## 実施手順

### ステップ 1: 依存関係の確認

```bash
# PageLinkMark への参照をすべて検索
grep -r "PageLinkMark" --include="*.ts" --include="*.tsx" --include="*.md" .

# page-link-mark ファイルへの参照を検索
grep -r "page-link-mark" --include="*.ts" --include="*.tsx" --include="*.md" .

# import 文を検索
grep -r "from.*page-link-mark\|import.*PageLinkMark" --include="*.ts" --include="*.tsx" .
```

### ステップ 2: 削除前のバックアップ

削除前に、git で現在の状態をコミット：

```bash
git add .
git commit -m "chore: backup before removing PageLinkMark"
```

### ステップ 3: ファイル削除

```bash
# メインファイル削除
rm lib/tiptap-extensions/page-link-mark.ts

# テストファイル削除（存在する場合）
rm -f lib/tiptap-extensions/__tests__/page-link-mark.test.ts
```

### ステップ 4: コード参照の削除

**対象ファイル**（例）:
1. `lib/tiptap-extensions/index.ts` - export 宣言削除
2. Editor 設定ファイル - Extension 登録削除
3. type 定義ファイル - 型参照削除

### ステップ 5: ドキュメント参照の更新

1. **仕様書内の削除参照削除**:
   - `docs/02_requirements/features/` 配下のドキュメント

2. **実装計画の更新**:
   - `docs/04_implementation/plans/unified-link-mark/` 配下のドキュメント
   - Phase 4 完了を記載

3. **README やその他ドキュメント**:
   - レガシー機能についての記述を削除またはアーカイブ

### ステップ 6: テスト実行

```bash
# 全テスト実行
bun test

# 特に UnifiedLinkMark 関連のテスト
bun test lib/tiptap-extensions/unified-link-mark/__tests__/
```

### ステップ 7: 動作確認

1. エディタの起動
2. リンク入力（`[Title]` 形式）
3. リンク解決の動作確認
4. ページナビゲーション確認

---

## 削除チェックリスト

- [ ] `page-link-mark.ts` メインファイルを削除
- [ ] テストファイルを削除
- [ ] `lib/tiptap-extensions/index.ts` の export を削除
- [ ] Editor Extension 登録から削除
- [ ] type 定義ファイルから型参照を削除
- [ ] `docs/02_requirements/` ドキュメント更新
- [ ] `docs/04_implementation/` ドキュメント更新
- [ ] grep で残存参照がないか確認
- [ ] すべてのテスト実行
- [ ] エディタ動作確認
- [ ] git commit で履歴に記録

---

## 検索コマンド集

### 参照検索

```bash
# すべての参照を検索
grep -r "PageLinkMark" --include="*.ts" --include="*.tsx" --include="*.md" .

# ファイルパスの参照
grep -r "page-link-mark" --include="*.ts" --include="*.tsx" .

# import 文の検索
grep -rn "import.*PageLinkMark\|from.*page-link-mark" --include="*.ts" --include="*.tsx" .

# Extension 登録の検索
grep -rn "PageLinkMark" --include="*.ts" --include="*.tsx" | grep -E "extension|mark|add"
```

### 削除確認

```bash
# 削除後の参照確認
grep -r "PageLinkMark" --include="*.ts" --include="*.tsx" .
# 結果が出なければ削除完了
```

---

## 潜在的な問題と対策

### 問題 1: 残存参照による型エラー

**兆候**: TypeScript エラー「PageLinkMark が見つからない」

**対策**:
```bash
grep -rn "PageLinkMark" . | grep -v ".git"
```
で残存参照を検索して削除

### 問題 2: 動的な Extension ロードの問題

**兆候**: エディタ起動時にエラー

**対策**:
- Editor 設定ファイルで Extension 登録を確認
- 動的にロードしている場合は、ロード機構を修正

### 問題 3: ドキュメント内の不完全な参照

**兆候**: ドキュメント内で削除済み機能に言及

**対策**:
- grep で「PageLinkMark」「page-link-mark」を検索
- マークダウンドキュメント内の参照を削除またはアーカイブ

---

## 関連ファイル（参考）

### 確認する import/export

```bash
# lib/tiptap-extensions/index.ts 確認
cat lib/tiptap-extensions/index.ts | grep -i "pagelink"

# 他の設定ファイル確認
find . -name "*.config.ts" -o -name "*.config.js" | xargs grep -l "PageLinkMark" 2>/dev/null
```

---

## 参考ドキュメント

- 📋 [検証報告書](20251019_05_verification-report-memo-link-investigation.md)
- 📝 [元のレポート](20251018_04_memo-link-feature-investigation.md)
- 🔗 [Phase 4 実装計画](../../04_implementation/plans/unified-link-mark/20251012_15_phase4-implementation-plan.md)

---

**作成者**: GitHub Copilot  
**作成日**: 2025-10-19  
**最終更新**: 2025-10-19
