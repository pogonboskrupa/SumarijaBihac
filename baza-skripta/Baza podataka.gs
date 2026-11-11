/*******************************************************
 * BAZA PODATAKA — INDEKSIRANJE (PRIMKA + OTPREMA)
 * Jedan fajl, bez modula.
 *
 * Stabilno FULL indeksiranje (bez INIT loop-a) + DODAJ NOVE
 * + vizuelni separator (deblja linija) između dana.
 *
 * ID-evi dolaze iz CONFIG.gs (getteri — redoslijed učitavanja fajlova
 * u Apps Scriptu nije garantovan, pa se CONFIG čita tek pri upotrebi).
 *******************************************************/

const IDX_CFG = {
  get TARGET_SS_ID() { return CONFIG.BAZA_PODATAKA_ID; },
  get FOLDER_ID()    { return CONFIG.FOLDER_ODJELI_ID; },

  START_ROW: 14,
  END_ROW: 300,

  READ_COLS: 23,        // A..W
  SORT_START_IDX: 3,    // D (0-based)
  SORT_COLS: 20,        // D..W

  INDEX_PRIMKA: 'INDEKS_PRIMKA',
  INDEX_OTPREMA: 'INDEKS_OTPREMA',

  FILES_PER_BATCH: 20,
  SOFT_TIME_LIMIT_MS: 250000 // ~4:10 min
};

const IDX_SORT_HDR_20 = [
  'F/L Č','I','II','III','RD','TRUPCI Č','CEL.DUGA','CEL.CIJEPANA','ŠKART','Σ ČETINARI',
  'F/L L','I','II','III','TRUPCI L','OGR.DUGI','OGR.CIJEPANI','GULE','LIŠĆARI','UKUPNO Č+L'
];

const IDX_PROP = {
  FULL_FILE_IDS: 'IDX_FULL_FILE_IDS',
  FULL_CURSOR: 'IDX_FULL_CURSOR',
  FULL_PHASE: 'IDX_FULL_PHASE', // INITING | READY
  DODAJ_LAST_UPDATED_MAP: 'IDX_DODAJ_LAST_UPDATED_MAP'
};

/**
 * 1) FULL indeksiranje (stabilno, nastavlja gdje je stao)
 */
function INDEKS_FULL() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log('FULL: zaključano (drugi run radi). Pokušaj ponovo.');
    return;
  }

  const t0 = Date.now();
  const props = PropertiesService.getScriptProperties();

  try {
    const tss = SpreadsheetApp.openById(IDX_CFG.TARGET_SS_ID);

    IDX_ensureFullInitState_(props, tss);

    let ids = JSON.parse(props.getProperty(IDX_PROP.FULL_FILE_IDS) || '[]');
    let cursor = Number(props.getProperty(IDX_PROP.FULL_CURSOR) || '0');

    if (!ids.length) {
      Logger.log('FULL: nema snapshot fajlova. Radim re-init.');
      IDX_forceFullInit_(props, tss);
      ids = JSON.parse(props.getProperty(IDX_PROP.FULL_FILE_IDS) || '[]');
      cursor = Number(props.getProperty(IDX_PROP.FULL_CURSOR) || '0');
    }

    const shP = IDX_getOrCreateSheet_(tss, IDX_CFG.INDEX_PRIMKA);
    const shO = IDX_getOrCreateSheet_(tss, IDX_CFG.INDEX_OTPREMA);

    while (cursor < ids.length) {
      if (Date.now() - t0 > IDX_CFG.SOFT_TIME_LIMIT_MS) break;

      const batch = ids.slice(cursor, cursor + IDX_CFG.FILES_PER_BATCH);

      const primkaRows = [];
      const otpremaRows = [];

      for (const id of batch) {
        try {
          const res = IDX_readOneFileBoth_(id);
          if (res.primka.length) primkaRows.push(...res.primka);
          if (res.otprema.length) otpremaRows.push(...res.otprema);
        } catch (e) {
          Logger.log(`FULL SKIP ${id}: ${e && e.message ? e.message : e}`);
        }
      }

      IDX_appendRows_(shP, primkaRows);
      IDX_appendRows_(shO, otpremaRows);

      cursor += batch.length;
      props.setProperty(IDX_PROP.FULL_CURSOR, String(cursor));

      Logger.log(`FULL progress: ${cursor}/${ids.length}`);
    }

    if (cursor >= ids.length) {
      IDX_sortIndexByDate_(shP);
      IDX_sortIndexByDate_(shO);

      // separator između dana
      IDX_applyDaySeparators_(shP, 1, 2);
      IDX_applyDaySeparators_(shO, 1, 2);

      IDX_formatDateCol_(shP, 1);
      IDX_formatDateCol_(shO, 1);

      // očisti FULL state
      props.deleteProperty(IDX_PROP.FULL_PHASE);
      props.deleteProperty(IDX_PROP.FULL_FILE_IDS);
      props.deleteProperty(IDX_PROP.FULL_CURSOR);

      Logger.log('FULL ZAVRŠEN: sort ASC + separatori + format datuma.');
    } else {
      Logger.log('FULL PAUZIRAN zbog time limit-a. Samo ponovo pokreni INDEKS_FULL (nastavlja).');
    }

  } finally {
    lock.releaseLock();
  }
}

