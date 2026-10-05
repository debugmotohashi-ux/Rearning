# Rearning 光コンテンツ更新計画

作成日: 2026-10-05 / 対象: debugmotohashi-ux/Rearning
ベース: b91170ff3f16ccd07926ecdc80259b4326e427e2

## 目的と実装範囲

新人が回線の種類、申込方法、割引前後の料金、提案時の確認事項を順に学べるよう、商材編の回線ページ先頭にauひかりプラスを追加する。既存カードのデザインを継承し、通常auひかり・BIGLOBE光は参考用として末尾へ移す。J:COM・WiMAXは維持する。

1. 要点、タイプ比較、料金、割引、申込手続き、Wi-Fiパック、ゴールド特典、提案チェックの8項目に分割。
2. 料金はBIGLOBE・2年契約の例として明示。必須ルーター858円、任意Wi-Fiパック770円、通常月額、期間限定割引、割引終了後を分ける。
3. 2年毎月割（10G:1848円、ホーム1G:1188円、マンション1G:627円）と対象窓口を明記。光開通翌月起算と、Wi-Fiパック割引のサービス開始月起算を区別する。
4. スマホ側セット割・カード還元をネット月額から差し引かない。未確認の社内施策・他プロバイダの料金を推測しない。
5. 関連するネット基礎・用語の新規/転用/事業者変更説明を補足し、通常auひかりとプラスを区別する。
6. 認証、localStorageキー、学習履歴、スタンプ、既存問題のIDは変更しない。学習データを消さずキャッシュ名だけ更新する。

## 内容監査方針

- 最短5日を共通条件として掲載しない。本文は到着後利用開始、BIGLOBE最短4日は条件付き参考。
- 1〜2カ月の短縮を確約しない。光開通まで先行利用できると説明。
- モバイル下り最大2.7GbpsはKDDI機器仕様で確認。一部エリアの理論値で北海道の実測値ではない。
- 電話（K）と（N）、設定/申込/登録が必要な機能を区別。
- 住所の提供判定を必須にし、北海道の10Gはタイプ3を確認する。受付・提供可否の最終判断は公式検索で行う。

## 検証と反映

スクリプト構文、料金算術、表示順、スマホ/iPadのレイアウト、折りたたみ操作、既存学習データ維持を確認する。GitHubの最新headを再確認したうえで競合がなければ通常の非強制更新で反映し、GitHub Pagesの公開結果を確認する。

## 公式参照（確認日: 2026-10-05）

- https://www.au.com/internet/auhikari_plus-home/
- https://www.au.com/internet/auhikari_plus-mansion/
- https://www.au.com/internet/auhikari_plus-wireless/
- https://www.au.com/internet/campaign/monthly-discount/
- https://www.au.com/internet/campaign/wi-fi_pack/
- https://www.au.com/energy/auhikariplus/
- https://www.au.com/internet/service/auhikari_plus/wi-fi_pack/
- https://www.au.com/internet/auhikari_plus-flow/
- https://www.kddi-fs.com/merit/point/au_hikari
- https://www.kddi.com/phone/volte/hr/
- https://join.biglobe.ne.jp/ftth/hikari/plus/faq/faq-bhp614.html
- https://www.so-net.ne.jp/info/2026/op20260917_0001.html
- https://setsuzoku.nifty.com/auhikari_plus/

## 完了判定

通常料金・割引後・期間・対象条件を同時に確認でき、従来サービスの参考情報も参照できること。未検証の内容を断定しないこと。既存の個人学習記録の形式と値を更新処理で変更しないこと。

## 検証結果（2026-10-05）

- 公式情報と照合し、通常月額・ルーターレンタル料・Wi-Fiパック・2年毎月割を明示。光の月額推移は開通月のずれによる誤読を避け、適用中の割引の組み合わせ別に表示。
- Chromiumでパスワード入力→商材→回線→料金ショートカットを実操作。8項目、従来カードの下部移動、5プランの割引後金額、キーボードでの開閉を確認。
- 390px、768px、1194pxでページ全体の横はみ出しなし。幅広の料金表だけ横スクロール。スマホ・iPad幅のスクリーンショットを確認。
- 再読み込み後のログイン保持、保存済み復習・統計データの値保持を確認。既存カードの開閉も動作。ページ実行エラーなし。
- 既存クイズ・進捗ロジック、認証処理、保存キーをベースと比較して一致。Service Workerはキャッシュ名のみ変更。全インラインJavaScriptとService Workerの構文検査、git diff --checkが合格。
- 検証はローカルChromiumで実施。iOS実機での確認は未実施。agent-browserの起動不具合のためPlaywrightで同じブラウザ操作を実施。
