# for-all-learners コンポーネント設計（逆生成）

## 分析日時
2025-07-31 JST

## コンポーネントアーキテクチャ概要

### 設計パターン
- **基本パターン**: Server Components + Client Components ハイブリッド
- **状態管理**: React Query (サーバー状態) + useState/useReducer (ローカル状態)
- **スタイリング**: Tailwind CSS + CSS Custom Properties
- **コンポーネント構成**: Atomic Design + Feature-based Organization

### ディレクトリ構造
```
components/
├── ui/                     # 基本UIコンポーネント (Atomic Level)
├── magicui/               # 特殊アニメーションコンポーネント
├── goals/                 # 目標関連コンポーネント
└── [その他機能別コンポーネント]

app/(protected)/[feature]/_components/  # 機能別コンポーネント
├── dashboard/
├── decks/
├── notes/
├── pages/
└── ...
```

## UIコンポーネントライブラリ

### Radix UI ベースコンポーネント (`components/ui/`)

#### フォーム・入力系
```typescript
// button.tsx - 基本ボタンコンポーネント
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

// input.tsx - 入力フィールド
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

// textarea.tsx - テキストエリア
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

// select.tsx - セレクトボックス
interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

// checkbox.tsx - チェックボックス
interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {}

// radio-group.tsx - ラジオボタングループ
interface RadioGroupProps extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> {}

// switch.tsx - スイッチ
interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {}

// slider.tsx - スライダー
interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {}
```

#### レイアウト・表示系
```typescript
// card.tsx - カードコンテナ
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

// dialog.tsx - モーダルダイアログ
interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// sheet.tsx - サイドパネル
interface SheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// popover.tsx - ポップオーバー
interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// tooltip.tsx - ツールチップ
interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

// separator.tsx - 区切り線
interface SeparatorProps extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {}

// progress.tsx - プログレスバー
interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number;
}
```

#### ナビゲーション系
```typescript
// tabs.tsx - タブコンポーネント
interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {}

// navigation-menu.tsx - ナビゲーションメニュー
interface NavigationMenuProps extends React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root> {}

// breadcrumb.tsx - パンくずナビ
interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {}

// pagination.tsx - ページネーション
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// back-link.tsx - 戻るリンク
interface BackLinkProps {
  href: string;
  children: React.ReactNode;
}
```

#### データ表示系
```typescript
// table.tsx - テーブル
interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}

// badge.tsx - バッジ
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

// avatar.tsx - アバター
interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {}

// skeleton.tsx - スケルトンローディング
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

// alert.tsx - アラート
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}
```

#### 高度なUI
```typescript
// command.tsx - コマンドパレット
interface CommandProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Root> {}

// context-menu.tsx - コンテキストメニュー
interface ContextMenuProps {
  children: React.ReactNode;
  content: React.ReactNode;
}

// dropdown-menu.tsx - ドロップダウンメニュー
interface DropdownMenuProps {
  children: React.ReactNode;
  content: React.ReactNode;
}

// carousel.tsx - カルーセル
interface CarouselProps {
  children: React.ReactNode;
  opts?: EmblaOptionsType;
  plugins?: EmblaPluginType[];
}

// resizable.tsx - リサイズ可能パネル
interface ResizablePanelGroupProps extends React.ComponentPropsWithoutRef<typeof ResizablePrimitive.PanelGroup> {}
```

### 特殊コンポーネント

#### MagicUI (`components/magicui/`)
```typescript
// animated-circular-progress-bar.tsx - アニメーション付きプログレス
interface AnimatedCircularProgressBarProps {
  max: number;
  value: number;
  min?: number;
  gaugePrimaryColor?: string;
  gaugeSecondaryColor?: string;
  className?: string;
}

// confetti.tsx - 紙吹雪エフェクト
interface ConfettiProps {
  particleCount?: number;
  spread?: number;
  colors?: string[];
  origin?: { x: number; y: number };
}
```

