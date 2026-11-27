発車標モード（ATOS風）追加ファイル

【上書き/追加するファイル】（プロジェクト直下に重ねてコピー）
 変更: index.html / style.css / sw.js / js/script.js / js/transfer.js
 追加: js/boardlib.js / js/board.js / board-config.html / board-led.html
       fonts/ascii8x16.json / board/board.json / board/sample/config.json / board/sample/led.json / board/sample/icon.png
 （旧版の board/sample-config.json と board/sample-led.json は不要なので削除してください）

【駅（盤面）の追加のしかた】
 1. board/<フォルダ名>/ に config.json と led.json を置く
 2. 一覧に出すアイコン画像（PNG）を board/<フォルダ名>/ に置く（例: icon.png）
 3. board/board.json の "boards" に次の1件を足す
      { "id":"○○", "name":"表示名", "description":"説明", "dir":"<フォルダ名>", "icon":"icon.png", "config":"config.json", "led":"led.json" }
    （icon は複数なら "icons":["a.png","b.png"]。led.json が無くても動きます）
 4. 「ATOS発車標を表示」を押すと、方向幕と同じカード一覧に出ます。一覧の間は同じ位置に「方向幕を表示」ボタンが出て、押すと方向幕の一覧に戻ります

【ツール】
 board-config.html … config.json を作る/読み込んで編集（時刻2/3/4桁・接近表示・在線位置・スクロール・ダイヤ）
 board-led.html    … led.json を作る/読み込んで編集（画像から追加・時刻PNG・ドット編集）
 どちらもフォント内蔵の単体ファイルで、ダブルクリックで開けます。

【確認用】 index.html?boardDebug で開くと、発車標の画面に時刻を進めるボタンが出ます

【表示の優先順位】 接近表示 ＞ 在線位置(指定秒数だけ) ＞ スクロール ＞ 通常表示
単位: 横16ドット=1桁 / 縦16ドット=1段
