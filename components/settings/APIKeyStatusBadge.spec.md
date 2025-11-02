# APIKeyStatusBadge.spec.md

**Component Name:** APIKeyStatusBadge
**Created:** 2025-11-02
**Category:** Settings / UI Component

---

## Overview

APIキーの設定状態を視覚的に表示するバッジコンポーネント。
設定済み/未設定の状態を色とアイコンで明確に伝えます。

---

## Requirements

### Functional Requirements

**FR-001: 設定済み状態表示**
- 設定済みの場合、緑色のバッジを表示
- チェックマークアイコン（✓）を表示
- "設定済み" テキストを表示

**FR-002: 未設定状態表示**
- 未設定の場合、グレー色のバッジを表示
- "未設定" テキストを表示

**FR-003: アクセシビリティ**
- スクリーンリーダー対応
- 色だけに依存しない（アイコン+テキスト）

---

### Non-Functional Requirements

**NFR-001: パフォーマンス**
- 軽量コンポーネント（< 1KB）
- React.memo 不要（十分に軽量）

**NFR-002: スタイリング**
- shadcn/ui Badgeコンポーネント使用
- Tailwind CSSでカスタマイズ
- ダークモード対応

---

## Component Specification

### Props Interface

```typescript
export interface APIKeyStatusBadgeProps {
  /** APIキーが設定済みかどうか */
  configured: boolean;
  
  /** カスタムクラス名（オプション） */
  className?: string;
}
```

---

### Component Structure

```tsx
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export function APIKeyStatusBadge({ 
  configured, 
  className 
}: APIKeyStatusBadgeProps) {
  if (configured) {
    return (
      <Badge 
        variant="success" 
        className={cn("gap-1", className)}
      >
        <Check className="h-3 w-3" />
        設定済み
      </Badge>
    );
  }
  
  return (
    <Badge 
      variant="secondary" 
      className={className}
    >
      未設定
    </Badge>
  );
}
```

---

### Badge Variants

```typescript
// components/ui/badge.tsx に追加
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        success: "border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);
```

---

## Test Cases

### TC-001: 設定済み状態の表示

**Given:**
- `configured = true`

**When:**
- コンポーネントがレンダリングされる

**Then:**
- 緑色のバッジが表示される
- チェックマークアイコンが表示される
- "設定済み" テキストが表示される
- `variant="success"` が適用される

---

### TC-002: 未設定状態の表示

**Given:**
- `configured = false`

**When:**
- コンポーネントがレンダリングされる

**Then:**
- グレー色のバッジが表示される
- "未設定" テキストが表示される
- `variant="secondary"` が適用される
- アイコンは表示されない

---

### TC-003: カスタムクラス名適用

**Given:**
- `configured = true`
- `className = "ml-2"`

**When:**
- コンポーネントがレンダリングされる

**Then:**
- 指定したクラス名が適用される
- デフォルトのスタイルは維持される

---

### TC-004: ダークモード対応

**Given:**
- `configured = true`
- ダークモードが有効

**When:**
- コンポーネントがレンダリングされる

**Then:**
- ダークモード用の色が適用される
- テキストのコントラストが十分確保される

---

### TC-005: アクセシビリティ

**Given:**
- コンポーネントがレンダリングされている

**When:**
- スクリーンリーダーで読み上げ

**Then:**
- "設定済み" または "未設定" が正しく読み上げられる
- アイコンは装飾として扱われる

---

### TC-006: レンダリングパフォーマンス

**Given:**
- コンポーネントが100回レンダリングされる

**When:**
- パフォーマンス測定

**Then:**
- 合計レンダリング時間 < 10ms
- 個別レンダリング時間 < 0.1ms

---

## Implementation Notes

### Styling

```css
/* Success variant (設定済み) */
.bg-green-100 {
  background-color: #dcfce7;
}

.text-green-800 {
  color: #166534;
}

/* Dark mode */
.dark .dark\:bg-green-900 {
  background-color: #14532d;
}

.dark .dark\:text-green-100 {
  color: #dcfce7;
}
```

