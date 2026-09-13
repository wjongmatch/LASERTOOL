# LASERTOOL v5.3

本版修正 GitHub Pages 上「模式按鈕按下沒有反應」問題。

## 修正方式
- 模式按鈕改成直接呼叫 `LASERTOOL_ENTER()`
- 模式切換核心程式直接放在 `index.html`
- `style.css` 與 `app.js` 加上 `?v=5.3`，強制瀏覽器抓新版本，避免舊快取
- 保留 `[hidden] { display:none !important; }`
- 保留「← 重選模式」
- 保留單一預覽區，不會在底部重複顯示圖片

## GitHub
請三個檔案全部覆蓋：
- index.html
- style.css
- app.js

Commit 後重新開啟 GitHub Pages。
