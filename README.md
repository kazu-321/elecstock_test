# 電子部品 在庫管理（Spreadsheet + GAS）

Spreadsheetをデータベースとして使う、電子部品の在庫管理Webアプリです。

## できること

- 部品の登録・編集
- 部品IDの自動発行（UUID、ユーザー入力不要）
- 入庫・出庫の記録
- 在庫数の自動更新
- 低在庫の表示
- `transactions` シートへの入出庫履歴保存

## 使い始める手順

### 1. Spreadsheetを作る

空のGoogle Spreadsheetを1つ作り、URLの `/d/` と `/edit` の間にある文字列をコピーします。
これがSpreadsheet IDです。

### 2. GASプロジェクトを作る

Node.jsが入っている環境で、このフォルダから実行します。

```bash
npm install
npx clasp login
npx clasp create --type standalone --title "elecstock"
npx clasp push
```

### 3. Spreadsheet IDを設定する

```bash
npx clasp open
```

GASエディタで `_setSpreadsheetId` を選び、次のように実行します。

```javascript
_setSpreadsheetId('ここにSpreadsheet ID')
```

初回実行時の権限確認を許可してください。`parts`、`transactions`、`settings` シートが自動作成されます。

### 4. Webアプリとして公開する

GASエディタの「デプロイ」→「新しいデプロイ」→「ウェブアプリ」を選びます。

- 次のユーザーとして実行：自分
- アクセスできるユーザー：必要な範囲を選択

公開されたURLを開けば使えます。

## Git運用

ソースコードを変更したら、次の順番です。

```bash
npx clasp push
git add Code.gs Index.html appsscript.json README.md package.json .claspignore .gitignore
git commit -m "変更内容"
```

Spreadsheetの中身はGitでは管理せず、`transactions`を履歴として残します。重要なデータはSpreadsheet側でもバックアップしてください。

## シート構成

### parts

```text
part_id | name | category | manufacturer | location | stock | min_stock | unit | note | updated_at
```

### transactions

```text
transaction_id | timestamp | type | part_id | quantity | note | operator | stock_after
```

`part_id`は内部管理用のUUIDです。ユーザーは入力・管理せず、Web画面から部品名で操作してください。

在庫数を直接書き換えず、Web画面から入庫・出庫を記録してください。

## GitHub Pages

GitHub Pagesは入口ページとして使い、Spreadsheetを操作する本体はGAS Webアプリで動かします。
GASの`google.script.run`はApps Script HTML画面専用のため、GitHub Pagesから直接置き換える構成にはしていません。

リポジトリのSettings → Pagesで、公開元を`codex/inventory-mvp`ブランチの`/docs`に設定してください。

## 次に追加すると便利な機能

1. 部品カテゴリ・場所のプルダウン
2. CSVインポート・エクスポート
3. バーコード／QRコード読み取り
4. 変更履歴の検索
5. Googleアカウントによる権限管理
