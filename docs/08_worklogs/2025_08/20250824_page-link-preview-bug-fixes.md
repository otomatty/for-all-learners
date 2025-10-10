# ページリンクプレビュー機能 - バグ修正作業ログ

## 作業日時・概要
- **作業日**: 2025年08月24日
- **タスク**: ページリンクプレビュー機能のバグ修正
- **目的**: チラつき問題とリンク解除問題の解消

## 発生している問題

### 1. プレビューカードのチラつき問題
**現象**: 
- ホバー時にプレビューカードが表示される際にチラつきが発生
- ローディング→実データ表示の際に視覚的な違和感

**原因推測**:
- ReactDOM re-renderによるDOM要素の再構築
- tippy.jsのコンテンツ更新時のレイアウトシフト
- ローディング状態と実データ状態でのサイズ差異

### 2. ページリロード時のリンク解除問題
**現象**:
- ページを新規作成してリンクを張る
- ページをリロードすると青文字リンクが赤文字（未設定）に戻る
- `data-page-id`属性が正しく設定されない

**原因推測**:
- `useLinkExistenceChecker`のデバウンス（500ms）とページロード順序の競合
- `existencePluginKey`のMapが初期化されるタイミング問題
- ページリンク同期処理（`updatePageLinks`）の実行順序

## 修正計画

### Phase 1: チラつき問題の解消

#### 1.1 プレビューカードのサイズ固定化
```typescript
// 問題: ローディング状態と実データ状態でサイズが変わる
// 解決: 最小高さを固定してレイアウトシフトを防ぐ

.page-preview-card {
  min-height: 120px; // 固定最小高さ
  width: 320px; // 固定幅
}
```

#### 1.2 スムーズなコンテンツ切り替え
```typescript
// 問題: React re-renderでDOM要素が完全に置き換わる
// 解決: フェードイン・アウトアニメーション追加

const PreviewCard = ({ isLoading, preview, error }) => {
  return (
    <div className="preview-container">
      {isLoading && <LoadingContent className="fade-in" />}
      {preview && <PreviewContent data={preview} className="fade-in" />}
      {error && <ErrorContent error={error} className="fade-in" />}
    </div>
  );
};
```

#### 1.3 tippy.js設定の最適化
```typescript
// 問題: コンテンツ更新時のアニメーション競合
// 解決: アニメーション設定の調整

const tippyConfig = {
  animation: false, // アニメーション無効化
  duration: 0, // 即座に表示
  updateDuration: 0, // コンテンツ更新時も即座に
};
```

### Phase 2: リンク解除問題の解消

#### 2.1 existencePlugin初期化タイミングの修正
```typescript
// 問題: ページロード時にexistMapが空の状態で描画される
// 解決: 初期データ取得の完了を待つ

const existencePlugin = new Plugin({
  state: {
    init: () => {
      // 初期状態では空のMapではなく、ローディング状態を示す
      return { loading: true, map: new Map() };
    },
    apply(tr, value) {
      const meta = tr.getMeta(existencePluginKey);
      return meta ?? value;
    },
  },
  // ...
});
```

#### 2.2 useLinkExistenceCheckerの改善
```typescript
// 問題: 500msデバウンスが初回チェックを遅延させる
// 解決: 初回は即座に実行、以降はデバウンス

useEffect(() => {
  const checkExistence = async (immediate = false) => {
    // 初回またはimmediateフラグがtrueの場合は即座に実行
    const delay = immediate ? 0 : 500;
    
    if (existenceTimeout.current) clearTimeout(existenceTimeout.current);
    existenceTimeout.current = setTimeout(async () => {
      // existing logic...
    }, delay);
  };

  // 初回は即座に実行
  checkExistence(true);
  
  const handler = () => checkExistence(false);
  editor.on("update", handler);
  // ...
}, [editor, supabase]);
```