/**
 * 2) DODAJ NOVE (samo izmijenjeni fajlovi)
 */
function INDEKS_DODAJ_NOVE() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log('DODAJ: zaključano (drugi run radi). Pokušaj ponovo.');
    return;
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const map = JSON.parse(props.getProperty(IDX_PROP.DODAJ_LAST_UPDATED_MAP) || '{}');

    const tss = SpreadsheetApp.openById(IDX_CFG.TARGET_SS_ID);
    const shP = IDX_getOrCreateSheet_(tss, IDX_CFG.INDEX_PRIMKA);
    const shO = IDX_getOrCreateSheet_(tss, IDX_CFG.INDEX_OTPREMA);

    if (shP.getLastRow() < 1) IDX_writeHeaderPrimka_(shP);
    if (shO.getLastRow() < 1) IDX_writeHeaderOtprema_(shO);

    const folder = DriveApp.getFolderById(IDX_CFG.FOLDER_ID);
    const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);

    const primkaIncoming = [];
    const otpremaIncoming = [];

    while (files.hasNext()) {
      const f = files.next();
      const id = f.getId();
      const updated = f.getLastUpdated().getTime();
      const last = Number(map[id] || 0);

      if (updated <= last) continue;

      map[id] = updated;

      try {
        const res = IDX_readOneFileBoth_(id);
        primkaIncoming.push(...res.primka);
        otpremaIncoming.push(...res.otprema);
      } catch (e) {
        Logger.log(`DODAJ SKIP ${id}: ${e && e.message ? e.message : e}`);
      }
    }

    const primkaAdded = IDX_appendUnique_(shP, primkaIncoming, IDX_primkaKey_);
    const otpremaAdded = IDX_appendUnique_(shO, otpremaIncoming, IDX_otpremaKey_);

    IDX_sortIndexByDate_(shP);
    IDX_sortIndexByDate_(shO);

    // separator između dana
    IDX_applyDaySeparators_(shP, 1, 2);
    IDX_applyDaySeparators_(shO, 1, 2);

    IDX_formatDateCol_(shP, 1);
    IDX_formatDateCol_(shO, 1);

    props.setProperty(IDX_PROP.DODAJ_LAST_UPDATED_MAP, JSON.stringify(map));
    Logger.log(`DODAJ: PRIMKA +${primkaAdded}, OTPREMA +${otpremaAdded}`);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 3) RESET FULL state
 */
function INDEKS_RESET() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log('RESET: zaključano (drugi run radi). Pokušaj ponovo.');
    return;
  }

  try {
    const props = PropertiesService.getScriptProperties();
    props.deleteProperty(IDX_PROP.FULL_FILE_IDS);
    props.deleteProperty(IDX_PROP.FULL_CURSOR);
    props.deleteProperty(IDX_PROP.FULL_PHASE);
    Logger.log('RESET: FULL state obrisan. Sada pokreni INDEKS_FULL.');
  } finally {
    lock.releaseLock();
  }
}

/* =========================
 * FULL INIT STATE MACHINE
 * ========================= */

function IDX_ensureFullInitState_(props, tss) {
  const phase = props.getProperty(IDX_PROP.FULL_PHASE) || '';
  const idsProp = props.getProperty(IDX_PROP.FULL_FILE_IDS);
  const cursorProp = props.getProperty(IDX_PROP.FULL_CURSOR);

  if (phase !== 'READY' || !idsProp || cursorProp === null) {
    IDX_forceFullInit_(props, tss);
  }
}