## 機能別コンポーネント

### ダッシュボード (`app/(protected)/dashboard/_components/`)

#### 統計表示
```typescript
// dashboard-summary.tsx - ダッシュボード概要
interface DashboardSummaryProps {
  userId: string;
}

// goal-summary/goal-heatmap.tsx - 学習ヒートマップ
interface GoalHeatmapProps {
  data: {
    date: string;
    count: number;
  }[];
  startDate: Date;
  endDate: Date;
}

// goal-summary/time-progress.tsx - 時間進捗表示
interface TimeProgressProps {
  goalId: string;
  deadline?: string;
  progress: number;
}
```

#### アクション
```typescript
// quick-action-tiles.tsx - クイックアクション
interface QuickActionTilesProps {
  onCreateDeck: () => void;
  onCreatePage: () => void;
  onStartLearning: () => void;
}

// deck-selection-dialog.tsx - デッキ選択ダイアログ
interface DeckSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (deckId: string) => void;
}
```

### フラッシュカード (`app/(protected)/decks/_components/`)

#### カード表示・操作
```typescript
// cards-list.tsx - カード一覧
interface CardsListProps {
  deckId: string;
  cards: Card[];
  onEdit: (card: Card) => void;
  onDelete: (cardId: string) => void;
  loading?: boolean;
}

// card-item.tsx - 個別カードアイテム
interface CardItemProps {
  card: Card;
  onEdit: (card: Card) => void;
  onDelete: (cardId: string) => void;
  onStudy?: (cardId: string) => void;
  showActions?: boolean;
}

// card-form.tsx - カード作成・編集フォーム
interface CardFormProps {
  card?: Partial<Card>;
  deckId: string;
  onSubmit: (cardData: CardInsert) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// rich-content.tsx - リッチコンテンツ表示
interface RichContentProps {
  content: JSONContent;
  className?: string;
  editable?: boolean;
}
```

#### AI統合
```typescript
// audio-card-generator.tsx - 音声からカード生成
interface AudioCardGeneratorProps {
  deckId: string;
  onGenerated: (cards: Card[]) => void;
  onError: (error: string) => void;
}

// image-card-generator.tsx - 画像からカード生成
interface ImageCardGeneratorProps {
  deckId: string;
  onGenerated: (cards: Card[]) => void;
  onError: (error: string) => void;
}
```

### ノート・ページ管理

#### ページエディタ (`app/(protected)/pages/[id]/_components/`)
```typescript
// edit-page-form.tsx - ページ編集フォーム
interface EditPageFormProps {
  page: Page;
  onSave: (updates: PageUpdate) => Promise<void>;
  onCancel: () => void;
  autoSave?: boolean;
}

// floating-toolbar.tsx - フローティングツールバー
interface FloatingToolbarProps {
  editor: Editor;
  onBold: () => void;
  onItalic: () => void;
  onLink: () => void;
  onHeading: (level: number) => void;
}

// page-links-grid.tsx - ページリンク表示
interface PageLinksGridProps {
  pageId: string;
  links: {
    id: string;
    title: string;
    href: string;
    type: 'internal' | 'external';
  }[];
  onLinkClick: (link: any) => void;
}

// speech-control-buttons.tsx - 音声コントロール
interface SpeechControlButtonsProps {
  text: string;
  onSpeak: () => void;
  onStop: () => void;
  speaking: boolean;
}
```

