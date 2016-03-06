# The Bake Sale 2016

給阿姨的線上表單～

## 使用說明

打開一個 google spreadsheet

https://docs.google.com/spreadsheets/d/1TuqlBzU9oGAaExc3lXtZK2wiI9mcdSeN_1DMyYFALIs/edit#gid=0

然後記得讓這個傢伙有存取權限：

aa-663 [AT] ann-arbor-bake-sale-2016.iam.gserviceaccount.com

然後要插入指令碼（原則上應該複製專案就可以了）

### 細節

1. C2/D2 這兩格分別代表 Freeze Row/ Freeze Column, 會是一開始爬欄位的關鍵
2. 最後一欄也不會被 parse
3. emailed 設定為 0，每一分鐘 script 會從最後一列往回檢查，只要是 0 都會寄信。
