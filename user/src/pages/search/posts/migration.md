---
title: Migration
layout: SearchMd
---

このページに minista v1 と v2 の相違点をまとめています。

## Performance

minista v1 と v2 の最も大きな違いはパフォーマンスです。v1 はページやコンポーネントが増えるほどに開発サーバーの起動が遅くなっていました。v2 は規模に関係なく 0.6 秒ほどで立ち上がります。本番ビルドの時間も半分近く縮められるでしょう。

## Config

`webpack.config.js` で設定していた内容は、専用のコンフィグファイルに移りました。JavaScript ファイルのエントリーや書き出し先の設定などは似ていますが、ローダーや webpack プラグインは使用できません。拡張は Vite と Rollup のエコシステムを使用することになります。

## Extension

webpack はテンプレートの拡張子を `.js` にできましたが、Vite は `.jsx` でなければエラーとなります。拡張子を一括で変更する場合は以下のようなライブラリを使用した変換が簡単です。

## Pages

`render()` を書く必要がなくなりました！また、非同期関数 `getStaticData` で CMS のデータを取得してダイナミックルーティングを行えるなど開発の幅が広がっています。

## Componnets

コンポーネントが自身の CSS ファイルを読み込めるようになりました！ファイルの置き場がバラけないので管理が容易です。

## Head

`<Head>` が組み込みコンポーネントになりました。依存ライブラリである `react-helmet` をプロジェクト側で呼ぶのは違和感があったため、ラッパーとして実装されています。