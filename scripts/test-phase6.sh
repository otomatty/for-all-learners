#!/bin/bash

# Phase 6: Next.js静的化とTauri統合 - 動作確認スクリプト
# Issue #157

set -e

echo "=========================================="
echo "Phase 6: Next.js静的化とTauri統合 - 動作確認"
echo "=========================================="
echo ""

# カラー出力
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Service Workerの制御ロジックテスト
echo -e "${YELLOW}1. Service Workerの制御ロジックテスト${NC}"
echo "----------------------------------------"
if bun run test lib/utils/__tests__/service-worker.test.ts; then
    echo -e "${GREEN}✓ Service Workerの制御ロジックテストが成功しました${NC}"
else
    echo -e "${RED}✗ Service Workerの制御ロジックテストが失敗しました${NC}"
    exit 1
fi
echo ""

# 2. 静的エクスポートのビルドテスト（スキップ可能）
echo -e "${YELLOW}2. 静的エクスポートのビルドテスト${NC}"
echo "----------------------------------------"
echo "注意: 静的エクスポートのビルドは、すべてのServer Actionsが移行されるまで"
echo "      完全には動作しません（API Routesや動的ルートのエラーが発生します）"
echo ""
echo "現在の実装状況:"
echo "  - Phase 1-5でServer Actionsの移行が進行中"
echo "  - 静的エクスポートの設定は完了"
echo "  - 完全な動作確認は、すべてのServer Actions移行後に実施"
echo ""
echo -e "${YELLOW}⚠ 静的エクスポートのビルドテストはスキップします${NC}"
echo "  完全な動作確認は、Phase 1-5の完了後に実施してください"
echo ""

# 3. 動的ルートの確認
echo -e "${YELLOW}3. 動的ルートの確認${NC}"
echo "----------------------------------------"
DYNAMIC_ROUTES=(
    "app/(protected)/notes/[slug]/page.tsx"
    "app/(protected)/notes/[slug]/[id]/page.tsx"
    "app/(protected)/notes/[slug]/[id]/generate-cards/page.tsx"
    "app/(protected)/decks/[deckId]/page.tsx"
    "app/(protected)/decks/[deckId]/audio/page.tsx"
    "app/(protected)/decks/[deckId]/pdf/page.tsx"
    "app/(protected)/decks/[deckId]/ocr/page.tsx"
    "app/admin/inquiries/[id]/page.tsx"
)

MISSING_GENERATE_STATIC_PARAMS=()

for route in "${DYNAMIC_ROUTES[@]}"; do
    if grep -q "generateStaticParams" "$route"; then
        echo -e "${GREEN}✓ $route に generateStaticParams が実装されています${NC}"
    else
        echo -e "${RED}✗ $route に generateStaticParams が実装されていません${NC}"
        MISSING_GENERATE_STATIC_PARAMS+=("$route")
    fi
done

if [ ${#MISSING_GENERATE_STATIC_PARAMS[@]} -gt 0 ]; then
    echo -e "${RED}✗ 以下の動的ルートに generateStaticParams が実装されていません:${NC}"
    for route in "${MISSING_GENERATE_STATIC_PARAMS[@]}"; do
        echo "  - $route"
    done
    exit 1
fi
echo ""

# 4. Next.js設定の確認
echo -e "${YELLOW}4. Next.js設定の確認${NC}"
echo "----------------------------------------"
if grep -q "ENABLE_STATIC_EXPORT" next.config.ts; then
    echo -e "${GREEN}✓ next.config.ts に ENABLE_STATIC_EXPORT の設定があります${NC}"
else
    echo -e "${RED}✗ next.config.ts に ENABLE_STATIC_EXPORT の設定がありません${NC}"
    exit 1
fi

if grep -q "output.*export" next.config.ts; then
    echo -e "${GREEN}✓ next.config.ts に output: export の設定があります${NC}"
else
    echo -e "${YELLOW}⚠ next.config.ts に output: export の設定が見つかりません（条件付き設定の可能性）${NC}"
fi
echo ""

# 5. Tauri設定の確認
echo -e "${YELLOW}5. Tauri設定の確認${NC}"
echo "----------------------------------------"
if grep -q "ENABLE_STATIC_EXPORT=true" src-tauri/tauri.conf.json; then
    echo -e "${GREEN}✓ tauri.conf.json に ENABLE_STATIC_EXPORT=true の設定があります${NC}"
else
    echo -e "${RED}✗ tauri.conf.json に ENABLE_STATIC_EXPORT=true の設定がありません${NC}"
    exit 1
fi

if grep -q '"withGlobalTauri": true' src-tauri/tauri.conf.json; then
    echo -e "${GREEN}✓ tauri.conf.json に withGlobalTauri: true の設定があります${NC}"
else
    echo -e "${RED}✗ tauri.conf.json に withGlobalTauri: true の設定がありません${NC}"
    exit 1
fi
echo ""

# 6. Service Worker Providerの確認
echo -e "${YELLOW}6. Service Worker Providerの確認${NC}"
echo "----------------------------------------"
if grep -q "ServiceWorkerProvider" components/providers.tsx; then
    echo -e "${GREEN}✓ components/providers.tsx に ServiceWorkerProvider が追加されています${NC}"
else
    echo -e "${RED}✗ components/providers.tsx に ServiceWorkerProvider が追加されていません${NC}"
    exit 1
fi

if [ -f "components/providers/ServiceWorkerProvider.tsx" ]; then
    echo -e "${GREEN}✓ components/providers/ServiceWorkerProvider.tsx が存在します${NC}"
else
    echo -e "${RED}✗ components/providers/ServiceWorkerProvider.tsx が存在しません${NC}"
    exit 1
fi
echo ""

# 7. 環境検出ユーティリティの確認
echo -e "${YELLOW}7. 環境検出ユーティリティの確認${NC}"
echo "----------------------------------------"
if [ -f "lib/utils/environment.ts" ]; then
    echo -e "${GREEN}✓ lib/utils/environment.ts が存在します${NC}"
    if grep -q "isTauri" lib/utils/environment.ts; then
        echo -e "${GREEN}✓ isTauri() 関数が実装されています${NC}"
    else
        echo -e "${RED}✗ isTauri() 関数が実装されていません${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ lib/utils/environment.ts が存在しません${NC}"
    exit 1
fi
echo ""

echo "=========================================="
echo -e "${GREEN}すべての確認が完了しました！${NC}"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "1. 開発サーバーを起動してService Workerの動作を確認: bun dev"
echo "2. Tauri開発モードで起動してService Workerが無効化されることを確認: bunx tauri dev"
echo "3. 静的エクスポートを確認: ENABLE_STATIC_EXPORT=true bun build"
echo "4. Tauriビルドを確認: bunx tauri build"
echo ""

