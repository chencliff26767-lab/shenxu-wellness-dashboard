# Cliff 健康管理 Dashboard 系統規格書
## 完整建置、交付與部署規格

- 文件版本：1.5
- 建立日期：2026-06-18
- 專案擁有者：Cliff
- 預設時區：Asia/Taipei
- 專案定位：Cliff 與指定教練共同使用的私人健康紀錄 Web App
- 本版重點：iPhone-first 手動紀錄、每週預排訓練、勾選式執行流程、Supabase Free 圖片容量最佳化
- 正式架構：Next.js + TypeScript + Tailwind CSS + shadcn/ui + Recharts + Supabase + Vercel
- 預設身高：168 cm
- 介面語言：繁體中文
- 裝置優先順序：iPhone（Safari／加入主畫面 PWA）> 其他手機 > 平板 > 桌機

---

# 0. 給執行 Agent 的最高優先指令

這份文件是專案的唯一主要規格。執行 Agent 應依照本文件逐步完成專案，不得擅自把系統改成 Notion、Coda、Looker Studio、Airtable、Google Sheets 或其他低程式碼方案。

## 0.1 必須遵守

1. 使用 **Next.js App Router**。
2. 使用 **TypeScript strict mode**。
3. 使用 **Tailwind CSS + shadcn/ui**。
4. 使用 **Supabase Auth、PostgreSQL、Storage 與 Row Level Security**。
5. 使用 **Vercel** 部署。
6. 所有健康資料與照片都必須在登入後才能查看。
7. Supabase Storage Bucket 必須是 private。
8. 每一張暴露於 Supabase Data API 的資料表都必須啟用 RLS。
9. `SUPABASE_SERVICE_ROLE_KEY` 絕不可放入 `NEXT_PUBLIC_*` 變數，也不可進入瀏覽器 Bundle。
10. 優先完成可用、快速、手機友善的輸入流程，再增加視覺效果。
11. 不得使用傳統企業 BI 風格。
12. 不得使用大量紅綠燈 KPI、密集格線、鮮豔高飽和色或科技藍。
13. 所有表單都要有前端與伺服器端驗證。
14. 所有日期顯示與週期統計都以 `Asia/Taipei` 為準。
15. 若實際套件 API 與本文件不同，以執行當下的官方穩定版文件為準，並在 README 記錄差異。
16. 不應因為小型、不影響核心功能的模糊處而停止；採用本文件的預設值繼續完成。
17. 每完成一個階段，都要執行 lint、typecheck、測試與 build；不可累積到最後才處理。
18. 不可只製作靜態 Prototype。最終交付必須能登入、寫入資料、上傳照片、查看趨勢並部署到 Vercel。
19. 所有核心流程必須先以 iPhone Safari 與「加入主畫面」後的 Standalone PWA 實機驗收；一般桌機 RWD 通過不可取代 iPhone 實機驗收。
20. 飲食、訓練與身體狀況照片不可直接保存 iPhone 原始檔；預設只保存壓縮後的 WebP 顯示圖與必要縮圖，不保存原始照片。
21. 一般照片的主顯示圖目標為 80～180KB、硬上限 250KB；縮圖目標為 15～40KB。不得為了追求極小容量而讓照片失去教練判讀價值。
22. 所有核心健康資料以手動輸入為主；第一版不實作外部健康平台或穿戴裝置自動同步。
23. 預排訓練是第一版核心功能，不得降級為單純備註或日曆文字；必須支援日期、運動類型、動作、變化種類、目標組數、次數、重量、RPE／RIR 與休息時間。
24. 預排與實際訓練必須建立可追溯連結。開始執行時由計畫自動建立實際 Session，不能要求使用者重新輸入相同動作。
25. 勾選完成一組時，系統預設採用原定重量與次數；只有實際結果不同時才要求修改，降低運動中的輸入成本。
26. 預排訓練支援完成、部分完成、略過、取消與改期；未完成不得使用羞辱、懲罰或高壓紅色文案。
27. 計畫一旦開始執行，原始目標應鎖定成快照；後續修改實際重量、次數或強度，不得改寫原始計畫。

## 0.2 最終交付物

執行 Agent 最後必須交付：

- 可執行的 GitHub Repository
- 正式 Vercel Deployment URL
- Supabase SQL migrations
- `.env.example`
- 完整 README
- 資料庫 TypeScript types
- 基本 Seed 或 Demo 模式
- 自動化測試
- 部署與維運說明
- 驗收清單結果
- 已知限制清單

---

# 1. 產品願景

建立一個溫暖、安靜、容易持續使用的個人健康 Dashboard。

這不是公司報表，也不是醫療系統。它是一個讓 Cliff 能快速留下飲食、運動與身體變化，同時讓教練能看見趨勢、留言與設定目標的共同健康日誌。

核心概念：

> 先記錄，再分析；先簡單，再精準。  
> 一點一點，也是在前進。

MVP 的飲食、訓練、體重、腰圍與身體狀況資料，均由使用者或教練透過系統表單手動輸入，不依賴外部健康平台或穿戴裝置同步。

---

# 2. 核心目標與非目標

## 2.1 核心目標

1. Cliff 能在 30～60 秒內手動完成一筆日常紀錄。
2. 手機拍照後可以直接建立飲食紀錄。
3. 能記錄重訓、有氧、皮拉提斯、慢跑、網球與自訂運動。
4. 能記錄體重、腰圍並自動計算 BMI。
5. 教練能查看 Cliff 的資料並提供回饋。
6. 能用溫和、簡潔的圖表查看趨勢。
7. 不需要自行管理 Server、Linux、Nginx 或資料庫主機。
8. 初期可在 Vercel 與 Supabase 免費方案內運作。
9. 資料可匯出，避免被單一平台鎖定。
10. 網站可加到 iPhone 主畫面，使用體驗接近 App。
11. 飲食與訓練照片平均控制在數十至數百 KB，讓 Supabase Free Storage 可長期使用。
12. Cliff 可以先安排未來一週的訓練日期、動作、種類、組數、次數、重量與目標強度。
13. 到了訓練當天，系統直接顯示今天要做什麼，使用者以勾選為主、修改差異為輔。
14. 系統可比較原定計畫與實際完成結果，協助 Cliff 與教練調整下一週內容。
15. 未完成的計畫可以改期、部分完成或略過，不會消失，也不會被當成已完成紀錄。

## 2.2 非目標

第一版不做：

- 醫療診斷
- 自動判斷疾病
- 精確熱量或營養素辨識
- AI 自動辨識照片中的所有食材
- 外部健康平台、穿戴裝置或運動平台自動同步
- 多位一般會員 SaaS
- 金流
- 公開社群
- 即時聊天系統
- 複雜離線同步
- 原始高畫質影片管理
- 自動產生醫療建議

---

# 3. 使用者與權限

## 3.1 Owner：Cliff

可以：

- 查看自己的所有資料
- 新增、修改、刪除自己的飲食、身體數據與實際訓練
- 建立、編輯、複製、改期、開始、完成、略過與取消自己的預排訓練
- 上傳與刪除自己的照片
- 查看原定計畫與實際結果差異
- 查看教練回饋
- 管理教練關係
- 設定目標
- 匯出資料
- 移除教練權限

## 3.2 Coach：指定教練

預設可以：

- 查看 Cliff 授權的飲食、訓練、預排計畫與身體趨勢
- 留下單筆回饋
- 建立或調整每週目標
- 建立、編輯與改期尚未開始的訓練計畫
- 查看計畫完成率、部分完成與略過原因
- 標記需要注意的項目
- 查看自己留下的回饋

預設不可以：

- 刪除 Cliff 的原始紀錄
- 修改已開始或已完成計畫的原始目標快照
- 直接替 Cliff 勾選實際完成組數
- 修改 Cliff 的身體數據
- 管理 Cliff 的帳號
- 邀請其他教練
- 查看未被授權的其他使用者資料

Coach 是否能管理預排計畫，由 `manage_plans` 權限控制。Cliff 可以隨時關閉這項權限。

## 3.3 未授權使用者

即使知道網址：

- 只能看到登入頁
- 不能查詢健康資料
- 不能讀取照片
- 不能查看預排訓練
- 不能透過 Supabase API 繞過前端權限

---

# 4. 使用者故事

## 4.1 Cliff：日常紀錄

- 我想在吃飯時拍一張照片，快速記錄這一餐。
- 我想複製昨天的早餐，不必每天重新輸入。
- 我想在沒有預排的情況下，也能事後補登一次訓練。
- 我想記錄跑步距離、配速、心率及膝蓋或足弓疼痛。
- 我想記錄皮拉提斯項目、彈簧阻力、組數與次數。
- 我想每天輸入體重與腰圍，BMI 自動完成。
- 我想看七日平均，而不是被單日體重波動影響。
- 我想看到教練最新留言與本週重點。
- 我想知道今天還有哪些項目尚未記錄。
- 我想拍照時不必擔心 Supabase 免費容量很快用完。

## 4.2 Cliff：預排與執行訓練

- 我想在週末先排好下週每天要做的訓練，不必到健身房才思考內容。
- 我想指定下週一做深蹲、保加利亞分腿蹲，以及各自的變化種類、組數、次數、重量與目標強度。
- 我想指定下週二做臥推或其他上半身訓練。
- 我想複製上週某一天或整週的計畫，再做小幅修改。
- 我想在今日首頁直接看到今天預計訓練的內容。
- 我想按下「開始訓練」後，所有原定動作與組數自動出現。
- 如果某組完全照計畫完成，我只想點一下勾選，不想再次輸入重量與次數。
- 如果實際重量、次數或 RPE 不同，我想只修改有差異的欄位。
- 我想略過某一組或某個動作，並可選填原因。
- 我想暫停訓練，稍後繼續，進度不能消失。
- 我想完成後看到原定與實際結果差異。
- 如果今天真的無法訓練，我想一鍵改到明天或其他日期，而不是刪掉重建。
- 我想把未完成的計畫標成部分完成或略過，不要假裝完成。
- 我想看到本週預排幾次、完成幾次，以及哪些動作經常未完成。
- 我不希望系統用羞辱式文案責備我，但希望它清楚提醒尚未執行的計畫。

## 4.3 教練

- 我想快速看見 Cliff 本週體重、腰圍、運動量與執行率。
- 我想查看 Cliff 下週已排哪些訓練，避免安排不合理或恢復不足。
- 我想替 Cliff 建立或調整尚未開始的訓練計畫。
- 我想比較原定組數、重量、次數與實際結果。
- 我想從飲食照片了解實際飲食內容。
- 我想對某一餐、某次訓練或某個預排計畫留言。
- 我想看見高疼痛、高 RPE、部分完成、略過或逾期未執行的訓練。
- 我想設定下週目標。
- 我不想在大量原始表格中尋找資料。

---

# 5. 資訊架構與路由

建議使用 Route Groups 區分登入與 Dashboard。

```text
/
├── /login
├── /auth/callback
└── /(dashboard)
    ├── /today
    ├── /plans
    ├── /plans/new
    ├── /plans/[id]
    ├── /plans/[id]/edit
    ├── /plans/[id]/execute
    ├── /meals
    ├── /meals/new
    ├── /meals/[id]
    ├── /workouts
    ├── /workouts/new
    ├── /workouts/[id]
    ├── /body
    ├── /coach
    ├── /settings
    └── /settings/access
```

登入成功後預設導向 `/today`。

## 5.1 iPhone 底部導覽重新設計

底部固定導覽改為：

1. **今日**：今天的身體、飲食與今日預排訓練
2. **計畫**：週計畫、未來訓練與改期
3. **新增**：中央 Quick Add
4. **紀錄**：飲食、實際訓練、身體數據與趨勢
5. **教練**：回饋、目標與共同規劃

「新增」開啟 Bottom Sheet：

- 預排一個訓練
- 事後記錄一次訓練
- 記錄一餐
- 記錄身體數據

「紀錄」頁面內以 Segmented Tabs 或清楚卡片前往：

- 飲食
- 訓練歷史
- 身體數據
- 趨勢

桌機版改為左側 Sidebar，但資訊架構與名稱一致。

## 5.2 計畫與實際紀錄的關係

```text
Workout Plan
  ├── 預定日期與時間
  ├── 訓練類型與目標
  ├── Planned Exercises
  └── Planned Sets
          │
          │ 開始訓練：建立快照
          ▼
Workout Session
  ├── 實際開始與結束時間
  ├── Actual Exercises
  └── Actual Sets
          │
          ▼
完成摘要與計畫差異
```

規則：

- 預排計畫不是實際訓練紀錄。
- 尚未開始的計畫可以編輯與改期。
- 開始後鎖定原定目標快照。
- 實際 Session 可連回原計畫。
- 事後補登的訓練可以沒有原計畫。
- 一個計畫最多產生一個主要實際 Session。
- 若中途暫停，應繼續同一個 Session，不建立重複紀錄。

---

# 6. 主要頁面與新 UI／UX 流程

## 6.1 登入頁 `/login`

內容：

- 專案名稱：Cliff Wellness Journal
- 文案：在緩慢的日子裡，也留下身體前進的痕跡。
- 溫暖插圖
- Google 登入
- Email Magic Link 可作為備用
- 隱私提示

行為：

- 已登入者直接轉到 `/today`
- 未授權帳號登入後顯示「尚未取得存取權」，不可看到任何健康資料
- 不顯示註冊成為一般會員的導向

## 6.2 今日首頁 `/today`

今日首頁由「要做什麼」優先，而不是先顯示大量圖表。

由上到下：

1. 日期與問候語
2. 今日預排訓練 Hero Card
3. 今日快速紀錄
4. 教練最新回饋
5. 今日身體數據
6. 今日三餐
7. 本週執行摘要
8. 簡短鼓勵文字

### 今日有預排訓練

Hero Card 顯示：

```text
今天・下肢力量

深蹲
4 組 × 8 次・40 kg・目標 RPE 7

保加利亞分腿蹲
3 組 × 10 次／側・啞鈴 12 kg

預計 50 分鐘
[開始訓練]
```

次要操作：

- 查看完整計畫
- 改期
- 編輯；只限尚未開始
- 今天不做；開啟略過／改期選單

### 今日沒有預排訓練

顯示溫和空狀態：

```text
今天還沒有安排訓練
先替未來的自己準備好，到了現場就不用再想。

[安排今天] [安排本週]
```

不可只顯示「No data」。

### 今日已完成

Hero Card 改為：

- 完成時間
- 完成動作數
- 完成組數
- 實際 RPE
- 與原定計畫差異摘要
- 查看紀錄
- 留下今日感受

## 6.3 週計畫 `/plans`

這是新的核心頁面。

### 頂部

- 週範圍，例如 `6/22－6/28`
- 上一週、下一週
- 回到本週
- `安排訓練` 主按鈕
- `複製上週` 次按鈕

### iPhone 週檢視

不要使用擁擠的桌面月曆。

使用橫向 Day Chips：

```text
一 22   二 23   三 24   四 25   五 26   六 27   日 28
  ●       ●               ●
```

點選日期後，下方顯示該日卡片。

Day Chip 狀態：

- 空白：無計畫
- 鼠尾草圓點：已安排
- 實心勾：已完成
- 半圓或文字：部分完成
- 淡陶土線：待改期
- 灰色刪除線不可使用，避免像懲罰

### 每日計畫卡片

顯示：

- 訓練名稱
- 運動類型
- 預定時間
- 目標分鐘
- 動作數
- 主要動作摘要
- 狀態
- 建立者：Cliff 或教練
- 教練留言數

操作：

- 查看
- 編輯
- 複製
- 改期
- 開始
- 略過
- 取消

不可把 Drag & Drop 當成唯一改期方式；iPhone 以「改期」Bottom Sheet 為主。

## 6.4 建立預排訓練 `/plans/new`

採 4 步驟 Wizard，但使用者可以返回前一步。

### Step 1：選日期與訓練主題

- 日期
- 預定時間，選填
- 訓練名稱
- 運動類型
- 預計時間
- 本次重點
- 建立方式：
  - 從空白建立
  - 複製最近一次
  - 複製上週同一天
  - 從既有計畫複製

### Step 2：加入動作

每個動作：

- 動作名稱
- 動作變化／種類
  - 例如高背槓深蹲、低背槓深蹲、啞鈴保加利亞分腿蹲
- 器材
- 訓練部位
- 左右側
- 必做／選做
- 備註

操作：

- 搜尋最近使用動作
- 新增自訂動作
- 調整順序
- 複製動作
- 刪除動作

### Step 3：設定目標組數

每一組可設定：

- 目標重量
- 目標次數
- 目標持續時間
- 目標距離
- 目標 RPE
- 目標 RIR
- 休息秒數
- 左右側
- 備註

快捷操作：

- `新增同樣一組`
- `套用到所有組`
- `第 2～4 組沿用第 1 組`
- `遞增重量`
- `遞減次數`

