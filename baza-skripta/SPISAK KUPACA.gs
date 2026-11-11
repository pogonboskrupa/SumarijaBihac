/*******************************************************
 * DROPDOWN_KUPCI_SYNC
 *******************************************************/

const DB_SHEET_CUSTOMERS = 'SPISAK KUPACA';
const DB_RANGE_CUSTOMERS = 'A2:A500';

const TARGET_SHEET = 'OTPREMA';
const TARGET_RANGE = 'A14:A500';

const MAX_DV_LIST_ITEMS = 500;

function DROPDOWN_KUPCI_SYNC() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const kupci = loadKupciFromDB_();

    if (!kupci.length) {
      throw new Error('Lista kupaca je prazna.');
    }

    if (kupci.length > MAX_DV_LIST_ITEMS) {
      throw new Error('Previše kupaca za dropdown (' + kupci.length + '). Limit je 500.');
    }

    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(kupci, true)
      .setAllowInvalid(false)
      .build();

    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ODJELI_ID);
    const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);

    let updated = 0;
    let skipped = 0;

    while (files.hasNext()) {
      const file = files.next();
      const ss = SpreadsheetApp.openById(file.getId());
      const sh = ss.getSheetByName(TARGET_SHEET);

      if (!sh) {
        skipped++;
        continue;
      }

      sh.getRange(TARGET_RANGE).setDataValidation(rule);
      updated++;
    }

    SpreadsheetApp.getActive().toast(
      'Dropdown kupaca: ' + updated + ' ažurirano, ' + skipped + ' preskočeno.',
      'SYNC OK',
      6
    );

  } finally {
    lock.releaseLock();
  }
}

function loadKupciFromDB_() {
  const db = SpreadsheetApp.openById(CONFIG.BAZA_PODATAKA_ID);
  const sh = db.getSheetByName(DB_SHEET_CUSTOMERS);

  if (!sh) {
    throw new Error('Nedostaje list: ' + DB_SHEET_CUSTOMERS);
  }

  const values = sh.getRange(DB_RANGE_CUSTOMERS).getValues();

  const seen = {};
  for (let i = 0; i < values.length; i++) {
    const s = values[i][0] ? String(values[i][0]).trim() : '';
    if (!s) continue;

    const key = s.toLowerCase();
    if (!seen[key]) seen[key] = s;
  }

  const out = Object.keys(seen).map(k => seen[k]);
  out.sort((a, b) => a.localeCompare(b));

  return out;
}
