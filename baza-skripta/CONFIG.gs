/*******************************************************
 * CONFIG — JEDINO MJESTO ZA ID-eve (Šumarija Bihać)
 *
 * Za drugu šumariju mijenjaju se SAMO vrijednosti ovdje.
 * Svi ostali fajlovi čitaju iz CONFIG (nigdje nema tvrdo
 * upisanih ID-eva).
 *******************************************************/
const CONFIG = {
  // Folder sa Google Sheets fajlovima odjela (jedan fajl = jedan odjel)
  FOLDER_ODJELI_ID: '1ofGFcRe5lWPLGFXkEEl6rwONc3P0FL2B',

  // Tabela BAZA PODATAKA (ova skripta je vezana za nju)
  BAZA_PODATAKA_ID: '11ICsdNiePrfDqTKewvNWLK21edxlTkENPz24Jbz-8So',

  // Tabela SUMARIJA_KORISNICI (sheet "Korisnici")
  KORISNICI_SPREADSHEET_ID: '1Xf3t3ne7hD4SaIHh336JZju9f_XKbYdmTAaxkNW8Dm0',

  // Izlazni sheet za stanje zaliha u bazi
  OUT_SHEET_NAME: 'STANJE_ZALIHA'
};