### Step 4：預覽與儲存

預覽：

- 日期
- 預計總時間
- 動作順序
- 各組目標
- 必做與選做
- 是否與前後日訓練部位過度重疊；只做提醒，不做醫療判斷

主操作：

- 儲存計畫
- 儲存並安排下一天
- 儲存並回到本週

## 6.5 計畫詳情 `/plans/[id]`

顯示：

- 日期、時間、標題、類型
- 建立者
- 狀態
- 預估時間
- 本次重點
- 所有動作及目標組數
- 教練留言
- 計畫修改時間

尚未開始：

- 開始訓練
- 編輯
- 複製
- 改期
- 略過
- 取消

已開始：

- 繼續訓練
- 查看目前進度
- 原始計畫只讀

已完成：

- 查看原定與實際差異
- 查看實際 Session
- 複製成新計畫

## 6.6 執行訓練 `/plans/[id]/execute`

這是運動當下使用的 iPhone 專用模式。

### 進入方式

- 今日首頁點「開始訓練」
- 計畫詳情點「開始訓練」
- 已開始者點「繼續訓練」

第一次開始時，系統以交易方式：

1. 鎖定原計畫。
2. 建立 `workout_session`。
3. 複製所有 Planned Exercises。
4. 複製所有 Planned Sets。
5. 實際值預填為目標值。
6. 所有組狀態設為 `pending`。

### 執行畫面

頂部固定：

- 訓練名稱
- 已用時間
- 完成組數，例如 `5 / 12`
- 暫停／離開
- 完成訓練

動作卡片：

```text
深蹲
目標：4 × 8・40 kg・RPE 7

□ 第 1 組   40 kg × 8   RPE —
□ 第 2 組   40 kg × 8   RPE —
□ 第 3 組   40 kg × 8   RPE —
□ 第 4 組   40 kg × 8   RPE —
```

### 一鍵勾選邏輯

點擊未完成組的 44px Checkbox：

- `execution_status = completed`
- 實際重量沿用目標重量
- 實際次數沿用目標次數
- 顯示 RPE 快速選擇；可以現在填，也可結束前補填
- 行列變為柔和完成狀態

若實際不同：

- 點該組內容開啟 Inline Editor 或 Bottom Sheet
- 修改實際重量、次數、時間、距離、RPE、RIR
- 原目標以小字保留對照
- 不修改 Planned Set

其他操作：

- 略過此組
- 新增額外組
- 補充備註
- 複製上一組實際值
- 完成整個動作
- 略過整個動作

### 避免誤操作

- 勾選後 5 秒內提供 Undo。
- 已完成組再次點擊，不直接刪除；先顯示取消完成確認。
- 略過必須從明確選單操作，不與勾選相鄰。
- 破壞性操作不用左滑作唯一入口。
- App 進背景或鎖屏後，進度保留。
- 每次變更自動保存，不依賴最後一次 Submit 才保存全部進度。

### 完成訓練

點「完成訓練」後顯示 Summary Sheet：

- 已完成動作／原定動作
- 已完成組數／原定組數
- 額外組數
- 實際總時間
- 整體 RPE，必填或明確略過
- 疼痛部位與分數
- 運動後感受
- 未完成動作
- 計畫差異
- 備註

Plan 狀態：

- 所有必做組完成：`completed`
- 至少一組完成但未全部完成：`partial`
- 完全沒有完成並選擇略過：`skipped`
- 使用者取消且不保留執行：`cancelled`

## 6.7 改期、略過與逾期流程

### 改期

Bottom Sheet 顯示：

- 明天
- 本週其他日期
- 下週同一天
- 選擇日期
- 原因，選填

改期規則：

- 保留同一計畫 ID。
- 更新預定日期。
- 記錄改期次數與最後改期時間。
- 尚未開始才能直接改期。
- 已開始的 Session 不可改成另一日；應暫停後繼續，或結束為部分完成，再複製剩餘內容。

### 略過

選填原因：

- 時間不足
- 身體不適
- 疲勞
- 行程衝突
- 場地或器材限制
- 其他

文案：

- 使用「今天先休息，之後再安排」
- 不使用「你失敗了」「偷懶」等羞辱文案

略過後提供：

- 改排到明天
- 複製到下週
- 保持略過

### 逾期

超過預定日期但狀態仍為 `planned`：

- UI 顯示「待安排」
- 不自動標成失敗或略過
- 首頁提供：
  - 今天執行
  - 改期
  - 略過

## 6.8 訓練紀錄 `/workouts`

頁面分成：

- 待執行；連到計畫
- 進行中
- 已完成
- 事後補登
- 全部

摘要：

- 本週預排次數
- 本週完成次數
- 計畫完成率
- 完成組數
- 平均 RPE
- 疼痛警示

每張已完成卡片顯示：

- 是否來自預排
- 原定與實際差異摘要
- 運動類型
- 總時間
- 完成組數
- 整體 RPE
- 教練留言

## 6.9 事後新增訓練 `/workouts/new`

仍保留原本「做完再記錄」的方式。

適用：

- 臨時運動
- 忘記先排
- 補登過去紀錄
- 無法在運動中使用手機

第一步選運動類型：

- 重訓
- 有氧
- 皮拉提斯
- 慢跑
- 網球
- 其他

共用欄位：

- 日期
- 開始時間
- 總時間
- 整體 RPE 1～10
- 運動前狀態
- 運動後感受
- 疼痛部位
- 疼痛分數 0～10
- 照片，選填
- 備註

重訓、有氧、皮拉提斯、慢跑與網球欄位沿用原有規格。

## 6.10 飲食日誌 `/meals`

檢視切換：

- 今日
- 日曆
- 照片卡片
- 依餐別篩選

每張卡片顯示：

- 照片
- 日期與時間
- 餐別
- 食物描述
- 飢餓程度
- 飽足程度
- 是否外食
- 教練留言數

功能：

- 新增
- 編輯
- 刪除
- 複製
- 查看詳情
- 教練留言

## 6.11 新增飲食 `/meals/new`

欄位：

- 日期與時間，預設現在
- 餐別：早餐、午餐、晚餐、點心、宵夜
- 照片，可多張，MVP 建議最多 3 張
- 食物內容，必填
- 大概份量，選填
- 飢餓程度 1～5
- 飽足程度 1～5
- 是否外食
- 飲料
- 備註

快捷功能：

- 複製昨天同餐別
- 最近吃過
- 常用餐點
- 只拍照稍後補文字：可作第二階段

## 6.12 身體趨勢 `/body`

輸入欄位：

- 日期與時間
- 體重 kg
- 腰圍 cm
- 是否空腹
- 是否排便後
- 睡眠時數
- 備註

固定身高 168 cm：

```text
BMI = 體重 kg ÷ 1.68²
```

顯示：

- 今日體重
- 七日移動平均
- 與上週平均差異
- 今日腰圍
- BMI
- 本月最高、最低及平均體重
- 體重每日值與七日平均折線圖
- 腰圍趨勢圖

不應以紅色顯示正常的單日上升。

## 6.13 教練專區 `/coach`

顯示：

- 下週計畫摘要
- 尚未安排的訓練日
- 本週預排與完成次數
- 計畫完成率
- 部分完成與略過項目
- 原定與實際差異
- 本週平均體重
- 腰圍變化
- 總運動分鐘
- 平均 RPE
- 飲食紀錄完整度
- 疼痛警示
- 最新留言
- 本週目標
- 下週重點

教練可以：

- 新增單筆留言
- 新增每週回饋
- 設定每週目標
- 建立與編輯尚未開始的計畫
- 複製前一週計畫
- 改期尚未開始的計畫
- 標記已查看
- 標記需要注意

## 6.14 設定 `/settings`

- 顯示名稱
- 身高，預設 168 cm；MVP 可鎖定
- 時區，預設 Asia/Taipei
- 一週起始日，預設星期一
- 預設組間休息
- 是否在今日首頁顯示明日計畫
- 主題偏好
- 教練存取權與 `manage_plans`
- 匯出資料
- 刪除資料
- 登出

---

# 7. 視覺設計系統

## 7.1 風格

關鍵詞：

- 溫潤
- 簡約
- 安靜
- 自然
- 侘寂
- 紙張感
- 低飽和
- 柔和插圖
- 健康手帳
- 不完美但舒適

避免：

- 高飽和科技藍
- 強烈漸層
- 霓虹
- 密集陰影
- 過度玻璃擬態
- 大量表格
- KPI 儀表板感
- 紅綠燈式健康評分
- 把未完成計畫呈現成失敗、懲罰或羞辱

## 7.2 色票

```css
:root {
  --background: #f4f0e8;
  --surface: #faf8f3;
  --surface-muted: #eee8de;
  --foreground: #4d4841;
  --muted-foreground: #81786d;
  --primary: #7c8673;
  --primary-foreground: #ffffff;
  --secondary: #b68164;
  --secondary-foreground: #ffffff;
  --accent-soft: #d8b7ac;
  --border: #ddd5c9;
  --success-soft: #a9b39b;
  --warning-soft: #c7a57c;
  --danger-soft: #b87f72;
}
```

可依 shadcn/ui 所需的 OKLCH 格式轉換，但視覺結果需接近以上 Hex。

## 7.3 字體

- 標題：Noto Serif TC
- 內文：Noto Sans TC
- 數字：Noto Sans TC，使用 tabular numbers
- 不使用過多字重
- 正文至少 16px
- 重要數字 28～36px
- 行高至少 1.5

使用 `next/font/google`，避免額外手動託管字型。

## 7.4 圓角與間距

- 大卡片：20px
- 小卡片：16px
- 按鈕：14～18px
- 輸入框：14px
- 頁面左右 Padding：手機 16px、平板 24px、桌機 32px
- 卡片之間至少 12～16px
- 點擊區域至少 44 × 44px

## 7.5 插圖

插圖方向：

- 植物枝葉
- 陶杯
- 木盤
- 食物線稿
- 人物伸展
- 皮拉提斯
- 晨光與窗戶
- 不規則手繪線條

規則：

- 使用原創、已授權或專案自行生成的素材
- 不可抓取來源不明圖片
- 優先 SVG 或透明 WebP
- 插圖只用於 Banner、空狀態與區塊點綴
- 不讓插圖干擾輸入操作
- 每頁最多 1 個主要插圖焦點

## 7.6 圖表

使用 shadcn Chart 或 Recharts。

圖表原則：

- 少量格線
- 不使用 3D
- 不使用儀表盤 Gauge
- 不使用超過 4 種顏色
- 主要趨勢用鼠尾草綠
- 次要趨勢用陶土色
- Tooltip 使用暖白卡片
- X 軸標籤減量
- 手機上避免橫向捲動
- 圖表高度約 220～300px
- 計畫狀態以文字＋圖示＋柔和色塊表示，不只靠顏色
- `planned` 使用淡砂色、`in_progress` 使用鼠尾草綠、`completed` 使用柔和深綠、`partial` 使用陶土色、`skipped` 使用灰褐色

---

# 8. 技術架構

```text
使用者
  ├── Cliff iPhone / Desktop
  └── Coach Phone / Desktop
          │
          ▼
Vercel
  └── Next.js App Router
      ├── React Server Components
      ├── Client Components
      ├── Server Actions
      ├── Route Handlers
      └── proxy.ts session refresh
          │
          ▼
Supabase
  ├── Auth
  ├── PostgreSQL
  ├── Row Level Security
  └── Private Storage
```

## 8.1 前端與全端

- Next.js 最新穩定版
- React 隨 Next.js 穩定版
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts
- React Hook Form
- Zod
- date-fns
- Lucide React
- Sonner
- browser-image-compression

## 8.2 後端

- Next.js Server Actions：表單寫入
- Next.js Route Handlers：OAuth callback、下載匯出等
- Supabase PostgreSQL：主要資料
- Supabase Auth：登入
- Supabase Storage：照片
- RLS：最終資料授權邊界

## 8.3 部署

- GitHub：版本控制
- Vercel：Preview 與 Production Deployment
- Supabase：雲端資料庫與檔案
- 不需要 VPS
- 不需要自架 PostgreSQL
- 不需要 Nginx

---

# 9. 專案建立：Step by Step

## Phase 0：準備帳號與工具

建立或確認：

- GitHub 帳號
- Vercel 帳號
- Supabase 帳號
- Google Cloud 帳號，僅 Google OAuth 需要
- Node.js，使用官方目前支援的 LTS 或 Next.js 要求版本
- pnpm
- Git
- VS Code 或同等 IDE

確認：

```bash
node -v
pnpm -v
git --version
```

## Phase 1：建立 GitHub Repository

Repository 建議名稱：

```text
cliff-wellness-dashboard
```

設定：

- Private Repository
- 初始化 README 可不勾，交由 Next.js 建立後推送
- 開啟 Branch Protection，至少正式使用後開啟
- `main` 作為 Production Branch
- Feature Branch 命名：
  - `feat/auth`
  - `feat/meals`
  - `feat/workouts`
  - `feat/body-metrics`
  - `feat/coach`
  - `fix/...`

## Phase 2：建立 Next.js 專案

```bash
pnpm create next-app@latest cliff-wellness-dashboard
cd cliff-wellness-dashboard
```

選項：

- TypeScript：Yes
- ESLint：Yes
- Tailwind CSS：Yes
- `src/` directory：Yes
- App Router：Yes
- Import alias：`@/*`
- AGENTS.md：Yes，若 CLI 提供此選項
- React Compiler：使用官方穩定預設；若生態套件出現相容問題則關閉並記錄

初始化 Git：

```bash
git init
git add .
git commit -m "chore: initialize Next.js application"
git branch -M main
git remote add origin <GITHUB_REPOSITORY_URL>
git push -u origin main
```

## Phase 3：安裝核心套件

```bash
pnpm add \
  @supabase/supabase-js \
  @supabase/ssr \
  zod \
  react-hook-form \
  @hookform/resolvers \
  recharts \
  lucide-react \
  date-fns \
  sonner \
  browser-image-compression
```

初始化 shadcn/ui：

```bash
pnpm dlx shadcn@latest init
```

建議新增元件：

```bash
pnpm dlx shadcn@latest add \
  button \
  card \
  input \
  label \
  textarea \
  select \
  dialog \
  sheet \
  drawer \
  dropdown-menu \
  tabs \
  badge \
  avatar \
  calendar \
  popover \
  form \
  slider \
  switch \
  checkbox \
  radio-group \
  alert-dialog \
  skeleton \
  separator \
  tooltip \
  chart
```

若 CLI 不支援一次加入全部，分批執行。

## Phase 4：建立專案資料夾

```text
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── today/
│   │   │   └── page.tsx
│   │   ├── meals/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── plans/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── edit/
│   │   │       │   └── page.tsx
│   │   │       └── execute/
│   │   │           └── page.tsx
│   │   ├── workouts/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── body/
│   │   │   └── page.tsx
│   │   ├── coach/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       └── access/
│   │           └── page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── manifest.ts
│   ├── loading.tsx
│   ├── error.tsx
│   └── not-found.tsx
├── actions/
│   ├── meals.ts
│   ├── workout-plans.ts
│   ├── workout-execution.ts
│   ├── workouts.ts
│   ├── body-metrics.ts
│   ├── coach-feedback.ts
│   └── access.ts
├── components/
│   ├── app-shell/
│   ├── auth/
│   ├── charts/
│   ├── coach/
│   ├── forms/
│   ├── illustrations/
│   ├── meals/
│   ├── plans/
│   ├── workout-execution/
│   ├── navigation/
│   ├── shared/
│   ├── today/
│   ├── ui/
│   └── workouts/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── proxy.ts
│   ├── constants/
│   ├── queries/
│   ├── validation/
│   ├── image/
│   ├── date/
│   ├── analytics/
│   ├── workout-plans/
│   │   ├── clone.ts
│   │   ├── comparison.ts
│   │   ├── status.ts
│   │   └── transactions.ts
│   └── utils.ts
├── types/
│   ├── database.types.ts
│   ├── domain.ts
│   └── forms.ts
└── proxy.ts

supabase/
├── config.toml
├── migrations/
└── seed.sql

tests/
├── unit/
├── integration/
└── e2e/
```

---

# 10. Supabase 建立流程

## Phase 5：建立 Supabase Project

1. 登入 Supabase Dashboard。
2. 建立新 Project。
3. Project Name：`cliff-wellness-dashboard`。
4. 選擇距離台灣較近且可用的 Region。
5. 建立高強度 Database Password，保存於密碼管理器。
6. 等待 Project 建立完成。
7. 取得：
   - Project URL
   - Publishable/Anon Key
   - Project Ref
8. 不要把 Service Role Key 貼到前端程式。

建立 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

建立 `.env.example`：

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`.env.local` 必須在 `.gitignore`。

