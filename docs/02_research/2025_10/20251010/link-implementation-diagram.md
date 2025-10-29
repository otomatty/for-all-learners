# リンク機能実装調査 - 概要図

## リンク実装の 3 世代

```mermaid
flowchart TB
    subgraph Phase1["Phase 1: Decoration ベース (旧)"]
        PL[PageLink Extension]
        PL --> BP[bracketPlugin - Decoration]
        PL --> SP[suggestionPlugin]
        PL --> PP[previewPlugin ❌削除済み]
        PL --> EP[existencePlugin ❌削除済み]
    end

    subgraph Phase2["Phase 2: Mark ベース (移行中)"]
        PLM[PageLinkMark]
        PLM --> T1["[Title] 専用"]
        PLM --> T2[基本的なMark実装]
        PLM --> T3[⚠️ 互換性のため残存<br/>新規使用非推奨]
    end

    subgraph Phase3["Phase 3: 統合Mark実装 (現在) ⭐"]
        ULM[UnifiedLinkMark]
        ULM --> F1["[Title] + #タグ 対応"]
        ULM --> F2[非同期バッチ解決]
        ULM --> F3[キャッシュ機能]
        ULM --> F4[リトライ機能]
        ULM --> F5[クロスタブ同期]
    end

    Phase1 -->|移行中| Phase2
    Phase2 -->|推奨| Phase3

    style Phase1 fill:#ffebee
    style Phase2 fill:#fff3e0
    style Phase3 fill:#e8f5e9
    style ULM fill:#4caf50,color:#fff
```

## UnifiedLinkMark アーキテクチャ

```mermaid
flowchart TD
    Input["ユーザー入力<br/>[Page Title] または #タグ"]

    InputRule["InputRule 検出<br/>ブラケット: /\[([^\[\]]+)\]$/<br/>タグ: /\B#([\p{...}]{1,50})/u (計画中)"]

    MarkGen["Mark生成 (state: pending)<br/>{<br/>  variant: 'bracket',<br/>  raw: 'Page Title',<br/>  key: 'page title',<br/>  state: 'pending',<br/>  markId: 'unilink-xxx'<br/>}"]

    Queue["Resolver Queue追加<br/>バッチサイズ: 10件"]

    Cache["キャッシュ確認<br/>30秒TTL"]
    Search["searchPages<br/>Supabase検索"]

    Match{"一致判定"}

    Exists["state: 'exists'<br/>pageId: '...'<br/>href: /pages/id"]
    Missing["state: 'missing'<br/>or 'error'<br/>href: '#'"]

    Update["Mark更新・表示<br/>色・スタイル変更"]

    Input --> InputRule
    InputRule --> MarkGen
    MarkGen --> Queue
    Queue --> Cache
    Cache -->|Hit| Match
    Cache -->|Miss| Search
    Search --> Match
    Match -->|完全一致あり| Exists
    Match -->|一致なし/エラー| Missing
    Exists --> Update
    Missing --> Update

    style Input fill:#e3f2fd
    style MarkGen fill:#fff3e0
    style Exists fill:#c8e6c9
    style Missing fill:#ffcdd2
    style Update fill:#f3e5f5
```

## 状態遷移図

```mermaid
stateDiagram-v2
    [*] --> pending: 初期状態

    pending --> exists: ページ存在確認
    pending --> missing: ページ未存在
    pending --> error: 通信エラー

    missing --> exists: ページ作成

    exists --> [*]
    error --> [*]

    note right of exists
        pageId: string
        href: /pages/id
    end note

    note right of missing
        href: "#"
        作成可能
    end note

    note right of error
        一時的な障害
        リトライ可能
    end note
```

## データ構造の比較

```mermaid
classDiagram
    class PageLinkMark {
        <<旧実装>>
        +string href
        +string? pageId
        +string? pageTitle
        +boolean? external
        +string? plId
        +boolean? exists
        +state? pending|exists|missing
    }

    class UnifiedLinkMark {
        <<新実装 ⭐>>
        +variant bracket|tag 🆕
        +string raw 🆕
        +string text 🆕
        +string key 🆕
        +string? pageId
        +string href
        +state pending|exists|missing|error
        +boolean exists
        +boolean? created
        +object? meta 🆕
        +string markId
    }

    PageLinkMark <|-- UnifiedLinkMark: 機能拡張

    note for PageLinkMark "互換性のため残存\n新規使用非推奨"
    note for UnifiedLinkMark "推奨実装\nタグ対応・最適化済み"
```

