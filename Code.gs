/**
 * 電子部品在庫管理 - Google Apps Script server code
 *
 * Spreadsheet is the data store. This file and Index.html are tracked by Git.
 */
const APP = Object.freeze({
  sheets: {
    parts: 'parts',
    transactions: 'transactions',
    settings: 'settings',
  },
  propertySpreadsheetId: 'SPREADSHEET_ID',
});

const HEADERS = Object.freeze({
  parts: ['part_id', 'name', 'category', 'manufacturer', 'location', 'stock', 'min_stock', 'unit', 'note', 'updated_at'],
  transactions: ['transaction_id', 'timestamp', 'type', 'part_id', 'quantity', 'note', 'operator', 'stock_after'],
  settings: ['key', 'value'],
});

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('電子部品 在庫管理')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Run this once after connecting the project to a Spreadsheet. */
function setup() {
  const ss = getSpreadsheet_();
  PropertiesService.getScriptProperties().setProperty(APP.propertySpreadsheetId, ss.getId());

  Object.keys(APP.sheets).forEach((key) => {
    ensureSheet_(ss, APP.sheets[key], HEADERS[key]);
  });

  return {
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    message: '初期設定が完了しました。',
  };
}

/** Use this when the GAS project is standalone. */
function _setSpreadsheetId(spreadsheetId) {
  const id = String(spreadsheetId || '').trim();
  if (!id) throw new Error('Spreadsheet IDを入力してください。');
  const ss = SpreadsheetApp.openById(id);
  PropertiesService.getScriptProperties().setProperty(APP.propertySpreadsheetId, ss.getId());
  return setup();
}