#### 2.3 ページリンク同期の強化
```typescript
// 問題: updatePageLinksが完了する前にリロードされる
// 解決: Server Actionsでの確実な同期

// app/_actions/pages.ts に追加
export async function ensurePageLinksSync(pageId: string) {
  const supabase = await createClient();
  
  // ページ内容を取得
  const { data: page } = await supabase
    .from("pages")
    .select("content_tiptap")
    .eq("id", pageId)
    .single();
    
  if (page) {
    const { outgoingIds } = extractLinkData(page.content_tiptap);
    await updatePageLinks({ pageId, outgoingIds });
  }
}
```

#### 2.4 クライアントサイド同期の改善
```typescript
// 問題: ページ保存後にリンク同期が完了する前にリロード
// 解決: 保存処理にリンク同期を含める

const savePage = async (content: JSONContent) => {
  // 1. ページ保存
  await updatePage({ id: pageId, content });
  
  // 2. リンク同期（確実に完了を待つ）
  const { outgoingIds } = extractLinkData(content);
  await updatePageLinks({ pageId, outgoingIds });
  
  // 3. existence mapを強制更新
  const titles = extractPageTitlesFromContent(content);
  const existMap = await fetchExistenceMap(titles);
  editor.view.dispatch(
    editor.state.tr.setMeta(existencePluginKey, existMap)
  );
};
```

## 実装スケジュール

### Day 1: チラつき問題の修正
- [ ] PreviewCardのサイズ固定化
- [ ] CSSアニメーション追加
- [ ] tippy.js設定の最適化
- [ ] テスト・確認

### Day 2: リンク解除問題の修正
- [ ] existencePlugin初期化改善
- [ ] useLinkExistenceChecker修正
- [ ] ページリンク同期強化
- [ ] テスト・確認

### Day 3: 統合テスト・最適化
- [ ] 全体的な動作確認
- [ ] パフォーマンステスト
- [ ] ドキュメント更新

## 技術的詳細

### チラつき対策のCSS
```css
.page-preview-card {
  min-height: 120px;
  width: 320px;
  transition: none; /* アニメーション無効化 */
}

.preview-content-fade {
  opacity: 0;
  animation: fadeIn 150ms ease-in-out forwards;
}

@keyframes fadeIn {
  to { opacity: 1; }
}
```

### 強化されたexistence check
```typescript
interface ExistenceState {
  loading: boolean;
  map: Map<string, string | null>;
  lastUpdated: number;
}

const checkExistenceImmediate = async (titles: string[]) => {
  const supabase = createClient();
  const { data: pages } = await supabase
    .from("pages")
    .select("title,id")
    .in("title", titles);
    
  const existMap = new Map<string, string | null>();
  const pageMap = new Map(pages?.map(p => [p.title, p.id]) || []);
  
  for (const title of titles) {
    existMap.set(title, pageMap.get(title) ?? null);
  }
  
  return existMap;
};
```

## 成功指標

### チラつき問題
- [ ] ホバー時の視覚的違和感が解消
- [ ] ローディング→実データ表示がスムーズ
- [ ] レイアウトシフトが発生しない

### リンク解除問題
- [ ] ページリロード後もリンクが維持される
- [ ] 新規作成リンクが即座に青文字になる
- [ ] `data-page-id`属性が正しく設定される

## リスク・注意点

### チラつき修正のリスク
- 固定サイズによる異なるコンテンツ長への対応
- アニメーション無効化による反応性の低下
- 異なるブラウザでの描画差異

### リンク同期修正のリスク
- 同期処理の複雑化によるパフォーマンス影響
- 競合状態の新たな発生可能性
- キャッシュ整合性の管理複雑化

## 参考資料

- [tippy.js - Content Updates](https://atomiks.github.io/tippyjs/v6/misc/#updating-content)
- [React - Avoiding Re-renders](https://react.dev/reference/react/memo)
- [ProseMirror - Plugin State](https://prosemirror.net/docs/ref/#state.Plugin.state)
- 既存実装: `lib/tiptap-extensions/page-link.ts`
- 関連機能: `app/(protected)/pages/[id]/_hooks/useLinkExistenceChecker.ts`
