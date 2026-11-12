function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📋 Pokreni unos')
    .addItem('➕ Dodaj nove unose', 'INDEKS_DODAJ_NOVE')
    .addItem('⚠️ Dodaj sve unose - greška u unosu', 'INDEKS_FULL')
    .addSeparator()
    .addItem('📦 Stanje zaliha', 'STANJE_ZALIHA_BIHAC')
    .addSeparator()
    .addItem('🧾 Dodaj novog kupca', 'DROPDOWN_KUPCI_SYNC')
    .addItem('👷 Dodaj radnika', 'DODAJ_RADNIKE')
    .addToUi();
}
