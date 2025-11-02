# ProviderCard.spec.md

**Component Name:** ProviderCard
**Created:** 2025-11-02
**Category:** Settings / UI Component

---

## Overview

プロバイダー（Google/OpenAI/Anthropic）の情報と設定状態を表示するカードコンポーネント。
ユーザーがAPIキーを設定・編集・削除するアクションを提供します。

---

## Requirements

### Functional Requirements

**FR-001: プロバイダー情報表示**
- プロバイダーのアイコン/ロゴを表示
- プロバイダー名を表示
- 簡潔な説明文を表示
- ドキュメントURLへのリンクを表示

**FR-002: 設定状態表示**
- 設定済み/未設定のバッジを表示
- 設定済みの場合、最終更新日時を表示
- 視覚的に状態が判別できるデザイン

**FR-003: アクションボタン**
- 未設定の場合: [設定] ボタン表示
- 設定済みの場合: [編集] [削除] ボタン表示
- クリック時に適切なコールバックを実行

**FR-004: レスポンシブデザイン**
- モバイル: 1列表示
- タブレット: 2列表示
- デスクトップ: 3列表示

---

### Non-Functional Requirements

**NFR-001: パフォーマンス**
- 初回レンダリング: < 16ms
- 再レンダリング最小化（React.memo使用）

**NFR-002: アクセシビリティ**
- キーボードナビゲーション対応
- スクリーンリーダー対応（適切なaria-label）
- フォーカス表示の明確化

**NFR-003: スタイリング**
- Tailwind CSS使用
- shadcn/ui Cardコンポーネント使用
- ダークモード対応

---

## Component Specification

### Props Interface

```typescript
export interface ProviderCardProps {
  /** プロバイダー識別子 */
  provider: LLMProvider;
  
  /** APIキーが設定済みかどうか */
  configured: boolean;
  
  /** 最終更新日時（ISO 8601形式） */
  updatedAt: string | null;
  
  /** 設定/編集ボタンクリック時のコールバック */
  onConfigure: () => void;
  
  /** 削除ボタンクリック時のコールバック */
  onDelete: () => void;
  
  /** ローディング状態（削除中など） */
  isLoading?: boolean;
}
```

---

### Provider Configuration

```typescript
interface ProviderInfo {
  name: string;
  icon: string;
  color: string;
  description: string;
  docsUrl: string;
}

const PROVIDER_CONFIG: Record<LLMProvider, ProviderInfo> = {
  google: {
    name: "Google Gemini",
    icon: "🤖",
    color: "blue",
    description: "Googleの最新LLMモデル。gemini-2.0-flash-expなど高速で強力なモデルを提供。",
    docsUrl: "https://ai.google.dev/",
  },
  openai: {
    name: "OpenAI",
    icon: "🎨",
    color: "green",
    description: "GPT-4o等の強力なモデル。チャット、画像生成、音声認識など幅広く対応。",
    docsUrl: "https://platform.openai.com/",
  },
  anthropic: {
    name: "Anthropic Claude",
    icon: "🧠",
    color: "purple",
    description: "Claude 3.5 Sonnet等、長文理解に優れたモデルを提供。",
    docsUrl: "https://docs.anthropic.com/",
  },
};
```

---

### Component Structure

```tsx
<Card className="relative">
  {/* ローディングオーバーレイ */}
  {isLoading && <LoadingOverlay />}
  
  <CardHeader>
    {/* アイコン + タイトル + バッジ */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <CardTitle>{name}</CardTitle>
      </div>
      <APIKeyStatusBadge configured={configured} />
    </div>
  </CardHeader>
  
  <CardContent>
    {/* 説明文 */}
    <p className="text-sm text-muted-foreground mb-4">
      {description}
    </p>
    
    {/* 最終更新日時 */}
    {configured && updatedAt && (
      <p className="text-xs text-muted-foreground">
        最終更新: {formatDate(updatedAt)}
      </p>
    )}
    
    {/* ドキュメントリンク */}
    <a 
      href={docsUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-xs text-primary hover:underline"
    >
      ドキュメントを見る →
    </a>
  </CardContent>
  
  <CardFooter>
    {/* アクションボタン */}
    {!configured ? (
      <Button onClick={onConfigure} className="w-full">
        設定
      </Button>
    ) : (
      <div className="flex gap-2 w-full">
        <Button onClick={onConfigure} variant="outline" className="flex-1">
          編集
        </Button>
        <Button onClick={onDelete} variant="destructive" className="flex-1">
          削除
        </Button>
      </div>
    )}
  </CardFooter>
</Card>
```

---

## Test Cases

### TC-001: 未設定状態の表示

**Given:**
- `configured = false`
- `updatedAt = null`

**When:**
- コンポーネントがレンダリングされる

**Then:**
- "未設定" バッジが表示される
- [設定] ボタンが表示される
- [編集] [削除] ボタンは表示されない
- 最終更新日時は表示されない

---

### TC-002: 設定済み状態の表示

**Given:**
- `configured = true`
- `updatedAt = "2025-11-02T10:00:00Z"`

**When:**
- コンポーネントがレンダリングされる

**Then:**
- "✓ 設定済み" バッジが表示される
- [編集] [削除] ボタンが表示される
- [設定] ボタンは表示されない
- 最終更新日時が "2025年11月2日 10:00" 形式で表示される

