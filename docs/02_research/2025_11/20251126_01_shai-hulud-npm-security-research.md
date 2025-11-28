# Shai-Hulud npm サプライチェーン攻撃 セキュリティ調査

## 概要

2025年11月に発生した「Shai-Hulud: The Second Coming」と呼ばれるnpmサプライチェーン攻撃に関する調査および対策をまとめる。

### 情報源

- [Codebook - Shai-Huludの悪夢再び：800件のnpmパッケージが感染し、シークレットがGitHub上に流出](https://codebook.machinarecord.com/threatreport/silobreaker-cyber-alert/42718/)

## 攻撃の概要

### Shai-Huludとは

Shai-Huludは自己複製型のnpmワームで、以下の特徴を持つ：

1. **感染経路**: npmパッケージのinstall/postinstallスクリプトを悪用
2. **シークレット窃取**: TruffleHogを使用してAPIキー、トークン等のシークレットを探索
3. **データ流出**: 窃取したシークレットを公開GitHubリポジトリにアップロード
4. **自己伝播**: npmに自身のコピーをプッシュして感染拡大

### 影響を受けたパッケージ（一部）

- Zapier
- ENS Domains
- PostHog
- Postman
- AsyncAPI関連パッケージ
- go-template

### タイムライン（日本時間）

| 時刻 | イベント |
|------|----------|
| 2025/11/24 12:16:26 | 最初の感染パッケージ（go-template、AsyncAPI関連36件）が観測 |
| 2025/11/24 13:11:55 | PostHog関連パッケージの侵害開始 |
| 2025/11/24 14:09:25 | Postmanパッケージの侵害開始 |

### 被害規模

- 800件以上のnpmパッケージが感染
- 約350人のGitHubユーザーに関連する25,000件超の悪意あるリポジトリが観測

## 対策

### 緊急対策（即時実施）

#### 1. npm install/updateの一時停止

新規のnpm install/updateを一時的に停止し、感染パッケージの取り込みリスクを軽減する。

**評価**: ✅ 短期的な緊急対応として有効

**注意点**: 
- セキュリティパッチの適用も止まるため長期運用には不向き
- 状況が落ち着いたことを確認後、段階的に再開

#### 2. .npmrcにignore-scripts=trueを設定

プロジェクトルートに`.npmrc`を作成し、installスクリプトの実行を無効化する。

```ini
# .npmrc
ignore-scripts=true
```

**評価**: ✅ 非常に有効（主要な感染経路を遮断）

**注意点**:
- 以下のパッケージで問題が発生する可能性あり：
  - `esbuild`, `swc` などのネイティブバイナリを含むパッケージ
  - `node-gyp` を使うネイティブモジュール
  - `husky` などのGit hooks設定

**補足**: 必要に応じて特定パッケージのみスクリプトを許可：
```bash
# 特定パッケージのみスクリプト許可（npm v9.1.0+）
npm config set ignore-scripts true
npm rebuild esbuild --ignore-scripts=false
```

#### 3. SSH禁止（port 22閉鎖）

**評価**: ⚠️ この攻撃に対しては効果が限定的

**理由**:
- Shai-Huludは主にHTTPS経由でGitHubにデータをプッシュする可能性が高い
- SSH鍵が窃取された場合でも、攻撃者は別の環境から使用できる
- 一般的なセキュリティ強化としては有効だが、直接的な防御効果は薄い

### 追加推奨対策

#### 4. シークレットの即時ローテーション（最優先）

すでに感染している可能性を考慮し、以下を緊急で実施：

- [ ] GitHubトークン（Personal Access Token）の再生成
- [ ] npmトークンの再生成
- [ ] AWS/GCP/AzureなどのクラウドAPIキー
- [ ] SSH鍵の再生成
- [ ] .envファイル内のシークレットすべて
- [ ] Supabaseのサービスキー

#### 5. lockfileからのインストールを強制

```bash
# npm install の代わりに npm ci を使用
npm ci
```

- `package-lock.json`に固定されたバージョンのみインストール
- 攻撃者が新バージョンをpushしても取り込まれない

#### 6. GitHubアカウントの監査

- [ ] 自分のアカウントに不審なリポジトリが作成されていないか確認
- [ ] 不審なPersonal Access Tokenが発行されていないか確認
- [ ] Settings → Security logで不審なアクティビティを確認

#### 7. package-lock.jsonの差分確認

```bash
git diff HEAD~10 package-lock.json
```

意図しないパッケージ更新がないか確認。

#### 8. npm auditの実行

```bash
npm audit
```

## 対策の有効性まとめ

| 対策 | 有効性 | 推奨度 | 備考 |
|------|--------|--------|------|
| npm install/update停止 | ✅ 高（短期） | ⭐⭐⭐ | 緊急時の一時対応 |
| ignore-scripts=true | ✅ 高 | ⭐⭐⭐⭐⭐ | 強く推奨 |
| SSH禁止（port 22閉鎖） | ⚠️ 限定的 | ⭐⭐ | 補助的対策 |
| シークレットローテーション | ✅ 高 | ⭐⭐⭐⭐⭐ | 最優先 |
| npm ci使用 | ✅ 高 | ⭐⭐⭐⭐ | 推奨 |
| GitHubアカウント監査 | ✅ 高 | ⭐⭐⭐⭐ | 推奨 |

## プロジェクト内調査結果

### 調査日時

2025年11月26日

### 調査項目と結果

#### 1. 影響を受けたパッケージの有無

**結果: ✅ 安全 - 影響を受けたパッケージは含まれていない**

以下のパッケージがこのプロジェクトに含まれていないことを確認：
- posthog
- zapier
- postman
- asyncapi
- ens-domains
- go-template

#### 2. パッケージマネージャの設定

**使用しているパッケージマネージャ**: Bun

| 項目 | 状態 | 備考 |
|------|------|------|
| bun.lock | ✅ 存在 | 402KB、2025/11/26更新 |
| bunfig.toml | ⚠️ 未設定 | スクリプト実行制御が未設定 |
| .npmrc | ⚠️ 未設定 | npm使用時の対策が未設定 |

#### 3. 最近のdependency更新履歴（2025/11/21〜26）

```
e61f19b fix: use cross-env for Windows compatibility in Tauri build
4c91199 Merge branch 'develop' into feature/issue-157-phase6-static-export
4645100 Merge branch 'develop' into dependabot/npm_and_yarn/marked-17.0.1
9346445 Merge pull request #183 from otomatty/dependabot/npm_and_yarn/development-dependencies-429c23e885
818bf90 feat: implement Loopback Server for Tauri OAuth authentication
b8b8f39 chore: update bun.lock [skip ci]
064a674 chore: update bun.lock [skip ci]
8202ed1 chore: update bun.lock [skip ci]
```

**評価**: 攻撃期間（11/21〜24）にbun.lockの更新があるが、影響を受けたパッケージは含まれていないため、リスクは低い。

#### 4. GitHub Actionsの設定

**結果: ✅ 良好な設定**

- `bun install --frozen-lockfile` を使用（lockfileからのインストールを強制）
- シークレットはGitHub Secretsを使用
- GITHUB_TOKEN、SUPABASE関連のシークレットが適切に管理されている

#### 5. 環境変数ファイル

**結果**: .envファイルは.gitignoreで除外されているため、リポジトリには含まれていない（正常）

### 総合評価

| カテゴリ | 評価 | 詳細 |
|----------|------|------|
| 感染リスク | ✅ 低 | 影響を受けたパッケージなし |
| CI/CD設定 | ✅ 良好 | frozen-lockfile使用 |
| スクリプト制御 | ⚠️ 要対策 | bunfig.toml未設定 |
| シークレット管理 | ✅ 良好 | GitHub Secrets使用 |

### 推奨アクション

1. **【優先度: 中】** `bunfig.toml` を作成してスクリプト実行を制御 ✅ 完了
2. **【優先度: 中】** `.npmrc` を作成してnpm使用時の対策を追加 ✅ 完了
3. **【優先度: 低】** シークレットのローテーションを検討（感染リスクが低いため、緊急性は低い）

---

## ローカルPC全体の調査結果

### 調査ツール

Rustで作成したセキュリティスキャナー `shai-hulud-scanner` を使用。

- ツール場所: `tools/shai-hulud-scanner/`
- 参照CSV: [Wiz Security IoC List](https://github.com/wiz-sec-public/wiz-research-iocs/blob/main/reports/shai-hulud-2-packages.csv)

### スキャン結果（~/apps ディレクトリ）

| 項目 | 結果 |
|------|------|
| スキャン対象 | `/Users/sugaiakimasa/apps` |
| 読み込んだ影響パッケージ数 | 798件 |
| スキャンしたパッケージファイル数 | 102,364件 |
| CRITICAL（完全一致） | **0件** ✅ |
| WARNING（名前一致、バージョン異なる） | **6件** ⚠️ |

### 検出された警告

すべて `posthog-node` パッケージに関連：

| プロジェクト | インストール版 | 影響を受けた版 | 評価 |
|-------------|---------------|---------------|------|
| saedgewell (mastra経由) | 4.10.1 | 5.13.3, 5.11.3, 4.18.1 | ⚠️ バージョン異なる |
| saedgewell | 4.11.2 | 5.13.3, 5.11.3, 4.18.1 | ⚠️ バージョン異なる |
| estimate-agent | 4.11.1 | 5.13.3, 5.11.3, 4.18.1 | ⚠️ バージョン異なる |

### 評価

**直接的な感染リスク: 低**

- インストールされているバージョン（4.10.x〜4.11.x）は、影響を受けたバージョン（4.18.1, 5.11.3, 5.13.3）とは異なる
- ただし、今後のアップデートには注意が必要
- 当該プロジェクトにも `bunfig.toml` / `.npmrc` の追加を推奨

## 参考リンク

- [Codebook - 自己伝播ワーム「Shai-Hulud」のサプライチェーン攻撃で180件超のnpmパッケージが侵害される](https://codebook.machinarecord.com/threatreport/silobreaker-cyber-alert/) - 2025年9月の第1弾攻撃
- [米CISA - Shai-Huludワームを用いたnpmサプライチェーン攻撃について注意喚起](https://codebook.machinarecord.com/threatreport/silobreaker-cyber-alert/)

## 実施した対策

### 作成したファイル

1. **bunfig.toml** - Bunでのスクリプト実行を無効化
```toml
[install]
lifecycle.ignore = true
```

2. **.npmrc** - npm使用時のスクリプト実行を無効化
```ini
ignore-scripts=true
save-exact=true
audit=true
```

### 注意事項

スクリプト実行を無効化することで、以下のパッケージで問題が発生する可能性があります：
- `esbuild`, `swc` などのネイティブバイナリを含むパッケージ
- `node-gyp` を使うネイティブモジュール
- `husky` などのGit hooks設定

問題が発生した場合は、以下のコマンドで特定パッケージのみスクリプトを許可できます：
```bash
# Bunの場合
bun install --trust <package-name>

# npmの場合
npm rebuild <package-name> --ignore-scripts=false
```

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2025/11/26 | 初版作成 |
| 2025/11/26 | プロジェクト内調査結果を追加 |
| 2025/11/26 | bunfig.toml、.npmrcを作成 |

