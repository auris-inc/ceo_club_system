# OTA 配信ガイド (EAS Update)

App Store / Play Store の審査を経由せずに、JavaScript / アセットの変更を配信できます。

## チャネル設計

| profile (eas.json) | channel | 用途 |
|---|---|---|
| development | `development` | dev client (社内のみ) |
| preview | `preview` | Ad Hoc デモ環境（main push で自動配信） |
| adhoc | `adhoc` | 別途 Ad Hoc 配布用 |
| production | `production` | 本番リリース |

## 配信フロー

### 自動配信（推奨）
1. コードを `main` ブランチに push
2. EAS Workflows が `.eas/workflows/ota-update.yml` を実行
3. **preview チャネル** に対して `eas update` が EAS クラウド側で走る
4. preview ビルドの端末で次回起動時に自動取得

### 手動配信
任意のチャネルに即時配信したい場合:
```bash
cd mobile-app
eas workflow:run .eas/workflows/ota-update.yml
```

もしくは特定チャネル指定:
```bash
eas update --branch production --platform all --message "Fix: xxx"
```

⚠️ **ローカル実行は要注意**: ローカルから直接 `eas update` を打つと、ビルド時の Fingerprint と一致せず端末でバンドルが拒否される（サイレント失敗）ケースがあります。EAS Workflows 経由で実行するのが安全。

## 初回セットアップ手順

1. **expo-updates をインストール済** (`~29.0.17`)
2. **app.json**:
   - `runtimeVersion: { policy: "appVersion" }`
   - `updates.url: https://u.expo.dev/<projectId>`
3. **eas.json**: 各プロファイルに `channel` 指定
4. **新規ビルドが必要**:
   - 既存の Ad Hoc ビルドは `expo-updates` を含まないため OTA を受け取れません
   - `eas build --profile preview --platform ios` で再ビルドして配布し直す

## ランタイムバージョンと配信の関係

`runtimeVersion: { policy: "appVersion" }` を使っているため:
- `app.json` の `version` を `1.0.0` → `1.0.1` に上げると、`1.0.0` ビルドには **OTA が届かなくなる**
- ネイティブ変更（新パッケージ追加など）が無い JS のみの変更は同じ `version` で OK
- ネイティブ変更がある場合は `version` を上げて Store 再申請（または Ad Hoc 再配布）が必要

## デバッグ Tips

OTA が反映されない時の確認手順（端末アプリ内に一時的に埋め込んで確認）:
```ts
import * as Updates from 'expo-updates';

Alert.alert(
  'OTA Status',
  [
    `updateId: ${Updates.updateId}`,
    `channel: ${Updates.channel}`,
    `runtimeVersion: ${Updates.runtimeVersion}`,
  ].join('\n'),
);
```

EAS ダッシュボードでも配信履歴・取得状況を確認できます:
https://expo.dev/accounts/a.makihara/projects/ceo-club/updates
