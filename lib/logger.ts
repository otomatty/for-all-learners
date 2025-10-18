import pino from "pino";

/**
 * Structured logger using Pino
 *
 * Usage guidelines:
 * ================
 *
 * logger.debug() - Development debugging, verbose internal state
 *   使用例: 内部状態のトレース、詳細なデバッグ情報
 *   本番環境では出力されない（LOG_LEVEL=info以上）
 *
 * logger.info() - Important application events, state transitions
 *   使用例: 初期化完了、重要な処理の開始/終了
 *   本番環境でも記録される標準ログレベル
 *
 * logger.warn() - Unexpected but recoverable situations
 *   使用例: 非推奨APIの使用、フォールバック処理、設定の問題
 *   調査が必要だが動作は継続できる状況
 *
 * logger.error() - Errors requiring attention
 *   使用例: API呼び出し失敗、データ処理エラー
 *   必ずエラーハンドリングと共に使用すること
 *
 * Environment Variables:
 * =====================
 * LOG_LEVEL - Set log level (debug|info|warn|error)
 *   development: 'debug' (all logs)
 *   production: 'info' (info, warn, error only)
 *
 * Example:
 * ========
 * // Good: Structured logging with context
 * logger.info({ userId, action: 'login' }, 'User logged in');
 * logger.error({ error, context }, 'Failed to process request');
 *
 * // Avoid: Using console.log (blocked by Biome)
 * // console.log('User logged in'); // ❌ Error
 */

// Check if running in browser environment
const isBrowser = typeof window !== "undefined";

// Logger configuration
const logger = pino({
  // Default to 'info' in production, but allow override via env var
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "production" ? "info" : "debug"),
  browser: {
    // Browser-specific configuration
    asObject: true,
  },
  // Only use transport in development and non-SSR environments
  // SSR environments (Next.js server-side) have issues with worker threads
  ...(process.env.NODE_ENV === "development" &&
    !isBrowser &&
    typeof process !== "undefined" &&
    !process.env.NEXT_RUNTIME && {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      },
    }),
});

export default logger;
