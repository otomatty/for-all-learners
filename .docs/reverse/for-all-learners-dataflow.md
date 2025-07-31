# for-all-learners データフロー図（逆生成）

## 分析日時
2025-07-31 JST

## システムデータフロー概要

### アーキテクチャパターン
- **メインパターン**: Server Actions + React Query + Supabase
- **認証フロー**: Supabase Auth + Middleware
- **状態管理**: React Query (サーバー状態) + Jotai (クライアント状態)

## 1. 認証フロー

### Google OAuth認証フロー
```mermaid
sequenceDiagram
    participant U as ユーザー
    participant B as ブラウザ
    participant M as Middleware
    participant SA as Server Action
    participant SB as Supabase Auth
    participant G as Google
    
    U->>B: ログインボタンクリック
    B->>SA: loginWithGoogle()
    SA->>SB: signInWithOAuth('google')
    SB->>G: OAuth認証リダイレクト
    G-->>SB: 認証コード
    SB-->>SA: OAuth URL
    SA-->>B: redirect(url)
    B->>G: Google認証画面
    G-->>B: 認証後コールバック
    B->>M: /auth/callback
    M->>SB: セッション確認
    SB-->>M: ユーザー情報
    M-->>B: 保護ルートへリダイレクト
```

### Magic Link認証フロー
```mermaid
sequenceDiagram
    participant U as ユーザー
    participant B as ブラウザ
    participant SA as Server Action
    participant SB as Supabase Auth
    participant E as Email Service
    
    U->>B: メールアドレス入力
    B->>SA: loginWithMagicLink(email)
    SA->>SB: signInWithOtp(email)
    SB->>E: Magic Link送信
    E-->>U: Magic Link メール
    U->>B: Magic Link クリック
    B->>SB: 認証トークン確認
    SB-->>B: セッション確立
    B->>B: ダッシュボードへ遷移
```

## 2. データ操作フロー

### Server Actions による標準的なデータフロー
```mermaid
flowchart TD
    A[ユーザーアクション] --> B[React Component]
    B --> C[Server Action 呼び出し]
    C --> D{認証チェック}
    D -->|未認証| E[認証エラー]
    D -->|認証済み| F[Supabase Client 生成]
    F --> G[RLS ポリシー適用]
    G --> H[データベース操作]
    H --> I{操作結果}
    I -->|成功| J[成功レスポンス]
    I -->|エラー| K[エラーレスポンス]
    J --> L[React Query キャッシュ更新]
    K --> M[エラーハンドリング]
    L --> N[UI 再レンダリング]
    M --> N
```

### フラッシュカード作成フロー（具体例）
```mermaid
sequenceDiagram
    participant U as ユーザー
    participant C as CardForm
    participant SA as createCard()
    participant SB as Supabase
    participant AI as Gemini AI
    participant Q as React Query
    
    U->>C: カード内容入力
    C->>SA: createCard(cardData)
    SA->>SB: INSERT into cards
    SB-->>SA: カードID返却
    SA->>AI: 問題生成（有料ユーザーのみ）
    AI-->>SA: 生成された問題
    SA->>SB: INSERT into questions
    SB-->>SA: 問題ID返却
    SA-->>C: 成功レスポンス
    C->>Q: invalidateQueries(['cards'])
    Q->>U: UI更新（新カード表示）
```

## 3. 状態管理フロー

### React Query による状態管理
```mermaid
flowchart LR
    A[Component Mount] --> B[useQuery Hook]
    B --> C{キャッシュ存在?}
    C -->|存在| D[キャッシュデータ表示]
    C -->|存在しない| E[Server Action 実行]
    E --> F[Supabase Query]
    F --> G[データ取得]
    G --> H[キャッシュ更新]
    H --> I[UI 更新]
    
    J[User Mutation] --> K[useMutation Hook]
    K --> L[Server Action 実行]
    L --> M[データ更新]
    M --> N[invalidateQueries]
    N --> O[関連キャッシュ無効化]
    O --> P[UI 再フェッチ]
```

### Jotai による軽量状態管理
```mermaid
flowchart TB
    A[userIdAtom] --> B[グローバルユーザーID]
    B --> C[コンポーネント間共有]
    C --> D[認証状態依存の処理]
```

## 4. リアルタイム更新フロー

### ページ編集でのオートセーブ
```mermaid
sequenceDiagram
    participant U as ユーザー
    participant E as TiptapEditor
    participant H as useAutoSave
    participant SA as updatePage()
    participant SB as Supabase
    participant RQ as React Query
    
    U->>E: テキスト入力
    E->>H: debounce(500ms)
    H->>SA: updatePage(pageData)
    SA->>SB: UPDATE pages SET content
    SB-->>SA: 更新完了
    SA-->>H: 成功レスポンス
    H->>RQ: setQueryData(['page'])
    RQ->>E: 保存状態更新
```

## 5. エラーハンドリングフロー

### 統一エラーハンドリング
```mermaid
flowchart TD
    A[エラー発生] --> B{エラー種別判定}
    B -->|認証エラー| C["/auth/login へリダイレクト"]
    B -->|権限エラー| D["403 エラートースト表示"]
    B -->|バリデーションエラー| E[フォームエラー表示]
    B -->|ネットワークエラー| F[リトライ機能]
    B -->|サーバーエラー| G[エラートースト + ログ記録]
    B -->|不明なエラー| H[汎用エラーメッセージ]
    
    C --> I[認証状態リセット]
    D --> J[ユーザーに権限不足を通知]
    E --> K[入力フィールドにエラー表示]
    F --> L[自動リトライ実行]
    G --> M[エラーログ保存]
    H --> N[開発者にレポート送信]
```

