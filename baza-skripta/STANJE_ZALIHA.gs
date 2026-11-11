/*******************************************************
 * STANJE_ZALIHA_BIHAC
 *
 * Layout po odjelu:
 *  R1: A=ODJEL,          B=naziv,  C=OPIS,     D:W=zaglavlje
 *  R2: A=RADILIŠTE,      B=vrijednost, C=PROJEKAT, D:W=projekat
 *  R3: A=IZVOĐAČ,        B=vrijednost, C=SJEČA,    D:W=sječa
 *  R4: A=POSLOVOĐA,      B=vrijednost, C=OTPREMA,  D:W=otprema
 *  R5: A=ZADNJA OTPREMA, B=datum,  C=ZALIHA,   D:W=zaliha
 *  R6: separator
 *
 * Zamjenjuje stare STANJE_ZALIHA_V4 i STANJE_ZALIHA_KRUPA
 * (oba fajla se brišu iz projekta).
 *******************************************************/

function _validateConfig() {
  ['BAZA_PODATAKA_ID', 'FOLDER_ODJELI_ID', 'OUT_SHEET_NAME'].forEach(key => {
    if (!CONFIG || !CONFIG[key]) throw new Error('CONFIG.' + key + ' nije definisan!');
  });
}

// ─── KONSTANTE ───────────────────────────────────────────────────────────────
const SKV = {
  SHEET_OTPREMA:       'OTPREMA',
  SHEET_PRIMKA:        'PRIMKA',
  INDEX_OTPREMA_SHEET: 'INDEKS_OTPREMA',

  // META u PRIMKA sheetu
  CELL_RADILISTE:      'D4',
  CELL_IZVODJAC:       'D5',
  CELL_POSLOVODJA:     'D6',

  // Blok podataka u OTPREMA sheetu (4 reda x 20 kolona)
  SRC_BLOCK:           'D10:W13',

  OUT_COLS:            23,   // A..W
  BLOCK_ROWS:          5,
  BLOCK_SIZE:          6,    // 5 redova + separator

  HEADER_BG:           '#F2F2F2',
  BORDER_COLOR:        '#999999',

  COL_WIDTHS: { 1: 110, 2: 220, 3: 110 },
  COL_DATA_WIDTH: 60,
  ROW_HEIGHT:     18,

  DATA_HEADERS: [
    'F/L Č','I','II','III','RD','TRUPCI Č','CEL.DUGA','CEL.CIJEPANA','ŠKART','Σ ČETINARI',
    'F/L L','I','II','III','TRUPCI L','OGR.DUGI','OGR.CIJEPANI','GULE','LIŠĆARI','UKUPNO Č+L'
  ],

  ROW_LABELS: ['PROJEKAT', 'SJEČA', 'OTPREMA', 'ZALIHA'],
};

// ─── GLAVNA FUNKCIJA ─────────────────────────────────────────────────────────
function STANJE_ZALIHA_BIHAC() {
  _validateConfig();

  const outSS  = SpreadsheetApp.openById(CONFIG.BAZA_PODATAKA_ID);
  const outSh  = _getOrCreateSheet(outSS, CONFIG.OUT_SHEET_NAME);
  outSh.clear();

  const latestOtpremaMap = _buildLatestOtpremaMap();
  const allFiles         = _collectSheetFiles(CONFIG.FOLDER_ODJELI_ID);
  const errors           = [];
  const out              = [];

  allFiles.forEach(file => {
    try {
      _processOdjelFile(file, latestOtpremaMap).forEach(r => out.push(r));
    } catch (e) {
      errors.push('[' + file.getName() + '] ' + e.message + '\n' + e.stack);
    }
  });

  if (out.length) {
    outSh.getRange(1, 1, out.length, SKV.OUT_COLS).setValues(out);
  }

  _applyLayout(outSh);
  _applyHeaderStyles(outSh);
  _applyBorders(outSh);

  if (errors.length) {
    Logger.log('=== GREŠKE ===\n' + errors.join('\n---\n'));
    SpreadsheetApp.getUi().alert(
      'Završeno s ' + errors.length + ' greškom/greškama.\nDetalji u Logs-u.'
    );
  }
}

// ─── OBRADA JEDNOG ODJELA ────────────────────────────────────────────────────
function _processOdjelFile(file, latestOtpremaMap) {
  const odjel    = file.getName();
  const odjelKey = _normalizeKey(odjel);
  const ss       = SpreadsheetApp.openById(file.getId());

  const shP        = ss.getSheetByName(SKV.SHEET_PRIMKA);
  const radiliste  = shP ? shP.getRange(SKV.CELL_RADILISTE).getDisplayValue().trim()  : '';
  const izvodjac   = shP ? shP.getRange(SKV.CELL_IZVODJAC).getDisplayValue().trim()   : '';
  const poslovodja = shP ? shP.getRange(SKV.CELL_POSLOVODJA).getDisplayValue().trim() : '';

  const shO = ss.getSheetByName(SKV.SHEET_OTPREMA);
  if (!shO) throw new Error('Sheet "' + SKV.SHEET_OTPREMA + '" nije pronađen.');

  const data = shO.getRange(SKV.SRC_BLOCK).getValues();
  if (data.length !== 4 || data[0].length !== 20) {
    throw new Error('Neočekivane dimenzije bloka u "' + SKV.SRC_BLOCK + '": ' + data.length + 'x' + data[0].length);
  }

  const zadnjaOtprema = _formatDateOrEmpty(latestOtpremaMap[odjelKey]);

  return [
    _makeRow({ col1: 'ODJEL',         col2: odjel,         col3: 'OPIS',            data: SKV.DATA_HEADERS }),
    _makeRow({ col1: 'RADILIŠTE',      col2: radiliste,     col3: SKV.ROW_LABELS[0], data: data[0] }),
    _makeRow({ col1: 'IZVOĐAČ',        col2: izvodjac,      col3: SKV.ROW_LABELS[1], data: data[1] }),
    _makeRow({ col1: 'POSLOVOĐA',      col2: poslovodja,    col3: SKV.ROW_LABELS[2], data: data[2] }),
    _makeRow({ col1: 'ZADNJA OTPREMA', col2: zadnjaOtprema, col3: SKV.ROW_LABELS[3], data: data[3] }),
    new Array(SKV.OUT_COLS).fill(''),
  ];
}