function getAppData() {
  const ss = getSpreadsheet_();
  const parts = readObjects_(ss.getSheetByName(APP.sheets.parts), HEADERS.parts)
    .filter((part) => part.part_id)
    .map((part) => ({
      part_id: String(part.part_id),
      name: String(part.name || ''),
      category: String(part.category || ''),
      manufacturer: String(part.manufacturer || ''),
      location: String(part.location || ''),
      stock: toNumber_(part.stock),
      min_stock: toNumber_(part.min_stock),
      unit: String(part.unit || '個'),
      note: String(part.note || ''),
      updated_at: formatDate_(part.updated_at),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'));

  const lowStock = parts.filter((part) => part.stock <= part.min_stock);
  return {
    parts,
    dashboard: {
      partCount: parts.length,
      totalStock: parts.reduce((sum, part) => sum + part.stock, 0),
      lowStockCount: lowStock.length,
    },
    categories: unique_(parts.map((part) => part.category).filter(Boolean)),
    locations: unique_(parts.map((part) => part.location).filter(Boolean)),
  };
}

function savePart(input) {
  const data = input || {};
  // New parts receive an internal UUID. Users do not need to know this ID.
  const id = String(data.part_id || '').trim() || Utilities.getUuid();
  const name = String(data.name || '').trim();
  if (!name) throw new Error('部品名は必須です。');

  const minStock = integer_(data.min_stock, '最低在庫');
  if (minStock < 0) throw new Error('最低在庫は0以上にしてください。');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = getSpreadsheet_();
    const sheet = ss.getSheetByName(APP.sheets.parts);
    const headers = HEADERS.parts;
    const rowIndex = findRowIndex_(sheet, id, headers.indexOf('part_id'));
    const now = new Date();
    const values = rowIndex
      ? sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0]
      : headers.map(() => '');

    values[headers.indexOf('part_id')] = id;
    values[headers.indexOf('name')] = name;
    values[headers.indexOf('category')] = String(data.category || '').trim();
    values[headers.indexOf('manufacturer')] = String(data.manufacturer || '').trim();
    values[headers.indexOf('location')] = String(data.location || '').trim();
    values[headers.indexOf('min_stock')] = minStock;
    values[headers.indexOf('unit')] = String(data.unit || '個').trim() || '個';
    values[headers.indexOf('note')] = String(data.note || '').trim();
    values[headers.indexOf('updated_at')] = now;

    if (rowIndex) {
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([values]);
    } else {
      const initialStock = integer_(data.initial_stock || 0, '初期在庫');
      if (initialStock < 0) throw new Error('初期在庫は0以上にしてください。');
      values[headers.indexOf('stock')] = initialStock;
      sheet.appendRow(values);
      if (initialStock > 0) {
        appendTransaction_(ss, {
          type: 'INITIAL', partId: id, quantity: initialStock,
          note: '初期登録', stockAfter: initialStock,
        });
      }
    }
    return getAppData();
  } finally {
    lock.releaseLock();
  }
}

function recordTransaction(input) {
  const data = input || {};
  const type = String(data.type || '').toUpperCase();
  if (!['IN', 'OUT'].includes(type)) throw new Error('入庫または出庫を選択してください。');
  const partId = String(data.part_id || '').trim();
  if (!partId) throw new Error('部品を選択してください。');
  const quantity = integer_(data.quantity, '数量');
  if (quantity <= 0) throw new Error('数量は1以上にしてください。');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = getSpreadsheet_();
    const sheet = ss.getSheetByName(APP.sheets.parts);
    const stockIndex = HEADERS.parts.indexOf('stock');
    const rowIndex = findRowIndex_(sheet, partId, HEADERS.parts.indexOf('part_id'));
    if (!rowIndex) throw new Error('部品が見つかりません。');

    const row = sheet.getRange(rowIndex, 1, 1, HEADERS.parts.length).getValues()[0];
    const currentStock = toNumber_(row[stockIndex]);
    const nextStock = type === 'IN' ? currentStock + quantity : currentStock - quantity;
    if (nextStock < 0) throw new Error(`在庫不足です。現在庫: ${currentStock}`);

    row[stockIndex] = nextStock;
    row[HEADERS.parts.indexOf('updated_at')] = new Date();
    sheet.getRange(rowIndex, 1, 1, HEADERS.parts.length).setValues([row]);
    appendTransaction_(ss, {
      type, partId, quantity,
      note: String(data.note || '').trim(),
      stockAfter: nextStock,
    });
    return getAppData();
  } finally {
    lock.releaseLock();
  }
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty(APP.propertySpreadsheetId);
  if (id) return SpreadsheetApp.openById(id);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('Spreadsheet IDが未設定です。GASエディタで setSpreadsheetId("ID") を一度実行してください。');
  }
  return active;
}

function ensureSheet_(ss, name, headers) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1f4e78')
      .setFontColor('#ffffff');
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}

function readObjects_(sheet, headers) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length)
    .getValues()
    .map((row) => headers.reduce((obj, header, index) => {
      obj[header] = row[index];
      return obj;
    }, {}));
}

function findRowIndex_(sheet, id, idColumnIndex) {
  if (sheet.getLastRow() < 2) return 0;
  const values = sheet.getRange(2, idColumnIndex + 1, sheet.getLastRow() - 1, 1).getValues();
  const offset = values.findIndex((row) => String(row[0]).trim() === id);
  return offset < 0 ? 0 : offset + 2;
}

function appendTransaction_(ss, data) {
  const sheet = ss.getSheetByName(APP.sheets.transactions);
  const operator = getOperator_();
  sheet.appendRow([
    `TX-${Utilities.getUuid()}`,
    new Date(),
    data.type,
    data.partId,
    data.quantity,
    data.note || '',
    operator,
    data.stockAfter,
  ]);
}

function getOperator_() {
  try {
    return Session.getActiveUser().getEmail() || '';
  } catch (error) {
    return '';
  }
}

function integer_(value, label) {
  const number = Number(value || 0);
  if (!Number.isInteger(number)) throw new Error(`${label}は整数で入力してください。`);
  return number;
}

function toNumber_(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatDate_(value) {
  if (!(value instanceof Date) || isNaN(value.getTime())) return String(value || '');
  return Utilities.formatDate(value, Session.getScriptTimeZone() || 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
}

function unique_(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'ja'));
}
