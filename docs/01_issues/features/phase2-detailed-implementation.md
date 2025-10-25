# Phase 2: .iconサフィックス表示機能 - 詳細実装計画書

## 1. 既存ロジック分析と活用方針

### 1.1 既存のブラケット記法処理の詳細分析

#### 核心的な処理の場所
| コンポーネント | ファイル | 役割 | 修正対象 |
|---|---|---|---|
| 正規表現マッチング | `page-link.ts:117` | `const bracketRegex = /\[([^\[\]]+)\]/g;` | ✅拡張 |
| 装飾処理 | `page-link.ts:118-189` | `for (const match of text.matchAll(bracketRegex))` | ✅拡張 |
| 存在確認マップ | `page-link.ts:75-78` | `existMap.get(title)` | ✅拡張 |
| クリック処理 | `page-link.ts:568-737` | ブラケット内容の解析・遷移 | ✅拡張 |

#### 活用可能な既存パターン
```typescript
// 現在の処理フロー（page-link.ts:126-148）
const title = match[1];                    // ブラケット内容取得
const isExternal = /^https?:\/\//.test(title);   // 外部リンク判定
const pageId = existMap.get(title);        // ページ存在確認
const exists = isExternal || Boolean(pageId);    // 存在判定
const cls = exists ? "text-blue-500" : "text-red-500";  // 色指定
```

### 1.2 拡張が必要な箇所の特定

#### 1. 正規表現処理の拡張（最小限）
```typescript
// 既存: title = match[1] の単純な取得
// 拡張: .iconサフィックスの検知と分離
function parseBracketContent(content: string): {
  slug: string;
  isIcon: boolean;
  type: 'page' | 'icon' | 'external';
} {
  // .iconサフィックス検知
  const iconMatch = content.match(/^(.+)\.icon$/);
  if (iconMatch) {
    return {
      slug: iconMatch[1],
      isIcon: true,
      type: 'icon'
    };
  }
  
  // 外部リンク判定
  if (/^https?:\/\//.test(content)) {
    return {
      slug: content,
      isIcon: false,
      type: 'external'
    };
  }
  
  // 通常のページリンク
  return {
    slug: content,
    isIcon: false,
    type: 'page'
  };
}
```

#### 2. 装飾処理の拡張
```typescript
// 既存の装飾属性生成を条件分岐で拡張
if (parsedContent.isIcon) {
  // アイコン専用の装飾
  const decoAttrs = {
    nodeName: "span",
    class: "inline-flex items-center user-icon-container",
    "data-user-slug": parsedContent.slug,
    "data-is-icon": "true",
    "data-page-id": pageId || null,
  };
} else {
  // 既存のページリンク装飾（変更なし）
  const decoAttrs = {
    nodeName: "a",
    href: hrefValue,
    class: `${cls} underline cursor-pointer whitespace-normal break-all`,
    // ... 既存の属性
  };
}
```

## 2. 詳細実装設計

### 2.1 新規作成ファイル

#### components/ui/user-icon.tsx
```tsx
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface UserIconData {
  thumbnailUrl: string | null;
  pageId: string | null;
  userSlug: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  exists: boolean;
}

interface UserIconProps {
  userSlug: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  xs: "w-4 h-4 text-xs",
  sm: "w-6 h-6 text-sm", 
  md: "w-8 h-8 text-base",
  lg: "w-12 h-12 text-lg"
};

export function UserIcon({ 
  userSlug, 
  size = 'sm', 
  showName = false,
  className,
  onClick
}: UserIconProps) {
  const [iconData, setIconData] = useState<UserIconData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchIconData() {
      try {
        const response = await fetch(`/api/user-icon/${userSlug}`);
        if (response.ok) {
          const data = await response.json();
          setIconData(data);
        } else {
          // ユーザーが存在しない場合のフォールバック
          setIconData({
            thumbnailUrl: null,
            pageId: null,
            userSlug,
            exists: false
          });
        }
      } catch (error) {
        console.error("Failed to fetch user icon data:", error);
        setIconData({
          thumbnailUrl: null,
          pageId: null,
          userSlug,
          exists: false
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchIconData();
  }, [userSlug]);
  
  if (loading) {
    return (
      <div className={cn(
        "rounded-full bg-gray-200 animate-pulse",
        sizeClasses[size],
        className
      )} />
    );
  }
  
  // フォールバック順序の決定
  let imageUrl: string | null = null;
  let fallbackText = userSlug.charAt(0).toUpperCase();
  
  if (iconData) {
    // 1. ページサムネイル
    if (iconData.thumbnailUrl) {
      imageUrl = iconData.thumbnailUrl;
    }
    // 2. ユーザーアバター
    else if (iconData.avatarUrl) {
      imageUrl = iconData.avatarUrl;
    }
    
    // 表示名の決定
    if (iconData.fullName) {
      fallbackText = iconData.fullName.charAt(0).toUpperCase();
    }
  }
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (iconData?.pageId) {
      // デフォルトのクリック動作：ユーザーページに遷移
      window.location.href = `/pages/${iconData.pageId}`;
    }
  };
  
  return (
    <div className={cn(
      "inline-flex items-center gap-2",
      onClick || iconData?.pageId ? "cursor-pointer" : "cursor-default",
      className
    )}>
      <Avatar 
        className={cn(sizeClasses[size])}
        onClick={handleClick}
      >
        {imageUrl ? (
          <AvatarImage 
            src={imageUrl} 
            alt={`${userSlug}のアイコン`}
          />
        ) : null}
        <AvatarFallback className={cn(
          "bg-gradient-to-br from-blue-400 to-purple-500 text-white font-medium",
          !iconData?.exists && "bg-gray-400"
        )}>
          {fallbackText}
        </AvatarFallback>
      </Avatar>
      
      {showName && (
        <span 
          className={cn(
            "font-medium",
            !iconData?.exists && "text-gray-500",
            onClick || iconData?.pageId ? "hover:underline" : ""
          )}
          onClick={handleClick}
        >
          {iconData?.fullName || userSlug}
        </span>
      )}
    </div>
  );
}
```

