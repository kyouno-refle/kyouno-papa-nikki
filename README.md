# 今日のパパ日記 V101

現在のデザインとSupabase連携を維持したまま、Cloudflareへ公開できる構成に整理した完成パッケージです。

## 構成

- `public/`：サイト本体
- `wrangler.jsonc`：Cloudflare Workers Static Assets設定
- `package.json`：GitHub自動デプロイ用
- `public/_headers`：セキュリティ・キャッシュ設定
- `public/_redirects`：固定ページの短縮URL
- `public/404.html`：404ページ
- `public/robots.txt` / `sitemap.xml`：検索エンジン向け

## Cloudflareの現在の画面で公開する方法

Cloudflareの「Set up your application」で次のようにします。

- Project name：`kyouno-papa-nikki`
- Build command：空欄
- Deploy command：`npx wrangler deploy`
- Root directory：空欄

そのまま「Deploy」を押します。`wrangler.jsonc`が`public`フォルダを静的サイトとして公開します。

## Cloudflare Pagesを使う場合

- Build command：空欄
- Build output directory：`public`

## GitHubへ入れ替える方法

リポジトリの既存ファイルを削除して、このZIPを解凍した中身をルートへアップロードしてください。
`package.json`、`wrangler.jsonc`、`public`フォルダが同じ階層に見えれば正解です。

## Supabase

`public/config.js`には現在のSupabase URLと公開用anon keyが保持されています。秘密鍵ではありませんが、Supabase側のRLS設定は必ず有効にしてください。
