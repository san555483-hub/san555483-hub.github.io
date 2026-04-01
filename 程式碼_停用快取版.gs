// ============================================================
// UNI Hair Shop — 程式碼.gs 完整版
// 全選取代
// ============================================================

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 設定區
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LINE_TOKEN     = "QkCzhhK+vi5bF+uTCwyAA3WH/LEwLXJo3XIiCaa3jw93BIAnfZoskdGLBFajmk7K1SeGcymbACbPdtIzZMu7SxfsVdpWnD5XyfeFAqqAqlBY3UBcZ2qqLC5YGYVmVyI6RPAASTxWwuMpQk77CZHqQAdB04t89/1O/w1cDnyilFU=";
const SHEET_NAME     = "顧客追蹤表(Elsa戰鬥版)";
const BOOKING_SHEET  = "預約紀錄";
const SERVICE_SHEET  = "服務價格";
const SCHEDULE_SHEET = "排程設定";
const NOTIFY_EMAIL   = "san555483@gmail.com";
const OWNER_UID      = "U21e198ba1e0185560050f87d7bedc7f0";

const COL = {
  USER_ID: 0, FOLLOW_DATE: 1, STATUS: 2, MESSAGE: 3,
  SENT_AT: 4, SERVICE: 5, CUSTOMER_TYPE: 6, REMARK: 7,
  LINE_NAME: 8, PHONE: 9,
};

const BCOL = {
  ID: 0, NAME: 1, PHONE: 2, SERVICE: 3, DATE: 4,
  TIME: 5, NOTE: 6, PRIORITY: 7, STATUS: 8, CREATED: 9,
};

const FOLLOW_UP_DAYS = {
  '男生剪髮': 30, '女生剪髮': 60, '男生燙髮': 45, '女生燙髮': 90,
  '燙直': 90, '舒壓洗髮': 7, '頭皮養護': 35, '髮質養護': 45,
  '結構養護－中度受損': 28, '結構養護－高度受損': 14,
  '剪髮': 30, '染髮': 45, '燙髮': 60, '頭皮護理': 40, '結構式護髮': 30,
};
const DEFAULT_DAYS = 60;