## パフォーマンス最適化機能

```mermaid
graph TB
    subgraph Optimization["UnifiedLinkMark 最適化戦略"]
        subgraph Cache["1. キャッシュ機能"]
            C1[メモリキャッシュ Map]
            C2[TTL: 30秒]
            C3[key → pageId]
        end

        subgraph Batch["2. バッチ処理"]
            B1[Resolver Queue]
            B2[10件ずつバッチで処理]
            B3[50ms間隔で実行]
        end

        subgraph Retry["3. リトライ機能"]
            R1[指数バックオフ]
            R2[1回目: 100ms]
            R3[2回目: 200ms]
            R4[3回目: 400ms]
            R5[最大2回リトライ]
        end

        subgraph CrossTab["4. クロスタブ同期 (P3)"]
            T1[BroadcastChannel]
            T2[ページ作成通知]
            T3[キャッシュ同期]
            T4[状態同期]
        end
    end

    style Cache fill:#e1f5fe
    style Batch fill:#f3e5f5
    style Retry fill:#fff9c4
    style CrossTab fill:#f1f8e9
```

## ファイル構造

```mermaid
graph TD
    subgraph lib["lib/"]
        subgraph tiptap["tiptap-extensions/"]
            ULM["unified-link-mark.ts ⭐<br/>メイン実装"]
            PLM["page-link-mark.ts ⚠️<br/>旧実装(互換性)"]
            PL["page-link.ts ❌<br/>Legacy(削除予定)"]
            Preview["page-link-preview-mark-plugin.ts<br/>プレビュー機能"]
        end

        subgraph unilink["unilink/ ⭐ サポートモジュール"]
            Index["index.ts<br/>エクスポート集約"]
            Utils["utils.ts<br/>正規化・キャッシュ"]
            Resolver["resolver.ts<br/>ページ作成・解決"]
            Metrics["metrics.ts<br/>メトリクス"]
            BC["broadcast-channel.ts<br/>クロスタブ通信"]
            RT["realtime-listener.ts<br/>Realtime連携"]
            AR["auto-reconciler.ts<br/>自動調整"]
            MI["mark-index.ts<br/>Mark検索"]
            RQ["reconcile-queue.ts<br/>調整キュー"]
        end

        subgraph utils["utils/"]
            Search["searchPages.ts<br/>ページ検索API"]
            Transform["transformPageLinks.ts<br/>リンク変換"]
        end

        subgraph metrics["metrics/"]
            PLMetrics["pageLinkMetrics.ts<br/>基本メトリクス"]
        end
    end

    subgraph docs["docs/"]
        Spec["unified-link-mark-spec.md ⭐<br/>仕様書"]
        Plan["page-link-legacy-removal-plan.md<br/>削除計画"]
        Logs["unified-link-mark-*-*.md<br/>実装ログ"]
    end

    subgraph components["components/"]
        Editor["tiptap-editor.tsx<br/>エディタ統合"]
    end

    ULM --> Utils
    ULM --> Resolver
    Editor --> ULM

    style ULM fill:#4caf50,color:#fff
    style unilink fill:#e8f5e9
    style PLM fill:#fff3e0
    style PL fill:#ffcdd2
```

## 推奨される使用方法

```typescript
// ✅ 推奨: UnifiedLinkMark を使用
import { UnifiedLinkMark } from "@/lib/tiptap-extensions/unified-link-mark";

const editor = useEditor({
  extensions: [
    UnifiedLinkMark, // これを使う
    // ...
  ],
});

// ⚠️ 非推奨: PageLinkMark（互換性のため残存）
import { PageLinkMark } from "@/lib/tiptap-extensions/page-link-mark";
// 既存コードでのみ使用可能、新規では使用しない

// ❌ 使用禁止: PageLink（削除予定）
import { PageLink } from "@/lib/tiptap-extensions/page-link";
// Legacy実装、使用しないこと
```
