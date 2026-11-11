/****************************************************
 * DROPDOWN RADNICI + DROPDOWN META (D4:D6) U SVIM ODJELIMA
 *
 * IZVOR: BAZA PODATAKA (CONFIG.BAZA_PODATAKA_ID) → INFO
 *   B2:B20 PRIMAČI | C2:C25 OTPREMAČI
 *   E2:E20 RADILIŠTA | F2:F20 IZVOĐAČI | D2:D20 POSLOVOĐE
 *
 * TARGET: folder ODJELI (CONFIG.FOLDER_ODJELI_ID)
 *
 * Data validation ne može referencirati range iz drugog fajla,
 * zato se koristi requireValueInList(lista).
 ****************************************************/

/** Dropdown PRIMAČ / OTPREMAČ (kolona C, od reda 14). */
function DODAJ_RADNIKE() {
  const START_ROW = 14;
  const END_ROW = 500;
  const COL_C = 3;

  const info = _openInfoSheet_();
  const primaci = readCleanUniqueList_(info.getRange('B2:B20').getValues());
  const otpremaci = readCleanUniqueList_(info.getRange('C2:C25').getValues());

  if (!primaci.length) throw new Error('INFO!B2:B20: nema važećih PRIMAČA (prazno).');
  if (!otpremaci.length) throw new Error('INFO!C2:C25: nema važećih OTPREMAČA (prazno).');

  const rulePrimac = _listRule_(primaci);
  const ruleOtpremac = _listRule_(otpremaci);
  const rows = END_ROW - START_ROW + 1;

  const res = _forEachOdjel_((ss) => {
    let touched = false;
    const shP = ss.getSheetByName('PRIMKA');
    if (shP) { shP.getRange(START_ROW, COL_C, rows, 1).setDataValidation(rulePrimac); touched = true; }
    const shO = ss.getSheetByName('OTPREMA');
    if (shO) { shO.getRange(START_ROW, COL_C, rows, 1).setDataValidation(ruleOtpremac); touched = true; }
    return touched;
  });

  _toastDone_('Dropdown radnika gotov', res);
}

/** Dropdown RADILIŠTE / IZVOĐAČ / POSLOVOĐA (D4:D6 u PRIMKA, D3:D5 u OTPREMA). */
function SET_DROPDOWN_INFO_D4_D6_SVI_ODJELI() {
  const info = _openInfoSheet_();
  const radilista = readCleanUniqueList_(info.getRange('E2:E20').getValues());
  const izvodjaci = readCleanUniqueList_(info.getRange('F2:F20').getValues());
  const poslovodje = readCleanUniqueList_(info.getRange('D2:D20').getValues());

  if (!radilista.length) throw new Error('INFO!E2:E20: prazna lista radilišta.');
  if (!izvodjaci.length) throw new Error('INFO!F2:F20: prazna lista izvođača.');
  if (!poslovodje.length) throw new Error('INFO!D2:D20: prazna lista poslovođa.');

  const r1 = _listRule_(radilista);
  const r2 = _listRule_(izvodjaci);
  const r3 = _listRule_(poslovodje);

  const res = _forEachOdjel_((ss) => {
    let touched = false;
    const shP = ss.getSheetByName('PRIMKA');
    if (shP) {
      shP.getRange('D4').setDataValidation(r1);
      shP.getRange('D5').setDataValidation(r2);
      shP.getRange('D6').setDataValidation(r3);
      touched = true;
    }
    const shO = ss.getSheetByName('OTPREMA');
    if (shO) {
      shO.getRange('D3').setDataValidation(r1);
      shO.getRange('D4').setDataValidation(r2);
      shO.getRange('D5').setDataValidation(r3);
      touched = true;
    }
    return touched;
  });

  _toastDone_('Dropdown D4:D6 gotov', res);
}

/* ---------- pomoćne funkcije ---------- */

function _openInfoSheet_() {
  const sh = SpreadsheetApp.openById(CONFIG.BAZA_PODATAKA_ID).getSheetByName('INFO');
  if (!sh) throw new Error('BAZA PODATAKA: ne postoji list "INFO".');
  return sh;
}

function _listRule_(list) {
  return SpreadsheetApp.newDataValidation()
    .requireValueInList(list, true)
    .setAllowInvalid(false)
    .build();
}

/** Poziva fn(ss) za svaki odjel-fajl; fn vraća true ako je nešto izmijenjeno. */
function _forEachOdjel_(fn) {
  const files = DriveApp.getFolderById(CONFIG.FOLDER_ODJELI_ID).getFilesByType(MimeType.GOOGLE_SHEETS);
  let updated = 0;
  let skipped = 0;

  while (files.hasNext()) {
    let ss;
    try {
      ss = SpreadsheetApp.openById(files.next().getId());
    } catch (e) {
      skipped++;
      continue;
    }
    if (fn(ss)) updated++; else skipped++;
  }
  return { updated, skipped };
}

function _toastDone_(title, res) {
  SpreadsheetApp.getActive().toast(
    title + '. Ažurirano: ' + res.updated + ' | Preskočeno: ' + res.skipped,
    'VALIDACIJA',
    8
  );
}

/** 2D values → lista stringova (trim, bez praznih, unique, čuva redoslijed). */
function readCleanUniqueList_(values2d) {
  const out = [];
  const seen = {};

  for (let i = 0; i < values2d.length; i++) {
    const v = values2d[i][0];
    if (v === null || v === undefined) continue;

    const s = String(v).trim();
    if (!s || seen[s]) continue;

    seen[s] = true;
    out.push(s);
  }
  return out;
}