const SALON_SYSTEM_PROMPT = `你是 UNI Hair Shop 的 LINE 客服助理。
用溫和、親切、專業的繁體中文回覆，語氣像一位職人設計師的助理，不要像制式客服機器人。
回覆要有溫度，簡短有力，不要廢話。

【關於 UNI Hair Shop】
一對一訂製髮型設計，含親子美髮。設計師：Elsa
店址：桃園市八德區桃德路115號
電話：03-260-9960 分機206（緊急聯繫用）
無固定公休。

【營業時間】
週一、二、四：09:00-15:00、17:00-21:00（午休 15:00-17:00）
週三、五：09:00-12:00、13:30-21:00（午休 12:00-13:30）
週六、日：09:00-21:00

【服務與價格（均無分年齡，依需求訂製）】
剪髮類：
・剪髮 $699 ・兒童剪髮 $699 ・瀏海設計 $250
・男士洗髮含造型 $250 ・編髮 $199

洗髮類：
・舒壓洗髮系列 $549起 ・店選購自備髮品洗髮 $360 ・店選購自備髮品洗護 $440
（自備髮品另加工本費$300）

護髮類：
・光澤保養 $749起（不含舒壓洗髮時間）
・結構護髮 $949起（不含舒壓洗髮時間）
・頭皮護理（卡碧兒）初階$799 / 中階$999 / 高階$1349

燙髮（依受損分級）：$2800～$7300 / 髮束檢測$800（確定燙折抵$300）
染髮：漂髮 $4400/$4700/$5000/$5300 / 加漂 $1900

會員優惠：燙/染/結構護髮85折 / 生日回饋金
付款：街口支付、iPASS Money、轉帳

【回覆原則】
1. 客人問價格 → 直接給表定價格
2. 燙染護細節 → 「髮況不同差異較大，讓 Elsa 直接評估會更準確」
3. 表定以外 → 不腦補，「讓 Elsa 直接跟您確認」
4. 預約 → 確認項目和時間後給連結
5. 100字以內，不每則都附連結，不用「您好」開頭

【預約連結】https://san555483-hub.github.io/booking.html`;


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HTTP 入口
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function doGet(e) {
  try {
    const action = e.parameter.action || '';
    const intent = e.parameter.trigger_intent || '';
    const uid    = e.parameter.uid || '';

    if (action === 'booking')        return handleBooking(e);
    if (action === 'getBookedSlots') return getBookedSlots(e);
    if (action === 'getServices')    return getServices();
    if (action === 'getSchedule')    return getSchedule(e);
    if (action === 'updateService')  return updateService(e);
    if (action === 'updateSchedule') return updateSchedule(e);
    if (action === 'getBookings')    return getBookings(e);
    if (action === 'updateBooking')  return updateBookingStatus(e);

    if (intent === 'check_register') return checkRegister(uid);
    if (intent === 'register')       return registerNewCustomerWithName(uid, '') || ok('ok');

    return okJson({ status: 'ok' });
  } catch (err) {
    writeLog('doGet', err.message);
    return okJson({ status: 'error', msg: err.message });
  }
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) return ok('ERR: 無效請求');
  try {
    const action = e.parameter && e.parameter.action;
    if (action === 'lineToken' || action === 'customToken') return handleAuthRequest(e);

    const json = JSON.parse(e.postData.contents);
    if (json.events && Array.isArray(json.events)) {
      json.events.forEach(handleLineEvent);
      return ok('ok');
    }
    if (json.trigger_intent) {
      const uid = json.uid;
      if (!uid) return ok('ERR: 缺少 uid');
      if (json.trigger_intent === 'check_register') return checkRegister(uid);
      return ok('OK');
    }
    return ok('OK');
  } catch (err) {
    writeLog('doPost', err.message);
    return ok('ERR: ' + err.message);
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 預約接收
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function handleBooking(e) {
  try {
    const p = e.parameter;
    const { name, phone, service, date, time, note, priority } = p;
    if (!name || !phone || !service || !date || !time) {
      return okJson({ status: 'error', msg: '缺少必要欄位' });
    }
    ensureBookingSheet();
    const id = 'B' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BOOKING_SHEET);
    const row = new Array(10).fill('');
    row[BCOL.ID]       = id;
    row[BCOL.NAME]     = name;
    row[BCOL.PHONE]    = phone;
    row[BCOL.SERVICE]  = service;
    row[BCOL.DATE]     = date;
    row[BCOL.TIME]     = time;
    row[BCOL.NOTE]     = note || '';
    row[BCOL.PRIORITY] = priority === 'yes' ? '✅ 加價服務' : '';
    row[BCOL.STATUS]   = '待確認';
    row[BCOL.CREATED]  = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow(row);

    const priorityText = priority === 'yes' ? '\n⭐ 加價指定時段服務' : '';
    const noteText = note ? `\n📝 備註：${note}` : '';
    pushLine(OWNER_UID,
      `🔔 新預約通知！\n\n📋 ${service}\n📅 ${date} ${time}\n👤 ${name}｜📱 ${phone}` +
      priorityText + noteText + `\n\n預約編號：${id}`
    );
    writeLog('handleBooking', `新預約 ${id}: ${name} ${service} ${date} ${time}`);
    return okJson({ status: 'ok', bookingId: id });
  } catch (err) {
    writeLog('handleBooking', err.message);
    return okJson({ status: 'error', msg: err.message });
  }
}