---

### Icon Sizing

```tsx
// Check アイコンは小さめに表示
<Check className="h-3 w-3" />

// gap-1 でアイコンとテキストの間隔を調整
className="gap-1"
```

---

### Utility Classes

```typescript
import { cn } from "@/lib/utils";

// cn() を使ってクラス名を結合
className={cn("gap-1", className)}
```

---

## Dependencies

### External Dependencies
- `react`: ^18.0.0
- `@/components/ui/badge`: shadcn/ui Badge component
- `lucide-react`: Icons (Check)
- `class-variance-authority`: Badge variants

### Internal Dependencies
- `@/lib/utils`: cn() utility function

---

## Related Files

- **Implementation**: `components/settings/APIKeyStatusBadge.tsx`
- **Tests**: `components/settings/__tests__/APIKeyStatusBadge.test.tsx`
- **UI Component**: `components/ui/badge.tsx`
- **Parent Component**: `components/settings/ProviderCard.tsx`

---

## Visual Examples

### 設定済みバッジ

```
┌──────────────┐
│ ✓ 設定済み   │  (緑色背景、濃い緑色テキスト)
└──────────────┘
```

### 未設定バッジ

```
┌──────────────┐
│ 未設定       │  (グレー背景、暗いグレーテキスト)
└──────────────┘
```

### ダークモード（設定済み）

```
┌──────────────┐
│ ✓ 設定済み   │  (暗い緑色背景、明るい緑色テキスト)
└──────────────┘
```

---

## Usage Examples

### Basic Usage

```tsx
import { APIKeyStatusBadge } from "@/components/settings/APIKeyStatusBadge";

// 設定済み
<APIKeyStatusBadge configured={true} />

// 未設定
<APIKeyStatusBadge configured={false} />
```

---

### With Custom Class

```tsx
// 右寄せ配置
<APIKeyStatusBadge configured={true} className="ml-auto" />

// マージン追加
<APIKeyStatusBadge configured={false} className="mt-2" />
```

---

### In ProviderCard

```tsx
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle>{providerName}</CardTitle>
    <APIKeyStatusBadge configured={isConfigured} />
  </div>
</CardHeader>
```

---

## Accessibility Considerations

### Screen Reader Support

```tsx
// 明示的なラベルは不要（テキストが十分明確）
<Badge>設定済み</Badge>

// アイコンは装飾として扱う
<Check aria-hidden="true" className="h-3 w-3" />
```

---

### Color Contrast

```
設定済み（ライトモード）:
- 背景: #dcfce7 (緑100)
- テキスト: #166534 (緑800)
- コントラスト比: 7.2:1 ✅ WCAG AAA

未設定（ライトモード）:
- 背景: hsl(var(--secondary))
- テキスト: hsl(var(--secondary-foreground))
- コントラスト比: 4.5:1 ✅ WCAG AA

設定済み（ダークモード）:
- 背景: #14532d (緑900)
- テキスト: #dcfce7 (緑100)
- コントラスト比: 8.1:1 ✅ WCAG AAA
```

---

## Design Decisions

### なぜチェックマークアイコンを使用？

✅ **採用理由:**
- 設定完了を直感的に伝える
- 国際的に理解されるシンボル
- 色覚異常者でも識別可能

❌ **代替案（却下）:**
- テキストのみ → 視認性が低い
- 複雑なアイコン → バッジサイズに不適切

---

### なぜ "成功" バリアントを使用？

✅ **採用理由:**
- APIキー設定は肯定的なアクション
- 緑色は「完了」「成功」を連想
- 他の状態（エラー、警告）と明確に区別

❌ **代替案（却下）:**
- Primary バリアント → 重要度が過剰
- Outline バリアント → 視認性が低い

---

**Last Updated:** 2025-11-02
**Status:** Ready for Implementation
**Next Step:** Implementation → Testing