#### ノートエクスプローラー (`app/(protected)/notes/explorer/_components/`)
```typescript
// notes-explorer.tsx - メインエクスプローラー
interface NotesExplorerProps {
  userId: string;
  onPageMove: (pageIds: string[], targetNoteId: string) => void;
  onBatchOperation: (operation: BatchOperation, pageIds: string[]) => void;
}

// draggable-page-item.tsx - ドラッグ可能ページアイテム
interface DraggablePageItemProps {
  page: Page;
  selected: boolean;
  onSelect: (pageId: string, selected: boolean) => void;
  onMove: (pageId: string, targetNoteId: string) => void;
}

// conflict-resolution-dialog.tsx - 競合解決ダイアログ
interface ConflictResolutionDialogProps {
  conflicts: PageConflict[];
  onResolve: (resolutions: ConflictResolution[]) => void;
  onCancel: () => void;
}

// trash-panel.tsx - ゴミ箱パネル
interface TrashPanelProps {
  userId: string;
  onRestore: (trashIds: string[]) => void;
  onPermanentDelete: (trashIds: string[]) => void;
}
```

### 学習機能 (`app/(protected)/learn/_components/`)

#### クイズシステム
```typescript
// quiz-session.tsx - クイズセッション管理
interface QuizSessionProps {
  deckId: string;
  settings: QuizSettings;
  onComplete: (results: QuizResults) => void;
  onExit: () => void;
}

// flashcard-quiz.tsx - フラッシュカードクイズ
interface FlashcardQuizProps {
  card: Card;
  onAnswer: (isCorrect: boolean, responseTime: number) => void;
  onNext: () => void;
}

// multiple-choice-quiz.tsx - 多肢選択クイズ
interface MultipleChoiceQuizProps {
  question: Question;
  options: string[];
  onAnswer: (answer: string) => void;
  selectedAnswer?: string;
}

// cloze-quiz.tsx - 穴埋めクイズ
interface ClozeQuizProps {
  question: Question;
  onAnswer: (answer: string) => void;
  userAnswer?: string;
}

// quiz-finished.tsx - クイズ完了画面
interface QuizFinishedProps {
  results: QuizResults;
  onRestart: () => void;
  onExit: () => void;
  onReviewMistakes: () => void;
}
```

### 設定画面 (`app/(protected)/settings/_components/`)

#### 設定カテゴリ
```typescript
// appearance/theme-selector.tsx - テーマ選択
interface ThemeSelectorProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  themes: {
    name: string;
    label: string;
    colors: {
      primary: string;
      secondary: string;
    };
  }[];
}

// external-sync-settings/cosense-sync-settings.tsx - Cosense同期設定
interface CosenseSyncSettingsProps {
  enabled: boolean;
  projects: CosenseProject[];
  onToggle: (enabled: boolean) => void;
  onConnect: () => void;
  onSync: (projectId: string) => void;
}

// llm-settings/index.tsx - LLM設定
interface LLMSettingsProps {
  settings: {
    provider: 'gemini' | 'openai' | 'claude' | 'deepseek';
    apiKey: string;
  }[];
  onSave: (settings: any) => void;
}
```

## 共通パターン・フック

### カスタムフック (`app/(protected)/pages/[id]/_hooks/`)

```typescript
// useAutoSave.ts - 自動保存
interface UseAutoSaveOptions {
  delay?: number;
  enabled?: boolean;
  onSave: (data: any) => Promise<void>;
  onError: (error: Error) => void;
}

export function useAutoSave<T>(
  data: T,
  options: UseAutoSaveOptions
): {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
}

// usePageEditorLogic.ts - ページエディタロジック
interface UsePageEditorLogicProps {
  pageId: string;
  initialContent?: JSONContent;
  autoSave?: boolean;
}

export function usePageEditorLogic(props: UsePageEditorLogicProps): {
  editor: Editor | null;
  content: JSONContent;
  isSaving: boolean;
  isDirty: boolean;
  save: () => Promise<void>;
  reset: () => void;
}

// useSpeechControls.ts - 音声コントロール
export function useSpeechControls(): {
  speak: (text: string) => void;
  stop: () => void;
  speaking: boolean;
  supported: boolean;
}
```

### 共通コンポーネントパターン

#### ローディング状態
```typescript
// スケルトンローディングパターン
const LoadingSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

// データ取得コンポーネントパターン
interface DataComponentProps<T> {
  loading?: boolean;
  error?: Error | null;
  data?: T;
  children: (data: T) => React.ReactNode;
  fallback?: React.ReactNode;
}
```

