// ============================================================
// KONFIGURACIJA ŠUMARIJE — JEDINO MJESTO ZA PODATKE SPECIFIČNE ZA ŠUMARIJU
//
// Za postavljanje aplikacije za DRUGU šumariju mijenja se SAMO ovaj fajl
// (plus Google ID-evi u apps-script/config.gs na backend strani).
//
// Ranije su ovi podaci bili razbacani po šest fajlova, a četiri vrijednosti
// su postojale u PO DVIJE KOPIJE (koordinate, godišnji plan, PLAN_YEAR,
// poslovođa→radilište) — što je bila stalna opasnost da kopije odu u
// nesklad pa Mapa i Godišnji plan pokažu različite brojeve.
//
// VAŽNO: ovaj fajl se učitava PRVI (vidi redoslijed <script> tagova u
// index.html) — svi ostali fajlovi čitaju iz window.SUMARIJA_CONFIG.
//
// Detaljno uputstvo: docs/TEMPLATE-ZA-DRUGE-SUMARIJE.md
// ============================================================
(function () {
    'use strict';

    // ---- 1. OSNOVNI PODACI ----
    var NAZIV_PUNI = 'Šumarija Bihać';   // TODO: potvrditi puni naziv
    var NAZIV_KRATKI = 'Šumarija Bihać';   // koristi se kao naziv dashboard taba

    // Lokacija kancelarije — centar mape, marker i početna tačka rute.
    var LOKACIJA = [44.8167, 15.8700];   // TODO: tačna lokacija kancelarije (približno Bihać)

    // ---- 2. BACKEND ----
    // URL Google Apps Script Web App-a (Deploy → New deployment → Web app).
    // Mijenja se pri svakom NOVOM deploymentu backenda.
    var API_URL = '';   // TODO: URL Apps Script Web App-a za Bihać (Deploy → Web app)

    // ---- 3. GOSPODARSKE JEDINICE ----
    // Nazivi se MORAJU tačno poklapati sa property "gj" u data/odjeli.geojson,
    // inače se sječa ne poveže sa poligonom na mapi.
    var GJ_LIST = [];   // TODO: nazivi gospodarskih jedinica (isti kao 'gj' u data/odjeli.geojson)
    var GJ_COLOR = {
        'Slučajni užici': '#7c3aed'
    };
    var GJ_BG = {
        'Slučajni užici': '#f5f3ff'
    };

    // ---- 4. GODINA I VERZIJA PODLOGE ----
    var PLAN_YEAR = 2026;

    // Povećati nakon svake zamjene data/odjeli.geojson — briše stari keš
    // poligona kod korisnika.
    var GEOJSON_VERSION = '1';

    // ---- 5. GODIŠNJI PLAN SJEČE ----
    // Jedan unos po odjelu. Polja:
    //   bruto/neto  — planirana drvna masa (m³)
    //   cTrupci     — trupci četinara
    //   dzgo        — celuloza/cijepano četinari (u Mapi se zove cijepanoC)
    //   lTrupci     — trupci lišćara
    //   cijepano    — ogrijev/cijepano lišćari (u Mapi se zove cijepanoL)
    var PLAN_ENTRIES = [];   // TODO: godišnji plan sječe po odjelima

    // Odjeli planirani za NAREDNU godinu (prikazuju se na mapi drugom bojom).
    var PLAN_ENTRIES_NAREDNA = [];

    // ---- 6. POSLOVOĐA → RADILIŠTE (rezervne liste) ----
    // Prava lista dolazi sa servera (INFO sheet). Ovo su rezerve ako server
    // ne odgovori. NAMJERNO su DVIJE i NISU iste:
    //   • OSNOVNI — prosta lista radilišta, imena SA dijakritikom, oba
    //     redoslijeda (ime prezime / prezime ime)
    //   • KARTA — dodatno dozvoljava ograničenje na pojedine odjele unutar
    //     radilišta (npr. Vojskova samo odjel 21), imena BEZ dijakritike
    // Ako se ujednače, izgubi se ograničenje po odjelu na karti.
    var POSLOVODJA_RADILISTA_OSNOVNI = {};
    var POSLOVODJA_RADILISTA_KARTA = {};

    // ============================================================
    // IZVEDENE VRIJEDNOSTI — ne mijenjati ručno
    // ============================================================

    // Mapa čita plan pod drugim imenima polja (istorijski razlog):
    //   dzgo → cijepanoC,  cijepano → cijepanoL
    // Izvodi se automatski iz PLAN_ENTRIES iznad, pa ne može doći do
    // neslaganja između Mape i Godišnjeg plana.
    var PLAN_ENTRIES_MAPA = PLAN_ENTRIES.map(function (e) {
        return {
            gj: e.gj, odjel: e.odjel, bruto: e.bruto, neto: e.neto,
            cTrupci: e.cTrupci, cijepanoC: e.dzgo,
            lTrupci: e.lTrupci, cijepanoL: e.cijepano
        };
    });

    window.SUMARIJA_CONFIG = {
        NAZIV_PUNI: NAZIV_PUNI,
        NAZIV_KRATKI: NAZIV_KRATKI,
        LOKACIJA: LOKACIJA,
        API_URL: API_URL,
        GJ_LIST: GJ_LIST,
        GJ_COLOR: GJ_COLOR,
        GJ_BG: GJ_BG,
        PLAN_YEAR: PLAN_YEAR,
        GEOJSON_VERSION: GEOJSON_VERSION,
        PLAN_ENTRIES: PLAN_ENTRIES,
        PLAN_ENTRIES_MAPA: PLAN_ENTRIES_MAPA,
        PLAN_ENTRIES_NAREDNA: PLAN_ENTRIES_NAREDNA,
        POSLOVODJA_RADILISTA_OSNOVNI: POSLOVODJA_RADILISTA_OSNOVNI,
        POSLOVODJA_RADILISTA_KARTA: POSLOVODJA_RADILISTA_KARTA
    };
})();