function getBookedSlots(e) {
  try {
    const date = e.parameter.date || '';
    if (!date) return okJson({ slots: [] });
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BOOKING_SHEET);
    if (!sheet) return okJson({ slots: [] });
    const data = sheet.getDataRange().getValues();
    const booked = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (String(row[BCOL.DATE]) === date && row[BCOL.STATUS] !== '已取消') {
        booked.push(String(row[BCOL.TIME]));
      }
    }
    return okJson({ slots: booked });
  } catch (err) {
    writeLog('getBookedSlots', err.message);
    return okJson({ slots: [] });
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 服務價格管理（★ 強制不快取，直接讀 Sheet）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getServices() {
  try {
    // ★ 強制 SpreadsheetApp 重新讀取，不用快取
    SpreadsheetApp.flush();

    ensureServiceSheet();
    const ss    = SpreadsheetApp.openById(SpreadsheetApp.getActiveSpreadsheet().getId());
    const sheet = ss.getSheetByName(SERVICE_SHEET);
    const data  = sheet.getDataRange().getValues();
    const services = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      services.push({
        id:       String(row[0]),
        category: String(row[1]),
        name:     String(row[2]),
        price:    String(row[3]),
        duration: Number(row[4]) || 0,
        note:     String(row[5] || ''),
        active:   row[6] !== false && row[6] !== 'FALSE',
      });
    }

    return okJson({ services });
  } catch (err) {
    writeLog('getServices', err.message);
    return okJson({ services: [] });
  }
}

function updateService(e) {
  try {
    const p = e.parameter;
    const { id, price, note, active } = p;
    if (!id) return okJson({ status: 'error', msg: '缺少 id' });
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SERVICE_SHEET);
    const data  = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        if (price  !== undefined) sheet.getRange(i + 1, 4).setValue(price);
        if (note   !== undefined) sheet.getRange(i + 1, 6).setValue(note);
        if (active !== undefined) sheet.getRange(i + 1, 7).setValue(active === 'true');
        SpreadsheetApp.flush();
        return okJson({ status: 'ok' });
      }
    }
    return okJson({ status: 'error', msg: '找不到該服務' });
  } catch (err) {
    writeLog('updateService', err.message);
    return okJson({ status: 'error', msg: err.message });
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 排程設定
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getSchedule(e) {
  try {
    ensureScheduleSheet();
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCHEDULE_SHEET);
    const data  = sheet.getDataRange().getValues();
    const schedule = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      schedule.push({
        date: String(row[0]),
        type: String(row[1] || ''),
        time: String(row[2] || ''),
        note: String(row[3] || ''),
      });
    }
    return okJson({ schedule });
  } catch (err) {
    writeLog('getSchedule', err.message);
    return okJson({ schedule: [] });
  }
}

function updateSchedule(e) {
  try {
    const p = e.parameter;
    const { date, type, time, note, remove } = p;
    if (!date) return okJson({ status: 'error', msg: '缺少日期' });
    ensureScheduleSheet();
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCHEDULE_SHEET);
    const data  = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === date) {
        if (remove === 'true') {
          sheet.deleteRow(i + 1);
        } else {
          sheet.getRange(i + 1, 1, 1, 4).setValues([[date, type || '', time || '', note || '']]);
        }
        return okJson({ status: 'ok' });
      }
    }
    if (remove !== 'true') sheet.appendRow([date, type || 'closed', time || '', note || '']);
    return okJson({ status: 'ok' });
  } catch (err) {
    writeLog('updateSchedule', err.message);
    return okJson({ status: 'error', msg: err.message });
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 預約管理
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getBookings(e) {
  try {
    const date = e.parameter.date || '';
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BOOKING_SHEET);
    if (!sheet) return okJson({ bookings: [] });
    const data = sheet.getDataRange().getValues();
    const bookings = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[BCOL.ID]) continue;
      if (date && String(row[BCOL.DATE]) !== date) continue;
      bookings.push({
        id:       String(row[BCOL.ID]),
        name:     String(row[BCOL.NAME]),
        phone:    String(row[BCOL.PHONE]),
        service:  String(row[BCOL.SERVICE]),
        date:     String(row[BCOL.DATE]),
        time:     String(row[BCOL.TIME]),
        note:     String(row[BCOL.NOTE] || ''),
        priority: String(row[BCOL.PRIORITY] || ''),
        status:   String(row[BCOL.STATUS]),
        created:  String(row[BCOL.CREATED]),
      });
    }
    bookings.sort((a, b) => a.time.localeCompare(b.time));
    return okJson({ bookings });
  } catch (err) {
    writeLog('getBookings', err.message);
    return okJson({ bookings: [] });
  }
}