---

### TC-003: 設定ボタンクリック

**Given:**
- `configured = false`

**When:**
- [設定] ボタンをクリック

**Then:**
- `onConfigure()` コールバックが呼ばれる
- 他の状態は変化しない

---

### TC-004: 編集ボタンクリック

**Given:**
- `configured = true`

**When:**
- [編集] ボタンをクリック

**Then:**
- `onConfigure()` コールバックが呼ばれる

---

### TC-005: 削除ボタンクリック

**Given:**
- `configured = true`

**When:**
- [削除] ボタンをクリック

**Then:**
- `onDelete()` コールバックが呼ばれる

---

### TC-006: ローディング状態

**Given:**
- `isLoading = true`

**When:**
- コンポーネントがレンダリングされる

**Then:**
- ローディングオーバーレイが表示される
- すべてのボタンが無効化される
- カード全体が半透明になる

---

### TC-007: プロバイダー情報表示（Google）

**Given:**
- `provider = "google"`

**When:**
- コンポーネントがレンダリングされる

**Then:**
- アイコン "🤖" が表示される
- タイトル "Google Gemini" が表示される
- 説明文が表示される
- ドキュメントリンクが https://ai.google.dev/ を指す

---

### TC-008: プロバイダー情報表示（OpenAI）

**Given:**
- `provider = "openai"`

**When:**
- コンポーネントがレンダリングされる

**Then:**
- アイコン "🎨" が表示される
- タイトル "OpenAI" が表示される
- 説明文が表示される
- ドキュメントリンクが https://platform.openai.com/ を指す

---

### TC-009: プロバイダー情報表示（Anthropic）

**Given:**
- `provider = "anthropic"`

**When:**
- コンポーネントがレンダリングされる

**Then:**
- アイコン "🧠" が表示される
- タイトル "Anthropic Claude" が表示される
- 説明文が表示される
- ドキュメントリンクが https://docs.anthropic.com/ を指す

---

### TC-010: キーボードナビゲーション

**Given:**
- コンポーネントがレンダリングされている

**When:**
- Tab キーでフォーカスを移動

**Then:**
- ボタン、リンクにフォーカスが移動する
- フォーカス表示が明確に見える

---

### TC-011: ドキュメントリンククリック

**Given:**
- コンポーネントがレンダリングされている

**When:**
- "ドキュメントを見る" リンクをクリック

**Then:**
- 新しいタブでドキュメントページが開く
- `rel="noopener noreferrer"` が設定されている

---

### TC-012: 日時フォーマット

**Given:**
- `updatedAt = "2025-11-02T15:30:45Z"`

**When:**
- コンポーネントがレンダリングされる

**Then:**
- "最終更新: 2025年11月2日 15:30" 形式で表示される
- タイムゾーンはユーザーのローカルタイムゾーン

---

## Implementation Notes

### Date Formatting

```typescript
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
```

---

### Loading Overlay

```tsx
function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
```

---

### Performance Optimization

```tsx
export const ProviderCard = React.memo(ProviderCardComponent);
```

---

### Accessibility

```tsx
<Button
  onClick={onConfigure}
  aria-label={`${providerInfo.name} の APIキーを設定`}
>
  設定
</Button>

<Button
  onClick={onDelete}
  aria-label={`${providerInfo.name} の APIキーを削除`}
>
  削除
</Button>
```

---

## Dependencies

### External Dependencies
- `react`: ^18.0.0
- `@/components/ui/card`: shadcn/ui Card components
- `@/components/ui/button`: shadcn/ui Button component
- `lucide-react`: Icons (Loader2)

### Internal Dependencies
- `@/components/settings/APIKeyStatusBadge`: Status badge component
- `@/types/llm`: LLMProvider type definition

---

## Related Files

- **Implementation**: `components/settings/ProviderCard.tsx`
- **Tests**: `components/settings/__tests__/ProviderCard.test.tsx`
- **Status Badge**: `components/settings/APIKeyStatusBadge.tsx`
- **Parent Component**: `components/settings/APIKeySettings.tsx`

---

## Visual Design

```
┌─────────────────────────────────────────────────┐
│ 🤖 Google Gemini              [✓ 設定済み]      │
├─────────────────────────────────────────────────┤
│                                                 │
│ Googleの最新LLMモデル。gemini-2.0-flash-exp     │
│ など高速で強力なモデルを提供。                   │
│                                                 │
│ 最終更新: 2025年11月2日 10:00                   │
│                                                 │
│ ドキュメントを見る →                            │
│                                                 │
├─────────────────────────────────────────────────┤
│ [    編集    ]  [    削除    ]                  │
└─────────────────────────────────────────────────┘

未設定の場合:
┌─────────────────────────────────────────────────┐
│ 🎨 OpenAI                        [未設定]       │
├─────────────────────────────────────────────────┤
│                                                 │
│ GPT-4o等の強力なモデル。チャット、画像生成、    │
│ 音声認識など幅広く対応。                        │
│                                                 │
│ ドキュメントを見る →                            │
│                                                 │
├─────────────────────────────────────────────────┤
│ [           設定           ]                    │
└─────────────────────────────────────────────────┘
```

---

**Last Updated:** 2025-11-02
**Status:** Ready for Implementation
**Next Step:** Implementation → Testing