## 6. 外部サービス統合フロー

### AI (Gemini) 統合フロー
```mermaid
sequenceDiagram
    participant U as ユーザー
    participant C as Component
    participant SA as generateCards()
    participant G as Gemini API
    participant SB as Supabase
    
    U->>C: "カード生成" ボタン
    C->>SA: generateCards(content)
    SA->>G: プロンプト送信
    G-->>SA: 生成されたカード
    SA->>SB: バッチINSERT cards
    SB-->>SA: 挿入完了
    SA-->>C: 生成結果
    C->>U: 新カード表示
```

### Gyazo 画像統合フロー
```mermaid
sequenceDiagram
    participant U as ユーザー
    participant E as TiptapEditor
    participant G as Gyazo API
    participant SB as Supabase Storage
    
    U->>E: 画像ドラッグ&ドロップ
    E->>G: 画像アップロード
    G-->>E: Gyazo画像URL
    E->>SB: メタデータ保存
    SB-->>E: 保存完了
    E->>U: エディタに画像表示
```

### Cosense (Scrapbox) 同期フロー
```mermaid
sequenceDiagram
    participant S as Scheduler
    participant SA as syncCosense()
    participant C as Cosense API
    participant SB as Supabase
    participant P as Parser
    
    S->>SA: 定期同期実行
    SA->>C: プロジェクトページ一覧取得
    C-->>SA: ページリスト
    SA->>C: 個別ページ内容取得
    C-->>SA: ページ内容
    SA->>P: Scrapbox記法パース
    P-->>SA: TiptapJSON変換
    SA->>SB: UPSERT pages
    SB-->>SA: 同期完了
```

## 7. 学習セッションフロー

### クイズセッション実行フロー
```mermaid
sequenceDiagram
    participant U as ユーザー
    participant Q as QuizSession
    participant SA as startQuiz()
    participant FSRS as FSRS Algorithm
    participant SB as Supabase
    participant LL as LearningLogs
    
    U->>Q: クイズ開始
    Q->>SA: startQuiz(deckId, settings)
    SA->>SB: 復習対象カード取得
    SB-->>SA: カードリスト
    SA->>FSRS: 次回復習日計算
    FSRS-->>SA: スケジューリング
    SA-->>Q: クイズデータ
    
    loop 各問題
        Q->>U: 問題表示
        U->>Q: 回答入力
        Q->>SA: submitAnswer(answer)
        SA->>LL: 学習ログ記録
        SA->>FSRS: 間隔調整
        FSRS-->>SA: 次回復習日更新
        SA->>SB: UPDATE cards, INSERT learning_logs
    end
    
    SA-->>Q: セッション完了
    Q->>U: 結果表示
```

## 8. ファイルアップロード・処理フロー

### 音声ファイル処理フロー
```mermaid
flowchart TD
    A[音声ファイル選択] --> B[ブラウザ圧縮]
    B --> C[Supabase Storage アップロード]
    C --> D[Server Action: transcribe()]
    D --> E[AI 音声認識]
    E --> F[テキスト抽出]
    F --> G[AI 要約・構造化]
    G --> H[フラッシュカード自動生成]
    H --> I[データベース保存]
    I --> J[UI 更新]
```

### 画像OCR処理フロー
```mermaid
flowchart TD
    A[画像ファイル選択] --> B[画像圧縮・最適化]
    B --> C[AI OCR処理]
    C --> D[テキスト抽出]
    D --> E[テキスト構造化]
    E --> F[フラッシュカード候補生成]
    F --> G[ユーザー確認・編集]
    G --> H[最終保存]
```

## 9. 検索機能フロー

### 統合検索フロー
```mermaid
sequenceDiagram
    participant U as ユーザー
    participant S as SearchBar
    participant API as /api/search-suggestions
    participant RPC as search_suggestions()
    participant SB as Supabase
    
    U->>S: 検索文字入力
    S->>API: GET /api/search-suggestions?q=query
    API->>RPC: search_suggestions(query)
    RPC->>SB: 全文検索実行
    SB-->>RPC: 検索結果
    RPC-->>API: 構造化された結果
    API-->>S: JSON レスポンス
    S->>U: 検索候補表示
```

## 10. パフォーマンス最適化フロー

### React Query キャッシュ戦略
```mermaid
flowchart LR
    A[データ要求] --> B{キャッシュ確認}
    B -->|Fresh| C[キャッシュから返却]
    B -->|Stale| D[キャッシュ返却 + バックグラウンド更新]
    B -->|None| E[サーバーから取得]
    
    F[Mutation 実行] --> G[楽観的更新]
    G --> H[サーバー送信]
    H --> I{成功?}
    I -->|成功| J[キャッシュ確定]
    I -->|失敗| K[ロールバック]
```

## まとめ

このデータフローは以下の特徴を持っています：

### 優れた点
1. **型安全性**: TypeScript による完全な型チェック
2. **パフォーマンス**: React Query による最適なキャッシュ戦略
3. **セキュリティ**: RLS による行レベルセキュリティ
4. **ユーザビリティ**: 楽観的更新による即座のフィードバック
5. **拡張性**: Server Actions による機能追加の容易さ

### 改善余地
1. **リアルタイム性**: WebSocket による即座の同期
2. **オフライン対応**: PWA による完全なオフライン機能
3. **エラー監視**: より詳細なエラートラッキング
4. **パフォーマンス監視**: リアルタイムパフォーマンス追跡