// ─── MAPA ZADNJIH OTPREMA ─────────────────────────────────────────────────────
function _buildLatestOtpremaMap() {
  const ss = SpreadsheetApp.openById(CONFIG.BAZA_PODATAKA_ID);
  const sh = ss.getSheetByName(SKV.INDEX_OTPREMA_SHEET);
  if (!sh) return {};

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return {};

  // A = datum, D = odjel
  const values = sh.getRange(1, 1, lastRow, 4).getValues();
  const map    = {};

  for (let i = 1; i < values.length; i++) {
    const key = _normalizeKey(values[i][3]);
    if (!key || !values[i][0]) continue;

    const datum = _parseDateSafe(values[i][0]);
    if (!datum) continue;

    if (!map[key] || datum.getTime() > map[key].getTime()) map[key] = datum;
  }

  return map;
}

// ─── LAYOUT / STILOVI / BORDERI ──────────────────────────────────────────────
function _applyLayout(sh) {
  Object.entries(SKV.COL_WIDTHS).forEach(([col, width]) => sh.setColumnWidth(Number(col), width));
  for (let c = 4; c <= SKV.OUT_COLS; c++) sh.setColumnWidth(c, SKV.COL_DATA_WIDTH);

  const lr = sh.getLastRow();
  if (!lr) return;

  sh.getRange(1, 1, lr, SKV.OUT_COLS)
    .setFontFamily('Arial')
    .setFontSize(9)
    .setVerticalAlignment('middle');

  for (let r = 1; r <= lr; r++) sh.setRowHeight(r, SKV.ROW_HEIGHT);
}

function _applyHeaderStyles(sh) {
  const lr = sh.getLastRow();
  if (!lr) return;

  const headerRanges = [];
  const metaRanges = [];
  const colCRanges = [];
  const separatorRanges = [];

  for (let r = 1; r <= lr; r += SKV.BLOCK_SIZE) {
    headerRanges.push('A' + r + ':W' + r);

    const blockEnd = Math.min(r + SKV.BLOCK_ROWS - 1, lr);
    if (blockEnd >= r + 1) metaRanges.push('A' + (r + 1) + ':B' + blockEnd);
    colCRanges.push('C' + r + ':C' + blockEnd);

    if (r + SKV.BLOCK_SIZE - 1 <= lr) separatorRanges.push('A' + (r + 5) + ':W' + (r + 5));
  }

  sh.getRangeList(headerRanges).setBackground(SKV.HEADER_BG).setFontWeight('bold');
  sh.getRangeList(metaRanges).setBackground(SKV.HEADER_BG).setFontWeight('bold');
  sh.getRangeList(colCRanges).setFontWeight('bold');
  if (separatorRanges.length) sh.getRangeList(separatorRanges).setBackground(null);
}

function _applyBorders(sh) {
  const lr = sh.getLastRow();
  if (!lr) return;

  const blockRanges = [];
  for (let r = 1; r <= lr; r += SKV.BLOCK_SIZE) {
    const rows = Math.min(SKV.BLOCK_ROWS, lr - r + 1);
    blockRanges.push('A' + r + ':W' + (r + rows - 1));
  }

  sh.getRangeList(blockRanges).setBorder(
    true, true, true, true, true, true,
    SKV.BORDER_COLOR,
    SpreadsheetApp.BorderStyle.SOLID
  );
}

// ─── POMOĆNE FUNKCIJE ─────────────────────────────────────────────────────────

/** Red od 23 kolone: A = col1, B = col2, C = col3, D..W = data (20 vrijednosti). */
function _makeRow({ col1, col2, col3, data }) {
  const row = new Array(SKV.OUT_COLS).fill('');
  row[0] = col1;
  row[1] = col2;
  row[2] = col3;
  data.forEach((v, i) => { row[3 + i] = v; });
  return row;
}

function _collectSheetFiles(folderId) {
  const iter = DriveApp.getFolderById(folderId).getFilesByType(MimeType.GOOGLE_SHEETS);
  const result = [];
  while (iter.hasNext()) result.push(iter.next());
  return result;
}

function _getOrCreateSheet(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function _normalizeKey(v) {
  return String(v || '').trim().toUpperCase();
}

function _parseDateSafe(v) {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function _formatDateOrEmpty(d) {
  if (!d) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd.MM.yyyy');
}
