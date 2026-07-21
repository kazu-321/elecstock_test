# 電子部品 在庫管理（GitHub Pages + Firebase）

スマホで使いやすい、静的ホスティング型の電子部品在庫管理アプリです。

## 現在の構成

```text
GitHub Pages（docs/）
  ↓ Googleログイン
Firebase Authentication
  ↓ ログイン済みユーザーのみ
Cloud Firestore
```

GASとSpreadsheetは現在のPages版では使いません。古いGAS版のファイル（`Code.gs`、`Index.html`）は移行履歴として残しています。

## できること

- Googleアカウントでログイン
- ログイン済みユーザー全員が利用可能（現時点ではドメイン制限なし）
- 部品の登録・編集
- 部品IDの自動発行（FirestoreのドキュメントID）
- 部品一覧から追加・使用を記録
- 実際に数えた個数を観測として記録
- 部品の基本情報を編集・削除
- 在庫数の自動更新
- 低在庫の表示
- Googleアカウント表示名・時刻・変更量・変更後推定在庫の履歴表示
- 観測時の「実測値−観測前の推定値」のズレ表示
- 型番・ジャンル・メーカー・保管場所・メモで検索
- ジャンル・メーカー・保管場所のタグ絞り込み
- 選択したジャンルに応じた仕様絞り込み
- ジャンル・メーカー・保管場所の候補入力（未使用の候補は自動整理）
- ジャンル別の追加仕様（抵抗値・サイズなど）

## Firebaseの初期設定

### 1. Firebaseプロジェクトを作る

Firebaseコンソールでプロジェクトを作成します。無料のSparkプランのまま開始できます。

### 2. Googleログインを有効にする

Firebaseコンソールの「Authentication」→「Sign-in method」→「Google」を有効にします。

### 3. Webアプリを登録する

プロジェクトの設定からWebアプリを追加し、表示された設定値を`docs/firebase-config.js`へ貼り付けます。

この設定値はWebアプリに公開される前提です。秘密鍵やサービスアカウントJSONは絶対に入れないでください。

### 4. Firestoreを作る

「Firestore Database」→「データベースを作成」で作成します。

FirebaseコンソールのFirestore「ルール」に、リポジトリの`firestore.rules`の内容を貼り付けて公開します。

現在のルールは、Googleログイン済みユーザー全員に読み書きを許可しています。後から`@gm.ibaraki-ct.ac.jp`限定へ変更できます。

### 5. GitHub Pagesのドメインを許可する

Authenticationの「設定」→「承認済みドメイン」に、次を追加します。

```text
kazu-321.github.io
```

## GitHub Pagesを公開する

GitHubリポジトリのSettings → Pagesで次を指定します。

- Source: Deploy from a branch
- Branch: `codex/inventory-mvp`
- Folder: `/docs`

公開URL：

```text
https://kazu-321.github.io/elecstock_test/
```

## データ構成

### `parts`コレクション

```text
name | category（ジャンル） | manufacturer | location | stock | min_stock | unit | note | specs
```

ドキュメントIDが内部部品IDです。画面には表示せず、ユーザーは部品名で操作します。

在庫は「推定在庫」として管理します。追加・使用で推定値を動かし、観測では実測値に合わせます。観測時の差分は履歴に残ります。

ジャンル・メーカー・保管場所の候補は、部品で現在使われている値から自動生成します。ジャンル別の追加仕様は`specs`に保存し、抵抗・チップ抵抗には専用項目、それ以外のジャンルには任意の項目を追加できます。

### `transactions`コレクション

```text
partId | timestamp | type | quantity | note | operator | stockAfter
```

## 開発

Pages版の変更は`docs/`を編集します。GASの`npx clasp push`は不要です。

```bash
git add docs firestore.rules README.md
git commit -m "変更内容"
git push
```

## 無料枠の目安

- Firebase Authentication：Googleなどのソーシャルログインは無料
- Firestore：読み取り5万件/日、書き込み2万件/日、保存1GBなど
- GitHub Pages：公開サイト1GB、帯域100GB/月のソフト上限など

小規模な部品在庫管理であれば十分な範囲です。