## Phase 6：安裝與初始化 Supabase CLI

```bash
pnpm add -D supabase
pnpm exec supabase init
```

登入與連結：

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <PROJECT_REF>
```

建立 migration：

```bash
pnpm exec supabase migration new initial_schema
```

將下一節 SQL 放入產生的 migration 檔案。

---

# 11. 資料庫 Schema

以下 SQL 是 MVP 的建議基線。執行 Agent 可以針對當下 PostgreSQL/Supabase 穩定版做必要語法調整，但不得降低 RLS 安全性。

```sql
-- ============================================================
-- Cliff Wellness Dashboard - Initial Schema
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Enum types ----------

create type public.relationship_status as enum (
  'pending',
  'active',
  'revoked'
);

create type public.meal_type as enum (
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'late_night'
);

create type public.workout_type as enum (
  'strength',
  'cardio',
  'pilates',
  'running',
  'tennis',
  'other'
);

create type public.workout_plan_status as enum (
  'planned',
  'in_progress',
  'completed',
  'partial',
  'skipped',
  'cancelled'
);

create type public.workout_session_status as enum (
  'in_progress',
  'completed',
  'abandoned'
);

create type public.execution_status as enum (
  'pending',
  'completed',
  'skipped'
);

create type public.feedback_category as enum (
  'meal',
  'workout',
  'body',
  'weekly',
  'general'
);

create type public.feedback_target_type as enum (
  'meal',
  'workout',
  'workout_plan',
  'body_metric',
  'weekly_goal',
  'none'
);

-- ---------- Common trigger ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Profiles ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  height_cm numeric(5,2) not null default 168.00
    check (height_cm between 100 and 250),
  timezone text not null default 'Asia/Taipei',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    avatar_url
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------- Explicit app owners ----------

create table public.app_owners (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- app_owners 不提供一般 Client INSERT policy。
-- Cliff 首次登入後，由 Supabase SQL Editor 手動插入 Cliff 的 auth UUID。

-- ---------- Coach relationships ----------

create table public.coach_relationships (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_owners(owner_id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  status public.relationship_status not null default 'pending',
  permissions jsonb not null default jsonb_build_object(
    'view_meals', true,
    'view_workouts', true,
    'view_body', true,
    'comment', true,
    'manage_goals', true,
    'manage_plans', true
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, coach_id),
  check (owner_id <> coach_id)
);

create trigger coach_relationships_set_updated_at
before update on public.coach_relationships
for each row execute function public.set_updated_at();

-- ---------- RLS helper functions ----------

create or replace function public.can_view_owner(target_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) = target_owner_id
    or exists (
      select 1
      from public.coach_relationships cr
      where cr.owner_id = target_owner_id
        and cr.coach_id = (select auth.uid())
        and cr.status = 'active'
    );
$$;

create or replace function public.can_manage_owner_goals(target_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) = target_owner_id
    or exists (
      select 1
      from public.coach_relationships cr
      where cr.owner_id = target_owner_id
        and cr.coach_id = (select auth.uid())
        and cr.status = 'active'
        and coalesce((cr.permissions ->> 'manage_goals')::boolean, false)
    );
$$;

create or replace function public.can_manage_owner_plans(target_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) = target_owner_id
    or exists (
      select 1
      from public.coach_relationships cr
      where cr.owner_id = target_owner_id
        and cr.coach_id = (select auth.uid())
        and cr.status = 'active'
        and coalesce((cr.permissions ->> 'manage_plans')::boolean, false)
    );
$$;

revoke all on function public.can_view_owner(uuid) from public;
revoke all on function public.can_manage_owner_goals(uuid) from public;
revoke all on function public.can_manage_owner_plans(uuid) from public;
grant execute on function public.can_view_owner(uuid) to authenticated;
grant execute on function public.can_manage_owner_goals(uuid) to authenticated;
grant execute on function public.can_manage_owner_plans(uuid) to authenticated;

-- ---------- Body metrics ----------

create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_owners(owner_id) on delete cascade,
  measured_at timestamptz not null default now(),
  weight_kg numeric(5,2) not null
    check (weight_kg between 25 and 300),
  waist_cm numeric(5,2)
    check (waist_cm is null or waist_cm between 30 and 250),
  bmi numeric(5,2)
    generated always as (
      round(weight_kg / 2.8224, 2)
    ) stored,
  is_fasting boolean,
  after_bowel_movement boolean,
  sleep_hours numeric(4,2)
    check (sleep_hours is null or sleep_hours between 0 and 24),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger body_metrics_set_updated_at
before update on public.body_metrics
for each row execute function public.set_updated_at();

create index body_metrics_owner_measured_idx
on public.body_metrics (owner_id, measured_at desc);

-- ---------- Meal logs ----------

create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_owners(owner_id) on delete cascade,
  eaten_at timestamptz not null default now(),
  meal_type public.meal_type not null,
  description text not null check (char_length(trim(description)) > 0),
  portion_note text,
  beverage text,
  hunger_before smallint
    check (hunger_before is null or hunger_before between 1 and 5),
  fullness_after smallint
    check (fullness_after is null or fullness_after between 1 and 5),
  is_eating_out boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create trigger meal_logs_set_updated_at
before update on public.meal_logs
for each row execute function public.set_updated_at();

create index meal_logs_owner_eaten_idx
on public.meal_logs (owner_id, eaten_at desc);

create index meal_logs_owner_type_idx
on public.meal_logs (owner_id, meal_type, eaten_at desc);

create table public.meal_photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_owners(owner_id) on delete cascade,
  meal_log_id uuid not null,
  display_storage_path text not null unique,
  thumbnail_storage_path text unique,
  display_width_px integer,
  display_height_px integer,
  display_size_bytes bigint
    check (display_size_bytes is null or display_size_bytes <= 256000),
  thumbnail_size_bytes bigint
    check (thumbnail_size_bytes is null or thumbnail_size_bytes <= 61440),
  mime_type text not null default 'image/webp',
  compression_version smallint not null default 1,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  foreign key (meal_log_id, owner_id)
    references public.meal_logs(id, owner_id)
    on delete cascade
);

create index meal_photos_meal_idx
on public.meal_photos (meal_log_id, sort_order);

-- ---------- Planned workouts ----------

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_owners(owner_id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(trim(title)) > 0),
  workout_type public.workout_type not null,
  scheduled_date date not null,
  scheduled_time time,
  target_duration_minutes integer
    check (
      target_duration_minutes is null
      or target_duration_minutes between 0 and 1440
    ),
  status public.workout_plan_status not null default 'planned',
  focus_text text,
  preparation_notes text,
  skipped_reason text,
  reschedule_count integer not null default 0
    check (reschedule_count >= 0),
  last_rescheduled_at timestamptz,
  locked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create trigger workout_plans_set_updated_at
before update on public.workout_plans
for each row execute function public.set_updated_at();

create index workout_plans_owner_schedule_idx
on public.workout_plans (owner_id, scheduled_date, scheduled_time);

create index workout_plans_owner_status_idx
on public.workout_plans (owner_id, status, scheduled_date);

create table public.planned_exercise_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_owners(owner_id) on delete cascade,
  workout_plan_id uuid not null,
  name text not null check (char_length(trim(name)) > 0),
  variation text,
  category text,
  equipment text,
  body_part text,
  laterality text,
  multiply_unilateral_volume_by_two boolean not null default false,
  spring_or_resistance text,
  is_required boolean not null default true,
  order_no smallint not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (workout_plan_id, owner_id)
    references public.workout_plans(id, owner_id)
    on delete cascade
);

create trigger planned_exercise_items_set_updated_at
before update on public.planned_exercise_items
for each row execute function public.set_updated_at();

create index planned_exercise_items_plan_idx
on public.planned_exercise_items (workout_plan_id, order_no);

create table public.planned_exercise_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_owners(owner_id) on delete cascade,
  planned_exercise_item_id uuid not null,
  set_no smallint not null check (set_no > 0),
  target_weight_kg numeric(7,2)
    check (target_weight_kg is null or target_weight_kg >= 0),
  target_repetitions integer
    check (target_repetitions is null or target_repetitions >= 0),
  target_duration_seconds integer
    check (
      target_duration_seconds is null
      or target_duration_seconds >= 0
    ),
  target_distance_m numeric(10,2)
    check (target_distance_m is null or target_distance_m >= 0),
  target_rpe smallint
    check (target_rpe is null or target_rpe between 1 and 10),
  target_rir smallint
    check (target_rir is null or target_rir between 0 and 10),
  rest_seconds integer
    check (rest_seconds is null or rest_seconds >= 0),
  side text,
  notes text,
  created_at timestamptz not null default now(),
  unique (planned_exercise_item_id, set_no),
  unique (id, owner_id),
  foreign key (planned_exercise_item_id, owner_id)
    references public.planned_exercise_items(id, owner_id)
    on delete cascade
);

create index planned_exercise_sets_item_idx
on public.planned_exercise_sets (planned_exercise_item_id, set_no);

-- ---------- Workout sessions ----------

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_owners(owner_id) on delete cascade,
  workout_plan_id uuid,
  workout_type public.workout_type not null,
  session_status public.workout_session_status not null default 'completed',
  title text,
  started_at timestamptz not null default now(),
  duration_minutes integer
    check (duration_minutes is null or duration_minutes between 0 and 1440),
  overall_rpe smallint
    check (overall_rpe is null or overall_rpe between 1 and 10),
  pre_condition text,
  post_condition text,
  pain_area text,
  pain_score smallint
    check (pain_score is null or pain_score between 0 and 10),

  distance_km numeric(7,3)
    check (distance_km is null or distance_km >= 0),
  average_heart_rate integer
    check (average_heart_rate is null or average_heart_rate between 20 and 250),
  max_heart_rate integer
    check (max_heart_rate is null or max_heart_rate between 20 and 250),
  average_pace_seconds_per_km integer
    check (
      average_pace_seconds_per_km is null
      or average_pace_seconds_per_km > 0
    ),
  cadence integer
    check (cadence is null or cadence >= 0),
  calories integer
    check (calories is null or calories >= 0),
  surface text,
  weather text,
  shoes text,

  knee_pain smallint
    check (knee_pain is null or knee_pain between 0 and 10),
  arch_pain smallint
    check (arch_pain is null or arch_pain between 0 and 10),
  sole_pain smallint
    check (sole_pain is null or sole_pain between 0 and 10),
  wrist_pain smallint
    check (wrist_pain is null or wrist_pain between 0 and 10),
  shoulder_pain smallint
    check (shoulder_pain is null or shoulder_pain between 0 and 10),

  metadata jsonb not null default '{}'::jsonb,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (workout_plan_id, owner_id)
    references public.workout_plans(id, owner_id)
    on delete restrict
);

create trigger workout_sessions_set_updated_at
before update on public.workout_sessions
for each row execute function public.set_updated_at();

create index workout_sessions_owner_started_idx
on public.workout_sessions (owner_id, started_at desc);

create index workout_sessions_owner_type_idx
on public.workout_sessions (owner_id, workout_type, started_at desc);

create unique index workout_sessions_plan_unique_idx
on public.workout_sessions (owner_id, workout_plan_id)
where workout_plan_id is not null;

create table public.exercise_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_owners(owner_id) on delete cascade,
  workout_session_id uuid not null,
  planned_exercise_item_id uuid,
  name text not null check (char_length(trim(name)) > 0),
  category text,
  equipment text,
  body_part text,
  laterality text,
  multiply_unilateral_volume_by_two boolean not null default false,
  spring_or_resistance text,
  order_no smallint not null default 0,
  execution_status public.execution_status not null default 'completed',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (workout_session_id, owner_id)
    references public.workout_sessions(id, owner_id)
    on delete cascade,
  foreign key (planned_exercise_item_id, owner_id)
    references public.planned_exercise_items(id, owner_id)
    on delete restrict
);

create trigger exercise_items_set_updated_at
before update on public.exercise_items
for each row execute function public.set_updated_at();

create index exercise_items_session_idx
on public.exercise_items (workout_session_id, order_no);

create table public.exercise_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_owners(owner_id) on delete cascade,
  exercise_item_id uuid not null,
  planned_exercise_set_id uuid,
  set_no smallint not null check (set_no > 0),
  weight_kg numeric(7,2)
    check (weight_kg is null or weight_kg >= 0),
  repetitions integer
    check (repetitions is null or repetitions >= 0),
  duration_seconds integer
    check (duration_seconds is null or duration_seconds >= 0),
  distance_m numeric(10,2)
    check (distance_m is null or distance_m >= 0),
  rpe smallint
    check (rpe is null or rpe between 1 and 10),
  rir smallint
    check (rir is null or rir between 0 and 10),
  rest_seconds integer
    check (rest_seconds is null or rest_seconds >= 0),
  side text,
  quality_score smallint
    check (quality_score is null or quality_score between 1 and 5),
  execution_status public.execution_status not null default 'completed',
  notes text,
  created_at timestamptz not null default now(),
  unique (exercise_item_id, set_no),
  foreign key (exercise_item_id, owner_id)
    references public.exercise_items(id, owner_id)
    on delete cascade,
  foreign key (planned_exercise_set_id, owner_id)
    references public.planned_exercise_sets(id, owner_id)
    on delete restrict
);

create index exercise_sets_item_idx
on public.exercise_sets (exercise_item_id, set_no);

-- ---------- Coach feedback ----------

create table public.coach_feedback (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_owners(owner_id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  category public.feedback_category not null default 'general',
  target_type public.feedback_target_type not null default 'none',
  target_id uuid,
  context_date date,
  body text not null check (char_length(trim(body)) > 0),
  requires_response boolean not null default false,
  is_acknowledged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (target_type = 'none' and target_id is null)
    or
    (target_type <> 'none' and target_id is not null)
  )
);

create trigger coach_feedback_set_updated_at
before update on public.coach_feedback
for each row execute function public.set_updated_at();

create index coach_feedback_owner_created_idx
on public.coach_feedback (owner_id, created_at desc);

-- ---------- Weekly goals ----------

create table public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.app_owners(owner_id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  week_start date not null,
  target_workout_count integer
    check (target_workout_count is null or target_workout_count between 0 and 14),
  target_cardio_minutes integer
    check (target_cardio_minutes is null or target_cardio_minutes >= 0),
  target_strength_sessions integer
    check (target_strength_sessions is null or target_strength_sessions between 0 and 14),
  target_meal_log_count integer
    check (target_meal_log_count is null or target_meal_log_count between 0 and 50),
  focus_text text,
  coach_summary text,
  owner_reflection text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, week_start)
);

create trigger weekly_goals_set_updated_at
before update on public.weekly_goals
for each row execute function public.set_updated_at();

create index weekly_goals_owner_week_idx
on public.weekly_goals (owner_id, week_start desc);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.app_owners enable row level security;
alter table public.coach_relationships enable row level security;
alter table public.body_metrics enable row level security;
alter table public.meal_logs enable row level security;
alter table public.meal_photos enable row level security;
alter table public.workout_plans enable row level security;
alter table public.planned_exercise_items enable row level security;
alter table public.planned_exercise_sets enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.exercise_items enable row level security;
alter table public.exercise_sets enable row level security;
alter table public.coach_feedback enable row level security;
alter table public.weekly_goals enable row level security;

-- Profiles

create policy "profiles_select_self_or_connected"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.coach_relationships cr
    where cr.status = 'active'
      and (
        (cr.owner_id = (select auth.uid()) and cr.coach_id = profiles.id)
        or
        (cr.coach_id = (select auth.uid()) and cr.owner_id = profiles.id)
      )
  )
);

create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- App owners

create policy "app_owners_select_authorized"
on public.app_owners
for select
to authenticated
using ((select public.can_view_owner(owner_id)));

-- Relationships

create policy "relationships_select_participants"
on public.coach_relationships
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or coach_id = (select auth.uid())
);

create policy "relationships_insert_owner"
on public.coach_relationships
for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "relationships_update_owner"
on public.coach_relationships
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "relationships_delete_owner"
on public.coach_relationships
for delete
to authenticated
using (owner_id = (select auth.uid()));

-- Reusable owner-only write and owner/coach read patterns

create policy "body_metrics_select_authorized"
on public.body_metrics
for select
to authenticated
using ((select public.can_view_owner(owner_id)));

create policy "body_metrics_insert_owner"
on public.body_metrics
for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "body_metrics_update_owner"
on public.body_metrics
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "body_metrics_delete_owner"
on public.body_metrics
for delete
to authenticated
using (owner_id = (select auth.uid()));

create policy "meal_logs_select_authorized"
on public.meal_logs
for select
to authenticated
using ((select public.can_view_owner(owner_id)));

create policy "meal_logs_insert_owner"
on public.meal_logs
for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "meal_logs_update_owner"
on public.meal_logs
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "meal_logs_delete_owner"
on public.meal_logs
for delete
to authenticated
using (owner_id = (select auth.uid()));

