# ユーザーアイコン挿入機能 - 段階的実装計画書

## プロジェクト概要

### 目標
ブラケット記法を拡張した`[{user_slug}.icon]`によるユーザーアイコン表示機能の実装

### 実装方針
3段階に分けて段階的に実装し、各段階で動作確認とテストを行う

---

## Phase 1: ユーザーページ自動作成機能

### 1.1 目標
ノート参加時にユーザーの専用ページを自動作成し、アバター画像をアイコンとして設定

### 1.2 トリガータイミング
- `joinNoteByLink()` 実行時
- `joinNotePublic()` 実行時
- ノート参加権限付与時

### 1.3 実装内容

#### 新規作成ファイル
```
app/_actions/
├── user-page.ts              # ユーザーページ管理Server Action
└── note-participation.ts     # ノート参加時の処理拡張

lib/utils/
└── user-page-creator.ts      # ユーザーページ作成ヘルパー
```

#### 修正対象ファイル
```
app/_actions/notes/
├── joinNoteByLink.ts         # ユーザーページ作成処理追加
└── joinNotePublic.ts         # ユーザーページ作成処理追加
```

### 1.4 技術仕様

#### ユーザーページ作成ロジック
```typescript
interface UserPageCreationParams {
  userId: string;
  userSlug: string;
  noteId: string;
  avatarUrl?: string | null;
}

interface UserPageCreationResult {
  pageCreated: boolean;
  pageId: string | null;
  iconSet: boolean;
  error?: string;
}

// ユーザーページ作成・更新
export async function ensureUserPage(
  params: UserPageCreationParams
): Promise<UserPageCreationResult>
```

#### ページ内容の自動生成
```typescript
// ユーザーページの初期コンテンツ
const defaultUserPageContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "プロフィール" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "image",
          attrs: {
            src: avatarUrl || "/default-avatar.png",
            alt: `${userSlug}のアバター`,
            title: "ユーザーアイコン"
          }
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: `こんにちは！${userSlug}です。` }
      ]
    }
  ]
};
```

### 1.5 処理フロー
1. ノート参加処理実行
2. ユーザーのuser_slug取得
3. 同名ページの存在確認
4. ページ未存在の場合：
   - ユーザーページ作成
   - アバター画像を先頭に配置
   - サムネイル自動設定
   - note_page_linksに登録
5. ページ既存の場合：
   - note_page_linksに登録のみ

### 1.6 エラーハンドリング
- user_slug未設定：エラーログ出力、処理継続
- アバター未設定：デフォルトアイコンまたはイニシャル使用
- ページ作成失敗：警告ログ、ノート参加は成功させる

### 1.7 テスト項目
- [ ] 新規ユーザーのノート参加時ページ自動作成
- [ ] 既存ユーザーページがある場合の重複作成回避
- [ ] アバター設定済みユーザーのアイコン自動配置
- [ ] アバター未設定ユーザーのフォールバック処理
- [ ] note_page_linksの正常な登録

---

## Phase 2: .iconサフィックス表示機能

### 2.1 目標
`[{user_slug}.icon]`記法でページのサムネイルをアイコンサイズで表示

### 2.2 実装内容

#### 修正対象ファイル
```
lib/tiptap-extensions/
└── page-link.ts              # .iconサフィックス処理追加

components/ui/
└── user-icon.tsx             # ユーザーアイコン表示コンポーネント（新規）
```

### 2.3 技術仕様

#### ブラケット記法拡張
```typescript
// 既存の正規表現を拡張
const bracketRegex = /\[([^\[\]]+)\]/g;
const iconRegex = /^(.+)\.icon$/;

interface BracketContent {
  type: 'page' | 'icon';
  slug: string;
  isIcon: boolean;
}

function parseBracketContent(content: string): BracketContent {
  const iconMatch = content.match(iconRegex);
  if (iconMatch) {
    return {
      type: 'icon',
      slug: iconMatch[1],
      isIcon: true
    };
  }
  return {
    type: 'page',
    slug: content,
    isIcon: false
  };
}
```

#### アイコン表示コンポーネント
```tsx
interface UserIconProps {
  userSlug: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

export function UserIcon({ 
  userSlug, 
  size = 'sm', 
  showName = false,
  className 
}: UserIconProps) {
  // サムネイル取得
  // フォールバック表示
  // クリック処理（ページ遷移）
}
```

### 2.4 表示制御ロジック

#### サイズ定義
```css
.user-icon-sm { width: 24px; height: 24px; }
.user-icon-md { width: 32px; height: 32px; }
.user-icon-lg { width: 48px; height: 48px; }
```

#### フォールバック順序
1. ページサムネイル（thumbnail_url）
2. ページ内の最初の画像
3. ユーザーアバター（accounts.avatar_url）
4. イニシャルアイコン（user_slugの最初の文字）

### 2.5 レンダリング方針

#### 既存装飾との統合
```typescript
// page-link.ts内の装飾処理に追加
if (bracketContent.isIcon) {
  // アイコン専用の装飾
  const decoAttrs = {
    nodeName: "span",
    class: "inline-flex items-center user-icon-container",
    "data-user-slug": bracketContent.slug,
    "data-is-icon": "true"
  };
} else {
  // 既存のページリンク装飾
}
```

