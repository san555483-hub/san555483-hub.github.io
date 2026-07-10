# UNI_交接簿 — 單一真相檔規格書

> 目的：解決「每次開新對話都要重貼一堆 .gs 檔 + Claude 重新 grep 接點」的浪費。
> 一次性投資，之後每次開新對話都省。
> 建立日期：2026/07/10

---

## 為什麼要做這個

Claude 每次對話是「失憶」的：

- 這個對話結束 → 下一個新對話的 Claude，記憶體是空的
- 你貼的 .gs 檔、Claude 挖出來的接點、函式簽名 → 全部消失
- Claude 的「記憶」只有背景那份濃縮摘要，**撈不到 8360 行主檔的完整內容**

**解法**：把「單一真相檔」放在一個固定位置，持續覆蓋更新。
下次開新對話，你只要貼進來，Claude 5 分鐘對齊就能動工，
不用一個檔一個檔貼、Claude 不用一段一段 grep。

---

## 放哪裡

**建一個 GitHub repo（或 Google Doc）叫 `UNI_交接簿`。**

⚠️ 限制：GitHub raw URL 被 Claude 的 web_fetch 擋，所以開新對話時你還是要「把 raw 內容貼進來」。
但這比「散在各檔、每次重講一遍」快太多，而且**版本永遠只有一份最新的，不會亂**。

---

## repo 裡固定放這幾個檔

```
UNI_交接簿/
├── _核心事實.md          ← 接點、函式簽名、常數、四道開關清單
├── _進度與下一步.md       ← 目前做到哪、下一步要幹嘛
├── 主GS_最新.txt          ← 主系統 GS 完整最新版
├── m_agent_core.gs        ← 模組0 地基
├── m_agent_llm.gs         ← 模組2 LLM 抽取
├── m_agent_session.gs     ← 模組4 Session 管理
├── m_agent_flex.gs        ← 模組3 Flex 湊單
├── m_agent_router.gs      ← 模組1 路由
├── m_agent_gate.gs        ← 模組5 Gate 授權台
└── m_agent_schema_patch.gs ← Schema 補丁
```

---

## `_核心事實.md` 裡該寫什麼（AI Booking Agent 這條線）

這是 Claude 這次挖出來、下次開對話最需要先知道的東西：

### 系統接點
- webhook 入口：`doPost`(455) → `handleLineEvent`(1796) → `handleMessage`(1881)
- postback 分支在 `handleLineEvent` 裡（topup → **agent** → vote 的順序）
- 文字預約意圖攔截在 `handleMessage` 的 `hasBookingIntent` 區塊
- doGet 分流：`?page=quickbook`（電話登記）、`?page=agentgate`（Gate 授權台）

### 三處主 GS 插入（已整合進主GS_最新.txt）
1. postback 攔截：`agent_gate_tryReschedResponse_` + `agent_router_tryPostback_`（topup 後、vote 前）
2. 文字攔截：`agent_router_tryText_`（hasBookingIntent 內、handleBookingIntentSchedule_ 前）
3. doGet 分流：agentgate 頁 + agentGateList/Slots/Act 三個 action

### 複用的主系統函式簽名
- `qb_submit(payload)` — payload={idemKey,name,date,time,phone,service,note}，回 {ok,result,booking}
  - result: written/taken/dup/invalid/failed/disabled
- `qb_getFreeSlots(dateStr)` — 回 {ok, slots:['09:00',...]}
- `notifyOwner_(text, type)` — LINE + Email 雙發
- `replyLineMessages(replyToken, messages)` / `pushLine(uid, text)`
- `getLineProfile(uid)` — 回 {displayName,...}
- `getServices()` — 回 ContentService JSON，含 services[].{active, name}

### 主預約表欄位（BCOL）
ID=0, NAME=1, PHONE=2, SERVICE=3, DATE=4, TIME=5, NOTE=6, PRIORITY=7, STATUS=8, CREATED=9
- 佔位規則：STATUS ≠「已取消」即佔位灰化
- 電話快速登記寫入狀態值 = QB_STATUS_VALUE =「電話預約」

### 四道開關（全部預設 false = 對現有系統零影響）
| 開關 | 位置 | 管什麼 |
|---|---|---|
| `AI_BOOKING_AGENT_ENABLED` | m_agent_core | 收單 Agent 總開關 |
| `AGENT_FLEX_ENABLED` | m_agent_flex | Flex 湊單獨立開關 |
| `AI_BOOKING_GATE_ENABLED` | m_agent_core | Gate 授權總開關 |
| `AGENT_ROUTER_ENABLED` | m_agent_router | 路由獨立開關（預設 true，仍受總開關節制）|

### 狀態機（模組0 定義）
- Session 只走兩態：COLLECTING（進行中）、REJECTED（作廢）
- Pending 走四態：PENDING_GATE / CONFIRMED / REJECTED / FAILED
- 替代時段生命週期：舊 Pending 結案(RESCHEDULE_PROPOSED) → 建新 Session(AWAITING_RESCHEDULE_CONFIRM) → 客人同意 → 建新 Pending → Elsa 確認才 qb_submit

### AgentPending 溯源欄（Schema 補丁後）
originPendingId(16), replacedBySessionId(17), proposedDate(18), proposedTime(19)

---

## `_進度與下一步.md` 目前狀態（2026/07/10）

### ✅ 已完成
- 模組 0/2/3/4（core/llm/session/flex）— 已部署、開關關
- Schema 補丁 — 已跑，4 溯源欄 + RESCHEDULE_PROPOSED reason 生效 ✅
- 模組 1 router — 已貼、agent_testRouter 驗收過（開關關回 false）✅
- 模組 5 gate — 已貼、agentGate_testSelfCheck 驗收過（溯源欄偵測到）✅
- 主 GS 三處插入 — 已整合成完整檔（主GS_已整合.gs）

### 🔵 下一步（通電測試）
1. 覆蓋主 GS（存檔應無紅字錯誤）
2. 開 `AI_BOOKING_AGENT_ENABLED` + `AGENT_FLEX_ENABLED`（先不開 Gate）
   → 測試手機打字「我要剪髮」→ 看 Flex 湊單卡
3. 湊單走通 → 開 `AI_BOOKING_GATE_ENABLED` → 測 Gate 授權台
4. 全程用測試裝置 UID = Uc558dadbe7faa22557a028f6010c6f70，不碰真實客人

### ⏳ 之後（主幹驗收後才做）
- 劉曦璟型後台主動啟動入口（共用引擎，只差起點）

---

## 開新對話怎麼用這個交接簿

開新對話時，丟這句話 + 貼下面幾個檔的 raw 內容：

```
讀我的 UNI_交接簿。先看 _核心事實.md 和 _進度與下一步.md 對齊，
然後我們接著做「下一步」那項。以下是最新檔：

[貼 _核心事實.md]
[貼 _進度與下一步.md]
[需要動哪個檔就貼哪個的最新版]
```

Claude 對齊完就能直接動工，不用重新挖接點。

---

## 維護規則

**每條線做完 → 只更新這個 repo（覆蓋舊的）。**
- 改了主 GS → 更新 `主GS_最新.txt`
- 加了新模組 → 放進來 + 更新 `_核心事實.md`
- 做到新進度 → 更新 `_進度與下一步.md`

版本永遠只有一份最新，不會亂。