function IDX_forceFullInit_(props, tss) {
  props.setProperty(IDX_PROP.FULL_PHASE, 'INITING');

  const shP = IDX_getOrCreateSheet_(tss, IDX_CFG.INDEX_PRIMKA);
  const shO = IDX_getOrCreateSheet_(tss, IDX_CFG.INDEX_OTPREMA);

  IDX_writeHeaderPrimka_(shP);
  IDX_writeHeaderOtprema_(shO);
  IDX_clearBodyFast_(shP);
  IDX_clearBodyFast_(shO);

  const ids = IDX_listSheetFileIds_(IDX_CFG.FOLDER_ID);

  props.setProperty(IDX_PROP.FULL_FILE_IDS, JSON.stringify(ids));
  props.setProperty(IDX_PROP.FULL_CURSOR, '0');
  props.setProperty(IDX_PROP.FULL_PHASE, 'READY');

  // full resetuje add-map
  props.deleteProperty(IDX_PROP.DODAJ_LAST_UPDATED_MAP);

  Logger.log(`FULL INIT OK: ${ids.length} fajlova. Nastavljam obradu u istom pokretanju...`);
}

/* =========================
 * DAY SEPARATORS (deblja linija)
 * ========================= */

function IDX_applyDaySeparators_(sh, dateCol /* 1-based */, startRow /* 2 */) {
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < startRow + 1 || lastCol === 0) return;

  const numRows = lastRow - startRow + 1;

  // očisti postojeće bordere na data području
  sh.getRange(startRow, 1, numRows, lastCol).setBorder(false, false, false, false, false, false);

  const dateVals = sh.getRange(startRow, dateCol, numRows, 1).getValues();

  let prevKey = '';
  for (let i = 0; i < dateVals.length; i++) {
    const k = IDX_dateKey_(dateVals[i][0]);
    if (k === '0000-00-00') continue;

    if (prevKey && k !== prevKey) {
      const breakRow = startRow + i - 1; // linija ispod prethodnog reda
      if (breakRow >= startRow) {
        sh.getRange(breakRow, 1, 1, lastCol).setBorder(
          null, null, true, null, null, null,
          null, SpreadsheetApp.BorderStyle.SOLID_MEDIUM
        );
      }
    }
    prevKey = k;
  }
}

/* =========================
 * READERS
 * ========================= */

function IDX_readOneFileBoth_(fileId) {
  const ss = SpreadsheetApp.openById(fileId);
  const odjel = ss.getName();

  const meta = IDX_readMetaFromPrimkaPrefer_(ss);

  return {
    primka: IDX_readOneSheet_(ss, odjel, 'PRIMKA', 'PRIMKA', meta),
    otprema: IDX_readOneSheet_(ss, odjel, 'OTPREMA', 'OTPREMA', meta)
  };
}

function IDX_readMetaFromPrimkaPrefer_(ss) {
  const pick = (sheetName) => {
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return null;
    const v = sh.getRange('D4:D6').getDisplayValues();
    const radiliste  = String((v[0] && v[0][0]) || '').trim();
    const izvodjac   = String((v[1] && v[1][0]) || '').trim();
    const poslovodja = String((v[2] && v[2][0]) || '').trim();
    return { radiliste, izvodjac, poslovodja };
  };

  return pick('PRIMKA') || pick('OTPREMA') || { radiliste: '', izvodjac: '', poslovodja: '' };
}

function IDX_readOneSheet_(ss, odjel, sheetName, mode, meta) {
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return [];

  const radiliste  = String(meta && meta.radiliste ? meta.radiliste : '').trim();
  const izvodjac   = String(meta && meta.izvodjac ? meta.izvodjac : '').trim();
  const poslovodja = String(meta && meta.poslovodja ? meta.poslovodja : '').trim();

  const numRows = IDX_CFG.END_ROW - IDX_CFG.START_ROW + 1;
  const values = sh.getRange(IDX_CFG.START_ROW, 1, numRows, IDX_CFG.READ_COLS).getValues(); // A..W

  const out = [];

  for (const r of values) {
    const dateObj = IDX_parseDateStrict_(r[1]); // B
    if (!dateObj) continue;

    const sort20 = IDX_slicePadNumbers_(r, IDX_CFG.SORT_START_IDX, IDX_CFG.SORT_START_IDX + IDX_CFG.SORT_COLS);

    if (mode === 'PRIMKA') {
      const primac = String(r[2] || '').trim(); // C
      out.push([dateObj, primac, odjel, radiliste, izvodjac, poslovodja, ...sort20]);
    } else {
      const kupac = String(r[0] || '').trim();     // A
      const otpremac = String(r[2] || '').trim();  // C
      out.push([dateObj, otpremac, kupac, odjel, radiliste, izvodjac, poslovodja, ...sort20]);
    }
  }

  return out;
}