function updateBookingStatus(e) {
  try {
    const { id, status } = e.parameter;
    if (!id || !status) return okJson({ status: 'error', msg: '缺少參數' });
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BOOKING_SHEET);
    const data  = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][BCOL.ID]) === id) {
        sheet.getRange(i + 1, BCOL.STATUS + 1).setValue(status);
        return okJson({ status: 'ok' });
      }
    }
    return okJson({ status: 'error', msg: '找不到預約' });
  } catch (err) {
    writeLog('updateBookingStatus', err.message);
    return okJson({ status: 'error', msg: err.message });
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LINE 事件處理
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function handleLineEvent(event) {
  try {
    if (event.type === 'follow')  handleFollow(event);
    if (event.type === 'message') handleMessage(event);
  } catch (err) {
    writeLog('handleLineEvent', err.message);
  }
}

function handleFollow(event) {
  try {
    const uid = event.source && event.source.userId;
    if (!uid) return;
    let displayName = '';
    try { const p = getLineProfile(uid); displayName = p.displayName || ''; } catch (_) {}
    registerNewCustomerWithName(uid, displayName);
    pushLine(uid, `嗨 ${displayName} 👋 歡迎來到 UNI Hair Shop！\n\n我是 Elsa 的助理，有任何問題都可以直接問我 😊\n想預約或了解服務，隨時說一聲～`);
  } catch (err) {
    writeLog('handleFollow', err.message);
  }
}

function handleMessage(event) {
  try {
    const uid  = event.source && event.source.userId;
    const text = (event.message && event.message.text || '').trim();
    if (!uid || !text) return;
    if (text === '預約' || text === '1' || text === '我要預約') {
      pushLine(uid, '好的！請點以下連結選擇時段和服務項目 👇\nhttps://san555483-hub.github.io/booking.html\n\n預約完成會自動確認，不用等回覆 ✅');
      return;
    }
    const reply = askClaude(text);
    pushLine(uid, reply || '收到你的訊息了，Elsa 稍後會回覆你 🙏');
  } catch (err) {
    writeLog('handleMessage', err.message);
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Claude API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function askClaude(userMessage) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
    if (!apiKey) { writeLog('askClaude', 'API Key 未設定'); return null; }
    const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      payload: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: SALON_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }]
      }),
      muteHttpExceptions: true,
    });
    const json = JSON.parse(res.getContentText());
    if (json.content && json.content[0] && json.content[0].text) return json.content[0].text;
    writeLog('askClaude', '回應異常：' + res.getContentText());
    return null;
  } catch (err) {
    writeLog('askClaude', err.message);
    return null;
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 客戶建檔
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function checkRegister(uid) {
  try {
    if (!uid) return ok('ERR: 缺少 uid');
    const data = getSheet().getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][COL.USER_ID]) === String(uid)) return ok('已登記');
    }
    return ok('未登記');
  } catch (err) {
    writeLog('checkRegister', err.message);
    return ok('ERR: ' + err.message);
  }
}

