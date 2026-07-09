# Rearning UI v2.0 PWA Offline Release

## 追加内容
- service-worker.js を追加
- index.html に Service Worker 登録処理を追加
- manifest.webmanifest の PWA設定を確認・補強
- 画面上のバージョン表記はスタッフ展開用の v2.0 のまま

## できること
- iOS / Android でホーム画面追加
- 一度オンラインで開いた後、基本画面をオフラインでも開ける
- 画像は index.html 埋め込み済みなので、画像フォルダ不要

## GitHub配置
GitHubの Reearning / public / に以下を置いてください。

public/
  index.html
  service-worker.js
  manifest.webmanifest
  icon-192.png
  icon-512.png
  apple-touch-icon.png
  favicon-32.png

## 注意
- 初回だけはオンラインで開いて、Service Workerにキャッシュさせる必要があります。
- 反映後、古い表示が残る場合はSafari/Chromeの再読み込み、またはPWAを削除して再追加してください。
- GitHub PagesなどHTTPS環境で動かしてください。