/* =========================
 * HEADERS
 * ========================= */

function IDX_writeHeaderPrimka_(sh) {
  const header = ['DATUM','PRIMAČ','ODJEL','RADILIŠTE','IZVOĐAČ','POSLOVOĐA', ...IDX_SORT_HDR_20];
  sh.getRange(1, 1, 1, header.length).setValues([header]);
}

function IDX_writeHeaderOtprema_(sh) {
  const header = ['DATUM','OTPREMAČ','KUPAC','ODJEL','RADILIŠTE','IZVOĐAČ','POSLOVOĐA', ...IDX_SORT_HDR_20];
  sh.getRange(1, 1, 1, header.length).setValues([header]);
}

/* =========================
 * APPEND / UNIQUE / SORT
 * ========================= */

function IDX_appendRows_(sh, rows) {
  if (!rows || !rows.length) return;
  const startRow = sh.getLastRow() + 1;
  sh.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}

function IDX_appendUnique_(sh, incomingRows, keyFn) {
  if (!incomingRows.length) return 0;

  const existing = IDX_readBody_(sh);
  const keys = new Set(existing.map(r => keyFn(r)));

  const fresh = [];
  for (const r of incomingRows) {
    const k = keyFn(r);
    if (!keys.has(k)) {
      keys.add(k);
      fresh.push(r);
    }
  }
  IDX_appendRows_(sh, fresh);
  return fresh.length;
}

function IDX_sortIndexByDate_(sh) {
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow <= 2) return;
  sh.getRange(2, 1, lastRow - 1, lastCol).sort({ column: 1, ascending: true });
}

function IDX_formatDateCol_(sh, col) {
  const lastRow = sh.getLastRow();
  if (lastRow >= 2) sh.getRange(2, col, lastRow - 1, 1).setNumberFormat('dd.MM.yyyy');
}

/* =========================
 * DEDUPE KEYS
 * ========================= */

function IDX_primkaKey_(r) {
  return `${IDX_dateKey_(r[0])}||${String(r[2]||'').trim()}||${String(r[1]||'').trim()}`;
}

function IDX_otpremaKey_(r) {
  return `${IDX_dateKey_(r[0])}||${String(r[3]||'').trim()}||${String(r[2]||'').trim()}||${String(r[1]||'').trim()}`;
}

/* =========================
 * FILE LIST
 * ========================= */

function IDX_listSheetFileIds_(folderId) {
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  const ids = [];
  while (files.hasNext()) ids.push(files.next().getId());
  return ids;
}

/* =========================
 * UTILS
 * ========================= */

function IDX_getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function IDX_clearBodyFast_(sh) {
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return;
  sh.getRange(2, 1, lastRow - 1, lastCol).clearContent();
}

function IDX_readBody_(sh) {
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];
  return sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

// Strogo dd.MM.yyyy. ili dd.MM.yyyy (bez pogađanja)
function IDX_parseDateStrict_(v) {
  if (!v) return null;

  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  }

  const s = String(v).trim();
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})\.?$/);
  if (!m) return null;

  const dd = Number(m[1]), mm = Number(m[2]), yy = Number(m[3]);
  const d = new Date(yy, mm - 1, dd);
  if (d.getFullYear() === yy && d.getMonth() === mm - 1 && d.getDate() === dd) return d;
  return null;
}

function IDX_dateKey_(v) {
  const d = IDX_parseDateStrict_(v);
  if (!d) return '0000-00-00';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function IDX_slicePadNumbers_(arr, start, end) {
  const out = [];
  for (let i = start; i < end; i++) out.push(IDX_safeNumber_(arr[i]));
  return out;
}

function IDX_safeNumber_(v) {
  if (v === null || v === '') return 0;
  if (typeof v === 'number') return v;
  const s = String(v).replace(',', '.').trim();
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}
