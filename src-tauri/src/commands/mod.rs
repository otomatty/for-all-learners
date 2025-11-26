//! Tauri Commands モジュール
//!
//! TypeScript側からSQLite操作を呼び出すためのコマンド群
//!
//! DEPENDENCY MAP:
//!
//! Parents (Files that import this module):
//!   └─ src-tauri/src/lib.rs
//!
//! Children (Submodules):
//!   ├─ notes_commands.rs
//!   ├─ pages_commands.rs
//!   ├─ decks_commands.rs
//!   ├─ cards_commands.rs
//!   ├─ study_goals_commands.rs
//!   ├─ learning_logs_commands.rs
//!   └─ milestones_commands.rs
//!
//! Spec: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
//! Issue: https://github.com/otomatty/for-all-learners/issues/192

pub mod cards_commands;
pub mod decks_commands;
pub mod learning_logs_commands;
pub mod milestones_commands;
pub mod notes_commands;
pub mod pages_commands;
pub mod study_goals_commands;
pub mod user_settings_commands;

// 各モジュールからコマンドを再エクスポート
pub use cards_commands::*;
pub use decks_commands::*;
pub use learning_logs_commands::*;
pub use milestones_commands::*;
pub use notes_commands::*;
pub use pages_commands::*;
pub use study_goals_commands::*;
pub use user_settings_commands::*;