create policy "meal_photos_select_authorized"
on public.meal_photos
for select
to authenticated
using ((select public.can_view_owner(owner_id)));

create policy "meal_photos_insert_owner"
on public.meal_photos
for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "meal_photos_delete_owner"
on public.meal_photos
for delete
to authenticated
using (owner_id = (select auth.uid()));

-- Planned workouts：Owner 與有 manage_plans 權限的 Coach 可管理尚未開始的計畫。

create policy "workout_plans_select_authorized"
on public.workout_plans
for select
to authenticated
using ((select public.can_view_owner(owner_id)));

create policy "workout_plans_insert_authorized"
on public.workout_plans
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select public.can_manage_owner_plans(owner_id))
);

create policy "workout_plans_update_authorized"
on public.workout_plans
for update
to authenticated
using (
  (select public.can_manage_owner_plans(owner_id))
  and status = 'planned'
  and locked_at is null
)
with check (
  (select public.can_manage_owner_plans(owner_id))
  and status = 'planned'
  and locked_at is null
);

create policy "workout_plans_delete_authorized"
on public.workout_plans
for delete
to authenticated
using (
  (select public.can_manage_owner_plans(owner_id))
  and status = 'planned'
  and locked_at is null
);

create policy "planned_exercise_items_select_authorized"
on public.planned_exercise_items
for select
to authenticated
using ((select public.can_view_owner(owner_id)));