#### エラー境界
```typescript
// エラー境界コンポーネント
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}
```

#### レスポンシブ対応
```typescript
// モバイル対応パターン
const ResponsiveComponent = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  return isMobile ? <MobileView /> : <DesktopView />;
};
```

## スタイリング・テーマシステム

### CSS Custom Properties活用
```css
/* テーマ変数定義 */
.theme-ocean {
  --primary: 210 100% 50%;
  --secondary: 210 100% 95%;
  --accent: 210 100% 60%;
  --background: 0 0% 100%;
  --foreground: 210 11% 15%;
}

.theme-forest {
  --primary: 120 100% 25%;
  --secondary: 120 50% 95%;
  /* ... */
}
```

### Tailwind CSS拡張
```javascript
// tailwind.config.js での拡張
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--primary))',
        secondary: 'hsl(var(--secondary))',
        accent: 'hsl(var(--accent))',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      }
    }
  }
}
```

## アクセシビリティ対応

### Radix UI によるアクセシビリティ
- **キーボードナビゲーション**: 全コンポーネントで対応
- **ARIA属性**: 自動設定
- **フォーカス管理**: 適切なフォーカストラップ
- **スクリーンリーダー対応**: セマンティックなHTML構造

### カスタム実装
```typescript
// キーボードショートカット
const useKeyboardShortcuts = (shortcuts: Record<string, () => void>) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = `${event.ctrlKey ? 'ctrl+' : ''}${event.key.toLowerCase()}`;
      shortcuts[key]?.();
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};
```

## パフォーマンス最適化

### React最適化
```typescript
// メモ化パターン
const ExpensiveComponent = React.memo(({ data, onAction }: Props) => {
  const processedData = useMemo(() => processData(data), [data]);
  const handleAction = useCallback(() => onAction(), [onAction]);
  
  return <div>{/* コンポーネント内容 */}</div>;
});

// 仮想化（大量データ対応）
const VirtualizedList = ({ items }: { items: any[] }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={60}
    >
      {({ index, style }) => (
        <div style={style}>
          <ListItem item={items[index]} />
        </div>
      )}
    </FixedSizeList>
  );
};
```

### 遅延読み込み
```typescript
// 動的インポート
const LazyComponent = React.lazy(() => import('./HeavyComponent'));

// 条件付き読み込み
const ConditionalComponent = ({ shouldLoad }: { shouldLoad: boolean }) => {
  if (!shouldLoad) return null;
  
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <LazyComponent />
    </Suspense>
  );
};
```

## 今後の改善提案

### 短期改善
1. **ストーリーブック導入**: コンポーネントカタログ作成
2. **テスト追加**: React Testing Library によるコンポーネントテスト
3. **アクセシビリティ監査**: axe-core による自動テスト
4. **パフォーマンス監視**: React DevTools Profiler 活用

### 中長期改善
1. **デザインシステム強化**: より包括的なデザイントークン
2. **コンポーネント自動生成**: Figma to Code 連携
3. **マイクロフロントエンド化**: 大規模チーム対応
4. **Web Components移行**: フレームワーク非依存化

## まとめ

このコンポーネント設計は以下の特徴を持つ優れたアーキテクチャです：

### 優れた点
1. **モダンな設計**: React 19 + Next.js 15 の最新機能活用
2. **優れたDX**: TypeScript による型安全性とIntelliSense
3. **アクセシビリティ**: Radix UI による標準準拠
4. **拡張性**: Atomic Design による構造化
5. **パフォーマンス**: 適切なメモ化と遅延読み込み

### 改善余地
1. **テスト**: コンポーネントテストの充実
2. **ドキュメント**: Storybook によるドキュメント化
3. **型安全性**: より厳密なprops型定義
4. **再利用性**: 汎用コンポーネントの抽象化