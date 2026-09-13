# 黑白網點／雷雕圖片轉換器 v2

純前端 HTML / CSS / JavaScript 工具，可直接放到 GitHub Pages。

## 新增功能
- 拖曳上傳
- 臨界值
- 網點大小
- 對比
- 網點角度
- 網點密度
- 黑白反轉
- 雷雕模式
- 原圖 / 結果對照
- 圓點、線條、菱形、方形
- 輸出 JPG
- 輸出透明背景 PNG
- 輸出 DXF 外框向量

## DXF 說明
DXF 會將目前處理結果中的黑色區域外框轉為 LWPOLYLINE。
為避免複雜圖片產生數十萬節點，DXF 追蹤時會將最長邊限制在約 900px，再把座標比例還原。

適合：
- 雷射雕刻
- 雷射切割前的外框整理
- AutoCAD / LibreCAD / LightBurn / RDWorks 等後續編修

注意：
- DXF 是輪廓向量，不是「真正的灰階網點填色」。
- 如果圖片過於細碎，建議提高網點大小，或啟用雷雕模式。
- 若需要真正可縮放的網點向量，SVG 會比 DXF 更適合，之後可再加入。

## GitHub Pages
將以下檔案上傳到 Repository 根目錄：
- index.html
- style.css
- app.js

然後：
Settings → Pages → Deploy from a branch → main → /root

所有圖片皆於瀏覽器本機處理，不會上傳伺服器。