create policy "planned_exercise_items_insert_authorized"
on public.planned_exercise_items
for insert
to authenticated
with check (
  (select public.can_manage_owner_plans(owner_id))
  and exists (
    select 1
    from public.workout_plans wp
    where wp.id = workout_plan_id
      and wp.owner_id = owner_id
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);

create policy "planned_exercise_items_update_authorized"
on public.planned_exercise_items
for update
to authenticated
using (
  (select public.can_manage_owner_plans(owner_id))
  and exists (
    select 1
    from public.workout_plans wp
    where wp.id = planned_exercise_items.workout_plan_id
      and wp.owner_id = planned_exercise_items.owner_id
      and wp.status = 'planned'
      and wp.locked_at is null
  )
)
with check (
  (select public.can_manage_owner_plans(owner_id))
  and exists (
    select 1
    from public.workout_plans wp
    where wp.id = planned_exercise_items.workout_plan_id
      and wp.owner_id = planned_exercise_items.owner_id
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);

create policy "planned_exercise_items_delete_authorized"
on public.planned_exercise_items
for delete
to authenticated
using (
  (select public.can_manage_owner_plans(owner_id))
  and exists (
    select 1
    from public.workout_plans wp
    where wp.id = planned_exercise_items.workout_plan_id
      and wp.owner_id = planned_exercise_items.owner_id
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);

create policy "planned_exercise_sets_select_authorized"
on public.planned_exercise_sets
for select
to authenticated
using ((select public.can_view_owner(owner_id)));

create policy "planned_exercise_sets_insert_authorized"
on public.planned_exercise_sets
for insert
to authenticated
with check (
  (select public.can_manage_owner_plans(owner_id))
  and exists (
    select 1
    from public.planned_exercise_items pei
    join public.workout_plans wp
      on wp.id = pei.workout_plan_id
     and wp.owner_id = pei.owner_id
    where pei.id = planned_exercise_item_id
      and pei.owner_id = owner_id
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);

create policy "planned_exercise_sets_update_authorized"
on public.planned_exercise_sets
for update
to authenticated
using (
  (select public.can_manage_owner_plans(owner_id))
  and exists (
    select 1
    from public.planned_exercise_items pei
    join public.workout_plans wp
      on wp.id = pei.workout_plan_id
     and wp.owner_id = pei.owner_id
    where pei.id = planned_exercise_sets.planned_exercise_item_id
      and pei.owner_id = planned_exercise_sets.owner_id
      and wp.status = 'planned'
      and wp.locked_at is null
  )
)
with check (
  (select public.can_manage_owner_plans(owner_id))
  and exists (
    select 1
    from public.planned_exercise_items pei
    join public.workout_plans wp
      on wp.id = pei.workout_plan_id
     and wp.owner_id = pei.owner_id
    where pei.id = planned_exercise_sets.planned_exercise_item_id
      and pei.owner_id = planned_exercise_sets.owner_id
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);

create policy "planned_exercise_sets_delete_authorized"
on public.planned_exercise_sets
for delete
to authenticated
using (
  (select public.can_manage_owner_plans(owner_id))
  and exists (
    select 1
    from public.planned_exercise_items pei
    join public.workout_plans wp
      on wp.id = pei.workout_plan_id
     and wp.owner_id = pei.owner_id
    where pei.id = planned_exercise_sets.planned_exercise_item_id
      and pei.owner_id = planned_exercise_sets.owner_id
      and wp.status = 'planned'
      and wp.locked_at is null
  )
);

create policy "workout_sessions_select_authorized"
on public.workout_sessions
for select
to authenticated
using ((select public.can_view_owner(owner_id)));

create policy "workout_sessions_insert_owner"
on public.workout_sessions
for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "workout_sessions_update_owner"
on public.workout_sessions
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "workout_sessions_delete_owner"
on public.workout_sessions
for delete
to authenticated
using (owner_id = (select auth.uid()));

create policy "exercise_items_select_authorized"
on public.exercise_items
for select
to authenticated
using ((select public.can_view_owner(owner_id)));

create policy "exercise_items_insert_owner"
on public.exercise_items
for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "exercise_items_update_owner"
on public.exercise_items
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "exercise_items_delete_owner"
on public.exercise_items
for delete
to authenticated
using (owner_id = (select auth.uid()));

create policy "exercise_sets_select_authorized"
on public.exercise_sets
for select
to authenticated
using ((select public.can_view_owner(owner_id)));

create policy "exercise_sets_insert_owner"
on public.exercise_sets
for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "exercise_sets_update_owner"
on public.exercise_sets
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "exercise_sets_delete_owner"
on public.exercise_sets
for delete
to authenticated
using (owner_id = (select auth.uid()));

-- Feedback：Owner 與有效 Coach 都可建立；只有作者或 Owner 可修改/刪除。

create policy "coach_feedback_select_authorized"
on public.coach_feedback
for select
to authenticated
using ((select public.can_view_owner(owner_id)));

create policy "coach_feedback_insert_authorized"
on public.coach_feedback
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and (select public.can_view_owner(owner_id))
);

create policy "coach_feedback_update_author_or_owner"
on public.coach_feedback
for update
to authenticated
using (
  author_id = (select auth.uid())
  or owner_id = (select auth.uid())
)
with check (
  (author_id = (select auth.uid()) or owner_id = (select auth.uid()))
  and (select public.can_view_owner(owner_id))
);

create policy "coach_feedback_delete_author_or_owner"
on public.coach_feedback
for delete
to authenticated
using (
  author_id = (select auth.uid())
  or owner_id = (select auth.uid())
);

-- Weekly goals：Owner 與有權限 Coach 可管理。

create policy "weekly_goals_select_authorized"
on public.weekly_goals
for select
to authenticated
using ((select public.can_view_owner(owner_id)));

create policy "weekly_goals_insert_authorized"
on public.weekly_goals
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select public.can_manage_owner_goals(owner_id))
);

create policy "weekly_goals_update_authorized"
on public.weekly_goals
for update
to authenticated
using ((select public.can_manage_owner_goals(owner_id)))
with check ((select public.can_manage_owner_goals(owner_id)));

create policy "weekly_goals_delete_authorized"
on public.weekly_goals
for delete
to authenticated
using ((select public.can_manage_owner_goals(owner_id)));
```

## 11.1 預排訓練的交易與快照要求

開始計畫、完成計畫與複製整週都涉及多張資料表，不可由前端逐筆寫入而缺乏交易保護。

至少建立以下 PostgreSQL RPC 或等價的 Server-side Transaction：

### `start_workout_plan(plan_id)`

單一交易內：

1. 驗證目前使用者是 Owner。
2. 鎖定 `workout_plans` 該列。
3. 確認狀態為 `planned`，且尚未存在 Session。
4. 將 Plan 更新為 `in_progress`，寫入 `locked_at` 與 `started_at`。
5. 建立 `workout_sessions`，狀態為 `in_progress`。
6. 複製 Planned Exercise Items 至 Actual Exercise Items。
7. 複製 Planned Sets 至 Actual Sets。
8. 實際重量、次數、時間與距離預填目標值。
9. Actual Item 與 Set 的 `execution_status` 設為 `pending`。
10. 回傳 Session ID。

同一 Plan 重複呼叫時必須具備 Idempotency：回傳既有 Session，不建立第二筆。

### `complete_workout_session(session_id, summary)`

單一交易內：

1. 驗證 Owner 與 Session。
2. 更新總時間、整體 RPE、疼痛與心得。
3. 將 Session 設為 `completed`。
4. 根據必做 Planned Sets 與 Actual Set 狀態計算：
   - `completed`
   - `partial`
   - `skipped`
5. 更新 Plan 狀態與 `completed_at`。
6. 不修改 Planned Set 的目標值。

### `clone_workout_plan(source_plan_id, target_date)`

- 複製 Plan、Items 與 Sets。
- 新 Plan 狀態為 `planned`。
- 不複製原 Session、實際值、RPE、疼痛與完成狀態。
- `created_by` 使用當前使用者。
- 可供「複製上週同一天」與「複製整週」重複使用。

### 鎖定規則

- `locked_at is not null` 後，Plan、Planned Items 與 Planned Sets 在一般 UI 中只讀。
- Coach 不可修改已鎖定計畫。
- 需要調整時，修改 Actual Set，或結束後複製成新計畫。
- RLS 之外，Server Action／RPC 仍需檢查鎖定狀態。
- `planned → in_progress → completed／partial／skipped` 狀態轉換由受控 RPC 執行；一般 Client 不能直接更新已鎖定 Plan。
- RPC 若採 `security definer`，必須固定 `search_path`、逐項驗證 `auth.uid()`、限制授權並避免接受 Client 傳入 owner_id。

---

## Phase 7：套用 Migration

遠端套用：

```bash
pnpm exec supabase db push
```

或先在本機 Supabase 測試：

```bash
pnpm exec supabase start
pnpm exec supabase db reset
```

每次修改 Schema：

```bash
pnpm exec supabase migration new <descriptive_name>
```

不可直接長期依賴 Dashboard 手動修改而不回寫 migration。

## Phase 8：建立 Cliff Owner

1. 先完成登入流程。
2. Cliff 使用正式帳號登入一次。
3. 在 Supabase Dashboard 的 Authentication Users 找到 Cliff UUID。
4. 執行：

```sql
insert into public.app_owners (owner_id)
values ('CLIFF_AUTH_USER_UUID')
on conflict do nothing;
```

5. 登出再登入。
6. 確認 `/today` 可正常讀取空資料狀態。

---

# 12. Supabase Storage

## Phase 9：建立 Private Bucket

Bucket：

```text
health-media
```

SQL：

```sql
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'health-media',
  'health-media',
  false,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
```

路徑規則：

```text
{owner_uuid}/meals/{yyyy}/{mm}/{uuid}-display.webp
{owner_uuid}/meals/{yyyy}/{mm}/{uuid}-thumb.webp
{owner_uuid}/workouts/{yyyy}/{mm}/{uuid}-display.webp
{owner_uuid}/workouts/{yyyy}/{mm}/{uuid}-thumb.webp
```

Storage RLS：

```sql
create policy "health_media_select_authorized"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'health-media'
  and (select public.can_view_owner(
    ((storage.foldername(name))[1])::uuid
  ))
);

create policy "health_media_insert_owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'health-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "health_media_update_owner"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'health-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'health-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "health_media_delete_owner"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'health-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
```

注意：

- Bucket 必須為 private。
- 畫面顯示照片時使用 signed URL。
- signed URL 有效時間建議 5～30 分鐘。
- 刪除 Meal 時，同步刪除 Storage 物件，避免孤兒檔案。
- Database Insert 失敗時，已上傳的照片要回滾刪除。
- 不在資料庫保存永久公開 URL，只保存 `storage_path`。

---

# 13. 照片極限壓縮、容量控制與上傳流程

手機原始照片通常為 2～10MB，絕不可直接存入 Supabase Free Storage。

本系統的照片用途主要是：

- 飲食內容判讀
- 訓練姿勢或器材紀錄
- 身體狀況的視覺追蹤
- 教練回顧

因此需要在「可判讀」與「低容量」之間取得平衡。

## 13.1 是否能壓成只有幾 KB？

可以壓成數十 KB，但不建議把主要照片硬壓到 5～20KB。

5～20KB 通常只適合很小的縮圖，容易出現：

- 食物細節糊掉
- 文字與器材數字無法辨識
- 光線較暗時產生大量色塊
- 教練放大後失去判讀價值

本系統採雙層策略：

| 版本 | 建議尺寸 | 目標容量 | 用途 |
|---|---:|---:|---|
| Thumbnail | 最長邊 320～400px | 15～40KB | 列表、日曆、首頁小卡 |
| Display | 最長邊 1024～1280px | 80～180KB | 詳情頁、教練查看 |
| Detail 模式，選配 | 最長邊 1600px | 180～350KB | 動作姿勢或文字需放大 |

硬性規則：

- 一般 Display 圖硬上限 250KB。
- Thumbnail 硬上限 60KB。
- Detail 模式硬上限 450KB。
- 預設不保存原始照片。
- 使用者必須明確開啟「保留較多細節」才可使用 Detail 模式。
- 不把 Base64 圖片存入 PostgreSQL。

## 13.2 容量估算

假設平均每張 Display 120KB、Thumbnail 25KB，每天 4 組照片：

```text
(120KB + 25KB) × 4 × 365
約 212MB／年
```

若不建立 Thumbnail、只保存平均 120KB 的 Display：

```text
120KB × 4 × 365
約 175MB／年
```

實際還要保留 Storage Metadata、其他圖片與未來成長空間，因此建議：

- 每月顯示目前 Storage 使用量估算。
- 70% 容量時提醒。
- 85% 容量時停止 Detail 模式。
- 90% 容量時建議匯出並清理舊照片。
- 不自動刪除使用者照片。

## 13.3 壓縮格式

優先順序：

1. WebP
2. JPEG，作為編碼失敗或相容性備援
3. PNG 僅限真正需要透明背景的插圖，不用於相機照片

不建議在第一版以 AVIF 作為唯一格式，因 iPhone 上的瀏覽器端編碼、效能與套件支援需額外驗證。

## 13.4 自適應壓縮演算法

不要只固定 Quality，應反覆壓縮直到落入目標大小。

建議步驟：

```text
讀取原始照片
  ↓
校正 EXIF Orientation
  ↓
移除 EXIF / GPS
  ↓
縮小至最長邊 1280px
  ↓
WebP quality 0.78
  ↓
若 > 180KB，改 quality 0.68
  ↓
若 > 220KB，改 quality 0.58
  ↓
若仍 > 250KB，縮小至 1024px 再壓縮
  ↓
建立 360px Thumbnail，目標 15～40KB
  ↓
顯示壓縮前後容量
  ↓
使用者確認後上傳
```

照片類型可採不同設定：

| 類型 | 最長邊 | 主要目標 |
|---|---:|---:|
| 飲食 | 1024～1280px | 80～160KB |
| 一般訓練紀錄 | 1280px | 100～200KB |
| 姿勢／動作細節 | 1600px | 180～350KB |
| 體重計畫面 | 1024px | 60～140KB |
| Thumbnail | 320～400px | 15～40KB |

## 13.5 iPhone 實作要求

輸入：

- JPEG
- PNG
- HEIC／HEIF
- iPhone 相機直拍
- 相簿多選

要求：

- iPhone Safari 實機測試 HEIC／HEIF。
- 若瀏覽器無法解碼 HEIC，使用相容的轉換方案或提示改用相機的 Most Compatible 格式。
- 相機拍照後回到 PWA，表單不得遺失。
- 壓縮運算使用 Web Worker，避免 UI 凍結。
- 壓縮期間顯示「正在縮小照片」。
- 上傳期間顯示百分比或階段。
- 失敗可重試。
- 可刪除單張預覽。
- 多張照片逐張處理，不一次把所有原圖完整解碼到記憶體。
- 預覽使用 `URL.createObjectURL`，完成後執行 `URL.revokeObjectURL`。
- 不在 Local Storage 長期保存完整 Blob。

## 13.6 上傳資料一致性

建議流程：

```text
選擇或拍照
  ↓
檢查 MIME / 原始大小
  ↓
校正方向、移除 Metadata
  ↓
建立 Display 與 Thumbnail
  ↓
檢查目標容量
  ↓
本機預覽
  ↓
上傳 Private Bucket
  ↓
取得 display_storage_path / thumbnail_storage_path
  ↓
寫入 meal_logs
  ↓
寫入 meal_photos
  ↓
成功後 revalidate
```

錯誤處理：

- 任一 Database Insert 失敗，刪除已上傳 Storage Object。
- Display 成功但 Thumbnail 失敗：
  - 可只保存 Display。
  - Database 的 `thumbnail_storage_path` 設為 null。
- 刪除 Meal 時，同步刪除 Display 與 Thumbnail。
- 定期執行孤兒檔案檢查。
- 不保留上傳前的原始檔。
- 相同檔案可計算 SHA-256，避免同一次表單重複上傳。

## 13.7 教練查看品質驗收

壓縮完成後，以下資訊仍應可辨識：

- 主要食物類型
- 大致份量
- 是否有蔬菜、蛋白質與澱粉
- 器材與動作姿勢輪廓
- 體重計數字，若該照片本來就清楚
- 身體狀況照片的主要區域

若 80～180KB 無法達成判讀，才切換 Detail 模式，不可一律提高所有照片容量。

---
# 14. Supabase Auth 與 Session

## Phase 10：建立 Supabase Client

安裝已包含：

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

建立：

- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/proxy.ts`
- `src/proxy.ts`

要求：

- Browser Client 使用 `createBrowserClient`
- Server Client 使用 `createServerClient`
- Session 儲存在 Cookie
- `proxy.ts` 只負責刷新 Session 與必要導向，不承擔完整授權
- 真正資料授權仍由 RLS 保護
- Server Component 取得使用者時使用可靠的 Auth API，不把未驗證 Cookie 當成最終權限

## 14.1 Google 登入

Supabase Dashboard：

1. Authentication
2. Providers
3. Google
4. 啟用
5. 填入 Google Client ID / Secret

Google Cloud Console：

1. 建立 OAuth Client
2. Application Type：Web Application
3. 加入 Supabase 提供的 Authorized Redirect URI
4. 儲存 Client ID / Secret

Supabase URL Configuration：

Local：

```text
http://localhost:3000/auth/callback
```

Production：

```text
https://YOUR-VERCEL-DOMAIN/auth/callback
```

Vercel Preview 可使用 Supabase 支援的 wildcard redirect 設定，但正式環境應保留精確 URL。

## 14.2 OAuth Callback

`/auth/callback`：

1. 讀取 URL `code`
2. 使用 Server Supabase Client 執行 `exchangeCodeForSession`
3. 成功導向 `/today`
4. 失敗導向 `/login?error=oauth_callback_failed`
5. 不在 URL 暴露敏感資訊

## 14.3 未授權登入者

任何成功登入但不在 `app_owners` 或 active `coach_relationships` 的人：

- 顯示 Access Pending 頁面
- 不載入健康資料
- 可登出
- 不顯示空白 Dashboard 假裝有權限

---

# 15. 邀請教練流程

## MVP 最穩定方案：手動連結

1. 教練先登入一次。
2. 從 `profiles` 取得教練 UUID。
3. Cliff 或管理者執行：

```sql
insert into public.coach_relationships (
  owner_id,
  coach_id,
  status
)
values (
  'CLIFF_AUTH_USER_UUID',
  'COACH_AUTH_USER_UUID',
  'active'
)
on conflict (owner_id, coach_id)
do update set status = 'active';
```

4. 教練重新登入。
5. 驗證教練只能 Select、Comment、Manage Goals。

## 第二階段：App 內邀請

可新增：

- `coach_invites`
- email
- token hash
- expires_at
- accepted_at

規則：

- Owner 建立邀請
- Server 端寄出一次性連結
- 教練登入後接受
- token 不以明文存資料庫
- 過期時間 7 天
- 接受後建立 relationship
- 此功能若使用 Supabase Admin API，Service Role Key 只存在 Vercel Server Environment，不得暴露到 Client

MVP 不應為此延後上線。

---

# 16. TypeScript Database Types

Schema 完成後：

```bash
pnpm exec supabase gen types typescript \
  --project-id <PROJECT_REF> \
  --schema public \
  > src/types/database.types.ts
```

或連結後使用：

```bash
pnpm exec supabase gen types typescript \
  --linked \
  --schema public \
  > src/types/database.types.ts
```

要求：

- 不手寫與 Database 重複的 Row 型別
- Domain View Model 可以另外定義
- Schema 每次變更後重新產生 Types
- CI 應檢查 Types 是否同步

---

# 17. Validation 規格

使用 Zod。

## 17.1 Body Metric Schema

- weight_kg：25～300
- waist_cm：30～250，可空
- sleep_hours：0～24，可空
- measured_at：有效日期
- notes：建議最多 2000 字

## 17.2 Meal Schema

- description：1～1000 字
- meal_type：enum
- hunger/fullness：1～5，可空
- beverage：最多 200 字
- notes：最多 2000 字
- photo count：0～3
- 每張壓縮後不得超過限制

## 17.3 Workout Plan Schema

- title：1～120 字
- workout_type：有效 enum
- scheduled_date：有效日期
- scheduled_time：有效時間，可空
- target_duration_minutes：0～1440，可空
- 每個計畫至少 1 個動作
- 每個動作至少 1 組目標，除非該運動類型明確以整體時間記錄
- target_weight_kg：不得小於 0
- target_repetitions：非負整數
- target_duration_seconds：非負整數
- target_distance_m：不得小於 0
- target_rpe：1～10，可空
- target_rir：0～10，可空
- rest_seconds：非負整數
- 必做／選做：boolean
- 已鎖定 Plan 不接受一般編輯 Action
- 改期日期可為今天或未來；歷史未完成計畫可改到未來
- 同一 Owner 同一日期可以有多個計畫，但 UI 要提醒可能重疊

## 17.4 Workout Execution Schema

- Session 必須屬於當前 Owner
- Plan-based Session 必須有唯一 `workout_plan_id`
- execution_status：pending／completed／skipped
- completed Set 使用實際重量、次數、時間或距離
- 若使用者只勾選，實際值可以沿用原目標
- skipped Set 不得被計入實際訓練量
- 額外組的 `planned_exercise_set_id` 為 null
- overall_rpe：1～10，可空，但完成摘要需提示補填
- pain scores：0～10
- session_status：in_progress／completed／abandoned
- 完成 Session 後一般 UI 不可再改回 in_progress；需要更正時走 Edit Flow 並留下更新時間

## 17.5 事後 Workout Schema

- duration_minutes：0～1440
- overall_rpe：1～10，可空
- pain scores：0～10
- heart rate：合理範圍
- distance：不得小於 0
- repetitions：非負整數
- set_no：正整數
- weight：不得小於 0
- 日期不可無意義地超過未來太久；允許補登過去資料
- 事後補登 Session 的 `workout_plan_id` 為 null
- 事後補登的 Item／Set 預設為 completed

## 17.6 驗證位置

同一個 Schema 應同時用於：

- React Hook Form
- Server Action
- Route Handler
- PostgreSQL RPC 輸入
- Import／Clone 操作

Client 驗證只改善體驗，Server 與 Database 驗證才是寫入前的必要條件。

---

# 18. 資料讀寫策略

## 18.1 Server Components

適合：

- 頁面初始資料
- Today Summary
- 本週計畫與今日計畫
- 歷史列表
- 趨勢資料
- 教練摘要

## 18.2 Client Components

只在需要時使用：

- 表單
- 圖表互動
- 日期選擇器
- 動態新增計畫動作與組數
- 勾選式訓練執行畫面
- 圖片預覽與壓縮
- Bottom Sheet
- Toast

避免把整頁都設為 `"use client"`。

## 18.3 Server Actions

每個 Action 必須：

1. 建立 Server Supabase Client
2. 取得目前 Auth User
3. 未登入立即回傳 Unauthorized
4. Zod parse
5. 不信任 Client 傳入的 `owner_id`
6. Owner 寫入時，`owner_id` 一律由 `user.id` 決定
7. 教練操作時驗證 relationship 與 permission
8. 處理錯誤
9. 成功後 `revalidatePath`
10. 回傳可顯示的結果，不回傳敏感 Stack Trace
11. 計畫開始、完成、複製與整週複製必須呼叫交易 RPC，不可由 Client 逐表寫入
12. 所有計畫變更都要確認 `locked_at` 與狀態

## 18.4 不使用 Service Role 的一般 CRUD

一般飲食、訓練、體重與留言：

- 使用登入使用者 Session
- 依靠 RLS
- 不使用 Service Role Key

Service Role 只允許在確實需要 Admin API 的 Server-only 功能使用。

---

# 19. 統計與計算

## 19.1 BMI

資料庫已用 168 cm 生成：

```text
BMI = weight_kg / 2.8224
```

UI 顯示兩位小數。

若未來允許修改身高：

- 建立 migration，BMI 改為寫入快照 height_cm 或計算 View
- 不可只修改前端公式造成資料不一致

## 19.2 七日平均

以 `Asia/Taipei` 日期排序。

第一版可在 Server 端取得最近 30～90 日資料後計算。

若缺少某一天：

- 不補 0
- 七日平均使用該範圍內實際測量值
- Tooltip 顯示當日值與平均值

## 19.3 每週運動分鐘

週起始日：星期一。

```text
weekly_minutes = SUM(completed workout_sessions.duration_minutes)
```

進行中、取消或未執行計畫不得算入完成運動分鐘。

## 19.4 實際訓練量

每個已完成 Set：

```text
actual_volume = weight_kg × repetitions
```

單側：

```text
若 multiply_unilateral_volume_by_two = true
actual_volume = weight_kg × repetitions × 2
```

只有 `execution_status = completed` 且重量、次數均存在時才計算。

## 19.5 原定訓練量

每個 Planned Set：

```text
planned_volume = target_weight_kg × target_repetitions
```

用途：

- 顯示原定與實際差異
- 不作為健康或表現好壞的唯一判斷
- 跑步、皮拉提斯與時間型訓練不強制換算重量訓練量

## 19.6 計畫完成率

Session 層：

```text
plan_session_completion =
已完成或部分完成的計畫數 ÷ 到期計畫數
```

預設主要 KPI 建議更嚴格：

```text
fully_completed_plan_rate =
completed 計畫數 ÷ 到期計畫數
```

Set 層：

```text
set_completion_rate =
completed planned sets ÷ all planned sets
```

必做 Set 層：

```text
required_set_completion_rate =
completed required planned sets ÷ all required planned sets
```

規則：

- 尚未到期的未來計畫不進分母。
- 已取消計畫不進分母。
- 已改期計畫依新日期計算。
- 略過計畫進入到期計畫分母，但 UI 使用中性說明。
- 部分完成另行顯示，不假裝完整完成。

## 19.7 計畫與實際差異

重量差：

```text
weight_delta = actual_weight - target_weight
```

次數差：

```text
repetition_delta = actual_repetitions - target_repetitions
```

RPE 差：

```text
rpe_delta = actual_rpe - target_rpe
```

Session 摘要可顯示：

- 照計畫完成的組數
- 修改重量的組數
- 修改次數的組數
- 額外組數
- 略過組數
- 原定與實際總時間
- 原定與實際訓練量；只適用可計算項目

不可把所有正負差異直接解讀為進步或退步。

## 19.8 連續執行與提醒

可顯示：

- 本週已完成幾個計畫
- 連續幾週完成至少一個計畫
- 待安排的逾期計畫

不建議第一版建立高壓 Streak：

- 不因一天未完成而歸零全部成就
- 不使用火焰、警報或羞辱文案
- 優先鼓勵改期與持續回來

## 19.9 飲食完整率

預設每日目標三餐：

```text
completion = 已記錄的早餐、午餐、晚餐類型數 ÷ 3
```

點心與宵夜不納入分母。

## 19.10 疼痛警示

建議：

- 0～2：一般
- 3～4：注意
- 5～6：明顯
- 7～10：高警示

這只是 UI 分組，不是醫療診斷。高疼痛時顯示保守文案，建議停止加重並尋求合格專業人士評估，不自行下診斷。

---

# 20. 元件清單

## App Shell

- `DashboardShell`
- `MobileBottomNav`
- `DesktopSidebar`
- `PageHeader`
- `QuickAddDrawer`
- `UserMenu`

## Shared

- `MetricCard`
- `EmptyState`
- `WarmSection`
- `DateRangeFilter`
- `LoadingCard`
- `ConfirmDeleteDialog`
- `ErrorNotice`
- `IllustrationPanel`
- `PainBadge`
- `RpeBadge`
- `StatusBadge`
- `UndoToast`

## Today

- `TodayWorkoutHero`
- `TomorrowPlanPreview`
- `TodayQuickActions`
- `WeeklyPlanProgress`
- `OverduePlanPrompt`

## Plans

- `WeekNavigator`
- `WeekDayChips`
- `PlanDayCard`
- `WorkoutPlanCard`
- `WorkoutPlanForm`
- `PlanSetupWizard`
- `PlannedExerciseEditor`
- `PlannedSetRow`
- `PlanPreview`
- `CopyPlanSheet`
- `CopyWeekDialog`
- `ReschedulePlanSheet`
- `SkipPlanSheet`
- `PlanActualComparison`
- `PlanStatusBadge`

## Workout Execution

- `WorkoutExecutionHeader`
- `ExecutionProgress`
- `ExecutionExerciseCard`
- `ExecutionSetRow`
- `SetCompletionCheckbox`
- `SetActualEditorSheet`
- `AddExtraSetButton`
- `SkipSetMenu`
- `WorkoutSummarySheet`
- `ResumeWorkoutBanner`
- `AutoSaveIndicator`

## Meals

- `MealCard`
- `MealPhotoGallery`
- `MealForm`
- `MealTypeSelector`
- `HungerScale`
- `FullnessScale`
- `RecentMealPicker`
- `CopyPreviousMealButton`

## Workouts

- `WorkoutCard`
- `WorkoutTypeSelector`
- `WorkoutForm`
- `ExerciseItemEditor`
- `ExerciseSetRow`
- `AddSetButton`
- `RunMetricsFields`
- `PilatesFields`
- `TennisFields`
- `PainScoreFields`

## Body

- `BodyMetricForm`
- `WeightTrendChart`
- `WaistTrendChart`
- `BmiCard`
- `SevenDayAverageCard`

## Coach

- `CoachSummary`
- `CoachFeedbackCard`
- `CoachFeedbackForm`
- `WeeklyGoalForm`
- `CoachPlanEditor`
- `PlanAdherenceSummary`
- `AttentionList`

---

# 21. 表單與訓練執行 UX 原則

## 21.1 一般表單

1. 手機鍵盤類型要正確：
   - 重量、腰圍、距離：decimal
   - 次數、分鐘、心率：numeric
2. 日期與時間預設合理值。
3. 常用選項大按鈕化，不只使用 Select。
4. 成功送出顯示 Toast 並回到合理頁面。
5. 送出時按鈕 disabled，避免重複提交。
6. 表單錯誤顯示在欄位附近。
7. 離開未儲存表單前提醒。
8. 重訓 Set 可快速複製上一組。
9. 新增下一組時預填上一組重量。
10. 所有主要操作單手可達。
11. 刪除必須二次確認。
12. 輸入不應要求不必要的欄位。

## 21.2 預排表單

- 先選日期與主題，再加入動作，不一開始顯示所有欄位。
- 每個動作預設建立 3 組，但使用者可調整；不可硬性假設所有動作都是 3 組。
- `套用到所有組` 必須顯示將修改哪些欄位。
- 複製計畫時預設複製目標，不複製實際結果。
- 整週複製前顯示目標週已有幾個計畫，避免覆蓋。
- 若同一日期已有計畫，顯示提醒並允許繼續。
- 儲存後直接在週計畫中看到結果。

## 21.3 勾選式執行

- Checkbox 觸控區至少 44 × 44px。
- 點擊完成時立即保存，不等待整場結束。
- 一鍵完成沿用原定值。
- 修改實際值只在需要時展開。
- 原定值始終可見，但視覺層級低於實際值。
- 完成後提供 5 秒 Undo。
- 略過與刪除不能與勾選放在容易誤觸的位置。
- 額外組明確標示「額外」。
- 完成的組不可自動從畫面消失，避免使用者失去脈絡。
- 進度顯示 `完成組數／總組數`，不要只顯示百分比。
- App 切到背景時自動保存。
- 網路中斷時先保留本機佇列，恢復後重試，並顯示尚未同步狀態。
- 不要要求運動中填寫長篇文字。
- RPE 可在每組後快速選擇，也可在結束摘要補填。

## 21.4 改期與未完成

- 改期必須比刪除更容易找到。
- 略過原因選填，不可強迫自我辯解。
- 逾期計畫顯示「待安排」，不顯示「失敗」。
- 部分完成保留所有已完成組，不要求重建。
- 完成摘要可以一鍵把未完成動作複製到新日期。

---

# 22. Dashboard 圖表與計畫視覺化

MVP 圖表：

1. 體重每日值 + 七日平均
2. 腰圍趨勢
3. 每週運動分鐘
4. 運動類型分布
5. 每週預排次數 vs 完成次數
6. Planned Sets vs Completed Sets
7. 可選：每週平均 RPE

計畫頁以週卡片與進度摘要為主，不把所有內容都做成圖表。

## 22.1 計畫完成摘要

建議顯示：

- 本週排定 4 次
- 完成 2 次
- 部分完成 1 次
- 待執行 1 次
- 完成 23 / 31 組

不使用大型 Gauge。

## 22.2 原定與實際比較

動作詳情可使用雙欄或對照列：

```text
第 1 組
原定 40 kg × 8・RPE 7
實際 40 kg × 8・RPE 8
```

iPhone 不使用寬表格。

## 22.3 圖表驗收

- 375px 寬度不溢出
- Tooltip 可觸控
- 空資料有 Empty State
- 一筆資料不造成折線錯誤
- 日期排序正確
- 同一圖表色彩不超過 4 種
- 支援 reduced motion
- 數字與單位清楚
- completed／partial／skipped 除顏色外也有文字或圖示
- 未來計畫不被誤算成未完成

---

# 23. SEO、隱私與安全

## 23.1 禁止索引

在 Root Metadata：

```ts
robots: {
  index: false,
  follow: false,
  nocache: true,
}
```

同時可加 Header：

```text
X-Robots-Tag: noindex, nofollow, noarchive
```

## 23.2 安全基線

- 所有資料表 RLS
- Private Storage
- signed URL
- Server-side Zod
- 不信任 owner_id
- 不在 log 紀錄完整健康內容
- 不把 Session Token 放入一般分析事件
- 不把 Service Role 放 Client
- `.env.local` 不提交
- 定期查看 Supabase Security Advisor
- 對刪除操作二次確認
- 對匯出操作重新確認登入狀態
- 使用 HTTPS，Vercel 自動提供
- 設定合理 Content Security Policy，至少正式版前完成

## 23.3 健康資料顯示

- 不在登入頁、Open Graph 或錯誤頁顯示私人數值
- 錯誤追蹤工具不得直接收集表單內容
- Screenshot 或分享功能預設關閉
- 教練權限撤銷後應立即失去資料查詢能力

---

# 24. PWA 與 iPhone 主畫面

MVP 可做基本 PWA：

- `manifest.ts`
- App Name
- Short Name
- Theme Color
- Background Color
- 192px / 512px Icons
- `display: standalone`
- Apple touch icon
- Viewport 與 safe-area

不做完整 Offline Mutation。

可提供提示：

```text
Safari → 分享 → 加入主畫面
```

---

# 25. iPhone UI／UX 強制規範

本章為強制規格，不是建議事項。

所有核心頁面與操作流程必須先以 iPhone 為設計基準，再向平板與桌機延伸。只在 Chrome 桌機版、瀏覽器 Responsive Mode 或一般 RWD 畫面中看起來正常，不代表本功能完成。

優先支援環境：

1. iPhone Safari 瀏覽器。
2. 透過 Safari「加入主畫面」後的 Standalone PWA。
3. iPhone 直向模式。
4. iPhone 橫向模式不得版面破裂，但不是主要操作方向。
5. 教練使用的核心檢視，也必須能在 iPhone 上完成，不得只支援桌機。

---

## 25.1 必測裝置尺寸

至少驗收以下三種 CSS Viewport：

| 類型 | 建議測試尺寸 | 用途 |
|---|---:|---|
| 小尺寸 iPhone | 375 × 667 | 驗證 iPhone SE 類型的小螢幕與鍵盤空間 |
| 一般尺寸 iPhone | 390～393 × 844～852 | 主要設計基準 |
| 大尺寸 iPhone | 428～430 × 926～932 | 驗證 Pro Max 類型與過寬內容 |

要求：

- 375px 寬度下不可出現非預期水平捲動。
- 主要操作不能因螢幕較小而被隱藏。
- 不得以「請旋轉螢幕」作為必要操作條件。
- 所有核心流程都要在真實 iPhone 或可信任的 iOS 實機測試服務驗收。
- Chrome DevTools 裝置模擬只能作為開發輔助，不能取代 Safari 實機。

---

## 25.2 Viewport 與動態高度

Root Layout 必須設定符合 iPhone 的 Viewport。

建議：

```ts
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f0e8",
};
```

強制規則：

- 使用 `viewport-fit=cover`，讓頁面能正確處理瀏海、Dynamic Island 與 Home Indicator。
- 不得使用 `user-scalable=no`。
- 不得限制最大縮放比例。
- 不得用禁止縮放來解決 iOS 表單自動放大；應以輸入文字至少 16px 解決。
- 頁面高度優先使用 `dvh`，不要只使用傳統 `100vh`。
- Full-screen 區塊建議使用 `min-height: 100dvh`。
- 必要時提供 `100vh` fallback，但最終在支援環境使用 `dvh`。
- 鍵盤開啟時，不得依賴固定的初始 Viewport 高度。

範例：

```css
.app-shell {
  min-height: 100vh;
  min-height: 100dvh;
}
```

---

## 25.3 Safe Area 強制處理

全域建立 Safe Area 變數：

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
}
```

要求：

- 頂部固定區塊必須加入 `safe-area-inset-top`。
- 底部導覽、Bottom Sheet、Sticky Submit Bar 必須加入 `safe-area-inset-bottom`。
- 左右橫向模式必須考慮 `safe-area-inset-left/right`。
- 主要內容底部 Padding 必須大於底部導覽列加 Safe Area，最後一筆資料不可被蓋住。
- Toast、FAB、浮動按鈕不可貼住 Home Indicator。
- 不可用固定的 20px 假設所有 iPhone Safe Area 相同。

建議：

```css
.mobile-bottom-nav {
  min-height: calc(56px + var(--safe-bottom));
  padding-bottom: var(--safe-bottom);
}

