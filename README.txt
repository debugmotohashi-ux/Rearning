# Rearning UI v3.1 差し替えセット

## 修正内容
- 画面内の絵文字表示を撤去
- ホーム上部の丸アイコンをイラスト化
- 「？」プレースホルダーを撤去
- 未獲得トロフィーも画像を薄く表示する仕様に変更
- 最近の実績が空の場合も専用イラストを表示
- UI表記を「トロフィー」より「実績」寄りに調整
- APP_VERSION を v3.1 に更新

## GitHubでの配置
あなたのリポジトリが public フォルダを使っている場合は、ZIP内の public フォルダの中身を
GitHubの Reearning / public 直下にアップロードしてください。

正しい配置:
public/
  index.html
  manifest.webmanifest
  icon-192.png
  icon-512.png
  apple-touch-icon.png
  favicon-32.png
  trophies/
    ch6-own-beginner.png
    ...
  illustrations/
    first-step.png
    explanation.png
    comparison.png
    products.png
    review.png
    trophy.png
    plan-basic.png

注意:
public/trophies/trophies のように二重フォルダにしないでください。
public/illustrations/illustrations もNGです。