#### app/api/user-icon/[slug]/route.ts
```typescript
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();
    
    // 1. ユーザー情報取得
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id, user_slug, avatar_url, full_name")
      .eq("user_slug", slug)
      .single();
      
    if (accountError || !account) {
      return NextResponse.json(
        { exists: false, userSlug: slug },
        { status: 404 }
      );
    }
    
    // 2. ユーザーページ取得
    const { data: page, error: pageError } = await supabase
      .from("pages")
      .select("id, thumbnail_url")
      .eq("user_id", account.id)
      .eq("title", slug)
      .single();
    
    // ページが存在しない場合はアバターのみ返す
    if (pageError || !page) {
      return NextResponse.json({
        exists: true,
        userSlug: slug,
        pageId: null,
        thumbnailUrl: null,
        avatarUrl: account.avatar_url,
        fullName: account.full_name,
      });
    }
    
    // ページが存在する場合はサムネイル優先
    return NextResponse.json({
      exists: true,
      userSlug: slug,
      pageId: page.id,
      thumbnailUrl: page.thumbnail_url,
      avatarUrl: account.avatar_url,
      fullName: account.full_name,
    });
    
  } catch (error) {
    console.error("User icon API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### 2.2 既存ファイルの修正

#### lib/tiptap-extensions/page-link.ts の修正
```typescript
// 1. ユーティリティ関数の追加（上部に配置）
interface BracketContent {
  slug: string;
  isIcon: boolean;
  type: 'page' | 'icon' | 'external';
}

function parseBracketContent(content: string): BracketContent {
  // .iconサフィックス検知
  const iconMatch = content.match(/^(.+)\.icon$/);
  if (iconMatch) {
    return {
      slug: iconMatch[1],
      isIcon: true,
      type: 'icon'
    };
  }
  
  // 外部リンク判定
  if (/^https?:\/\//.test(content)) {
    return {
      slug: content,
      isIcon: false,
      type: 'external'
    };
  }
  
  return {
    slug: content,
    isIcon: false,
    type: 'page'
  };
}