.dashboard-main {
  padding-bottom: calc(88px + var(--safe-bottom));
}

.sticky-submit-bar {
  padding-bottom: max(12px, var(--safe-bottom));
}
```

---

## 25.4 Mobile Layout 基準

### 頁面寬度

- iPhone 頁面預設左右 Padding：16px。
- 小螢幕不得低於 12px。
- 內容卡片預設滿版，不在手機上製造過窄雙欄。
- 只有非常簡短的 Metric Card 可使用兩欄。
- 複雜表單、圖表、照片與留言使用單欄。
- 卡片不得因固定寬度超出 Viewport。
- 所有可滾動內容必須有明確的滾動方向。

### 頂部區域

- 一般頁面 Header 建議可見高度 52～60px，不含 Safe Area。
- 標題不可長到把主要操作擠出畫面。
- 返回按鈕放左側，主要操作放右側。
- Header 若固定，內容要預留對應高度。

### 底部導覽

- 固定 Bottom Navigation 最多 5 個主要項目。
- 建議項目：
  1. 今日
  2. 日誌
  3. 新增
  4. 趨勢
  5. 教練
- 圖示加文字，不能只有圖示。
- 目前頁面要有明確狀態，但不可只靠顏色。
- 「新增」可以略為突出，但不可蓋住內容。
- Bottom Navigation 的可視高度建議 56～64px，不含 Safe Area。
- 不得與 Safari Bottom Bar 或 Home Indicator 重疊。

### 水平捲動

除非是明確的日期 Chip、照片 Carousel 或類別 Chip：

- 禁止主要頁面水平捲動。
- 表格在 iPhone 上必須轉為卡片或分段檢視。
- 圖表不得要求使用者左右拖曳才能看基本資訊。
- 若有橫向 Chip 列，需顯示可滑動線索，且不能影響頁面垂直捲動。

---

## 25.5 觸控與單手操作

所有互動必須以觸控為主，不得依賴 Hover。

強制規則：

- 每個主要 Touch Target 至少 44 × 44px。
- 相鄰主要按鈕間距至少 8px。
- 小型圖示按鈕也要透過 Padding 擴充至 44px。
- 主要新增、儲存、下一步操作盡量放在拇指容易觸及的下半部。
- 破壞性操作不可緊鄰主要儲存按鈕。
- 刪除使用文字加圖示，並二次確認。
- 不可將關鍵功能藏在 Hover。
- 不可要求使用者一定要長按。
- 不可要求使用者一定要左滑或右滑才能完成核心功能。
- Swipe 可作為快捷方式，但必須有可見按鈕替代。
- 避免細小 Drag Handle 成為唯一操作入口。
- 操作後要有立即視覺回饋，例如按壓狀態、Loading、成功 Toast。

---

## 25.6 iPhone 導覽與返回行為

- 頁面層級不得過深，核心流程建議不超過 3 層。
- 支援 Safari 原生返回。
- 支援 iOS 左側邊緣返回手勢，不得造成資料消失。
- 表單有未儲存變更時：
  - App 內返回要提示。
  - Browser Refresh 或離開可使用 `beforeunload` 作有限保護。
  - 重要長表單應定期保存本機 Draft。
- 儲存成功後使用 `router.replace` 或合理返回策略，避免按返回又回到已送出的表單。
- OAuth 完成後必須正確回到 App，不得停留空白頁或外部瀏覽器分頁。
- 不應在核心流程任意開新分頁。
- 外部連結需清楚標示離開 App。

---

## 25.7 表單與 iOS 鍵盤

### 字體與自動縮放

- 所有 Input、Textarea、Select 的可輸入文字至少 16px。
- 不得透過禁止縮放處理 iOS Auto Zoom。
- Error Text 不小於 13～14px。

### Keyboard Type

依欄位設定：

| 欄位 | 建議設定 |
|---|---|
| 體重、腰圍、重量、距離 | `inputMode="decimal"` |
| 次數、分鐘、心率 | `inputMode="numeric"` |
| Email | `type="email"` + `autoComplete="email"` |
| 搜尋 | `type="search"` |
| 備註 | `textarea` |
| 日期時間 | 優先採 iOS 可用的原生日期／時間輸入，並實機驗收 |

要求：

- 小數輸入要接受 iOS 鍵盤可能提供的本地化小數點。
- Server 端仍要重新解析與驗證。
- 不要使用自製數字鍵盤。
- 表單欄位要有明確 Label，不以 Placeholder 取代 Label。
- 需要單位時，把單位顯示在輸入框附近。
- 數字欄位不可因滾輪或手勢意外增減。
- 長表單依主題分段，不一次顯示過多欄位。

### 鍵盤遮擋

- 鍵盤開啟時，聚焦欄位必須保持可見。
- 驗證錯誤欄位需自動捲動到可見位置。
- Sticky Submit Bar 不可被鍵盤完全遮住。
- 若 Sticky Bar 與 iOS 鍵盤行為不穩定，鍵盤開啟時可改為流程內的一般 Submit Button。
- 只有在必要時使用 `window.visualViewport` 協助計算可視高度。
- 不得依賴硬編碼鍵盤高度。
- 鍵盤關閉後版面不得留下錯誤空白。

---

## 25.8 Sticky Submit Bar

新增飲食、訓練、身體數據等主要表單，可使用 Sticky Submit Bar。

要求：

- 位於內容底部或 Viewport 底部。
- 包含 Safe Area Padding。
- 至少一個明確主按鈕，例如「儲存飲食紀錄」。
- 主按鈕高度至少 48px。
- 送出期間 disabled，顯示 Loading。
- 不可遮擋最後一個輸入欄位。
- 鍵盤開啟時需實機驗收。
- 若表單很短，普通頁尾按鈕即可，不必強制 Sticky。

---

## 25.9 Bottom Sheet／Drawer 強制規範

iPhone 上：

- 快速新增、篩選、簡短選單優先使用 Bottom Sheet／Drawer。
- 複雜編輯流程使用完整頁面，不塞進過小 Dialog。
- Bottom Sheet 最大高度建議不超過 `90dvh`。
- 內部內容可捲動，但 Header 與主要操作應保持可理解。
- 頂部提供 Drag Handle，但 Drag Handle 不是唯一關閉方式。
- 必須有關閉按鈕或明確取消操作。
- 點背景是否關閉依資料風險決定。
- 有未儲存內容時，不得因輕觸背景直接遺失資料。
- 底部 Padding 包含 Safe Area。
- 避免 Bottom Sheet 內再開另一層 Bottom Sheet。
- iOS 邊緣返回手勢與 Sheet 拖曳不可互相衝突。

範例：

```css
.mobile-drawer-content {
  max-height: 90dvh;
  padding-bottom: max(16px, var(--safe-bottom));
  overscroll-behavior: contain;
}
```

---

## 25.10 拍照、相簿與圖片上傳

飲食紀錄的拍照流程是 iPhone 核心功能。

建議 Input：

```tsx
<input
  type="file"
  accept="image/*"
  capture="environment"
/>
```

實際產品應同時提供：

- 拍照
- 從相簿選擇

強制流程：

1. 使用者選擇拍照或相簿。
2. 選取後立即顯示本機預覽。
3. 顯示壓縮處理狀態。
4. 顯示上傳進度。
5. 可取消單張照片。
6. 失敗可重試。
7. 成功前不得讓使用者誤以為已完成。
8. App 進背景再返回時，尚未送出的表單盡可能保留。
9. HEIC／HEIF 必須在實機測試。
10. 若無法轉換，要顯示可理解的處理方式，不可只顯示技術錯誤。
11. 相機權限被拒絕時，仍可從相簿選取。
12. 不上傳原始 GPS EXIF。
13. 多張照片的排序可簡化，但必須有主要照片。
14. 上傳過程不可凍結整個頁面。

---

## 25.11 iPhone 圖表互動

- 圖表預設寬度 100%，不可固定 Desktop 寬度。
- 手機高度建議 220～280px。
- Tooltip 必須支援 Tap，不依賴 Hover。
- Tooltip 文字至少 14px。
- Legend 不使用過小點擊目標。
- X 軸標籤要減量，避免重疊。
- 重要數字在圖表上方提供文字摘要。
- 不要求 Pinch Zoom 才能看懂。
- 不使用需要精準游標的互動。
- 多序列圖表需可分辨，但不可只靠紅綠。
- 圖表父容器不得造成橫向溢出。
- VoiceOver 使用者至少能讀到同等文字摘要。

---

## 25.12 Safari 與 Standalone PWA

兩種模式都必須驗收：

### Safari Browser

- 上下 Browser Bar 收合時版面不跳壞。
- Scroll 不被固定元件鎖住。
- OAuth、返回、重新整理正常。
- 日期時間與檔案 Input 正常。
- Safari 分享功能不影響內容安全。

### 加入主畫面 PWA

必須確認：

- `display: standalone`
- App Icon 正常
- App Name 正常
- Theme Color 符合暖米色
- 啟動後不顯示瀏覽器網址列
- 頂部與底部 Safe Area 正確
- OAuth 後能返回 Standalone App 或至少回到正確登入狀態
- 從背景回到前景 Session 不失效
- 長時間背景後能重新整理過期資料
- 不依賴安裝 PWA 才可使用；Safari 中也要完整可用

可偵測 Standalone：

```ts
const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  // iOS Safari legacy property
  ("standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
```

此偵測只用於體驗調整，不用於安全權限。

---

## 25.13 滾動與手勢

- 頁面主要使用原生垂直捲動。
- 不濫用自訂 Scroll Container。
- 禁止全頁 `overflow: hidden` 造成 Safari 無法正常捲動。
- Modal／Drawer 開啟時，背景鎖定要在 iOS Safari 實測。
- 內層捲動區使用 `overscroll-behavior` 時需確認不破壞下拉與返回體驗。
- 不攔截 iOS 系統邊緣手勢。
- 不做會與 Safari 返回衝突的全頁水平 Swipe。
- 照片 Carousel 的水平手勢不可阻止頁面垂直捲動。
- 滾動位置在返回列表時應合理恢復。

---

## 25.14 Loading、錯誤與網路不穩

iPhone 可能在行動網路、Wi-Fi 切換或背景切回時中斷。

要求：

- 每次寫入有 Loading 狀態。
- 避免同一筆重複送出。
- 網路錯誤保留表單內容。
- 提供「重試」。
- 圖片上傳與資料寫入需處理部分成功。
- 長表單可把未送出內容保存到 `sessionStorage` 或 `localStorage`。
- Draft 要有版本與過期策略。
- 成功後清除 Draft。
- 不可把敏感健康資料長期無限制留在 Local Storage。
- Local Draft 預設只保存必要表單內容，照片 Blob 要審慎處理。
- 回到前景時重新檢查 Session 與必要資料。
- Skeleton 不應造成版面劇烈跳動。
- Toast 不可被 Dynamic Island、Header 或 Bottom Nav 擋住。

---

## 25.15 iPhone Accessibility

- 不禁止使用者縮放。
- 支援 VoiceOver 基本導覽。
- 使用語意化 HTML。
- Icon-only Button 提供 `aria-label`。
- 表單錯誤以文字呈現，不只使用顏色。
- 焦點順序符合畫面順序。
- Modal／Drawer 開啟後 Focus 正確進入，關閉後回到原觸發按鈕。
- 動畫尊重 `prefers-reduced-motion`。
- 字體使用 `rem`，避免過度固定 px。
- 文字大小調整後，主要按鈕與卡片不可嚴重截斷。
- 深色模式不是 MVP 必須功能；若未完整設計，不要跟隨系統自動切成半成品深色。
- 狀態 Badge 不可只有綠色／紅色差異。
- 插圖為裝飾時使用空 `alt=""`。

---

## 25.16 iPhone 專用 CSS 基線

建議加入：

```css
html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--background);
  color: var(--foreground);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