### 2.6 テスト項目
- [ ] `[username.icon]`形式の正規表現検知
- [ ] 存在するユーザーページのサムネイル表示
- [ ] 存在しないユーザーの適切なフォールバック
- [ ] 各サイズでの正常な表示
- [ ] クリック時のページ遷移

---

## Phase 3: Ctrl+Iキーボードショートカット

### 3.1 目標
Ctrl+I（Windows）/Cmd+I（Mac）で現在ユーザーの`[{user_slug}.icon]`を挿入

### 3.2 実装内容

#### 新規作成ファイル
```
app/_actions/
└── user-slug.ts              # ユーザーslug取得Server Action

lib/tiptap-extensions/
└── user-icon-shortcut.ts     # キーボードショートカット専用Extension
```

#### 修正対象ファイル
```
components/
└── tiptap-editor.tsx         # ショートカット機能追加

app/(protected)/pages/[id]/_hooks/
└── usePageEditorLogic.ts     # ショートカット機能追加
```

### 3.3 技術仕様

#### Server Action
```typescript
export async function getCurrentUserSlug(): Promise<{
  success: boolean;
  userSlug: string | null;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { success: false, userSlug: null, error: "Not authenticated" };
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("user_slug")
    .eq("id", user.id)
    .single();

  if (accountError || !account?.user_slug) {
    return { success: false, userSlug: null, error: "User slug not found" };
  }

  return { success: true, userSlug: account.user_slug };
}
```

#### Tiptapエクステンション
```typescript
export const UserIconShortcut = Extension.create({
  name: 'userIconShortcut',
  
  addKeyboardShortcuts() {
    return {
      'Mod-i': () => {
        return this.editor.commands.insertUserIcon();
      },
    };
  },

  addCommands() {
    return {
      insertUserIcon: () => ({ commands, state }) => {
        // getCurrentUserSlug()を呼び出し
        // [{user_slug}.icon]を挿入
        // エラーハンドリング
      },
    };
  },
});
```

### 3.4 実装パターン

#### 基本エディター（tiptap-editor.tsx）
```typescript
const editor = useEditor({
  extensions: [
    // 既存のエクステンション
    UserIconShortcut,
  ],
});
```

#### ページエディター（usePageEditorLogic.ts）
```typescript
const editor = useEditor({
  extensions: [
    // 既存のエクステンション
    UserIconShortcut,
  ],
});
```

### 3.5 エラーハンドリング
- 未認証：「ログインしてください」
- user_slug未設定：「プロフィール設定を完了してください」
- ネットワークエラー：「一時的に利用できません」

### 3.6 テスト項目
- [ ] Ctrl+I（Windows）での正常な挿入
- [ ] Cmd+I（Mac）での正常な挿入
- [ ] 未認証ユーザーのエラー処理
- [ ] user_slug未設定ユーザーのエラー処理
- [ ] 基本エディターでの動作
- [ ] ページエディターでの動作

---

## 統合テストシナリオ

### シナリオ1: 新規ユーザーの完全フロー
1. 新規ユーザーがノートに参加
2. ユーザーページが自動作成される
3. アバターがアイコンとして設定される
4. `[newuser.icon]`でアイコン表示される
5. Ctrl+Iで自分のアイコンを挿入できる

### シナリオ2: 既存ユーザーの機能追加
1. 既存ユーザーがノートに参加
2. 既存ページがnote_page_linksに追加される
3. `[existinguser.icon]`でアイコン表示される
4. Ctrl+Iで自分のアイコンを挿入できる

### シナリオ3: エラー処理
1. user_slug未設定ユーザーの処理
2. アバター未設定ユーザーのフォールバック
3. 存在しないユーザーの.icon表示
4. ネットワークエラー時の処理

---

## パフォーマンス要件

### Phase 1
- ユーザーページ作成：500ms以内
- アイコン設定：100ms以内

### Phase 2
- .icon表示判定：10ms以内
- サムネイル取得：200ms以内

### Phase 3
- キーボードショートカット応答：50ms以内
- user_slug取得：100ms以内

---

## リリース戦略

### Phase 1 リリース判定
- [ ] ユーザーページ自動作成機能完成
- [ ] アイコン自動設定機能完成
- [ ] エラーハンドリング実装
- [ ] 単体テスト90%以上

### Phase 2 リリース判定
- [ ] .iconサフィックス表示機能完成
- [ ] フォールバック処理実装
- [ ] レスポンシブ対応
- [ ] 統合テスト完了

### Phase 3 リリース判定
- [ ] キーボードショートカット機能完成
- [ ] 全エディターでの動作確認
- [ ] エラーメッセージの多言語化
- [ ] 総合テスト完了

---

## 注意事項

### 既存機能への影響
- 既存のページリンク機能に影響しないよう注意
- パフォーマンス劣化の監視
- 既存ユーザーの体験向上を最優先

### セキュリティ考慮
- user_slug検証の強化
- XSS対策の徹底
- 権限チェックの厳密化

### 将来の拡張性
- 他ユーザーアイコン表示（@メンション）
- アイコンサイズ指定機能
- アイコンスタイルカスタマイズ
