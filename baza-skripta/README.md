# Skripta vezana za tabelu BAZA PODATAKA (Šumarija Bihać)

Apps Script projekat "Baza podataka" (BAZA PODATAKA → Extensions → Apps Script).

## Jedino mjesto za podešavanje: `CONFIG.gs`

Svi ID-evi (folder odjela, baza, korisnici) i naziv izlaznog sheeta su samo u `CONFIG.gs`.
Nijedan drugi fajl nema tvrdo upisane ID-eve.

## Fajlovi (nazivi u editoru, bez `.gs`)

| Fajl | Šta radi |
|---|---|
| `CONFIG` | ID-evi — jedino što se mijenja za drugu šumariju |
| `Baza podataka` | `INDEKS_FULL`, `INDEKS_DODAJ_NOVE`, `INDEKS_RESET` — puni INDEKS_PRIMKA / INDEKS_OTPREMA iz fajlova odjela |
| `Meni` | `onOpen` — meni "📋 Pokreni unos" |
| `STANJE_ZALIHA` | `STANJE_ZALIHA_BIHAC` — gradi sheet STANJE_ZALIHA |
| `SPISAK KUPACA` | `DROPDOWN_KUPCI_SYNC` — dropdown kupaca u OTPREMA |
| `RADNICI I DROPDOWN` | `DODAJ_RADNIKE`, `SET_DROPDOWN_INFO_D4_D6_SVI_ODJELI` — dropdown radnika i meta polja |

## Fajlovi koje treba OBRISATI iz editora

- `STANJE ZALIHA.gs` (stari `STANJE_ZALIHA_V4`)
- `STANJE_ZALIHA-NOVO.gs` (zamijenjen fajlom `STANJE_ZALIHA`)
- `IZVOĐAČ,POSLOVOĐA,RA….gs` (zamijenjen fajlom `RADNICI I DROPDOWN`)

Dva fajla s istim imenima funkcija u jednom projektu se tiho pregazi, zato stare ne smiju ostati.

## Fajl koji još nije pregledan

- `VALIDACIJA.gs` — pošalji da provjerim da nema tvrdo upisanih ID-eva.