button,
a,
input,
select,
textarea {
  -webkit-tap-highlight-color: transparent;
}

input,
select,
textarea {
  font-size: 16px;
}

img,
svg,
canvas {
  max-width: 100%;
}

main {
  min-width: 0;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

注意：

- 不要全域設定 `touch-action: none`。
- 不要全域禁止文字選取。
- 不要使用 `position: fixed` 解決所有版面問題。
- 不要加入 `maximum-scale=1` 或 `user-scalable=no`。
- 不要用 JavaScript 強制捲動取代所有原生行為。

---

## 25.17 iPhone 實機驗收情境

每次 Release 前至少完成：

### 登入

- [ ] Safari Google Login
- [ ] PWA Google Login
- [ ] 登出後重新登入
- [ ] Session 過期後重新驗證
- [ ] OAuth 返回正確頁面

### 今日首頁

- [ ] Dynamic Island 不遮擋 Header
- [ ] Home Indicator 不遮擋 Bottom Nav
- [ ] 最後一張卡片可完整捲到可見
- [ ] 快速新增可單手點擊
- [ ] 空狀態與有資料狀態都正常

### 飲食

- [ ] 直接拍照
- [ ] 相簿選圖
- [ ] HEIC／HEIF
- [ ] 預覽
- [ ] 壓縮
- [ ] 上傳進度
- [ ] 切至相機再回 App 不遺失表單
- [ ] 上傳失敗可重試
- [ ] 鍵盤不遮擋描述與儲存按鈕

### 身體數據

- [ ] Decimal Keyboard 可輸入體重
- [ ] 可輸入小數
- [ ] BMI 正確
- [ ] 錯誤欄位會捲到可見處
- [ ] 儲存按鈕不被鍵盤遮住

### 重訓

- [ ] 新增動作
- [ ] 新增多組
- [ ] 複製上一組
- [ ] 數字鍵盤切換順暢
- [ ] 長表單返回後 Draft 存在
- [ ] Submit 後不重複新增

### 趨勢

- [ ] 圖表不溢出
- [ ] Tap Tooltip 正常
- [ ] 日期標籤不重疊
- [ ] 小螢幕可讀
- [ ] VoiceOver 有文字摘要

### 教練

- [ ] iPhone 可完整查看摘要
- [ ] 可新增留言
- [ ] 可編輯每週目標
- [ ] 無需桌機即可完成主要教練流程

---

## 25.18 預排與運動中操作強制規範

### 週計畫

- 一般 iPhone 一次聚焦一個日期，不顯示七欄壓縮桌面月曆。
- Day Chips 可水平滑動，但改期不可只靠拖曳。
- 計畫卡片主要按鈕位於拇指可達區域。
- 複製上週與新增計畫需可單手完成。
- 日期選擇後保留使用者目前編輯內容。

### 運動中

- 畫面主要用途是勾選與微調，不是閱讀長文。
- 每組 Checkbox 至少 44px。
- 實際重量與次數的數字鍵盤不可遮住目前 Set。
- 頂部 Progress 與完成按鈕在 Safe Area 內。
- Bottom Sheet 編輯實際值時，關閉後回到原 Set。
- 鎖屏、切換音樂或使用其他 App 後返回，進度仍存在。
- 每次勾選都應自動保存並顯示短暫完成回饋。
- 網路斷線時可以繼續勾選，清楚標示「尚未同步」。
- 不得要求精準拖曳小型控制元件。
- 不使用長按作為完成 Set 的唯一方式。
- 完成訓練 Summary 在 iPhone 一個畫面中先顯示最重要欄位，其餘內容可展開。

### 執行頁防誤觸

- `完成訓練` 不與單組 Checkbox 相鄰。
- `略過整個動作` 放在明確選單內。
- `取消本次訓練` 必須二次確認。
- 已完成組取消勾選時保留已輸入數值。
- Undo 不得只依賴 Toast；歷史已完成組仍可進入編輯。

---

## 25.19 iPhone Definition of Done

任何核心功能只有在以下條件全部成立時，才可標記完成：

- [ ] 375px、一般 iPhone、大尺寸 iPhone 均正常。
- [ ] Safari 與 Standalone PWA 均正常。
- [ ] 直向模式完整可用。
- [ ] Safe Area 正確。
- [ ] 鍵盤不遮擋主要操作。
- [ ] Input 字體至少 16px，不觸發非預期 Auto Zoom。
- [ ] Touch Target 至少 44 × 44px。
- [ ] 不依賴 Hover。
- [ ] 不依賴必須 Swipe 的核心操作。
- [ ] Bottom Navigation 不遮擋內容。
- [ ] Bottom Sheet 不與 Home Indicator 重疊。
- [ ] 相機與相簿流程正常。
- [ ] 行動網路失敗可重試且表單內容不消失。
- [ ] iOS 返回手勢不造成未儲存資料無提示遺失。
- [ ] 圖表 Tap 與文字摘要正常。
- [ ] VoiceOver 基本流程可操作。
- [ ] 實機驗收結果已記錄於 Release Checklist。

若上述任一核心項目未通過，不得以「桌機版正常」或「Android 正常」視為完成。

---

# 26. 測試策略

## Phase 11：安裝測試工具

```bash
pnpm add -D \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom \
  @playwright/test
```

## 26.1 Unit Tests

至少測：

- BMI 計算
- 七日平均
- 每週聚合
- 訓練量
- 單側乘二
- Pace 格式化
- 日期時區轉換
- Zod Schemas
- Pain/RPE 顯示規則
- Plan status 計算
- 計畫完成率
- Planned vs Actual volume
- 改期後日期與分母
- Plan clone 不複製實際結果

## 26.2 Component Tests

至少測：

- BodyMetricForm
- MealForm
- ExerciseSetRow
- WorkoutTypeSelector
- PlanSetupWizard
- PlannedSetRow
- ExecutionSetRow
- ReschedulePlanSheet
- WorkoutSummarySheet
- CoachFeedbackForm
- EmptyState
- MobileBottomNav

## 26.3 Integration Tests

至少測：

- 未登入不能進 Dashboard
- Owner 能新增身體數據
- Owner 能新增 Meal
- 圖片上傳失敗時不產生錯誤資料
- Owner 能新增 Workout 與 Sets
- Owner 能建立未來計畫、動作與目標組數
- Coach 有 manage_plans 時能建立與編輯未鎖定計畫
- Coach 無 manage_plans 時只能查看計畫
- 開始計畫會原子性建立唯一 Session 與 Actual Sets
- 重複開始同一 Plan 不建立第二個 Session
- 勾選 Set 沿用目標值並保存 completed 狀態
- 修改實際值不會改寫 Planned Set
- 完成部分組數時 Plan 變成 partial
- 改期保留 Plan 並增加 reschedule_count
- Coach 能讀取 Cliff 資料
- Coach 不能修改 Cliff 原始 Body Metric
- 未授權帳號不能讀資料
- 撤銷 Coach 後立即無權限

## 26.4 E2E Tests

Playwright 路徑：

1. Login
2. Add Body Metric
3. Add Meal without photo
4. Add Meal with test image
5. Add Strength Workout
6. Add Running Workout
7. View Trend
8. Coach adds Feedback
9. Owner acknowledges Feedback
10. Create next Monday strength plan
11. Copy last plan to next Tuesday
12. Start today's planned workout
13. Check a set without changing target values
14. Edit actual weight and RPE for another set
15. Skip one set and complete session as partial
16. Reschedule an unstarted plan
17. Coach creates a future plan
18. Logout

## 26.5 RLS 測試

不得只測 UI。

至少建立：

- Owner JWT
- Coach JWT with manage_plans
- Coach JWT without manage_plans
- Unauthorized authenticated JWT
- Anonymous request

驗證每個 Table 的 SELECT/INSERT/UPDATE/DELETE。

---

# 27. Package Scripts

`package.json` 建議包含：

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check": "pnpm lint && pnpm typecheck && pnpm test && pnpm build"
  }
}
```

每個 PR 合併前執行：

```bash
pnpm check
```

---

# 28. GitHub Actions

建立 `.github/workflows/ci.yml`。

流程：

1. Checkout
2. Setup pnpm
3. Setup Node
4. Cache pnpm
5. `pnpm install --frozen-lockfile`
6. `pnpm lint`
7. `pnpm typecheck`
8. `pnpm test`
9. `pnpm build`

Secrets：

- CI Build 若需要公開 Supabase URL/Anon Key，使用測試環境值
- 不應把 Production Service Role 放入一般 PR Workflow
- E2E 建議使用獨立測試 Supabase Project

---

# 29. Vercel 部署：Step by Step

## Phase 12：首次部署

1. 登入 Vercel。
2. Add New → Project。
3. Import GitHub Repository。
4. 選擇 `cliff-wellness-dashboard`。
5. Framework Preset 應自動判斷為 Next.js。
6. Root Directory 使用 Repository Root。
7. 加入 Environment Variables：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=https://YOUR-PROJECT.vercel.app
```

8. Scope：
   - Production
   - Preview
   - Development，若需要
9. Deploy。
10. 等待 Build 成功。
11. 開啟 Deployment URL。
12. 先測 Login 與未授權狀態。

## Phase 13：設定 Supabase Production Redirect

Supabase Authentication URL Configuration：

- Site URL：
  `https://YOUR-PROJECT.vercel.app`
- Redirect URL：
  `https://YOUR-PROJECT.vercel.app/auth/callback`
- Preview Redirect：
  依 Supabase 官方支援方式設定 Vercel Preview wildcard

Google OAuth Console 也要加入 Supabase 要求的 callback URL；App 自己的 callback 由 Supabase Redirect URL 管理。

修改環境變數後必須 Redeploy 才會套用。

## Phase 14：Git 自動部署

規則：

- Push 到 `main` → Production Deployment
- Pull Request / Feature Branch → Preview Deployment
- Preview 驗收後合併
- 不直接在 Production 上試驗破壞性變更

## Phase 15：自訂網域，可選

初期使用：

```text
your-project.vercel.app
```

未來可綁自訂網域。

綁定後要同步修改：

- `NEXT_PUBLIC_SITE_URL`
- Supabase Site URL
- Supabase Redirect URLs
- OAuth Allowed Origins/Redirects
- Canonical/Metadata，如有
- 重新部署

---

# 30. 開發順序

其他 Agent 應嚴格依以下順序，避免先做大量漂亮頁面卻沒有真實資料流。

## Sprint 1：Foundation

- Next.js 初始化
- shadcn/ui
- Design Tokens
- App Shell
- Mobile Navigation
- Supabase Clients
- Auth
- Proxy
- RLS Schema
- Private Storage
- Owner Access

驗收：

- 可登入
- 未登入被導向
- 未授權帳號看不到資料
- Mobile Shell 完成

## Sprint 2：Body Metrics

- 新增
- 編輯
- 刪除
- BMI
- 七日平均
- 體重圖
- 腰圍圖

原因：資料結構最簡單，可先驗證整套 CRUD、RLS、表單與圖表。

## Sprint 3：Meals

- Meal CRUD
- 拍照
- 壓縮
- Private upload
- signed URL
- Photo cards
- 複製上一餐

## Sprint 4：Manual Workouts

- Workout Session CRUD
- Dynamic Exercise Items
- Dynamic Sets
- Strength
- Cardio
- Pilates
- Running
- Tennis
- Volume
- Pain tracking

## Sprint 5：Workout Planning

- Workout Plan Schema
- Planned Exercise Items
- Planned Sets
- Week Navigator
- Plan Creation Wizard
- Clone Plan
- Clone Previous Week
- Reschedule
- Skip／Cancel
- Plan RLS
- Coach manage_plans permission

## Sprint 6：Check-based Workout Execution

- `start_workout_plan` transaction
- Plan Snapshot Locking
- Actual Session Copy
- Execution Set Checkbox
- Inline Actual Value Editing
- Auto Save
- Offline Pending State
- Undo
- Extra Sets
- Partial Completion
- Completion Summary
- Planned vs Actual Comparison
- Idempotency

## Sprint 7：Coach

- Relationship
- Coach Read Access
- Feedback
- Weekly Goals
- Plan Editor
- Plan Adherence Summary
- Attention List
- Revocation

## Sprint 8：Photo Storage Optimization

- Adaptive WebP compression
- 80～180KB Display target
- 15～40KB Thumbnail
- HEIC／HEIF handling
- Web Worker
- Storage usage estimate
- Orphan cleanup
- Compression quality acceptance

## Sprint 9：Polish

- Illustrations
- Empty states
- Responsive
- Loading skeletons
- Error boundaries
- PWA
- Accessibility
- Export
- Tests
- Deployment hardening

---

# 31. Demo / Seed Data

提供 `supabase/seed.sql`，但不得在 Production 自動插入假資料。

Seed 應包含：

- 14～30 天體重
- 4 筆腰圍
- 10～20 餐
- 5～8 次已完成訓練
- 下一週 4～6 個預排訓練
- 至少 1 個 completed、1 個 partial、1 個 skipped Plan
- Planned Sets 與對應 Actual Sets
- 2 則教練留言
- 1 筆每週目標

Seed 必須使用變數或註解提示替換 Owner UUID。

UI 也可支援 `NEXT_PUBLIC_DEMO_MODE`，但 Production 預設 false。

---

# 32. 匯出與備份

## 32.1 使用者匯出

設定頁提供：

- Body Metrics CSV
- Meals CSV
- Workout Plans CSV
- Planned Exercises／Sets CSV
- Workouts CSV
- Planned vs Actual Comparison CSV
- Coach Feedback CSV
- 全部 JSON

匯出必須：

- 驗證當前 User
- 只匯出有權限的 Owner 資料
- 檔名包含日期
- 不自動公開上傳

## 32.2 Database Migration

所有 Schema 變更都保存在：

```text
supabase/migrations/
```

## 32.3 定期備份

免費方案的備份能力可能與付費方案不同，正式長期使用前確認當下 Supabase 方案。

至少：

- 每月匯出資料
- 重要 Schema 以 Migration 版本控制
- 照片可定期備份至本機或私人雲端
- 在 README 記錄還原流程

---

# 33. 可觀測性與錯誤處理

MVP：

- Server errors 使用結構化 log
- 不 log 完整飲食內容、體重、腰圍或照片 URL
- 顯示一般化錯誤訊息
- 保留 request context，但不保留敏感 payload
- Vercel Log 僅供短期除錯

可選 Sentry：

- 遮蔽 PII
- 關閉 Session Replay 或遮罩所有輸入
- 不上傳照片
- 不捕捉表單完整內容

---

# 34. Accessibility

必須：

- 色彩對比合格
- 表單 Label 可被讀屏辨識
- 錯誤訊息關聯到欄位
- 所有按鈕有文字或 aria-label
- 不只靠顏色表示疼痛或狀態
- 鍵盤可操作
- Focus 可見
- 支援 `prefers-reduced-motion`
- 圖表提供文字摘要
- 圖片有適當 alt
- 裝飾插圖使用空 alt

---

# 35. 效能要求

- 首頁不一次下載所有歷史照片
- Meal List 使用分頁或 Infinite Scroll
- 圖片使用縮圖策略；免費 Supabase 無動態 Resize 時，Client 壓縮後上傳合理尺寸
- Server Component 優先
- 避免大範圍 Client Hydration
- Recharts 只在需要頁面載入
- Lazy load 非首屏照片
- 90 日以上趨勢可降低資料點密度
- 不在首頁做多個重型查詢
- 今日頁只查詢今天與必要的明日計畫，不一次載入整年計畫
- 週計畫按週查詢，避免載入全部 Planned Sets
- 執行頁使用局部更新與 optimistic UI，但以 Server 保存結果為準
- 圖片壓縮使用 Web Worker，避免主執行緒凍結
- 多張照片逐張處理，避免 iPhone 記憶體尖峰
- 避免 N+1 Query

目標：