// 2. 装飾処理の修正（line 117-189を置き換え）
const bracketRegex = /\[([^\[\]]+)\]/g;
for (const match of text.matchAll(bracketRegex)) {
  const start = pos + (match.index ?? 0);
  const end = start + match[0].length;
  
  if (isCodeContext) {
    decos.push(Decoration.inline(start, end, { nodeName: "span" }));
    continue;
  }
  
  const bracketContent = parseBracketContent(match[1]);
  
  if (bracketContent.isIcon) {
    // アイコン表示の処理
    const pageId = existMap.get(bracketContent.slug);
    const exists = Boolean(pageId);
    
    const decoAttrs = {
      nodeName: "span",
      class: "inline-flex items-center user-icon-wrapper",
      "data-user-slug": bracketContent.slug,
      "data-is-icon": "true",
      "data-page-id": pageId || "",
      "data-exists": exists.toString(),
      style: "vertical-align: middle;",
    };
    
    if (start >= paraStart && end <= paraEnd) {
      decos.push(Decoration.inline(start, end, decoAttrs));
    } else {
      // 非アクティブ時も同様の処理
      decos.push(
        Decoration.inline(start, start + 1, { style: "display: none" })
      );
      decos.push(
        Decoration.inline(end - 1, end, { style: "display: none" })
      );
      decos.push(Decoration.inline(start + 1, end - 1, {
        ...decoAttrs,
        contentEditable: "false",
      }));
    }
  } else {
    // 既存のページリンク処理（変更なし）
    const title = bracketContent.slug;
    const isExternal = bracketContent.type === 'external';
    const pageId = existMap.get(title);
    const exists = isExternal || Boolean(pageId);
    const cls = exists ? "text-blue-500" : "text-red-500";
    
    const hrefValue = isExternal
      ? title
      : pageId
        ? `/pages/${pageId}`
        : "#";
    
    const decoAttrs = {
      nodeName: "a",
      href: hrefValue,
      class: `${cls} underline cursor-pointer whitespace-normal break-all`,
      ...(isExternal
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {}),
      ...(!exists && !isExternal ? { "data-page-title": title } : {}),
      ...(pageId && !isExternal ? { "data-page-id": pageId } : {}),
    };
    
    // 既存の装飾処理
    if (start >= paraStart && end <= paraEnd) {
      decos.push(Decoration.inline(start, end, decoAttrs));
    } else {
      decos.push(
        Decoration.inline(start, start + 1, { style: "display: none" })
      );
      decos.push(
        Decoration.inline(end - 1, end, { style: "display: none" })
      );
      const inactiveAttrs: Record<string, string> = {
        ...decoAttrs,
        contentEditable: "false",
      };
      if (!isExternal && !pageId) {
        inactiveAttrs["data-page-title"] = title;
      }
      decos.push(Decoration.inline(start + 1, end - 1, inactiveAttrs));
    }
  }
}

// 3. クリック処理の修正（line 568-737に追加）
// handleClick関数内のbracketContent処理部分に追加
if (!bracketContent) return false;

const parsedContent = parseBracketContent(bracketContent);

if (parsedContent.isIcon) {
  // アイコンクリック時の処理
  console.log("🔗 PageLink: アイコンクリック検出", {
    userSlug: parsedContent.slug,
    noteSlug,
  });
  
  // ユーザーページに遷移
  (async () => {
    try {
      const supabase = createClient();
      const { data: account, error: accountError } = await supabase
        .from("accounts")
        .select("id")
        .eq("user_slug", parsedContent.slug)
        .single();
        
      if (accountError || !account) {
        toast.error(`ユーザー "${parsedContent.slug}" が見つかりません`);
        return;
      }
      
      const { data: page, error: pageError } = await supabase
        .from("pages")
        .select("id")
        .eq("user_id", account.id)
        .eq("title", parsedContent.slug)
        .single();
        
      if (pageError || !page) {
        toast.error(`ユーザーページが見つかりません`);
        return;
      }
      
      // ノートコンテキストに応じた遷移
      if (noteSlug) {
        window.location.href = `/notes/${encodeURIComponent(noteSlug)}/${page.id}`;
      } else {
        window.location.href = `/pages/${page.id}`;
      }
    } catch (error) {
      console.error("アイコンクリック処理エラー:", error);
      toast.error("ページ遷移に失敗しました");
    }
  })();
  
  return true;
}

// 既存のページリンククリック処理はそのまま
const searchTitle = parsedContent.slug.replace(/_/g, " ");
// ... 既存の処理
```

### 2.3 CSS/スタイリングの追加

#### globals.css への追加
```css
/* ユーザーアイコン表示用のスタイル */
.user-icon-wrapper {
  @apply inline-flex items-center;
  vertical-align: middle;
}

.user-icon-wrapper::before {
  content: '';
  display: inline-block;
  width: 1.5rem;
  height: 1.5rem;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 50%;
  margin-right: 0.25rem;
  flex-shrink: 0;
}

.user-icon-wrapper[data-exists="false"]::before {
  background: #6b7280;
}

/* アイコンが読み込まれた後のスタイル調整 */
.user-icon-wrapper.loaded::before {
  display: none;
}
```

### 2.4 クライアントサイドでの動的レンダリング

#### lib/utils/user-icon-renderer.ts
```typescript
"use client";

import { createRoot } from 'react-dom/client';
import { UserIcon } from '@/components/ui/user-icon';
import React from 'react';

/**
 * DOM上のuser-icon-wrapperを実際のUserIconコンポーネントに置き換え
 */
