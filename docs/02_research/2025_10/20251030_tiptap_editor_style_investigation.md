# TipTapエディター スタイル変更機能 調査レポート

**作成日**: 2025-10-30  
**対象**: TipTapエディターのスタイル機能実装調査  
**関連ファイル**: `components/tiptap-editor.tsx`

---

## 📋 目次

1. [概要](#概要)
2. [現在実装されているスタイル機能](#現在実装されているスタイル機能)
3. [カスタム拡張機能の詳細](#カスタム拡張機能の詳細)
4. [未実装のスタイル機能](#未実装のスタイル機能)
5. [スタイル適用の仕組み](#スタイル適用の仕組み)
6. [新しいスタイル機能の追加方法](#新しいスタイル機能の追加方法)
7. [関連ファイル構造](#関連ファイル構造)
8. [推奨される実装パターン](#推奨される実装パターン)

---

## 概要

このドキュメントは、For All Learnersプロジェクトで使用しているTipTapエディターのスタイル変更機能について調査した結果をまとめたものです。

### 調査対象

- **メインエディタコンポーネント**: `components/tiptap-editor.tsx`
- **カスタム拡張機能**: `lib/tiptap-extensions/`
- **スタイル定義**: `app/globals.css`
- **依存関係**: `package.json`

---

## 現在実装されているスタイル機能

### 1. 基本的なテキストスタイル

**実装場所**: `components/tiptap-editor.tsx` のツールバー

#### Bold（太字）

```typescript
<Button
  type="button"
  onClick={() => editor.chain().focus().toggleBold().run()}
  variant={editor.isActive("bold") ? "default" : "outline"}
  size="sm"
>
  Bold
</Button>
```

- **コマンド**: `editor.chain().focus().toggleBold().run()`
- **状態確認**: `editor.isActive("bold")`
- **提供元**: `StarterKit` (デフォルト機能)

#### Italic（斜体）

```typescript
<Button
  type="button"
  onClick={() => editor.chain().focus().toggleItalic().run()}
  variant={editor.isActive("italic") ? "default" : "outline"}
  size="sm"
>
  Italic
</Button>
```

- **コマンド**: `editor.chain().focus().toggleItalic().run()`
- **状態確認**: `editor.isActive("italic")`
- **提供元**: `StarterKit` (デフォルト機能)

#### Strike（取り消し線）

```typescript
<Button
  type="button"
  onClick={() => editor.chain().focus().toggleStrike().run()}
  variant={editor.isActive("strike") ? "default" : "outline"}
  size="sm"
>
  Strike
</Button>
```

- **コマンド**: `editor.chain().focus().toggleStrike().run()`
- **状態確認**: `editor.isActive("strike")`
- **提供元**: `StarterKit` (デフォルト機能)

### 2. テキスト配置（TextAlign）

**実装場所**: `components/tiptap-editor.tsx` の拡張機能設定

```typescript
TextAlign.configure({
  types: ["heading", "paragraph"],
})
```

#### 利用可能な配置コマンド

- **左揃え**: `editor.chain().focus().setTextAlign('left').run()`
- **中央揃え**: `editor.chain().focus().setTextAlign('center').run()`
- **右揃え**: `editor.chain().focus().setTextAlign('right').run()`
- **両端揃え**: `editor.chain().focus().setTextAlign('justify').run()`

**注意**: ツールバーボタンは未実装のため、プログラム的にのみ使用可能

### 3. Typography（タイポグラフィ）

**実装場所**: `components/tiptap-editor.tsx`

```typescript
Typography, // タイポグラフィ関連のショートカット（例: (c) -> ©）
```

#### 自動変換例

- `(c)` → `©`
- `(r)` → `®`
- `(tm)` → `™`
- `1/2` → `½`
- `->` → `→`
- `<-` → `←`

---

## カスタム拡張機能の詳細

### 1. Highlight（ハイライト）

**ファイル**: `lib/tiptap-extensions/highlight-extension.ts`

#### 実装内容

```typescript
export const Highlight = Mark.create<HighlightOptions, unknown>({
  name: "highlight",
  addOptions() {
    return {
      HTMLAttributes: {
        class: "bg-yellow-200",
      },
    };
  },
  parseHTML() {
    return [{ tag: "mark" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "mark",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
```

#### 使用方法

```typescript
// ハイライトを適用
editor.chain().focus().setHighlight({}).run()

// ハイライトを解除
editor.chain().focus().unsetHighlight().run()

// 状態確認
editor.isActive('highlight')
```

#### スタイル

- **背景色**: `bg-yellow-200` (Tailwind CSS)
- **HTMLタグ**: `<mark>`

---

### 2. CustomBlockquote（引用）

**ファイル**: `lib/tiptap-extensions/custom-blockquote.ts`

#### 実装内容

```typescript
export const CustomBlockquote = Blockquote.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      "blockquote",
      mergeAttributes(HTMLAttributes, {
        class: "border-l-4 border-gray-500 pl-4 italic my-4",
      }),
      0,
    ];
  },
});
```

#### スタイル詳細

- **左ボーダー**: `border-l-4 border-gray-500` (4pxの灰色ボーダー)
- **パディング**: `pl-4` (左側16px)
- **フォントスタイル**: `italic` (斜体)
- **マージン**: `my-4` (上下16px)

#### 使用方法

```typescript
// 引用ブロックに変換
editor.chain().focus().toggleBlockquote().run()

// 状態確認
editor.isActive('blockquote')
```

---

### 3. CustomHeading（見出し）

**ファイル**: `lib/tiptap-extensions/custom-heading.ts`

#### レスポンシブなサイズ設定

```typescript
const sizeClassMap: Record<number, string> = {
  1: "text-2xl sm:text-3xl md:text-4xl font-bold mt-6 mb-4",
  2: "text-xl sm:text-2xl md:text-3xl font-bold mt-5 mb-3",
  3: "text-lg sm:text-xl md:text-2xl font-bold mt-4 mb-2",
  4: "text-base sm:text-lg md:text-xl font-semibold mt-3 mb-1",
  5: "text-sm sm:text-base md:text-lg font-semibold mt-2 mb-0",
  6: "text-xs sm:text-sm md:text-base font-semibold mt-1 mb-0",
};
```

#### 使用方法

```typescript
// H1見出しに変換
editor.chain().focus().toggleHeading({ level: 1 }).run()

// H2見出しに変換
editor.chain().focus().toggleHeading({ level: 2 }).run()

// 状態確認
editor.isActive('heading', { level: 2 })
```

#### Markdownショートカット

デフォルトのMarkdown記法を1レベルシフト：

- `#` + スペース → H2 (H1を回避)
- `##` + スペース → H3
- `###` + スペース → H4

**理由**: ページタイトルとの競合を避けるため、エディタ内でH1を使用しない設計

---

### 4. CustomBulletList / CustomOrderedList（リスト）

**ファイル**: `lib/tiptap-extensions/custom-list.ts`

#### Bullet List（箇条書き）

```typescript
export const CustomBulletList = BulletList.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      "ul",
      mergeAttributes(HTMLAttributes, {
        class: "list-disc list-inside pl-5 space-y-1 mb-4",
      }),
      0,
    ];
  },
});
```

**スタイル**:
- `list-disc`: 黒丸マーカー
- `list-inside`: マーカーを内側に配置
- `pl-5`: 左パディング20px
- `space-y-1`: 項目間スペース4px
- `mb-4`: 下マージン16px

#### Ordered List（順序付きリスト）

```typescript
export const CustomOrderedList = OrderedList.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      "ol",
      mergeAttributes(HTMLAttributes, {
        class: "list-decimal list-inside pl-5 space-y-1 mb-4",
      }),
      0,
    ];
  },
});
```

**スタイル**:
- `list-decimal`: 数字マーカー
- その他は箇条書きリストと同様

#### 使用方法

```typescript
// 箇条書きリストに変換
editor.chain().focus().toggleBulletList().run()

// 順序付きリストに変換
editor.chain().focus().toggleOrderedList().run()

// 状態確認
editor.isActive('bulletList')
editor.isActive('orderedList')
```

#### Markdownショートカット

- `-` + スペース → 箇条書き
- `*` + スペース → 箇条書き
- `1.` + スペース → 順序付きリスト

---

### 5. CustomCodeBlock（コードブロック）

**ファイル**: `lib/tiptap-extensions/code-block.ts`

#### 実装内容

```typescript
export const CustomCodeBlock = CodeBlockShiki.extend({
  addInputRules() {
    const original = CodeBlockShiki.config.addInputRules?.call(this) ?? [];
    return [
      ...original,
      textblockTypeInputRule({
        find: /^code:\{([A-Za-z0-9_-]+)\}$/,
        type: this.type,
        getAttributes: (match) => ({ language: match[1] }),
      }),
    ];
  },
}).configure({
  defaultTheme: "tokyo-night",
});
```

#### 特徴

- **シンタックスハイライト**: Shiki統合
- **テーマ**: `tokyo-night`
- **カスタム記法**: `code:{language}` で言語指定

#### 使用方法

````typescript
// コードブロックに変換
editor.chain().focus().toggleCodeBlock().run()

// 言語指定付きコードブロック
editor.chain().focus().setCodeBlock({ language: 'typescript' }).run()

// 状態確認
editor.isActive('codeBlock')
````

#### Markdownショートカット

- ` ``` ` + スペース → コードブロック
- `code:{javascript}` → JavaScript コードブロック

---

## 未実装のスタイル機能

以下の拡張機能は**現在インストールされていません**：

### 1. TextStyle（テキストスタイルのベース）

```bash
bun add @tiptap/extension-text-style
```

**用途**: Color、FontFamily、FontSizeなどのベース拡張

### 2. Color（文字色変更）

```bash
bun add @tiptap/extension-color
```

**用途**: テキストの色を変更

**使用例**:
```typescript
editor.chain().focus().setColor('#FF0000').run()
```

### 3. FontFamily（フォント変更）

```bash
bun add @tiptap/extension-font-family
```

**用途**: フォントファミリーの変更

**使用例**:
```typescript
editor.chain().focus().setFontFamily('Comic Sans MS').run()
```

### 4. FontSize（フォントサイズ変更）

```bash
bun add @tiptap/extension-font-size
```

**注意**: 公式拡張機能は存在しないため、カスタム実装が必要

**参考実装**:
```typescript
import { Extension } from '@tiptap/core'

export const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },
})
```

### 5. Underline（下線）

```bash
bun add @tiptap/extension-underline
```

**用途**: テキストに下線を追加

**使用例**:
```typescript
editor.chain().focus().toggleUnderline().run()
```

### 6. TextBackground（背景色）

カスタム実装が必要

**参考実装**:
```typescript
import { Mark, mergeAttributes } from '@tiptap/core'

export const TextBackground = Mark.create({
  name: 'textBackground',
  addAttributes() {
    return {
      backgroundColor: {
        default: null,
        parseHTML: element => element.style.backgroundColor,
        renderHTML: attributes => {
          if (!attributes.backgroundColor) {
            return {}
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          }
        },
      },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'span[style*="background-color"]',
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },
})
```

---

## スタイル適用の仕組み

### 1. エディタの基本構造

**ファイル**: `components/tiptap-editor.tsx`

```typescript
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      blockquote: false, // CustomBlockquoteを使用
      codeBlock: false,  // CustomCodeBlockを使用
    }),
    CustomBlockquote,
    CustomCodeBlock,
    LatexInlineNode,
    Image.configure({ inline: false }),
    Placeholder.configure({ placeholder: placeholder || "入力してください..." }),
    Link.configure({ openOnClick: false, autolink: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Typography,
    Highlight,
    UnifiedLinkMark,
    MarkdownPaste.configure({ enabled: true, debug: false }),
  ],
  content: content ? JSON.parse(content) : undefined,
  onUpdate: ({ editor }) => {
    onChange(JSON.stringify(editor.getJSON()));
  },
  editorProps: {
    attributes: {
      class: "prose prose-sm sm:prose md:prose-lg mb-4 focus:outline-none border p-2 rounded-md min-h-[150px]",
    },
  },
});
```

### 2. CSS クラス構造

#### エディタコンテナ

```css
prose prose-sm sm:prose md:prose-lg mb-4 focus:outline-none border p-2 rounded-md min-h-[150px]
```

**役割**:
- `prose`: Tailwind Typographyのベーススタイル
- `prose-sm`, `sm:prose`, `md:prose-lg`: レスポンシブなタイポグラフィサイズ
- `mb-4`: 下マージン
- `focus:outline-none`: フォーカス時のアウトライン削除
- `border p-2 rounded-md`: ボーダー、パディング、角丸
- `min-h-[150px]`: 最小高さ

### 3. グローバルCSS（`app/globals.css`）

#### リンクスタイル

```css
/* リンク色の分岐: hrefありは青、なしは赤 */
.rich-content a[href] {
  @apply text-blue-500 underline cursor-pointer;
}
.rich-content a:not([href]) {
  @apply text-red-500 underline cursor-pointer;
}
```

#### リスト内の段落

```css
/* Treat paragraphs inside list items as inline to avoid extra block styling */
.prose li > p {
  @apply inline m-0;
}
```

#### ProseMirrorリンク状態

```css
.ProseMirror a[data-state="exists"] {
  /* 存在するページへのリンク */
}

.ProseMirror a[data-state="missing"] {
  /* 存在しないページへのリンク */
}

.ProseMirror a[data-state="grouped"] {
  /* グループ化されたリンク */
}
```

#### Blockquoteスタイル

```css
blockquote {
  margin: 1rem 0;
  padding-left: 1rem;
  border-left-width: 4px;
  border-color: #6b7280;
  font-style: italic;
}
```

---

## 新しいスタイル機能の追加方法

### パターン1: 既存の拡張機能を使用

#### 例: Highlightボタンの追加

```typescript
<Button
  type="button"
  onClick={() => editor.chain().focus().toggleHighlight().run()}
  variant={editor.isActive("highlight") ? "default" : "outline"}
  size="sm"
>
  Highlight
</Button>
```

#### 例: TextAlignボタンの追加

```typescript
<Button
  type="button"
  onClick={() => editor.chain().focus().setTextAlign('center').run()}
  variant={editor.isActive({ textAlign: 'center' }) ? "default" : "outline"}
  size="sm"
>
  Center
</Button>
```

---

### パターン2: 新しい拡張機能のインストール

#### ステップ1: 依存関係のインストール

```bash
bun add @tiptap/extension-text-style @tiptap/extension-color
```

#### ステップ2: エディタに拡張機能を追加

```typescript
// components/tiptap-editor.tsx
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'

const editor = useEditor({
  extensions: [
    // ... 既存の拡張機能
    TextStyle,
    Color.configure({
      types: ['textStyle'],
    }),
  ],
  // ...
})
```

#### ステップ3: ツールバーにUIを追加

```typescript
<input
  type="color"
  onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
  value={editor.getAttributes('textStyle').color || '#000000'}
  className="h-8 w-16 cursor-pointer"
/>
```

---

### パターン3: カスタム拡張機能の作成

#### 例: 蛍光ペン風ハイライト

**ファイル**: `lib/tiptap-extensions/custom-text-background.ts`

```typescript
import { Mark, mergeAttributes } from '@tiptap/core'

export interface TextBackgroundOptions {
  HTMLAttributes: Record<string, any>
}

export const TextBackground = Mark.create<TextBackgroundOptions>({
  name: 'textBackground',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      backgroundColor: {
        default: null,
        parseHTML: element => element.style.backgroundColor || null,
        renderHTML: attributes => {
          if (!attributes.backgroundColor) {
            return {}
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[style*="background-color"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setTextBackground: (backgroundColor: string) => ({ commands }) => {
        return commands.setMark(this.name, { backgroundColor })
      },
      unsetTextBackground: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },
})

// Type declarations
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textBackground: {
      setTextBackground: (backgroundColor: string) => ReturnType
      unsetTextBackground: () => ReturnType
    }
  }
}
```

**使用方法**:

```typescript
// エディタに追加
import { TextBackground } from '@/lib/tiptap-extensions/custom-text-background'

extensions: [
  // ...
  TextBackground,
]

// ツールバーボタン
const colors = ['#ffff00', '#00ff00', '#ff00ff', '#00ffff']

{colors.map(color => (
  <Button
    key={color}
    type="button"
    onClick={() => editor.chain().focus().setTextBackground(color).run()}
    style={{ backgroundColor: color }}
    className="w-8 h-8"
  />
))}
```

---

## 関連ファイル構造

```
for-all-learners/
├── components/
│   └── tiptap-editor.tsx                    # メインエディタコンポーネント
├── lib/
│   └── tiptap-extensions/
│       ├── highlight-extension.ts           # ハイライト機能
│       ├── custom-blockquote.ts             # カスタム引用
│       ├── custom-heading.ts                # カスタム見出し
│       ├── custom-list.ts                   # カスタムリスト
│       ├── code-block.ts                    # コードブロック
│       ├── latex-inline-node.ts             # LaTeX数式
│       ├── markdown-paste.ts                # Markdownペースト
│       └── unified-link-mark/               # 統合リンク機能
│           ├── index.ts
│           ├── link-group-state.ts
│           └── plugins/
│               └── suggestion-plugin.ts
├── app/
│   └── globals.css                          # グローバルスタイル
└── package.json                             # 依存関係
```

### 依存関係マップ

```
tiptap-editor.tsx
  ├─ @tiptap/react (useEditor, EditorContent)
  ├─ @tiptap/starter-kit (Bold, Italic, Strike, etc.)
  ├─ @tiptap/extension-image
  ├─ @tiptap/extension-link
  ├─ @tiptap/extension-placeholder
  ├─ @tiptap/extension-text-align
  ├─ @tiptap/extension-typography
  └─ カスタム拡張機能
      ├─ CustomBlockquote
      ├─ CustomCodeBlock
      ├─ CustomHeading (未使用、将来的に)
      ├─ CustomBulletList (未使用、将来的に)
      ├─ Highlight
      ├─ LatexInlineNode
      ├─ MarkdownPaste
      └─ UnifiedLinkMark
```

---

## 推奨される実装パターン

### 1. ツールバーの拡張

現在のツールバーは最小限の機能のみ実装されています。以下のボタンを追加することを推奨します：

#### 優先度: 高

```typescript
// Heading buttons
{[1, 2, 3].map(level => (
  <Button
    key={level}
    type="button"
    onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
    variant={editor.isActive('heading', { level }) ? "default" : "outline"}
    size="sm"
  >
    H{level}
  </Button>
))}

// List buttons
<Button
  type="button"
  onClick={() => editor.chain().focus().toggleBulletList().run()}
  variant={editor.isActive('bulletList') ? "default" : "outline"}
  size="sm"
>
  • List
</Button>

<Button
  type="button"
  onClick={() => editor.chain().focus().toggleOrderedList().run()}
  variant={editor.isActive('orderedList') ? "default" : "outline"}
  size="sm"
>
  1. List
</Button>

// Blockquote button
<Button
  type="button"
  onClick={() => editor.chain().focus().toggleBlockquote().run()}
  variant={editor.isActive('blockquote') ? "default" : "outline"}
  size="sm"
>
  Quote
</Button>

// Code block button
<Button
  type="button"
  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
  variant={editor.isActive('codeBlock') ? "default" : "outline"}
  size="sm"
>
  Code
</Button>
```

#### 優先度: 中

```typescript
// Highlight button
<Button
  type="button"
  onClick={() => editor.chain().focus().toggleHighlight().run()}
  variant={editor.isActive('highlight') ? "default" : "outline"}
  size="sm"
>
  Highlight
</Button>

// Text alignment buttons
{['left', 'center', 'right'].map(align => (
  <Button
    key={align}
    type="button"
    onClick={() => editor.chain().focus().setTextAlign(align).run()}
    variant={editor.isActive({ textAlign: align }) ? "default" : "outline"}
    size="sm"
  >
    {align}
  </Button>
))}
```

---

### 2. カラーピッカーの実装

#### シンプルな実装

```typescript
import { useState } from 'react'

const [showColorPicker, setShowColorPicker] = useState(false)

// Color button
<Button
  type="button"
  onClick={() => setShowColorPicker(!showColorPicker)}
  variant="outline"
  size="sm"
>
  Color
</Button>

{showColorPicker && (
  <div className="absolute z-10 mt-2 p-2 bg-white border rounded-lg shadow-lg">
    <input
      type="color"
      onChange={(e) => {
        editor.chain().focus().setColor(e.target.value).run()
        setShowColorPicker(false)
      }}
      className="w-full h-8 cursor-pointer"
    />
  </div>
)}
```

#### プリセットカラーパレット

```typescript
const presetColors = [
  '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF',
]

<div className="grid grid-cols-4 gap-1 p-2">
  {presetColors.map(color => (
    <button
      key={color}
      type="button"
      onClick={() => {
        editor.chain().focus().setColor(color).run()
        setShowColorPicker(false)
      }}
      style={{ backgroundColor: color }}
      className="w-8 h-8 border rounded cursor-pointer hover:scale-110 transition"
    />
  ))}
</div>
```

---

### 3. ツールバーのレイアウト改善

#### グループ化

```typescript
<div className="toolbar py-2 border-b flex items-center gap-1 flex-wrap">
  {/* Text formatting group */}
  <div className="flex items-center gap-1 border-r pr-2">
    <Button>Bold</Button>
    <Button>Italic</Button>
    <Button>Strike</Button>
  </div>

  {/* Heading group */}
  <div className="flex items-center gap-1 border-r pr-2">
    <Button>H1</Button>
    <Button>H2</Button>
    <Button>H3</Button>
  </div>

  {/* List group */}
  <div className="flex items-center gap-1 border-r pr-2">
    <Button>• List</Button>
    <Button>1. List</Button>
  </div>

  {/* Special blocks group */}
  <div className="flex items-center gap-1 border-r pr-2">
    <Button>Quote</Button>
    <Button>Code</Button>
  </div>

  {/* Insert group */}
  <div className="flex items-center gap-1">
    <Button>Image</Button>
    <Button>Link</Button>
  </div>
</div>
```

---

### 4. キーボードショートカットの実装

```typescript
addKeyboardShortcuts() {
  return {
    // Bold: Cmd/Ctrl + B
    'Mod-b': () => this.editor.commands.toggleBold(),
    
    // Italic: Cmd/Ctrl + I
    'Mod-i': () => this.editor.commands.toggleItalic(),
    
    // Strike: Cmd/Ctrl + Shift + S
    'Mod-Shift-s': () => this.editor.commands.toggleStrike(),
    
    // Highlight: Cmd/Ctrl + Shift + H
    'Mod-Shift-h': () => this.editor.commands.toggleHighlight(),
    
    // Code block: Cmd/Ctrl + Alt + C
    'Mod-Alt-c': () => this.editor.commands.toggleCodeBlock(),
  }
}
```

---

## まとめ

### 現在の実装状況

✅ **実装済み**:
- 基本的なテキストスタイル（Bold, Italic, Strike）
- カスタム引用（CustomBlockquote）
- カスタム見出し（CustomHeading）
- カスタムリスト（CustomBulletList, CustomOrderedList）
- コードブロック（CustomCodeBlock）
- ハイライト（Highlight）
- テキスト配置（TextAlign）
- タイポグラフィ（Typography）

⚠️ **未実装（ツールバーボタンなし）**:
- Heading buttons
- List buttons
- Blockquote button
- Code block button
- Highlight button
- Text alignment buttons

❌ **未インストール**:
- 文字色変更（Color）
- フォント変更（FontFamily）
- フォントサイズ変更（FontSize - カスタム実装必要）
- 下線（Underline）
- 背景色（TextBackground - カスタム実装必要）

### 次のステップ

1. **短期**:
   - 既存の拡張機能用のツールバーボタンを追加
   - ツールバーのレイアウトをグループ化

2. **中期**:
   - Color拡張機能のインストールとカラーピッカー実装
   - Underline拡張機能の追加
   - キーボードショートカットの実装

3. **長期**:
   - FontSize、TextBackgroundのカスタム拡張機能実装
   - リッチなツールバーUI（ドロップダウン、ポップオーバー）
   - プリセットスタイルの実装

---

## 参考資料

- [TipTap公式ドキュメント](https://tiptap.dev/)
- [TipTap Extensions](https://tiptap.dev/extensions)
- [Tailwind Typography](https://tailwindcss.com/docs/typography-plugin)
- [ProseMirror](https://prosemirror.net/)

---

**最終更新**: 2025-10-30  
**作成者**: AI Assistant