- 手機 4G 可接受
- 首頁主要內容快速顯示
- 表單送出有明確進度
- 圖片上傳失敗可重試

---

# 36. Definition of Done

功能完成不等於只有畫面完成。

每個功能必須同時符合：

- UI 完成
- 手機 Responsive
- 空狀態
- Loading 狀態
- Error 狀態
- 前端驗證
- Server 驗證
- RLS 驗證
- 計畫與實際資料關聯正確
- 重複開始具備 Idempotency
- Unit 或 Integration Test
- Accessibility 基礎
- 正式 Build 成功
- README 更新

---

# 37. 完整驗收清單

## Auth

- [ ] Google Login 成功
- [ ] Magic Link 備用流程可用或明確列為第二階段
- [ ] Session Refresh 正常
- [ ] 登出正常
- [ ] 未登入不能進 Dashboard
- [ ] 未授權帳號看不到資料
- [ ] Cliff 是 Owner
- [ ] 教練關係可啟用
- [ ] 撤銷教練後立即無資料權限

## Body

- [ ] 可新增體重
- [ ] 可新增腰圍
- [ ] BMI 自動正確
- [ ] 可編輯
- [ ] 可刪除
- [ ] 七日平均正確
- [ ] 趨勢圖手機不溢出
- [ ] 單日波動不以恐嚇式紅色呈現

## Meals

- [ ] 可拍照或選圖
- [ ] 圖片會壓縮
- [ ] Bucket 是 private
- [ ] signed URL 可顯示
- [ ] 未授權者不能讀圖
- [ ] 可新增、編輯、刪除
- [ ] 可複製上一餐
- [ ] 照片刪除不留孤兒檔案
- [ ] 上傳失敗有重試
- [ ] 一般 Display 圖平均落在 80～180KB
- [ ] Display 圖不超過 250KB
- [ ] Thumbnail 落在 15～40KB 或有合理例外
- [ ] 預設不保存原始照片
- [ ] HEIC／HEIF 已在 iPhone 實機驗收
- [ ] 壓縮後仍可供教練判讀
- [ ] Storage 使用量可查看或估算
- [ ] 刪除紀錄時同步清除 Display 與 Thumbnail

## Workout Planning

- [ ] 可在未來日期建立計畫
- [ ] 可指定運動類型、標題與預計時間
- [ ] 可新增深蹲、分腿蹲、臥推等多個動作
- [ ] 可記錄動作變化／種類
- [ ] 可設定每組重量、次數、時間、距離、RPE、RIR 與休息
- [ ] 可標記必做與選做動作
- [ ] 可複製最近計畫
- [ ] 可複製上週同一天
- [ ] 可複製整週且不覆蓋既有資料
- [ ] 可改期並保留 reschedule_count
- [ ] 可略過與取消
- [ ] 逾期顯示待安排，不自動判定失敗
- [ ] Coach manage_plans 權限生效
- [ ] 已開始計畫不可修改原始目標

## Workout Execution

- [ ] 開始計畫只建立一個 Session
- [ ] Planned Exercises／Sets 正確複製到 Actual
- [ ] Actual Set 預填原定值
- [ ] 單次勾選可完成一組
- [ ] 勾選後立即保存
- [ ] 勾選後可 Undo
- [ ] 修改實際值不會改寫原定值
- [ ] 可略過單組
- [ ] 可略過整個動作
- [ ] 可新增額外組
- [ ] App 進背景後進度仍存在
- [ ] 網路中斷時顯示尚未同步
- [ ] 可暫停並繼續同一 Session
- [ ] 完成摘要可填整體 RPE、疼痛與感受
- [ ] 全部完成時 Plan 為 completed
- [ ] 部分完成時 Plan 為 partial
- [ ] 完全略過時 Plan 為 skipped
- [ ] 原定與實際差異正確

## Workouts

- [ ] 可建立重訓
- [ ] 可動態增刪動作
- [ ] 可動態增刪組數
- [ ] 訓練量正確
- [ ] 單側乘二受欄位控制
- [ ] 可建立有氧
- [ ] 可建立皮拉提斯
- [ ] 可建立慢跑
- [ ] 可建立網球
- [ ] 疼痛分數正確
- [ ] RPE 正確
- [ ] 事後補登可沒有 workout_plan_id
- [ ] Plan-based Session 顯示來源計畫
- [ ] 可編輯與刪除

## Coach

- [ ] 教練可讀授權資料
- [ ] 教練不能改 Cliff 原始 Body Metric
- [ ] 教練可留言
- [ ] Cliff 可看到最新留言
- [ ] 教練可管理每週目標
- [ ] 教練有權限時可建立與編輯未開始計畫
- [ ] 教練不能修改已鎖定計畫
- [ ] 教練可查看計畫完成率與原定實際差異
- [ ] Cliff 可確認已讀
- [ ] 高疼痛項目出現在注意清單

## UI

- [ ] 375px 寬正常
- [ ] iPhone Safe Area 正常
- [ ] 桌機 Sidebar 正常
- [ ] 侘寂色票一致
- [ ] 插圖不影響操作
- [ ] 字體與按鈕可讀
- [ ] 空狀態友善
- [ ] 不像企業 BI
- [ ] Touch Target 至少 44px

## iPhone UI／UX

- [ ] Safari 與加入主畫面 PWA 都已實機驗收
- [ ] 小型、一般與大尺寸 iPhone Viewport 均正常
- [ ] 使用 `100dvh` 或等效動態高度策略
- [ ] Dynamic Island、瀏海與 Home Indicator 不遮擋內容
- [ ] Bottom Nav、Bottom Sheet、Sticky Submit Bar 均包含 Safe Area
- [ ] 所有輸入欄位至少 16px，不發生非預期 Auto Zoom
- [ ] 鍵盤開啟時聚焦欄位與主要操作仍可見
- [ ] iOS 返回手勢不造成資料無提示遺失
- [ ] 相機、相簿、HEIC／HEIF 與圖片上傳流程正常
- [ ] 網路中斷後可重試，表單內容仍保留
- [ ] 圖表支援 Tap Tooltip，不依賴 Hover
- [ ] 核心功能不依賴 Swipe 或長按
- [ ] 週計畫在 iPhone 不使用擁擠七欄月曆
- [ ] Set Checkbox 至少 44 × 44px
- [ ] 運動中鍵盤不遮擋目前組數
- [ ] 鎖屏與切換 App 後執行進度仍存在
- [ ] 不使用 `user-scalable=no`
- [ ] VoiceOver 可完成登入、輸入與儲存等核心流程

## Security

- [ ] 所有 public tables 開啟 RLS
- [ ] RLS 已以多角色測試
- [ ] Storage private
- [ ] Service Role 不在 Client
- [ ] `.env.local` 未提交
- [ ] 不信任 Client owner_id
- [ ] 敏感資料未出現在 Log
- [ ] Robots noindex
- [ ] Security Advisor 已檢查

## Deployment

- [ ] GitHub CI 成功
- [ ] Vercel Preview 成功
- [ ] Vercel Production 成功
- [ ] Production Env 正確
- [ ] Supabase Redirect URL 正確
- [ ] Google OAuth 正確
- [ ] Production Login 正常
- [ ] Production CRUD 正常
- [ ] Production 圖片正常
- [ ] README 完整

---

# 38. README 必須包含

1. 專案簡介
2. Screenshots
3. Tech Stack
4. Local Setup
5. Environment Variables
6. Supabase Setup
7. Migration
8. Seed
9. Auth Setup
10. Storage Setup
11. Testing
12. Deployment
13. RLS 模型
14. Workout Planning Model
15. Plan-to-Session Transaction
16. Coach Plan Permission
17. Coach Onboarding
18. Backup / Export
19. Known Limitations
20. Troubleshooting
21. Photo Compression Policy
22. License / Private Use

---

# 39. 常見錯誤與排查

## OAuth 回到 localhost

檢查：

- Supabase Site URL
- Additional Redirect URLs
- `redirectTo`
- `NEXT_PUBLIC_SITE_URL`
- 修改 Vercel Env 後是否 Redeploy

## 登入成功但馬上登出

檢查：

- `@supabase/ssr` Client
- Cookie get/set 實作
- `proxy.ts`
- Server/Browser Client 是否混用
- Domain 與 HTTPS
- Supabase Auth Logs

## RLS 查不到資料

檢查：

- `auth.uid()`
- owner UUID 是否正確
- Cliff 是否已插入 `app_owners`
- relationship 是否 active
- policy 是否對 authenticated
- Client 是否真的帶 Session
- Security Advisor

## 圖片 403

檢查：

- Bucket 是否 private
- signed URL
- Storage policy
- 路徑第一段是否 owner UUID
- relationship 狀態
- signed URL 是否過期

## Vercel Build 失敗

檢查：

- Env 是否存在
- TypeScript Error
- Server-only code 是否被 Client import
- Node 版本
- Lockfile
- Dynamic API 使用
- Build Log

## 日期錯一天

檢查：

- Database 儲存 timestamptz
- 顯示時轉 Asia/Taipei
- `input[type=datetime-local]` 轉換
- 不把本地時間直接當 UTC
- `date-fns` 與時區工具的使用

---

## 圖片壓縮後仍然太大

檢查：

- 是否真的重新編碼成 WebP，而不是只修改副檔名
- 圖片最長邊是否已縮小
- 自適應 Quality Loop 是否執行
- HEIC／HEIF 是否先正確解碼
- 是否誤用「保留較多細節」模式
- 是否意外將原始照片與壓縮照片一起保存
- 是否為雜訊很多、低光源或細節極多的照片

## 壓縮後教練看不清楚

檢查：

- 是否錯把 Thumbnail 當作詳情頁圖片
- Display 圖是否低於 80KB
- 最長邊是否過小
- 是否因低光源造成壓縮色塊
- 是否應針對姿勢、器材數字或體重計畫面使用 Detail 模式
- 不可只為達成極小容量而犧牲判讀品質

## 按下開始訓練後出現兩筆 Session

檢查：

- `workout_sessions_plan_unique_idx`
- `start_workout_plan` 是否在單一 Transaction
- 重複點擊時按鈕是否 disabled
- RPC 是否具備 Idempotency
- Client 是否同時呼叫 Server Action 與直接 Supabase Insert

## 勾選完成但重新整理後消失

檢查：

- Set 更新是否已送到 Server
- Offline Queue 是否仍 pending
- `execution_status`
- Owner RLS
- optimistic update 是否錯誤回滾
- App 進背景前是否完成保存

## 修改實際重量時原定重量也被改掉

檢查：

- Actual Set 是否正確連到 Planned Set
- UI 是否誤用同一個 Form Object
- Server Action 是否更新錯誤資料表
- 原定資料是否已在 `locked_at` 後設為唯讀
- Comparison Query 是否把 actual 欄位當作 target

## 計畫完成率不正確

檢查：

- 未來計畫是否錯誤進入分母
- cancelled 是否排除
- rescheduled 是否依新日期計算
- partial 是否被誤算成 completed
- 時區與週起始日
- skipped 是否依產品定義納入到期分母

## 改期後產生重複計畫

檢查：

- 改期應更新原 Plan，而非 Clone
- Clone 與 Reschedule Action 是否混用
- 是否已有 started Session
- 已開始計畫不得直接改期

# 40. 第二階段功能

MVP 穩定後再做：

- 正式訓練模板與模板版本管理
- 週期性排程，例如每週一固定下肢
- PWA Push Notification 或 Email Reminder
- 計畫自動建議下一次重量；只能作建議，不自動修改
- Deload Week 與週期規劃
- Superset、Circuit 與 Tempo 欄位
- Warm-up Set 與 Working Set 分類
- 休息倒數計時器
- 常用餐點
- App 內 Coach Invite
- Coach push/email notification
- 每週 PDF 摘要
- 自動週報
- AI 飲食照片摘要
- AI 訓練趨勢摘要
- 多教練細項權限
- Audit Log
- Staging Supabase Project
- 完整 Offline Draft
- Custom Domain

任何 AI 功能都不得直接下醫療診斷，也不得未經確認自動變更訓練計畫。

---

# 41. 建議的 Agent 執行回報格式

每完成一個 Sprint，回報：

```markdown
## Completed
- ...

## Files changed
- ...

## Database changes
- ...

## Tests
- `pnpm lint`: pass/fail
- `pnpm typecheck`: pass/fail
- `pnpm test`: pass/fail
- `pnpm build`: pass/fail

## Manual verification
- ...

## Remaining risks
- ...

## Next step
- ...
```

若遇到阻塞：

1. 先查官方文件。
2. 嘗試最小可行修正。
3. 不要因非核心美術細節阻塞資料功能。
4. 不可用取消 RLS、公開 Bucket、Service Role 放前端等方式繞過問題。
5. 在 README 記錄實際版本差異。

---

# 42. 官方文件參考

以下連結應在實作時重新確認，因平台與套件會更新。

- Next.js Installation  
  https://nextjs.org/docs/app/getting-started/installation
- Next.js App Router  
  https://nextjs.org/docs/app
- Next.js Proxy  
  https://nextjs.org/docs/app/getting-started/proxy
- shadcn/ui Next.js Installation  
  https://ui.shadcn.com/docs/installation/next
- shadcn/ui CLI  
  https://ui.shadcn.com/docs/cli
- shadcn/ui Chart  
  https://ui.shadcn.com/docs/components/chart
- Supabase Next.js Auth Quickstart  
  https://supabase.com/docs/guides/auth/quickstarts/nextjs
- Supabase Server-Side Auth  
  https://supabase.com/docs/guides/auth/server-side
- Supabase SSR Client  
  https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase Row Level Security  
  https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage  
  https://supabase.com/docs/guides/storage
- Supabase Standard Uploads  
  https://supabase.com/docs/guides/storage/uploads/standard-uploads
- Supabase Google Login  
  https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase Redirect URLs  
  https://supabase.com/docs/guides/auth/redirect-urls
- Supabase Database Migrations  
  https://supabase.com/docs/guides/deployment/database-migrations
- Supabase CLI  
  https://supabase.com/docs/guides/local-development/cli/getting-started
- Vercel GitHub Integration  
  https://vercel.com/docs/git/vercel-for-github
- Vercel Next.js  
  https://vercel.com/docs/frameworks/full-stack/nextjs
- Vercel Environment Variables  
  https://vercel.com/docs/environment-variables

---

# 43. 最終成功條件

專案只有在以下情境完整成立時，才算完成：

1. Cliff 可以用手機登入。
2. Cliff 可以快速拍照記錄一餐。
3. Cliff 可以建立重訓、有氧、皮拉提斯、慢跑與網球的事後紀錄。
4. Cliff 可以預先安排下週每一天要做的動作、變化種類、組數、次數、重量與目標強度。
5. Cliff 在訓練當天可以從今日首頁直接開始預排計畫。
6. 開始後系統自動建立唯一 Session，並帶入所有原定動作與組數。
7. Cliff 照計畫完成一組時只需勾選；實際不同時才需修改重量、次數或 RPE。
8. Cliff 可以暫停、繼續、略過、部分完成、改期與新增額外組。
9. 系統保留原始計畫快照，並能正確比較原定與實際結果。
10. Cliff 可以輸入體重與腰圍並看到正確 BMI。
11. Cliff 可以看到七日平均、運動趨勢與計畫完成摘要。
12. 教練可以登入並看到 Cliff 手動紀錄且已授權的資料。
13. 教練在獲得 `manage_plans` 權限後，可以建立與調整尚未開始的計畫。
14. 教練不能修改已鎖定的原始計畫，也不能代替 Cliff 勾選完成組數。
15. 未授權使用者即使知道 API 或 Storage 路徑也無法讀取資料。
16. 網站在 iPhone Safari 與加入主畫面後的 Standalone PWA 中都能順暢操作，Safe Area、鍵盤、相機、返回手勢、Bottom Navigation 與運動中勾選均通過實機驗收。
17. 視覺呈現符合溫潤、簡約、侘寂、插圖感，而不是企業 BI。
18. 未完成、略過或逾期計畫使用中性、可行動的文案，不羞辱使用者。
19. GitHub Push 後 Vercel 能自動部署。
20. 所有核心測試、lint、typecheck 與 production build 通過。
21. 一般照片壓縮後平均落在 80～180KB，教練仍能辨識重要內容，且原始照片預設不保存。
22. 所有核心健康紀錄與預排訓練均可由使用者在 iPhone 上完成，不依賴外部資料同步。

完成後，Cliff 的日常流程應是：

```text
週末或前一晚
安排未來訓練
    ↓
訓練當天
打開今日首頁
    ↓
開始訓練
    ↓
每完成一組就勾選
有差異才修改數字
    ↓
完成摘要
    ↓
自己與教練查看差異
    ↓
調整下一週計畫
```

Cliff 不需要在健身房臨時思考全部內容，也不需要重複輸入早已排好的動作。

---