function registerNewCustomerWithName(uid, displayName) {
  try {
    if (!uid) return;
    const sheet = getSheet();
    const data  = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][COL.USER_ID]) === String(uid)) {
        if (!data[i][COL.LINE_NAME] && displayName) sheet.getRange(i + 1, COL.LINE_NAME + 1).setValue(displayName);
        return;
      }
    }
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + DEFAULT_DAYS);
    const row = new Array(10).fill('');
    row[COL.USER_ID]       = uid;
    row[COL.FOLLOW_DATE]   = Utilities.formatDate(nextDate, 'Asia/Taipei', 'yyyy-MM-dd');
    row[COL.SERVICE]       = '剪髮';
    row[COL.CUSTOMER_TYPE] = '新客';
    row[COL.LINE_NAME]     = displayName || '';
    sheet.appendRow(row);
    writeLog('registerNewCustomerWithName', `新客：${uid} / ${displayName}`);
  } catch (err) {
    writeLog('registerNewCustomerWithName', err.message);
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 每日推播追蹤
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function sendLineFollowUp() {
  try {
    const sheet   = getSheet();
    const data    = sheet.getDataRange().getValues();
    const today   = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');
    const sentMap = {};
    for (let i = 1; i < data.length; i++) {
      const row          = data[i];
      const userId       = String(row[COL.USER_ID] || '').trim();
      const followDateRaw = row[COL.FOLLOW_DATE];
      const status       = String(row[COL.STATUS] || '').trim();
      const serviceType  = String(row[COL.SERVICE] || '剪髮').trim();
      const customerType = String(row[COL.CUSTOMER_TYPE] || '熟客').trim();
      const remark       = String(row[COL.REMARK] || '').trim();
      if (!userId || !followDateRaw) continue;
      if (status === '已完成') continue;
      if (sentMap[userId]) continue;
      const followDate = Utilities.formatDate(new Date(followDateRaw), 'Asia/Taipei', 'yyyy-MM-dd');
      if (followDate > today) continue;
      const msg = generateFollowUpMessage(serviceType, customerType);
      sheet.getRange(i + 1, COL.MESSAGE + 1).setValue(msg);
      pushLine(userId, msg);
      sentMap[userId] = true;
      sheet.getRange(i + 1, COL.STATUS + 1).setValue('已完成');
      sheet.getRange(i + 1, COL.SENT_AT + 1).setValue(new Date());
      if (remark !== '已追未讀') {
        const retryDate = new Date();
        retryDate.setDate(retryDate.getDate() + 3);
        sheet.appendRow([userId, Utilities.formatDate(retryDate, 'Asia/Taipei', 'yyyy-MM-dd'), '', '', '', serviceType, customerType, '已追未讀', '', '']);
      }
      const days = FOLLOW_UP_DAYS[serviceType] || DEFAULT_DAYS;
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + days);
      sheet.appendRow([userId, Utilities.formatDate(nextDate, 'Asia/Taipei', 'yyyy-MM-dd'), '', '', '', serviceType, customerType, '', '', '']);
      writeLog('sendLineFollowUp', `${userId} / ${serviceType} / 下次${days}天後`);
    }
  } catch (err) {
    writeLog('sendLineFollowUp', err.message);
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 每日 email 提醒
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function sendFollowUpReminder() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = Utilities.formatDate(today, 'Asia/Taipei', 'yyyy-MM-dd');
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty('LAST_SENT_DATE') === todayKey) return;
    const data = getSheet().getDataRange().getValues();
    let urgentList = [], todayList = [];
    for (let i = 1; i < data.length; i++) {
      const row          = data[i];
      const name         = String(row[COL.LINE_NAME] || row[COL.USER_ID] || '未命名');
      const followDateRaw = row[COL.FOLLOW_DATE];
      const status       = String(row[COL.STATUS] || '').trim();
      if (!followDateRaw || status === '已完成') continue;
      const followDate = new Date(followDateRaw);
      followDate.setHours(0, 0, 0, 0);
      const diff = Math.floor((today - followDate) / 86400000);
      if (diff > 0)        urgentList.push({ name, days: diff });
      else if (diff === 0) todayList.push({ name });
    }
    if (!urgentList.length && !todayList.length) return;
    urgentList.sort((a, b) => b.days - a.days);
    const time = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd HH:mm');
    let body = `【UNI追蹤提醒｜${time}】\n\n`;
    if (urgentList.length) {
      body += '🔥 緊急\n';
      urgentList.forEach((c, i) => body += `${i+1}. ${c.name}｜已過${c.days}天\n`);
      body += '\n';
    }
    if (todayList.length) {
      body += '⏰ 今日\n';
      todayList.forEach((c, i) => body += `${i+1}. ${c.name}\n`);
      body += '\n';
    }
    body += '────\n1. 先處理🔥緊急\n2. 再處理⏰今日\n';
    MailApp.sendEmail({ to: NOTIFY_EMAIL, subject: `【UNI追蹤提醒】今日 ${urgentList.length + todayList.length} 位`, body });
    props.setProperty('LAST_SENT_DATE', todayKey);
    writeLog('sendFollowUpReminder', `寄出 ${urgentList.length + todayList.length} 位`);
  } catch (err) {
    writeLog('sendFollowUpReminder', err.message);
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 文案產生器
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateFollowUpMessage(serviceType, customerType) {
  const msgs = {
    '染髮': ['顏色差不多開始退了，現在補色會最漂亮🎨', '現在補染可以維持最乾淨的髮色狀態👌'],
    '燙髮': ['燙後的捲度到了最自然的時候，現在來整理最剛好💫', '燙髮後護理很重要，現在回來保養讓捲度更持久✨'],
    '頭皮護理': ['頭皮護理效果到這時間點了，要不要再來保養？🌿', '定期護理才能維持最好狀態，時間到囉～👍'],
    '頭皮養護': ['頭皮養護效果差不多了，現在回來效果最好🌿', '定期養護才能維持頭皮健康，時間到囉～👍'],
    '結構式護髮': ['結構式護髮效果差不多了，現在回來做一次最好✨', '讓髮質保持健康，差不多該回來保養囉💆'],
    '結構養護－中度受損': ['距離上次結構養護差不多了，現在回來效果最好✨', '髮質養護要定期，現在回來讓頭髮更健康💆'],
    '結構養護－高度受損': ['漂髮後髮質需要勤保養，現在回來做結構養護效果最好✨', '距離上次保養有段時間了，現在最適合回來修護💆'],
    '髮質養護': ['髮質養護效果差不多了，現在回來做一次最剛好✨', '讓髮質持續健康，差不多該回來保養囉💆'],
    '舒壓洗髮': ['距離上次舒壓洗髮有段時間了，來放鬆一下吧🌊', '忙了好久，是時候來犒賞自己了～✨'],
  };
  if (msgs[serviceType]) return randomPick(msgs[serviceType]);
  return customerType === '新客'
    ? randomPick(['上次效果差不多開始變化了，要不要來調整一下？', '距離上次整理有段時間了，現在回來剛剛好✨'])
    : randomPick(['時間差不多囉～這時候整理最剛好✨', '您的髮況我都記著，現在來調整會更好看👍']);
}

function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 補齊 LINE 名稱
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function fillAllLineNames() {
  try {
    const sheet = getSheet();
    const data  = sheet.getDataRange().getValues();
    let updated = 0;
    for (let i = 1; i < data.length; i++) {
      const uid      = String(data[i][COL.USER_ID] || '').trim();
      const existing = String(data[i][COL.LINE_NAME] || '').trim();
      if (!uid || existing) continue;
      try {
        const profile = getLineProfile(uid);
        if (profile.displayName) {
          sheet.getRange(i + 1, COL.LINE_NAME + 1).setValue(profile.displayName);
          updated++;
          Utilities.sleep(200);
        }
      } catch (_) {}
    }
    Logger.log(`✅ 補齊完成，共更新 ${updated} 筆`);
  } catch (err) {
    writeLog('fillAllLineNames', err.message);
  }
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 初始化 Sheet
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ensureBookingSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(BOOKING_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(BOOKING_SHEET);
    sheet.appendRow(['預約編號','姓名','電話','服務項目','預約日期','預約時間','備註','加價服務','狀態','建立時間']);
  }
}

function ensureServiceSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SERVICE_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(SERVICE_SHEET);
    sheet.appendRow(['ID','分類','服務名稱','價格','時長(分)','備註','啟用']);
    const services = [
      ['adult_cut','剪髮','成人剪髮','$699',30,'','TRUE'],
      ['kid_cut','剪髮','兒童剪髮','$699',40,'','TRUE'],
      ['bang','剪髮','瀏海設計','$250',10,'','TRUE'],
      ['men_wash','剪髮','男士洗髮含造型','$250',50,'','TRUE'],
      ['braid','剪髮','編髮','$199',30,'','TRUE'],
      ['wash_relax','洗髮','舒壓洗髮系列','$549起',60,'','TRUE'],
      ['wash_own_basic','洗髮','店選購自備髮品洗髮','$360',60,'自備髮品另加工本費$300','TRUE'],
      ['wash_own_care','洗髮','店選購自備髮品洗護','$440',60,'自備髮品另加工本費$300','TRUE'],
      ['gloss','護髮','光澤保養','$749起',60,'不含舒壓洗髮時間 自備髮品另加工本費$300','TRUE'],
      ['structure','護髮','結構護髮','$949起',60,'不含舒壓洗髮時間 自備髮品另加工本費$300','TRUE'],
      ['scalp','護髮','頭皮護理','$799起',0,'依需求約30-90分鐘','TRUE'],
      ['perm','燙染','燙髮／燙直','$2800起',-1,'時長依髮況，Elsa確認後通知','TRUE'],
      ['color','燙染','染髮／漂髮','$1900起',-1,'時長依髮況，Elsa確認後通知','TRUE'],
    ];
    services.forEach(r => sheet.appendRow(r));
  }
}

function ensureScheduleSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SCHEDULE_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(SCHEDULE_SHEET);
    sheet.appendRow(['日期','類型(closed/rest)','休息時段','備註']);
  }
}

function initAllSheets() {
  ensureBookingSheet();
  ensureServiceSheet();
  ensureScheduleSheet();
  Logger.log('✅ 所有 Sheet 初始化完成');
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 工具函式
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function ok(text) {
  return ContentService.createTextOutput(text);
}

function okJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function writeLog(fn, msg) {
  try { Logger.log(`[${fn}] ${msg}`); } catch (_) {}
}

function pushLine(uid, text) {
  try {
    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      headers: { 'Authorization': 'Bearer ' + LINE_TOKEN, 'Content-Type': 'application/json' },
      payload: JSON.stringify({ to: uid, messages: [{ type: 'text', text }] }),
      muteHttpExceptions: true,
    });
  } catch (err) {
    writeLog('pushLine', `${uid} / ${err.message}`);
  }
}

function getLineProfile(uid) {
  const res = UrlFetchApp.fetch(`https://api.line.me/v2/bot/profile/${uid}`, {
    headers: { Authorization: 'Bearer ' + LINE_TOKEN },
    muteHttpExceptions: true,
  });
  return JSON.parse(res.getContentText());
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 觸發器
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendLineFollowUp').timeBased().everyDays(1).atHour(10).create();
  ScriptApp.newTrigger('sendFollowUpReminder').timeBased().everyDays(1).atHour(10).create();
  Logger.log('✅ 觸發器設定完成');
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 測試
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function testRun() {
  PropertiesService.getScriptProperties().deleteProperty('LAST_SENT_DATE');
  sendFollowUpReminder();
  Logger.log('✅ testRun 完成');
}

function testClaude() {
  const reply = askClaude('你們剪髮大概多少錢？');
  Logger.log('Claude 回覆：' + reply);
  Logger.log(reply ? '✅ Claude API 正常' : '❌ Claude API 有問題');
}

function testBooking() {
  pushLine(OWNER_UID, '🧪 測試通知\n\n🔔 新預約通知！\n\n📋 成人剪髮\n📅 2026-04-01 10:00\n👤 測試客人｜📱 0912345678\n\n預約編號：TEST001');
  Logger.log('✅ 測試通知已送出');
}
