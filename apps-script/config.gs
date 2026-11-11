// ========================================
// 🔧 CONFIGURATION - Konstante i postavke
// ========================================
// Ovaj fajl sadrži sve konstante i konfiguracije za Šumarija API
// VAŽNO: Ažuriraj Spreadsheet ID-ove prema svom Google Drive okruženju

// ⚠️ VAŽNO: Postavi svoje Spreadsheet ID-ove ovdje
const KORISNICI_SPREADSHEET_ID = '1Xf3t3ne7hD4SaIHh336JZju9f_XKbYdmTAaxkNW8Dm0'; // SUMARIJA_KORISNICI
const INDEX_SPREADSHEET_ID = 'POSTAVI_ID_OVDJE';     // SUMARIJA_INDEX (zastarjelo)
const BAZA_PODATAKA_ID = '11ICsdNiePrfDqTKewvNWLK21edxlTkENPz24Jbz-8So';         // BAZA PODATAKA - glavni izvor
const ODJELI_FOLDER_ID = 'POSTAVI_ID_OVDJE';                      // Folder sa svim odjelima
const IMAGES_FOLDER_ID = 'POSTAVI_ID_OVDJE';                      // Folder za temp slike (auto-brisanje 5 dana)

// Admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

// Cache TTL (Time To Live) - vrijeme zadržavanja podataka u kešu
const CACHE_TTL = 180; // 3 minute cache (180 seconds)

// ========================================
// 📊 BAZA PODATAKA - Struktura kolona
// ========================================

// INDEKS_PRIMKA kolone (A-Z, 26 kolona)
const PRIMKA_COL = {
  DATE: 0,        // A - Datum
  RADNIK: 1,      // B - Primač
  ODJEL: 2,       // C - Odjel
  RADILISTE: 3,   // D - Radilište
  IZVODJAC: 4,    // E - Izvođač
  POSLOVODJA: 5,  // F - Poslovođa
  SORT_START: 6,  // G - Početak sortimenta (F/L Č)
  SORT_END: 25,   // Z - Kraj sortimenta (UKUPNO Č+L)
  UKUPNO: 25      // Z - UKUPNO Č+L
};

// INDEKS_OTPREMA kolone (A-AA, 27 kolona)
const OTPREMA_COL = {
  DATE: 0,        // A - Datum
  OTPREMAC: 1,    // B - Otpremač
  KUPAC: 2,       // C - Kupac
  ODJEL: 3,       // D - Odjel
  RADILISTE: 4,   // E - Radilište
  IZVODJAC: 5,    // F - Izvođač
  POSLOVODJA: 6,  // G - Poslovođa
  SORT_START: 7,  // H - Početak sortimenta (F/L Č)
  SORT_END: 26,   // AA - Kraj sortimenta (UKUPNO Č+L)
  UKUPNO: 26      // AA - UKUPNO Č+L
};

// Nazivi sortimenta (20 kolona) - koristi se za oba sheeta
const SORTIMENTI_NAZIVI = [
  "F/L Č", "I Č", "II Č", "III Č", "RD", "TRUPCI Č",
  "CEL.DUGA", "CEL.CIJEPANA", "ŠKART", "Σ ČETINARI",
  "F/L L", "I L", "II L", "III L", "TRUPCI L",
  "OGR.DUGI", "OGR.CIJEPANI", "GULE", "LIŠĆARI", "UKUPNO Č+L"
];

// Dinamika po mjesecima (plan 2025) - ZASTARJELO - koristi se DINAMIKA sheet
// const DINAMIKA_2025 = [788, 2389, 6027, 5597, 6977, 6934, 7336, 6384, 6997, 7895, 5167, 2016];