export function renderUserIcons() {
  const iconWrappers = document.querySelectorAll('[data-is-icon="true"]');
  
  iconWrappers.forEach((wrapper) => {
    const userSlug = wrapper.getAttribute('data-user-slug');
    const pageId = wrapper.getAttribute('data-page-id');
    
    if (!userSlug) return;
    
    // 既にレンダリング済みの場合はスキップ
    if (wrapper.classList.contains('user-icon-rendered')) return;
    
    // Reactコンポーネントをマウント
    const container = document.createElement('span');
    container.className = 'user-icon-container';
    
    const root = createRoot(container);
    root.render(
      React.createElement(UserIcon, {
        userSlug,
        size: 'sm',
        onClick: pageId ? () => {
          const currentUrl = window.location.pathname;
          if (currentUrl.includes('/notes/')) {
            const noteSlug = currentUrl.split('/notes/')[1]?.split('/')[0];
            if (noteSlug) {
              window.location.href = `/notes/${encodeURIComponent(noteSlug)}/${pageId}`;
              return;
            }
          }
          window.location.href = `/pages/${pageId}`;
        } : undefined
      })
    );
    
    // 元の要素を置き換え
    wrapper.parentNode?.replaceChild(container, wrapper);
    container.classList.add('user-icon-rendered');
  });
}

/**
 * Tiptapエディターの更新時に呼び出すためのフック
 */
export function useUserIconRenderer(editor: any) {
  React.useEffect(() => {
    if (!editor) return;
    
    const handleUpdate = () => {
      // 少し遅延させてからレンダリング（DOMの更新を待つ）
      setTimeout(renderUserIcons, 100);
    };
    
    editor.on('update', handleUpdate);
    
    // 初回レンダリング
    renderUserIcons();
    
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor]);
}
```

## 3. エディターとの統合

### 3.1 usePageEditorLogic.ts の修正
```typescript
import { useUserIconRenderer } from '@/lib/utils/user-icon-renderer';

export function usePageEditorLogic(props: UsePageEditorLogicProps) {
  // 既存のeditor作成処理
  const editor = useEditor({
    // ... 既存の設定
  });
  
  // ユーザーアイコンレンダリングの追加
  useUserIconRenderer(editor);
  
  // 既存の戻り値
  return {
    editor,
    // ... その他
  };
}
```

### 3.2 tiptap-editor.tsx の修正
```typescript
import { useUserIconRenderer } from '@/lib/utils/user-icon-renderer';

const TiptapEditor = ({ content, onChange, placeholder, userId }: TiptapEditorProps) => {
  const editor = useEditor({
    // ... 既存の設定
  });
  
  // ユーザーアイコンレンダリングの追加
  useUserIconRenderer(editor);
  
  // 既存のJSX
  return (
    <>
      {/* 既存のツールバー */}
      <EditorContent editor={editor} />
    </>
  );
};
```

## 4. テスト戦略

### 4.1 単体テスト

#### parseBracketContent関数
```typescript
describe('parseBracketContent', () => {
  it('.iconサフィックスを正しく検知', () => {
    const result = parseBracketContent('username.icon');
    expect(result).toEqual({
      slug: 'username',
      isIcon: true,
      type: 'icon'
    });
  });
  
  it('通常のページリンクは変更なし', () => {
    const result = parseBracketContent('page-name');
    expect(result).toEqual({
      slug: 'page-name',
      isIcon: false,
      type: 'page'
    });
  });
});
```

#### UserIcon コンポーネント
```typescript
describe('UserIcon', () => {
  it('サムネイル優先での表示', async () => {
    // モックAPI設定
    const { getByRole } = render(<UserIcon userSlug="testuser" />);
    // アバター要素の確認
  });
  
  it('存在しないユーザーのフォールバック', async () => {
    // 404レスポンスのモック
    const { getByText } = render(<UserIcon userSlug="nonexistent" />);
    // フォールバック表示の確認
  });
});
```

### 4.2 統合テスト

#### エディター内でのアイコン表示
```typescript
describe('Icon display in editor', () => {
  it('[username.icon] がアイコンに変換される', () => {
    // エディターにテキスト入力
    // アイコン要素の生成確認
    // クリック動作の確認
  });
});
```

## 5. パフォーマンス最適化

### 5.1 APIキャッシュ戦略
- ブラウザキャッシュの活用（60秒）
- 同一ページ内での重複リクエスト防止
- Supabaseクエリの最適化

### 5.2 レンダリング最適化
- 非同期レンダリングによるブロッキング回避
- IntersectionObserverによる遅延読み込み
- React.memoによる不要な再レンダリング防止

## 6. 将来の拡張性

### 6.1 追加機能の準備
- サイズ指定（`username.icon@lg`）
- スタイル指定（`username.icon#rounded`）
- ステータス表示（オンライン状態など）

### 6.2 国際化対応
- エラーメッセージの多言語化
- ユーザー名表示の地域設定対応
