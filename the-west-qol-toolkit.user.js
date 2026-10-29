// ==UserScript==
// @name         The West QOL Toolkit
// @namespace    local.thewest.qoltoolkit
// @version      1.3
// @homepageURL  https://github.com/hahahlolasd/TW-QOL-Toolkit
// @updateURL    https://raw.githubusercontent.com/hahahlolasd/TW-QOL-Toolkit/main/the-west-qol-toolkit.user.js
// @downloadURL  https://raw.githubusercontent.com/hahahlolasd/TW-QOL-Toolkit/main/the-west-qol-toolkit.user.js
// @description:hu  Életminőség-javító eszközök a The West-hez: piaci javítások, bővített felső sáv, vevők követése és Arany könyvelő. Minden funkció kikapcsolható a beállításokban.
// @description  Quality of life tools for The West: market fixes, an extended top bar (XP needed + money on the market), customer deal tracking and a Gold bookkeeper. Every feature can be switched off in the settings.
// @include      /^https?:\/\/[^\/]*the-west\.[a-z.]+\/game\.php.*$/
// @noframes
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const hasGM = typeof GM_getValue === 'function' && typeof GM_setValue === 'function';

  // ======================================================================================================
  // CORE: settings, shared market reader, launcher buttons
  // ======================================================================================================
  const SETTINGS_KEY = 'twQol_settings_v1';
  const FEATURES = [
    { group: 'Language', items: [
      { key: 'language', type: 'select', def: 'auto', title: 'Language of the toolkit', text: 'Choose the language of the toolkit. "Automatic" follows the language of the game.' }
    ] },
    { group: 'Market fixes', items: [
      { key: 'fixCategoryClick', title: 'Category list click', text: 'Clicking an item in the buy tabs\' category list shows its offers (no more dragging).' },
      { key: 'fixItemPaging', title: 'Offer page buttons', text: 'The page buttons below the offers of one item really change the page.' },
      { key: 'fixBidLink', title: 'Buy-now button', text: 'The price button in the auction dialog enters the immediate purchase price again.' },
      { key: 'fixSoldIcons', title: 'Sold icons', text: 'Sold offers in the Sell tab show the dollar icon again.' },
      { key: 'sellHelper', title: 'Sell dialog helper buttons', text: 'Two buttons in the sell dialog: "Sell for free" (shop price of the stack) and "Sell for market price" (enter a price per piece).' }
    ] },
    { group: 'Top bar', items: [
      { key: 'topbarXp', title: 'XP needed field', text: 'Extra field left of the coin: XP missing for the next level. Click it for today\'s XP, history and an XP target.' },
      { key: 'topbarMarket', title: 'Money on the market field', text: 'Extra field right of the coin: the money waiting for you on the market.' }
    ] },
    { group: 'Notification bar', items: [
      { key: 'notiBarAll', title: 'Show all notification buttons', text: 'The bar on the left edge (events, sales, friend requests, ...) shows all its buttons at once instead of hiding some behind the scroll arrows.' }
    ] },
    { group: 'Deals', items: [
      { key: 'dealsCustomers', title: 'Customer deals', text: 'Track product and item deals per customer.' },
      { key: 'dealsBookkeeper', title: 'Bookkeeper', text: 'Tracks who bought your Gold on the market and what each player owes.' }
    ] },
    { group: 'Prices', items: [
      { key: 'fairPrice', title: 'Market price of products', text: 'Shows the market price of a product in its details popup: your hourly rate divided by the products you find in an hour-long job. Open any job window once so the toolkit can learn your product bonus.' },
      { key: 'fairHourlyRate', type: 'number', def: 8000, title: 'Hourly farming rate', text: 'Dollars per hour used for the market price of products.' }
    ] }
  ];
  const defaults = {};
  FEATURES.forEach((g) => g.items.forEach((i) => { defaults[i.key] = i.def !== undefined ? i.def : true; }));
  const cfg = Object.assign({}, defaults);
  try {
    const raw = hasGM ? GM_getValue(SETTINGS_KEY, null) : localStorage.getItem(SETTINGS_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved) Object.keys(defaults).forEach((k) => { if (typeof saved[k] === typeof defaults[k] && (typeof saved[k] !== 'number' || (isFinite(saved[k]) && saved[k] > 0)) && (k !== 'language' || ['auto', 'en', 'hu'].indexOf(saved[k]) >= 0)) cfg[k] = saved[k]; });
  } catch (e) {}

  // ---- language: English (default) or Hungarian; "automatic" follows the language of the game ----
  const HU = {
 "Language": "Nyelv",
 "Notification bar": "Értesítési sáv",
 "Show all notification buttons": "Az összes értesítés gomb mutatása",
 "The bar on the left edge (events, sales, friend requests, ...) shows all its buttons at once instead of hiding some behind the scroll arrows.": "A bal szélén lévő sáv (események, akciók, barátkérések, ...) az összes gombját egyszerre mutatja, nem rejt el néhányat a görgetőnyilak mögé.",
 "Language of the toolkit": "A kiegészítő nyelve",
 "Choose the language of the toolkit. \"Automatic\" follows the language of the game.": "Válaszd ki a kiegészítő nyelvét. Az „Automatikus” a játék nyelvét követi.",
 "Automatic (game language)": "Automatikus (a játék nyelve)",
 "Market fixes": "Piaci javítások",
 "Category list click": "Kategórialista kattintás",
 "Clicking an item in the buy tabs' category list shows its offers (no more dragging).": "A vásárlás fülek kategórialistájában egy tárgyra kattintva megjelennek az ajánlatai (nem kell többé húzni).",
 "Offer page buttons": "Ajánlatok lapozógombjai",
 "The page buttons below the offers of one item really change the page.": "Egy tárgy ajánlatai alatti lapozógombok valóban lapoznak.",
 "Buy-now button": "Azonnali vétel gomb",
 "The price button in the auction dialog enters the immediate purchase price again.": "Az árverési ablak ár gombja újra az azonnali vételárat írja be.",
 "Sold icons": "Eladott ajánlatok ikonja",
 "Sold offers in the Sell tab show the dollar icon again.": "Az Eladnék fülön az eladott ajánlatok újra dollár ikont kapnak.",
 "Sell dialog helper buttons": "Eladási ablak segédgombjai",
 "Two buttons in the sell dialog: \"Sell for free\" (shop price of the stack) and \"Sell for market price\" (enter a price per piece).": "Két gomb az eladási ablakban: „Ingyen eladás” (a készlet boltári ára) és „Eladás piaci áron” (darabár megadása).",
 "Top bar": "Felső sáv",
 "XP needed field": "Hiányzó XP mező",
 "Extra field left of the coin: XP missing for the next level. Click it for today's XP, history and an XP target.": "Extra mező az érme bal oldalán: a következő szinthez hiányzó XP. Kattints rá a mai XP-hez, az előzményekhez és az XP-célhoz.",
 "Money on the market field": "Piacon lévő pénz mező",
 "Extra field right of the coin: the money waiting for you on the market.": "Extra mező az érme jobb oldalán: a piacon rád váró pénz.",
 "Deals": "Üzletek",
 "Customer deals": "Vevők üzletei",
 "Track product and item deals per customer.": "Termék- és tárgyüzletek követése vevőnként.",
 "Bookkeeper": "Könyvelő",
 "Tracks who bought your Gold on the market and what each player owes.": "Követi, ki vette meg az Aranyadat a piacon, és ki mennyivel tartozik.",
 "Prices": "Árak",
 "Market price of products": "Termékek piaci ára",
 "Shows the market price of a product in its details popup: your hourly rate divided by the products you find in an hour-long job. Open any job window once so the toolkit can learn your product bonus.": "Megmutatja a termék piaci árát a részletek felugró ablakban: az óránkénti bevételed osztva az egyórás munkán talált termékek számával. Nyiss meg egyszer egy munka ablakot, hogy a kiegészítő megtanulja a termékbónuszodat.",
 "Hourly farming rate": "Óránkénti gyűjtési bevétel",
 "Dollars per hour used for the market price of products.": "A termékek piaci árához használt dollár / óra érték.",
 "QOL Toolkit settings": "QOL Toolkit beállítások",
 "The West QOL Toolkit settings": "The West QOL Toolkit beállítások",
 "Changes apply after the game page is reloaded.": "A változások a játék újratöltése után lépnek életbe.",
 "Reload game": "Játék újratöltése",
 "No matching offers could be found!": "Nem található megfelelő ajánlat!",
 "Immediate purchase price": "Azonnali vételár",
 "Experience to next level.": "Tapasztalat a következő szintig.",
 "The experience points you still need to reach the next level. Click for today's gained XP, the daily history and your XP target.": "A következő szint eléréséhez még szükséges tapasztalati pont. Kattints rá a mai XP-hez, a napi előzményekhez és az XP-célodhoz.",
 "Experience points needed for the next level": "A következő szinthez szükséges tapasztalati pont",
 "Experience": "Tapasztalat",
 "Level": "Szint",
 "Total experience": "Összes tapasztalat",
 "Needed for the next level": "Szükséges a következő szinthez",
 "Gained today": "Ma szerzett",
 "Target": "Cél",
 "Every day": "Minden nap",
 "Until a date": "Egy dátumig",
 "Until": "Eddig",
 "Last days": "Elmúlt napok",
 "% of level": "% a szintből",
 "% of this level": "% ebből a szintből",
 "% of the current level": "% az aktuális szintből",
 "counted since %1 (when this script first ran today)": "számolva %1 óta (amikor a script ma először futott)",
 "Save target": "Cél mentése",
 "Clear target": "Cél törlése",
 "Enter the target as XP or as a percentage": "Add meg a célt XP-ben vagy százalékban",
 "Pick a date that is today or later": "Válassz mai vagy későbbi dátumot",
 "Target saved": "Cél elmentve",
 "No target set. Choose \"Every day\" or \"Until a date\", enter the XP (or the percentage of this level) and save.": "Nincs cél beállítva. Válaszd a „Minden nap” vagy az „Egy dátumig” lehetőséget, add meg az XP-t (vagy a szint százalékát), és mentsd el.",
 "Today": "Ma",
 "Daily target reached": "Napi cél teljesítve",
 "Still needed today": "Ma még szükséges",
 "Until %1": "Eddig: %1",
 "Target reached": "Cél teljesítve",
 "The deadline has passed": "A határidő lejárt",
 "%1 XP short": "%1 XP hiányzik",
 "%1 day left (today included)": "%1 nap van hátra (a mai is beleszámít)",
 "%1 days left (today included)": "%1 nap van hátra (a mai is beleszámít)",
 "%1 XP / day needed": "napi %1 XP szükséges",
 "(today)": "(ma)",
 "Money on the market.": "Pénz a piacon.",
 "%1 sold %2 (%3 %4), money not collected yet.": "%1 eladott %2 (%3 %4), a pénz még nincs felvéve.",
 "offer": "ajánlat",
 "offers": "ajánlat",
 "item": "tárgy",
 "items": "tárgy",
 "player": "játékos",
 "players": "játékos",
 "The game lists only the first ~100 of your offers, so this may be lower than the real sum.": "A játék csak az első ~100 ajánlatodat listázza, ezért ez alacsonyabb lehet a valódi összegnél.",
 "Not loaded yet.": "Még nincs betöltve.",
 "Updated %1. Click to refresh.": "Frissítve: %1. Kattints a frissítéshez.",
 "Earlier versions of The West Deals kept one list for all worlds. Import it (%1 customers) into %2? Choose \"No\" for a world it does not belong to.": "A The West Deals korábbi verziói egyetlen listát tároltak az összes világhoz. Importálod (%1 vevő) ide: %2? Válaszd a „Nem” gombot, ha nem ehhez a világhoz tartozik.",
 "Total:": "Összesen:",
 "unlimited": "korlátlan",
 "pcs": "db",
 "Copied to clipboard": "Vágólapra másolva",
 "Copy:": "Másolás:",
 "Could not read your notes": "Nem sikerült beolvasni a jegyzetfüzetedet",
 "Your notes are already up to date": "A jegyzetfüzeted már naprakész",
 "Saved to your notes": "Elmentve a jegyzetfüzetedbe",
 "Saving to your notes failed or was cut off (too long?)": "A jegyzetfüzetbe mentés nem sikerült vagy megcsonkult (túl hosszú?)",
 "Add your list to the end of your notes? Everything else in your notes stays unchanged.": "Hozzáadod a listát a jegyzetfüzeted végéhez? A jegyzetfüzeted többi része nem változik.",
 "No customers found in your notes": "Nem található vevő a jegyzetfüzetedben",
 "Replace your list (%1 customers, %2 lines) with the list from your notes (%3 customers, %4 lines%5)?": "Lecseréled a listádat (%1 vevő, %2 sor) a jegyzetfüzetedben lévő listára (%3 vevő, %4 sor%5)?",
 "; %1 unrecognised lines ignored": "; %1 fel nem ismert sor kihagyva",
 "Loaded from your notes": "Betöltve a jegyzetfüzetből",
 "In your bag / requested amount": "A táskádban / kért mennyiség",
 "Search item…": "Tárgy keresése…",
 "Amount (0 = %1)": "Mennyiség (0 = %1)",
 "$ / pcs": "$ / db",
 "No item found": "Nem található tárgy",
 "Pick an item from the list first": "Először válassz tárgyat a listából",
 "Add": "Hozzáad",
 "Delete \"%1\" and all their lines?": "Törlöd „%1” vevőt és az összes sorát?",
 "Open value: %1": "Nyitott érték: %1",
 "No customers yet. Add one above.": "Még nincs vevő. Adj hozzá egyet fent.",
 "copy": "másolás",
 "settled": "rendezve",
 "reopen": "újranyitás",
 "Gold bookkeeping: nothing open": "Arany könyvelés: nincs nyitott tétel",
 "Gold": "Arany",
 "%1 running": "%1 folyamatban",
 "%1 settled": "%1 rendezve",
 "Mark all %1 open Gold sales to \"%2\" (%3) as settled?": "Rendezettnek jelölöd mind a(z) %1 nyitott Arany eladást „%2” felé (%3)?",
 "The trade was reversed with this player: mark their open sales as settled": "Az üzletet visszafordítottátok ezzel a játékossal: jelöld rendezettnek a nyitott eladásait",
 "Mark the settled sales as open again": "Jelöld újra nyitottnak a rendezett eladásokat",
 " (still running, not final)": " (még fut, nem végleges)",
 "No sold Gold found yet. Press Refresh (or open the market’s Sell tab).": "Még nincs eladott Arany. Nyomd meg a Frissítés gombot (vagy nyisd meg a piac Eladnék fülét).",
 "Open: %1 from %2 %3": "Nyitott: %1 (%2 %3)",
 "(+%1 running)": "(+%1 folyamatban)",
 "The game only lists the first ~100 of your offers; collect or delete old ones to see newer sales.": "A játék csak az első ~100 ajánlatodat listázza; vedd fel vagy töröld a régieket, hogy az újabb eladásokat is lásd.",
 "Sold Gold from your own market listings, by buyer. \"Open\" is what the player still owes you when the trades are reversed.": "Az eladott Arany a saját piaci ajánlataidból, vevők szerint. A „Nyitott” az, amivel a játékos még tartozik, amikor visszafordítjátok az üzleteket.",
 "Buyer / offers": "Vevő / ajánlatok",
 "Open sum": "Nyitott összeg",
 "Refresh": "Frissítés",
 "Copy all": "Összes másolása",
 "Search player to add as customer…": "Játékos keresése vevőként hozzáadáshoz…",
 "Searching…": "Keresés…",
 "Search failed": "A keresés nem sikerült",
 "No player found": "Nem található játékos",
 "Item": "Tárgy",
 "In bag / Amount": "Táskában / Mennyiség",
 "Price": "Ár",
 "Total": "Összesen",
 "Save to notes": "Mentés jegyzetbe",
 "Load from notes": "Betöltés jegyzetből",
 "Customers": "Vevők",
 "Market price:": "Piaci ár:",
 "open any job window once to calculate it": "nyiss meg egyszer egy munka ablakot a kiszámításhoz",
 "Price per piece:": "Darabár:",
 "Sell for free": "Ingyen eladás",
 "The immediate purchase price becomes the shop price of the whole stack (shop price x quantity).": "Az azonnali vételár a teljes készlet boltári ára lesz (boltári ár x mennyiség).",
 "Sell for market price": "Eladás piaci áron",
 "Enter a price per piece: the immediate purchase price is that price x quantity, the minimum bid is the shop price x quantity.": "Add meg a darabárat: az azonnali vételár ez az ár x mennyiség, a legkisebb licit a boltári ár x mennyiség."
};
  const lang = function () {
    if (cfg.language === 'en' || cfg.language === 'hu') return cfg.language;
    const loc = String((W.Game && W.Game.locale) || '').toLowerCase();
    if (loc) return loc.indexOf('hu') === 0 ? 'hu' : 'en';
    return /\.hu$/i.test(location.hostname) ? 'hu' : 'en';
  };
  // T('English text', a, b): the text in the chosen language; %1, %2 ... are replaced by the extra arguments
  function T(text) {
    let r = text;
    if (lang() === 'hu' && Object.prototype.hasOwnProperty.call(HU, text)) r = HU[text];
    for (let i = 1; i < arguments.length; i++) r = r.split('%' + i).join(String(arguments[i]));
    return r;
  }
  const pl = (n, one, many) => T(n === 1 ? one : many);

  function saveCfg() {
    const s = JSON.stringify(cfg);
    try { hasGM ? GM_setValue(SETTINGS_KEY, s) : localStorage.setItem(SETTINGS_KEY, s); } catch (e) {}
  }

  // ---- shared reader of your own market offers: one request serves the top bar and the bookkeeper ----
  const market = (function () {
    const subs = [];
    let busy = false, last = 0, hooked = false;
    const waiting = [];
    function emit(list, capped, source) {
      subs.forEach((fn) => { try { fn(list, capped, source); } catch (e) { console.error('[The West QOL Toolkit]', e); } });
    }
    function fetch(force, cb) {
      if (cb) waiting.push(cb);
      if (busy) return;
      if (!force && Date.now() - last < 10000) { while (waiting.length) waiting.shift()(true); return; }
      busy = true;
      const done = function (ok) { busy = false; while (waiting.length) { try { waiting.shift()(ok); } catch (e) {} } };
      try {
        W.Ajax.remoteCall('building_market', 'fetch_offers', { page: 0 }, function (json) {
          last = Date.now();
          if (json.error) { done(false); return; }
          emit(json.msg.search_result || [], !!json.msg.next, 'request');
          done(true);
        }, W.MarketWindow);
      } catch (e) { done(false); }
    }
    // the market's own Sell tab loads the same list: reuse it
    function hook() {
      if (hooked) return;
      let tries = 0;
      const t = setInterval(function () {
        tries++;
        const S = W.MarketWindow && W.MarketWindow.Sell;
        if (S && typeof S.updateTable === 'function') {
          clearInterval(t);
          if (S.updateTable.__twQolMarket) { hooked = true; return; }
          const orig = S.updateTable;
          S.updateTable = function (data) {
            const r = orig.apply(this, arguments);
            try { if (Array.isArray(data)) { last = Date.now(); emit(data, false, 'sell-tab'); } } catch (e) {}
            return r;
          };
          S.updateTable.__twQolMarket = true;
          hooked = true;
        } else if (tries > 480) clearInterval(t);
      }, 500);
    }
    return {
      subscribe: function (fn) { subs.push(fn); hook(); },
      fetch: fetch
    };
  })();

  // ---- one more slot in the wooden column of icon buttons beside the portrait (drawn from the game's own picture) ----
  function addColumnSlot() {
    const cc = document.getElementById('ui_character_container');
    if (!cc || document.getElementById('twqol_strip')) return;
    const img = getComputedStyle(cc).backgroundImage;
    if (!img || img === 'none') return;
    const w = document.createElement('div');
    w.id = 'twqol_strip';
    w.style.cssText = 'position:absolute;left:143px;top:111px;width:33px;height:54px;padding:0;margin:0;pointer-events:none;';
    // two copies of a middle slot (the daily tasks slot's neighbour) and the closing edge
    [[0, 26, 85], [26, 26, 85], [52, 2, 137]].forEach(function (a) {
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;left:0;top:' + a[0] + 'px;width:33px;height:' + a[1] + 'px;padding:0;margin:0;' +
        'background-image:' + img + ';background-repeat:no-repeat;background-position:-143px -' + a[2] + 'px;';
      w.appendChild(d);
    });
    cc.insertBefore(w, cc.firstChild);   // below the game's own buttons
  }

  // ---- launcher buttons next to the character icons ----
  function makeLauncher(o) {
    if (document.getElementById(o.id)) return null;
    const cc = document.getElementById('ui_character_container');
    if (!cc) return null;
    const ROW = o.row !== undefined ? o.row : -300;
    const normalBg = 'linear-gradient(#3f2916,#755331)';
    const hoverBg = 'linear-gradient(#52361d,#8a6339)';
    const iconCss = o.icon ? o.icon + ',' : '';
    const b = document.createElement('div');
    b.id = o.id;
    b.className = 'char_links';
    b.style.top = o.top + 'px';
    b.style.backgroundPosition = '0px ' + ROW + 'px';
    if (o.row !== undefined) {   // a ready-made icon from the game's own button sprite: frame and picture in one
      b.addEventListener('mouseenter', function () { b.style.backgroundPosition = '-25px ' + ROW + 'px'; });
      b.addEventListener('mouseleave', function () { b.style.backgroundPosition = '0px ' + ROW + 'px'; });
      b.addEventListener('click', o.click);
      cc.appendChild(b);
      try { W.jQuery(b).addMousePopup(o.tip); } catch (e) { b.title = o.tip; }
      return b;
    }
    const inner = document.createElement('div');
    inner.style.cssText = 'position:absolute;left:3px;top:3px;right:3px;bottom:3px;pointer-events:none;' +
      'background-repeat:no-repeat;background-position:center,0 0;background-size:17px 17px,100% 100%;' +
      'padding:0;margin:0;box-sizing:border-box;text-align:center;font:bold 15px/19px Arial,sans-serif;color:#f1dfb5;';
    if (o.glyph) inner.textContent = o.glyph;
    inner.style.backgroundImage = o.icon ? iconCss + normalBg : normalBg;
    b.appendChild(inner);
    const setHover = function (on) {
      b.style.backgroundPosition = (on ? '-25px ' : '0px ') + ROW + 'px';
      inner.style.backgroundImage = (o.icon ? iconCss : '') + (on ? hoverBg : normalBg);
    };
    b.addEventListener('mouseenter', function () { setHover(true); });
    b.addEventListener('mouseleave', function () { setHover(false); });
    b.addEventListener('click', o.click);
    cc.appendChild(b);
    try { W.jQuery(b).addMousePopup(o.tip); } catch (e) { b.title = o.tip; }
    return b;
  }

  // ---- settings window ----
  const SET_WIN = 'twqol_settings';
  function settingsStyles() {
    if (document.getElementById('twqol_css')) return;
    const st = document.createElement('style');
    st.id = 'twqol_css';
    const P = '.' + SET_WIN;
    st.textContent =
      P + ' .qs_root{box-sizing:border-box;width:100%;height:100%;display:flex;flex-direction:column;padding:0;margin:0;}' +
      P + ' .qs_body{padding:2px 14px 6px 8px;}' +
      P + ' .qs_group{margin:12px 0 4px;padding:0 0 3px;border-bottom:1px solid #8a6a3a;font-weight:bold;font-size:13px;color:#3b2511;}' +
      P + ' .qs_group:first-child{margin-top:4px;}' +
      P + ' .qs_row{display:flex;align-items:flex-start;gap:10px;padding:5px 2px;margin:0;}' +
      P + ' .qs_cb{flex:0 0 26px;width:26px;display:flex;align-items:flex-start;justify-content:flex-start;padding:0;margin:0;}' +
      P + ' .qs_txt{flex:1 1 auto;min-width:0;line-height:1.35;padding:0;margin:0;}' +
      P + ' .qs_txt b{display:block;font-size:13px;}' +
      P + ' .qs_txt span{display:block;color:#5b4228;font-size:11px;}' +
      P + ' .qs_num{display:block;width:90px;height:20px;padding:0 4px;margin:0;text-align:right;box-sizing:border-box;border:1px solid #6b5230;background:#fff;font-size:12px;}' +
      P + ' .qs_foot{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 14px 4px 8px;' +
        'border-top:1px solid #8a6a3a;margin:0;box-sizing:border-box;min-height:34px;}' +
      P + ' .qs_note{visibility:hidden;font-size:11px;color:#8a2a1a;}' +
      P + ' .qs_foot > div{padding:0;margin:0;}';
    document.head.appendChild(st);
  }
  function openSettings() {
    const $ = W.jQuery;
    if (!W.wman || !$) return;
    settingsStyles();
    const win = W.wman.open(SET_WIN, T('QOL Toolkit settings'), 'noreload');
    try { win.setMiniTitle('QOL Toolkit'); } catch (e) {}
    try { win.setSize(480, 470); } catch (e) {}
    const root = $('<div class="qs_root"></div>');
    const body = $('<div class="qs_body"></div>');
    const note = $('<div class="qs_note"></div>').text(T('Changes apply after the game page is reloaded.'));
    const foot = $('<div class="qs_foot"></div>');
    const markChanged = function () { note.css('visibility', 'visible'); };
    FEATURES.forEach(function (g) {
      body.append($('<div class="qs_group"></div>').text(T(g.group)));
      g.items.forEach(function (it) {
        const row = $('<div class="qs_row"></div>');
        const holder = $('<div class="qs_cb"></div>');
        const txt = $('<div class="qs_txt"></div>');
        txt.append($('<b></b>').text(T(it.title))).append($('<span></span>').text(T(it.text)));
        if (it.type === 'select') {
          const sel = $('<select class="qs_num" style="width:auto;text-align:left;height:22px"></select>');
          [['auto', T('Automatic (game language)')], ['en', 'English'], ['hu', 'Magyar']].forEach(function (o) {
            sel.append($('<option></option>').attr('value', o[0]).text(o[1]));
          });
          sel.val(cfg[it.key]).on('change', function () { cfg[it.key] = this.value; saveCfg(); markChanged(); });
          txt.append(sel.css('margin-top', '4px'));
        } else if (it.type === 'number') {
          const inp = $('<input type="text" class="qs_num">').val(String(cfg[it.key]));
          inp.on('input change', function () {
            const v = parseFloat(String(this.value).replace(/[^0-9.]/g, ''));
            if (isFinite(v) && v > 0) { cfg[it.key] = v; saveCfg(); }
          });
          txt.append(inp.css('margin-top', '4px'));
        } else {
          let cb = null;
          try {
            cb = new W.west.gui.Checkbox();
            cb.setSelected(!!cfg[it.key]);
            cb.setCallback(function (v) { cfg[it.key] = !!v; saveCfg(); markChanged(); });
            holder.append(cb.getMainDiv());
          } catch (e) {
            holder.append($('<input type="checkbox">').prop('checked', !!cfg[it.key]).on('change', function () {
              cfg[it.key] = this.checked; saveCfg(); markChanged();
            }));
          }
          txt.css('cursor', 'pointer').on('click', function () { if (cb && cb.setSelected) { cb.setSelected(!cfg[it.key], true); } });
        }
        row.append(holder).append(txt);
        body.append(row);
      });
    });
    foot.append(note);
    const btnHolder = $('<div></div>');
    try {
      const btn = new W.west.gui.Button(T('Reload game'), function () { location.reload(); });
      btnHolder.append(btn.getMainDiv());
    } catch (e) {
      btnHolder.append($('<a href="#"></a>').text(T('Reload game')).on('click', function (ev) { ev.preventDefault(); location.reload(); }));
    }
    foot.append(btnHolder);
    try {
      const sp = new W.west.gui.Scrollpane();
      sp.appendContent(body);
      $(sp.getMainDiv()).css({ flex: '1 1 auto', 'min-height': 0, height: 'auto' });
      root.append(sp.getMainDiv());
    } catch (e) {
      root.append($('<div></div>').css({ flex: '1 1 auto', 'min-height': 0, overflow: 'auto' }).append(body));
    }
    root.append(foot);
    win.appendToContentPane(root);
  }
  try { if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand(T('The West QOL Toolkit settings'), function () { openSettings(); }); } catch (e) {}

  const CORE = { W, cfg, market, makeLauncher, addColumnSlot, openSettings };

  // ======================================================================================================
  // MODULE: market fixes
  // ======================================================================================================
  function moduleMarketFixer(CORE) {
  const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // FIX 1: market buy tabs (category list on the left): clicking an item in the category list did nothing, only dragging it onto the
  // offer table worked. The game binds the click as  function(){ clickHandler4Accordion(true,false) }  which loses
  // `this`, so the clicked item is never known. We do what a drag & drop does: mark the clicked row as the dragged
  // element and fire the offer table's own drop handler (it knows the correct search direction).
  function fixAccordionClick($) {
    $(document).on('click.twMarketFixer', '.marketplace p.accordion_contentRow', function () {
      const row = $(this);
      const pane = row.closest('[class*="marketplace-"]');
      const zone = pane.find('.dnd_dropzone').first();
      const opts = zone.data('drop_options');
      if (!zone.length || !opts || typeof opts.drop !== 'function') return;
      $('.dnd_dragElem').removeClass('dnd_dragElem');
      row.addClass('dnd_dragElem');
      try { opts.drop.call(zone[0]); } finally { row.removeClass('dnd_dragElem'); }
    });
  }

  // FIX 2: page buttons below the offers of ONE item (after clicking e.g. "Wonder tincture") always showed page 1.
  // The game's page bar tells its callback "next" / "prev" / "first", but for item searches the callback is
  // function(){ searchOffersByItemId(navi, ...) } which ignores that and always requests the first page.
  // We take over those page bar clicks: same request the game sends, with the right page number.
  function fixItemPagebar($) {
    const PB = W.west && W.west.gui && W.west.gui.Pagebar;
    if (!PB || PB.prototype.__twMarketFixer) return;
    PB.prototype.__twMarketFixer = true;
    const orig = PB.prototype.btnClick;
    PB.prototype.btnClick = function (dir) {
      try {
        const bar = this;
        const inMarket = bar.relative && typeof bar.callback === 'function' && bar.callback.length === 0 &&
          bar.divMain && $(bar.divMain).closest('.marketplace').length;
        if (inMarket) {
          const pane = $(bar.divMain).closest('[class*="marketplace-"]');
          const trows = pane.find('div.trows').first();
          const st = trows.data() || {};
          if (st.item_id > 0 && W.MarketWindow.buyTable) {
            const cur = parseInt(W.MarketWindow.Buy.currentPage, 10) || 1;
            const page = dir === 'next' ? cur + 1 : dir === 'prev' ? Math.max(1, cur - 1) : 1;
            if (dir === 'prev' && cur <= 1) return;
            const req = {
              item_id: st.item_id, page: page, nav: dir === 'prev' || dir === 'next' ? dir : 'first',
              sort: st.sort || 'bid', order: st.order || 'asc',
              direction_sell: st.direction_sell, direction_buy: st.direction_buy
            };
            W.Ajax.remoteCall('building_market', 'search', req, function (json) {
              if (json.error) return new W.UserMessage(json.msg, W.UserMessage.TYPE_ERROR).show();
              if (!json.msg.search_result.length) {
                return new W.UserMessage(T('No matching offers could be found!'), W.UserMessage.TYPE_ERROR).show();
              }
              trows.removeData().data(req);
              W.MarketWindow.Buy.currentPage = page;
              W.MarketWindow.Buy.updateTable(json.msg.search_result);
              bar.update(page, null, !!json.msg.next);
            }, W.MarketWindow);
            return;
          }
        }
      } catch (e) { console.error('[Market Fixer] page bar', e); }
      return orig.apply(this, arguments);
    };
  }

  // FIX 3: bid window ("Purchase item at auction"): the small link behind the bid field, e.g. "(900)", used to fill in the
  // immediate purchase price. After the update it fills in the minimum bid instead, which is easy to click by mistake.
  // We read the two price lines from the window text and point the link back to the immediate purchase price.
  function fixBidLink($) {
    // The dialog lists the immediate purchase price first and the minimum bid second; the currency sign sits before
    // or after the number depending on the language ("$ 2.000.000" / "660 $"). The offer line (with the link) is skipped.
    const num = (txt) => {
      if (txt.indexOf('$') < 0 || txt.indexOf('(') >= 0) return null;
      const m = String(txt).match(/\d[\d.,]*/);
      return m ? m[0] : null;
    };
    const digits = (v) => String(v).replace(/[^\d]/g, '');
    const patch = function (box) {
      box = $(box);
      if (box.data('twFixed')) return;
      const link = box.children('span.linkstyle').last();
      if (!link.length) return;
      box.data('twFixed', true);
      const html = box.html().split(/<br\s*\/?>/i).map((l) => $('<div>').html(l).text().trim());
      const prices = html.map(num).filter(Boolean);
      if (prices.length < 2) return; // only one price: the link already holds the immediate purchase price
      const linkVal = digits(link.text());
      const immediate = prices[0];
      if (linkVal !== digits(prices[1]) || digits(immediate) === linkVal) return;
      link.off('click').text('(' + immediate + ')').attr('title', T('Immediate purchase price'))
        .on('click', function () { $('#market_offer_money', box).val(digits(immediate)); });
    };
    new MutationObserver(function (muts) {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.matches && n.matches('.marketBid_messageBox')) patch(n);
          else if (n.querySelector) { const b = n.querySelector('.marketBid_messageBox'); if (b) patch(b); }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  // FIX 4: your own listings tab: sold items (money waiting) showed the black "Collect item" icon.
  // The server no longer sends a `direction` field with your own offers; the game then treats every ended offer as
  // one whose ITEM is waiting. We fill in direction = 'SELL' before the table is drawn (so the game itself creates the
  // "collect money" button) and show the dollar icon on it. Unsold, ended offers keep the "Collect item" icon.
  const DOLLAR = 'https://westen.innogamescdn.com/images/icons/bid.png';
  function fixSellIcons($) {
    const S = W.MarketWindow && W.MarketWindow.Sell;
    if (!S || S.__twMarketFixer) return;
    S.__twMarketFixer = true;
    const orig = S.updateTable;
    S.updateTable = function (data) {
      try { if (Array.isArray(data)) data.forEach(function (o) { if (o && !o.direction) o.direction = 'SELL'; }); } catch (e) {}
      const res = orig.apply(this, arguments);
      try {
        $('div.mps_pickup img[id^="mps_fetchMoney_"]', W.MarketWindow.DOM).each(function () {
          if (this.src !== DOLLAR) { this.src = DOLLAR; this.style.height = '16px'; this.style.width = '12px'; }
        });
      } catch (e) {}
      return res;
    };
  }

  function start() {
    let tries = 0;
    const timer = setInterval(function () {
      tries++;
      if (W.jQuery && W.MarketWindow && W.Ajax) {
        clearInterval(timer);
        if (cfg.fixCategoryClick) fixAccordionClick(W.jQuery);
        if (cfg.fixItemPaging) fixItemPagebar(W.jQuery);
        if (cfg.fixBidLink) fixBidLink(W.jQuery);
        if (cfg.fixSoldIcons) fixSellIcons(W.jQuery);
      } else if (tries > 240) {
        clearInterval(timer);
      }
    }, 500);
  }
  return start;

  }

  // ======================================================================================================
  // MODULE: top bar
  // ======================================================================================================
  function moduleTopBar(CORE) {

  const XP_ID = 'tw_topbar_xp';

  // The game draws the top bar as one picture (bar.png, 729x44) with the fields placed on top of it:
  //   left of the coin: bonds 59..189, nuggets 195..325      right of the coin: cash 411..541, bank 547..677
  // This feature makes the bar wider so there can be three fields on each side of the coin:
  //   bonds | nuggets | XP needed for the next level  [coin]  cash | bank | money waiting on the market
  // (each of the two new fields can be switched off in the settings)
  // The new bar is built from slices of the game's own picture, so it looks exactly like the original.
  const XP_X = 331;       // the XP field (left of the coin)
  const SHIFT = 136;      // one field plus its 6px gap

  const thousands = () => {
    const t = (document.getElementById('deposit') || {}).textContent || '';
    return t.indexOf(',') >= 0 && t.indexOf('.') < 0 ? ',' : '.';
  };
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, thousands());

  function needed() {
    try {
      const C = W.Character;
      const n = C.getMaxExperience() - C.experience;
      return isFinite(n) && n >= 0 ? n : null;
    } catch (e) { return null; }
  }

  const div = (s) => { const d = document.createElement('div'); d.style.cssText = s; return d; };
  // The game gives every div inside the bar padding (25px / 10px), so our boxes always set their own.
  const BOX = 'position:absolute;padding:0;margin:0;box-sizing:content-box;';

  function place(id, left, width, padL, padR, top) {
    const e = document.getElementById(id);
    if (!e) return;
    if (top != null) e.style.setProperty('top', top + 'px', 'important');
    e.style.setProperty('left', left + 'px', 'important');
    e.style.setProperty('width', width + 'px', 'important');
    e.style.setProperty('padding-left', padL + 'px', 'important');
    e.style.setProperty('padding-right', padR + 'px', 'important');
  }

  // a slice of the game's bar picture: copies picture columns srcX..srcX+w and shows them at x
  function slice(url, srcX, w, x) {
    return div(BOX + 'left:' + x + 'px;top:0;width:' + w + 'px;height:44px;pointer-events:none;' +
      'background:' + url + ' -' + srcX + 'px 0 no-repeat;');
  }

  // an extra field: wood copied from inside the field covers the icon of the copied field, then our own label
  function extraField(id, x, url, coverSrcX, label) {
    const box = div(BOX + 'top:0;height:44px;left:' + x + 'px;width:130px;cursor:pointer;');
    box.id = id;
    const cover = div(BOX + 'left:4px;top:4px;width:44px;height:23px;' +
      'background:' + url + ' -' + coverSrcX + 'px -4px no-repeat;');
    const lab = div(BOX + 'left:8px;top:5px;width:24px;height:21px;text-align:center;' +
      'font:bold 12px/21px Arial,Verdana,sans-serif;color:rgb(248,197,124);text-shadow:0 1px 1px #000;');
    if (label) lab.textContent = label;
    // same box as the game's own fields (content-box: 94px + 25px / 10px padding)
    const val = div(BOX + 'left:1px;top:5px;width:94px;height:21px;padding:0 10px 0 25px;text-align:right;' +
      'color:rgb(248,197,124);font:17.3333px/normal Arial,Verdana,sans-serif;');
    val.id = id + '_val';
    box.append(cover, lab, val);
    return { box, lab, val };
  }

  function build(bar) {
    const L = cfg.topbarXp ? SHIFT : 0;         // room added left of the coin
    const R = cfg.topbarMarket ? SHIFT : 0;     // room added at the right end
    if (!L && !R) return true;                  // nothing to change
    const url = getComputedStyle(bar).backgroundImage; // bar.png with the game's own cache parameter
    if (!url || url === 'none') return false;

    if (L) {
      // the earlier "XP to Level" script (if it is still enabled) would add its own XP field: hide that one
      const st = document.createElement('style');
      st.textContent = '#tw_xp_slot{display:none!important}';
      document.head.appendChild(st);
    }

    // 1. the wider bar, drawn from slices of the original picture (source x -> new x). Without the new fields
    //    the slices add up to the original bar.
    const parts = [slice(url, 0, 325, 0)];                       // left cap, bonds, nuggets
    if (L) parts.push(slice(url, 189, 136, 325));                // gap + a field: the XP field
    parts.push(slice(url, 325, 86, 325 + L));                    // coin
    parts.push(slice(url, 411, 130, 411 + L));                   // cash
    parts.push(slice(url, 541, 136, 541 + L));                   // gap + bank
    if (R) parts.push(slice(url, 541, 136, 677 + L));            // gap + a field: the market money field
    parts.push(slice(url, 677, 52, 677 + L + R));                // right cap
    parts.reverse().forEach((d) => bar.insertBefore(d, bar.firstChild));
    bar.style.setProperty('width', (729 + L + R) + 'px');
    bar.style.setProperty('margin-left', -(365 + L) + 'px');     // the coin stays where it was
    bar.style.setProperty('background-image', 'none');

    // 2. the game's own elements to their places (bonds and nuggets stay where the game has them)
    if (L) {
      const setLeft = (id, left) => { const e = document.getElementById(id); if (e) e.style.setProperty('left', left + 'px', 'important'); };
      setLeft('buy', 328 + L);        // coin button
      setLeft('money', 412 + L);      // cash
      setLeft('deposit', 548 + L);    // bank
    }

    // 3. XP field (copy of the nugget field: its nugget icon is covered)
    if (L) {
      const xp = extraField(XP_ID, XP_X, url, 270, 'XP');
      xp.box.addEventListener('click', toggleXpWindow);
      bar.appendChild(xp.box);
      try {
        W.jQuery(xp.box).addMousePopup(
          '<div style="max-width:250px"><span class="text_bold teaser_headline">' + T('Experience to next level.') + '</span> ' +
          '<div class="teaser_content">' + T("The experience points you still need to reach the next level. Click for today's gained XP, the daily history and your XP target.") + '</div></div>');
      } catch (e) { xp.box.title = T('Experience points needed for the next level'); }
    }

    // 4. money on the market field (copy of the bank field: its icon is covered)
    if (R) {
      const mkf = extraField(MK_ID, 683 + L, url, 617, null);
      mkf.lab.style.backgroundImage = 'url("' + (W.to_cdn ? W.to_cdn('images/icons/bid.png') : '/images/icons/bid.png') + '")';
      mkf.lab.style.backgroundRepeat = 'no-repeat';
      mkf.lab.style.backgroundPosition = 'center';
      mkf.lab.style.backgroundSize = 'auto 16px';
      mkf.box.addEventListener('click', function () { mkFetch(true); });
      bar.appendChild(mkf.box);
      try { W.jQuery(mkf.box).addMousePopup(mkTip()); } catch (e) {}
      mkPaint(true);
    }
    return true;
  }

  // ---------- XP tracking: gained today, daily history, target ----------
  const hasGM = typeof GM_getValue === 'function' && typeof GM_setValue === 'function';
  const readStore = (k) => { try { return hasGM ? GM_getValue(k, null) : localStorage.getItem(k); } catch (e) { return null; } };
  const writeStore = (k, v) => { try { hasGM ? GM_setValue(k, v) : localStorage.setItem(k, v); } catch (e) {} };
  const pad2 = (n) => String(n).padStart(2, '0');
  const dayStr = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  const dayNum = (s) => { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(s || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 : NaN; };

  // One record per world and account (the experience points are cumulative, so a gain is simply a difference):
  //   day / base / last   the current day, the XP at its start, the XP last seen
  //   days                finished days -> XP gained
  //   target              { mode: 'daily' | 'date', value (XP), until ('YYYY-MM-DD'), sinceXp }
  let XKEY = null;
  let xs = null;
  const saveXs = () => { if (XKEY && xs) writeStore(XKEY, JSON.stringify(xs)); };

  function loadXs() {
    XKEY = 'twTopBar_xp_v1_' + location.hostname + '_' + W.Character.playerId;
    let s = null;
    try { s = JSON.parse(readStore(XKEY)); } catch (e) {}
    xs = s && typeof s === 'object' ? s : {};
    if (!xs.days || typeof xs.days !== 'object') xs.days = {};
  }

  const xpNow = () => { try { const x = W.Character.experience; return typeof x === 'number' && isFinite(x) ? x : null; } catch (e) { return null; } };
  const lvSpan = () => { try { return W.Character.getMaxExperience() - W.Character.getMinExperience(); } catch (e) { return 0; } };

  function trackXp() {
    const x = xpNow();
    if (x === null || !xs) return;
    const today = dayStr(new Date());
    let dirty = false;
    if (!xs.day || typeof xs.base !== 'number') {
      xs.day = today; xs.base = x; xs.last = x; xs.startedAt = Date.now(); dirty = true;
    } else if (xs.day !== today) {
      xs.days[xs.day] = Math.max(0, xs.last - xs.base);
      xs.day = today;
      xs.base = xs.last; // XP earned while the game was closed counts for the day you open it again
      xs.startedAt = null;
      dirty = true;
      const keys = Object.keys(xs.days).sort();
      while (keys.length > 60) delete xs.days[keys.shift()];
    }
    if (xs.last !== x) { xs.last = x; dirty = true; }
    if (dirty) saveXs();
  }

  const gainedToday = () => { const x = xpNow(); return x === null || !xs ? 0 : Math.max(0, x - xs.base); };

  function say(t) { try { new W.UserMessage(t, W.UserMessage.TYPE_SUCCESS).show(); } catch (e) {} }
  function warn(t) { try { new W.UserMessage(t, W.UserMessage.TYPE_ERROR).show(); } catch (e) {} }

  // progress towards the target (null when none is set)
  function targetInfo() {
    const t = xs && xs.target;
    const x = xpNow();
    if (!t || !(t.value > 0) || x === null) return null;
    if (t.mode === 'date') {
      const left = dayNum(t.until) - dayNum(dayStr(new Date())) + 1; // today counts
      const gained = Math.max(0, x - (t.sinceXp == null ? x : t.sinceXp));
      return { mode: 'date', gained, goal: t.value, until: t.until, daysLeft: left,
        perDay: left > 0 ? Math.max(0, t.value - gained) / left : 0 };
    }
    return { mode: 'daily', gained: gainedToday(), goal: t.value };
  }

  // ---------- XP window ----------
  const XPW = 'tw_xp_win';
  let xpUi = null;

  function addXpStyles() {
    const st = document.createElement('style');
    st.textContent = `
      .${XPW} .xpw{box-sizing:border-box;width:100%;height:100%;display:flex;flex-direction:column;padding:.5% 1%}
      .${XPW} .xp_sec{margin:0 0 10px;padding:6px 8px;border:1px solid #8c6a37;border-radius:3px;background:rgba(255,235,190,.30)}
      .${XPW} .xp_two{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
      .${XPW} .xp_two .xp_sec{margin:0}
      .${XPW} .xp_h{font-weight:bold;margin:0 0 5px;padding-bottom:3px;border-bottom:1px solid rgba(140,106,55,.45)}
      .${XPW} .xp_kv{display:flex;justify-content:space-between;padding:1px 0}
      .${XPW} .xp_big{font-size:22px;font-weight:bold}
      .${XPW} .xp_sub{opacity:.8;font-size:11px;margin-top:2px}
      .${XPW} .xp_bar{position:relative;height:16px;margin:3px 0 6px;border:1px solid #5a3d16;background:rgba(80,50,20,.35)}
      .${XPW} .xp_bar .fill{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(#d9a24a,#9a6a22)}
      .${XPW} .xp_bar .fill.done{background:linear-gradient(#7fbf5a,#3f7f26)}
      .${XPW} .xp_bar .txt{position:absolute;left:0;right:0;top:0;line-height:16px;text-align:center;font-size:11px;font-weight:bold;color:#fff;text-shadow:0 1px 1px #000}
      .${XPW} .xp_tabs{display:flex;gap:6px;margin-bottom:6px}
      .${XPW} .xp_tab{padding:2px 10px;border:1px solid #8c6a37;border-radius:3px;cursor:pointer;background:rgba(255,235,190,.35)}
      .${XPW} .xp_tab.active{background:rgba(110,75,30,.45);color:#fff;text-shadow:0 1px 1px #000;font-weight:bold}
      .${XPW} .xp_row{display:flex;align-items:center;gap:8px;margin:4px 0;flex-wrap:wrap}
      .${XPW} .xp_row .lbl{opacity:.85}
      .${XPW} .xp_fluid{display:block;min-width:0;box-sizing:border-box}
      .${XPW} .xp_fluid .tw2gui_textfield{display:block;width:100%;box-sizing:border-box}
      .${XPW} .xp_fluid .tw2gui_textfield>span{display:block;width:100%;box-sizing:border-box}
      .${XPW} .xp_fluid input{box-sizing:content-box!important;width:calc(100% - 8px)!important}
      .${XPW} .xp_date{height:26px;box-sizing:border-box;border:1px solid #5a3d16;background:#e8d8b2;color:#3a2610;padding:0 4px;font:inherit}
      .${XPW} .xp_hist{display:grid;grid-template-columns:1fr auto auto;column-gap:14px;row-gap:2px}
      .${XPW} .xp_hist .r{text-align:right}
      .${XPW} .xp_ok{color:#2c6b1f;font-weight:bold}
    `;
    document.head.appendChild(st);
  }

  function toggleXpWindow() {
    const existing = document.querySelector('.tw2gui_window.' + XPW);
    if (existing) {
      try { xpUi.win.destroy(); } catch (e) { existing.remove(); }
      xpUi = null;
      return;
    }
    const $ = W.jQuery;
    const win = W.wman.open(XPW, T('Experience'), 'noreload');
    try { win.setMiniTitle(T('Experience')); } catch (e) {}
    try { win.setSize(560, 430); } catch (e) {}
    try { win.setMinSize(500, 340); } catch (e) {}
    try { win.setMaxSize(740, 430); } catch (e) {} // the parchment picture behind the content is that big
    try { win.setResizeable(true); } catch (e) {}

    const tf = function (placeholder, width, numeric) {
      const t = new W.west.gui.Textfield('xp_' + Math.random().toString(36).slice(2, 8));
      try { if (placeholder) t.setPlaceholder(placeholder); } catch (e) {}
      try { if (numeric) t.onlyNumeric(); } catch (e) {}
      $(t.getMainDiv()).addClass('xp_fluid').css('width', width);
      return t;
    };
    const tfIn = (t) => $(t.getMainDiv()).find('input');
    const btn = (caption, fn) => { const b = new W.west.gui.Button(caption, fn); return $(b.getMainDiv ? b.getMainDiv() : b.divMain); };

    const root = $('<div class="xpw"></div>');
    const scroll = new W.west.gui.Scrollpane();
    $(scroll.getMainDiv()).css({ flex: '1 1 auto', 'min-height': 0, height: 'auto' });
    root.append($(scroll.getMainDiv()));
    const c = $('<div class="xp_content"></div>');
    $(scroll.getContentPane()).append(c);

    c.html(
      '<div class="xp_two"><div class="xp_sec"><div class="xp_h">' + T('Level') + ' <span data-k="lv"></span></div>' +
        '<div class="xp_bar"><div class="fill" data-k="lvfill"></div><span class="txt" data-k="lvtxt"></span></div>' +
        '<div class="xp_kv"><span>' + T('Total experience') + '</span><b data-k="tot"></b></div>' +
        '<div class="xp_kv"><span>' + T('Needed for the next level') + '</span><b data-k="need"></b></div></div>' +
      '<div class="xp_sec"><div class="xp_h">' + T('Gained today') + '</div>' +
        '<div class="xp_big" data-k="today"></div><div class="xp_sub" data-k="todaysub"></div></div></div>' +
      '<div class="xp_sec"><div class="xp_h">' + T('Target') + '</div>' +
        '<div class="xp_tabs"><span class="xp_tab" data-m="daily">' + T('Every day') + '</span><span class="xp_tab" data-m="date">' + T('Until a date') + '</span></div>' +
        '<div class="xp_row" data-k="form"></div>' +
        '<div class="xp_row" data-k="dateRow"><span class="lbl">' + T('Until') + '</span></div>' +
        '<div class="xp_row" data-k="btns"></div>' +
        '<div class="xp_bar" data-k="tbar" style="display:none"><div class="fill" data-k="tfill"></div><span class="txt" data-k="ttxt"></span></div>' +
        '<div data-k="tinfo"></div></div>' +
      '<div class="xp_sec"><div class="xp_h">' + T('Last days') + '</div><div class="xp_hist" data-k="hist"></div></div>'
    );
    const k = (n) => c.find('[data-k="' + n + '"]');

    // target form: XP value and percent of the current level stay linked
    const valTf = tf('XP', '34%', true);
    const pctTf = tf(T('% of level'), '20%', false);
    const dateIn = $('<input type="date" class="xp_date">').attr('min', dayStr(new Date()));
    k('form').append($('<span class="lbl"></span>').text(T('Target')), $(valTf.getMainDiv()), '<span class="lbl">XP =</span>', $(pctTf.getMainDiv()), $('<span class="lbl"></span>').text(T('% of this level')));
    k('dateRow').append(dateIn);

    let mode = (xs.target && xs.target.mode) || 'daily';
    const showMode = function () {
      c.find('.xp_tab').each(function () { $(this).toggleClass('active', $(this).attr('data-m') === mode); });
      k('dateRow').toggle(mode === 'date');
    };
    c.find('.xp_tab').on('click', function () { mode = $(this).attr('data-m'); showMode(); });
    showMode();

    const digits = (s) => parseInt(String(s || '').replace(/\D/g, ''), 10) || 0;
    const decimal = (s) => { const n = parseFloat(String(s || '').replace(',', '.')); return isFinite(n) && n > 0 ? n : 0; };
    tfIn(valTf).on('keyup', function () {
      const sp = lvSpan();
      const v = digits(tfIn(valTf).val());
      tfIn(pctTf).val(v && sp ? (Math.round(v / sp * 1000) / 10).toString() : '');
    });
    tfIn(pctTf).on('keyup', function () {
      const sp = lvSpan();
      const p = decimal(tfIn(pctTf).val());
      tfIn(valTf).val(p && sp ? String(Math.round(p / 100 * sp)) : '');
    });
    if (xs.target && xs.target.value > 0) {
      tfIn(valTf).val(String(xs.target.value));
      tfIn(valTf).trigger('keyup');
      if (xs.target.until) dateIn.val(xs.target.until);
    }

    k('btns').append(
      btn(T('Save target'), function () {
        const v = digits(tfIn(valTf).val());
        if (!v) { warn(T('Enter the target as XP or as a percentage')); return; }
        const t = { mode, value: v };
        if (mode === 'date') {
          const until = dateIn.val();
          if (!(dayNum(until) >= dayNum(dayStr(new Date())))) { warn(T('Pick a date that is today or later')); return; }
          t.until = until;
          t.sinceXp = xpNow();
        }
        xs.target = t;
        saveXs();
        say(T('Target saved'));
        refreshXpWindow();
      }),
      btn(T('Clear target'), function () {
        delete xs.target;
        saveXs();
        tfIn(valTf).val(''); tfIn(pctTf).val(''); dateIn.val('');
        refreshXpWindow();
      })
    );

    win.appendToContentPane(root);
    xpUi = { win, k };
    refreshXpWindow();
  }

  function refreshXpWindow() {
    if (!xpUi || !document.querySelector('.tw2gui_window.' + XPW)) { xpUi = null; return; }
    const k = xpUi.k;
    const x = xpNow();
    if (x === null) return;
    const C = W.Character;
    let min = 0, max = 0;
    try { min = C.getMinExperience(); max = C.getMaxExperience(); } catch (e) {}
    const sp = max - min;
    const lvPct = sp > 0 ? Math.min(100, Math.max(0, (x - min) / sp * 100)) : 0;
    const pct = (a, b) => (b > 0 ? Math.round(a / b * 1000) / 10 : 0);

    k('lv').text(C.level != null ? C.level : '');
    k('lvfill').css('width', lvPct + '%');
    k('lvtxt').text((Math.round(lvPct * 10) / 10) + T('% of this level'));
    k('tot').text(fmt(x));
    k('need').text(fmt(Math.max(0, max - x)));

    const g = gainedToday();
    k('today').text('+' + fmt(g) + ' XP');
    let sub = (sp > 0 ? (Math.round(g / sp * 1000) / 10) + T('% of the current level') : '');
    if (xs.startedAt) sub += (sub ? ' · ' : '') + T('counted since %1 (when this script first ran today)', pad2(new Date(xs.startedAt).getHours()) + ':' + pad2(new Date(xs.startedAt).getMinutes()));
    k('todaysub').text(sub);

    const t = targetInfo();
    if (!t) {
      k('tbar').hide();
      k('tinfo').html($('<div class="xp_sub"></div>').text(T('No target set. Choose "Every day" or "Until a date", enter the XP (or the percentage of this level) and save.')));
    } else {
      const p = pct(t.gained, t.goal);
      const done = t.gained >= t.goal;
      k('tbar').show();
      k('tfill').css('width', Math.min(100, p) + '%').toggleClass('done', done);
      k('ttxt').text(p + '%');
      let html;
      if (t.mode === 'daily') {
        html = '<div class="xp_kv"><span>' + T('Today') + '</span><b>+' + fmt(t.gained) + ' / ' + fmt(t.goal) + ' XP</b></div>' +
          '<div class="xp_kv"><span>' + T(done ? 'Daily target reached' : 'Still needed today') + '</span><b class="' + (done ? 'xp_ok' : '') + '">' +
          (done ? '✓' : fmt(t.goal - t.gained) + ' XP') + '</b></div>';
      } else {
        html = '<div class="xp_kv"><span>' + T('Until %1', t.until) + '</span><b>+' + fmt(t.gained) + ' / ' + fmt(t.goal) + ' XP</b></div>';
        if (done) html += '<div class="xp_kv"><span>' + T('Target reached') + '</span><b class="xp_ok">✓</b></div>';
        else if (t.daysLeft <= 0) html += '<div class="xp_kv"><span>' + T('The deadline has passed') + '</span><b>' + T('%1 XP short', fmt(t.goal - t.gained)) + '</b></div>';
        else html += '<div class="xp_kv"><span>' + T(t.daysLeft === 1 ? '%1 day left (today included)' : '%1 days left (today included)', t.daysLeft) + '</span><b>' + T('%1 XP / day needed', fmt(t.perDay)) + '</b></div>';
      }
      k('tinfo').html(html);
    }

    // history: today first, then the finished days; "ok" when the daily target was reached
    const daily = xs.target && xs.target.mode === 'daily' && xs.target.value > 0 ? xs.target.value : 0;
    const rows = [[xs.day, g, true]].concat(Object.keys(xs.days).sort().reverse().slice(0, 7).map((d) => [d, xs.days[d], false]));
    k('hist').html(rows.map(function (r) {
      const okc = daily && r[1] >= daily ? ' xp_ok' : '';
      return '<span>' + r[0] + (r[2] ? ' ' + T('(today)') : '') + '</span><span class="r' + okc + '">+' + fmt(r[1]) + ' XP</span>' +
        '<span class="r' + okc + '">' + (daily ? pct(r[1], daily) + '%' : '') + '</span>';
    }).join(''));
  }

  // The game's cash / bank fields count from the old to the new number (west.common.countTo: 1 second, "swing"
  // easing, whole numbers). The XP field does the same; a new change takes over from the number shown right now.
  let shown = null;   // last value we have set
  let anim = null;    // running count animation
  const fmtNum = (n) => { try { return typeof W.format_money === 'function' ? W.format_money(n) : fmt(n); } catch (e) { return fmt(n); } };
  function countXp(el, to) {
    const $ = W.jQuery;
    const from = parseInt(String(el.textContent).replace(/\D/g, ''), 10);
    if (!isFinite(from)) { el.textContent = fmtNum(to); return; }
    if (anim) anim.stop(true);
    anim = $({ val: from });
    anim.animate({ val: to }, {
      duration: 1000,
      easing: 'swing',
      step: function () { el.textContent = fmtNum(Math.ceil(this.val)); },
      complete: function () { el.textContent = fmtNum(to); }
    });
  }

  function update() {
    const bar = document.getElementById('ui_topbar');
    if (!bar) return;
    if (!bar.getAttribute('data-twqol')) { if (!build(bar)) return; bar.setAttribute('data-twqol', '1'); }
    if (!cfg.topbarXp) return;
    const n = needed();
    const val = document.getElementById(XP_ID + '_val');
    if (val) {
      if (n === null || shown === null) {
        const text = n === null ? '-' : fmt(n);
        if (val.textContent !== text) val.textContent = text;   // first value: no animation
      } else if (n !== shown) {
        countXp(val, n);                                        // changed: count like the cash / bank fields
      }
      shown = n;
    }
    if (xs) { trackXp(); refreshXpWindow(); }
  }

  // ---------- money waiting on the market ----------
  // The last field on the right shows the money you have on the market: offers of yours that are sold (ended with a bid, or bought at the
  // immediate price) and whose money has not been collected yet. Players keep money there instead of in the bank.
  const MK_ID = 'tw_topbar_market';
  const MK_REFRESH_MS = 5 * 60 * 1000;
  let mk = { sum: 0, count: 0, items: 0, capped: false, at: 0, loaded: false };
  let mkShown = null, mkAnim = null, mkBusy = false;

  // sold = the money is waiting on the market
  function mkRead(list, capped) {
    let sum = 0, count = 0, items = 0;
    (list || []).forEach(function (o) {
      if (!o || !(o.current_bid > 0) || o.fetched_money) return;
      const sold = o.auction_ends_in <= 0 || (o.max_price > 0 && o.current_bid >= o.max_price);
      if (!sold) return;
      sum += o.current_bid; count++; items += o.item_count || 1;
    });
    mk = { sum: sum, count: count, items: items, capped: !!capped, at: Date.now(), loaded: true };
    mkPaint();
  }

  // the shared market reader asks the game for your offers (and also reads them whenever the market's Sell tab loads them)
  function mkFetch(force) { CORE.market.fetch(force); }

  function mkTip() {
    const when = mk.at ? new Date(mk.at).toLocaleTimeString() : '-';
    return '<div style="max-width:260px"><span class="text_bold teaser_headline">' + T('Money on the market.') + '</span>' +
      '<div class="teaser_content">' + (mk.loaded
        ? T('%1 sold %2 (%3 %4), money not collected yet.', mk.count, pl(mk.count, 'offer', 'offers'), mk.items, pl(mk.items, 'item', 'items')) +
          (mk.capped ? '<br>' + T('The game lists only the first ~100 of your offers, so this may be lower than the real sum.') : '')
        : T('Not loaded yet.')) +
      '<br><i>' + T('Updated %1. Click to refresh.', when) + '</i></div></div>';
  }

  function mkCount(el, to) {
    const $ = W.jQuery;
    const from = parseInt(String(el.textContent).replace(/\D/g, ''), 10);
    if (!isFinite(from)) { el.textContent = fmtNum(to); return; }
    if (mkAnim) mkAnim.stop(true);
    mkAnim = $({ val: from });
    mkAnim.animate({ val: to }, { duration: 1000, easing: 'swing',
      step: function () { el.textContent = fmtNum(Math.ceil(this.val)); },
      complete: function () { el.textContent = fmtNum(to); } });
  }

  function mkPaint(fresh) {
    const box = document.getElementById(MK_ID);
    const val = document.getElementById(MK_ID + '_val');
    if (!box || !val) return;
    if (!mk.loaded) { if (!val.textContent) val.textContent = '-'; return; }
    if (fresh || mkShown === null) val.textContent = fmtNum(mk.sum);
    else if (mkShown !== mk.sum) mkCount(val, mk.sum);
    mkShown = mk.sum;
    try { W.jQuery(box).removeMousePopup(); W.jQuery(box).addMousePopup(mkTip()); } catch (e) {}
  }

  function mkInit() {
    CORE.market.subscribe(function (list, capped) { mkRead(list, capped); });
    mkFetch(true);
    setInterval(function () { mkFetch(false); }, MK_REFRESH_MS);
  }

  function start() {
    let tries = 0;
    const timer = setInterval(function () {
      tries++;
      if (W.Character && W.Character.playerId && typeof W.Character.getMaxExperience === 'function' &&
          W.jQuery && document.getElementById('ui_topbar') && document.getElementById('deposit') &&
          document.getElementById('bonds') && document.getElementById('nuggets')) {
        clearInterval(timer);
        if (cfg.topbarXp) { loadXs(); addXpStyles(); }
        update();
        if (cfg.topbarMarket) mkInit();
        setInterval(update, 1000); // experience changes while you play
      } else if (tries > 240) {
        clearInterval(timer);
      }
    }, 500);
  }
  return start;

  }

  // ======================================================================================================
  // MODULE: deals + bookkeeper
  // ======================================================================================================
  function moduleDeals(CORE) {

  const OLD_KEY = 'twFarmTracker_v1';      // earlier versions: one list shared by every world
  const KEY_PREFIX = 'twFarmTracker_v2_';
  let KEY = null;                          // set once the game is ready: one list per world and per account
  const WIN_ID = 'farm_tracker';
  const hasGM = typeof GM_getValue === 'function' && typeof GM_setValue === 'function';

  // ---------- storage ----------
  const readStore = (key) => { try { return hasGM ? GM_getValue(key, null) : localStorage.getItem(key); } catch (e) { return null; } };
  const writeStore = (key, s) => { try { hasGM ? GM_setValue(key, s) : localStorage.setItem(key, s); } catch (e) {} };
  function parseStore(raw) {
    try {
      const s = raw ? JSON.parse(raw) : null;
      if (s && Array.isArray(s.clients)) return s.clients;
    } catch (e) {}
    return null;
  }

  const state = { clients: [] };
  function save() { if (KEY) writeStore(KEY, JSON.stringify(state)); }

  // The world is the host name (e.g. hu14.the-west.hu) and the account is the player id, so every world and
  // every account has its own list. (The notes are per character, so they are separate per world anyway.)
  function initStorage() {
    KEY = KEY_PREFIX + location.hostname + '_' + W.Character.playerId;
    const mine = parseStore(readStore(KEY));
    if (mine) { state.clients = mine; return; }

    // first run in this world / account: offer the list from the earlier single-list versions, once
    const old = parseStore(readStore(OLD_KEY));
    if (old && old.length) {
      const world = (W.Game && W.Game.worldName) || location.hostname;
      ask(T('Earlier versions of The West Deals kept one list for all worlds. Import it (%1 customers) into %2? Choose "No" for a world it does not belong to.', old.length, world),
      function () { state.clients = old; save(); renderList(); },
      function () { save(); }); // "No": start empty and do not ask again here
    }
  }

  // ---------- helpers ----------
  let $;          // the game's jQuery, set once the game is ready
  let ui = null;  // open window references

  const uid = () => Math.random().toString(36).slice(2, 9);
  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
  const num = (v) => {
    const n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.'));
    return isFinite(n) && n >= 0 ? n : 0;
  };

  const INF = '\u221e';
  const UNIT = T('pcs');
  // wording used in the copied text
  const INF_EXPORT = T('unlimited'); // for "no upper limit" (amount 0)

  // An amount of 0 means "unlimited": the player always needs that product.
  // Only the requested amount is stored. Ticked lines are finished; `open` is the value of the lines still open.
  function totals(c) {
    let open = 0, inf = false;
    c.lines.forEach((l) => {
      if (l.done) return;
      if (l.amount > 0) open += l.price * l.amount; else inf = true;
    });
    return { open, inf };
  }

  // one line of text, e.g. "[item=752000] $1,100 / 840 pcs" ([item=ID] is translated by the game)
  function lineText(l) {
    const label = l.code || '[' + l.product + ']';
    return label + ' ' + money(l.price) + ' / ' + (l.amount > 0 ? l.amount + ' ' + UNIT : INF_EXPORT);
  }

  function exportText(c) {
    const open = c.lines.filter((l) => !l.done);
    if (!open.length) return c.name + ': (all done)';
    const t = totals(c);
    const total = t.open > 0 ? money(t.open) + (t.inf ? ' + ' + INF_EXPORT : '') : (t.inf ? INF_EXPORT : money(0));
    return c.name + ':\n' + open.map(lineText).join('\n') + '\n' + T('Total:') + ' ' + total;
  }

  // ---------- products (every game item, so set pieces and anything else can be tracked too) ----------
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let productCache = null;

  function products() {
    if (!productCache) {
      productCache = Object.values(W.ItemManager.getAll())
        .filter((i) => i && i.item_id && i.name) // every item of the game: products, set pieces, weapons, ...
        .map((i) => ({ id: i.item_id, name: i.name, type: i.type || '', key: norm(i.name) }));
    }
    return productCache;
  }

  function findProducts(query) {
    const q = norm(query).trim();
    if (!q) return [];
    const ranked = [];
    products().forEach((p) => {
      const at = p.key.indexOf(q);
      if (at < 0) return;
      const rank = p.key === q ? 0 : at === 0 ? 1 : p.key.indexOf(' ' + q) >= 0 ? 2 : 3;
      ranked.push({ p, rank });
    });
    ranked.sort((a, b) => a.rank - b.rank || a.p.name.localeCompare(b.p.name) || a.p.id - b.p.id);
    return ranked.slice(0, 60).map((r) => r.p);
  }

  // how many of an item are in the bag right now (null = unknown). Display only: never stored, exported or synced.
  function haveCount(id) {
    try {
      const n = W.Bag.getItemCount(id); // 0 when the item is not in the bag
      return typeof n === 'number' ? n : null;
    } catch (e) { return null; }
  }
  const idOfCode = (code) => { const m = /\[item=(\d+)\]/i.exec(code || ''); return m ? parseInt(m[1], 10) : 0; };

  // "in bag / requested", e.g. "65 / 210 pcs"
  const amtText = (amount) => amount > 0 ? amount + ' ' + UNIT : INF;
  const haveLabel = (n, amount) => (n == null ? '-' : String(n)) + ' / ' + amtText(amount);
  function haveText(l) {
    const id = idOfCode(l.code);
    return haveLabel(id ? haveCount(id) : null, l.amount);
  }

  // refresh the "in bag" column in place (keeps the scroll position)
  let haveTimer = null;
  function refreshHave() {
    if (!ui) return;
    $(ui.scroll.getContentPane()).find('.ft_line .have').each(function () {
      const el = $(this);
      const id = parseInt(el.attr('data-id'), 10);
      const need = parseInt(el.attr('data-need'), 10) || 0;
      const n = id ? haveCount(id) : null;
      el.text(haveLabel(n, need));
      el.toggleClass('enough', n != null && need > 0 && n >= need);
    });
  }

  const codeOf = (id) => '[item=' + id + ']';

  // The game's own text parser turns [item=ID] into the translated, clickable item link with its popup.
  function itemLinkHtml(code) {
    try { return W.Game.TextHandler.parse(code); } catch (e) { return null; }
  }

  function say(text) {
    try { new W.UserMessage(text, W.UserMessage.TYPE_SUCCESS).show(); } catch (e) {}
  }
  function warn(text) {
    try { new W.UserMessage(text, W.UserMessage.TYPE_ERROR).show(); } catch (e) {}
  }

  function copyText(text) {
    const done = () => say(T('Copied to clipboard'));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => window.prompt(T('Copy:'), text));
    } else {
      window.prompt(T('Copy:'), text);
    }
  }

  function ask(text, onYes, onNo) {
    try {
      const d = new W.west.gui.Dialog('The West Deals', text, W.west.gui.Dialog.SYS_QUESTION).addButton('yes', onYes);
      (onNo ? d.addButton('no', onNo) : d.addButton('no')).show();
    } catch (e) {
      if (window.confirm(text)) onYes(); else if (onNo) onNo();
    }
  }

  // ---------- sync through the game's notes ----------
  // The notebook is one text field per game account, so it follows the account to every computer. Our list lives
  // in a marked block; saving only ever replaces that block and leaves the rest of the notes untouched.
  const BLOCK_START = '--- The West Deals ---';
  const BLOCK_END = '--- end of The West Deals ---';
  // markers written by earlier versions: still recognised, and replaced by the new ones on the next save
  const OLD_MARKERS = [['--- Farm tracker ---', '--- end of Farm tracker ---'],
    ['--- TW Product Tracker ---', '--- end of TW Product Tracker ---']];

  function findBlock(text) {
    const pairs = [[BLOCK_START, BLOCK_END]].concat(OLD_MARKERS);
    for (const [a, b] of pairs) {
      const s = text.indexOf(a);
      const e = text.indexOf(b);
      if (s >= 0 && e > s) return { start: s, bodyStart: s + a.length, bodyEnd: e, end: e + b.length };
    }
    return null;
  }

  function notesBlock() {
    const out = [BLOCK_START];
    state.clients.forEach((c) => {
      out.push(c.name + ':');
      c.lines.forEach((l) => out.push(l.done ? '[del]' + lineText(l) + '[/del]' : lineText(l)));
      out.push('');
    });
    out.push(BLOCK_END);
    return out.join('\n');
  }

  const digitsToInt = (s) => parseInt(String(s).replace(/\D/g, ''), 10) || 0;

  function productByName(name) {
    const k = norm(name).trim();
    const hits = products().filter((p) => p.key === k);
    return hits.length === 1 ? hits[0] : null;
  }

  // Tolerant parser: anything it does not understand is skipped (and counted), never fatal.
  //   Name:                                  starts a customer
  //   [item=752000] $1,100 / 840 pcs         a line ("/ ..." without a number, or no "/" at all, = unlimited)
  //   [del][item=752000] $1,100 / 840 pcs[/del]   a finished line
  function parseNotes(raw) {
    let text = String(raw || '').replace(/\r\n?/g, '\n');
    const blk = findBlock(text);
    const hadBlock = !!blk;
    if (blk) text = text.slice(blk.bodyStart, blk.bodyEnd);

    let clients = [];
    let cur = null;
    let ignored = 0;

    text.split('\n').forEach((rawLine) => {
      let line = rawLine.trim();
      if (!line) return;
      if (/^(total|összesen)\s*:/i.test(line)) return; // total line of a copied order

      let done = false;
      const del = /^\[del\]([\s\S]*)\[\/del\]$/i.exec(line);
      if (del) { done = true; line = del[1].trim(); }

      // product reference: [item=ID], or a plain [Name] that matches exactly one product
      let id = 0;
      let rest = '';
      const byCode = /^\[item=(\d+)\]\s*([\s\S]*)$/i.exec(line);
      const byName = !byCode && /^\[([^\]=]+)\]\s*([\s\S]*)$/.exec(line);
      if (byCode) { id = parseInt(byCode[1], 10); rest = byCode[2]; }
      else if (byName) { const p = productByName(byName[1]); if (p) { id = p.id; rest = byName[2]; } }

      if (id) {
        const pm = /\$\s*(\d[\d\s.,]*)/.exec(rest);
        if (!cur || !pm) { ignored++; return; }
        const after = rest.slice(pm.index + pm[0].length);
        const am = /^\s*\/\s*(.*)$/.exec(after);
        const nm = am ? /^\d[\d\s.,]*/.exec(am[1]) : null;
        const known = products().find((p) => p.id === id);
        cur.lines.push({
          id: uid(), code: codeOf(id), product: known ? known.name : codeOf(id),
          price: digitsToInt(pm[1]), amount: nm ? digitsToInt(nm[0]) : 0, done
        });
        return;
      }

      // customer header: a line ending with ":" (formatting tags such as [b] are stripped first)
      const plain = line.replace(/\[\/?(?!item\b|del\b)[a-z]+(?:=[^\]]*)?\]/gi, '').trim();
      if (!done && /:$/.test(plain) && plain.indexOf('[item=') < 0) {
        const name = plain.slice(0, -1).trim();
        if (name && name.length <= 60) {
          cur = { id: uid(), name, lines: [], folded: false };
          clients.push(cur);
          return;
        }
      }
      ignored++;
    });

    // without our block the whole note is scanned, so drop headers that never got a line (e.g. "Todo:")
    if (!hadBlock) clients = clients.filter((c) => c.lines.length);
    return { clients, ignored, hadBlock };
  }

  function fetchNotes(cb) {
    try {
      W.Ajax.get('character', 'get_notebook', {}, function (resp) {
        if (!resp || resp.error) { cb(null); return; }
        cb(String(resp.raw || '').replace(/\r\n?/g, '\n'));
      });
    } catch (e) { cb(null); }
  }

  function saveNotes(raw, cb) {
    try {
      W.Ajax.remoteCall('character', 'save_notebook', { notebook: raw }, function (resp) {
        if (!resp || resp.error) { cb(false); return; }
        fetchNotes(function (back) { // read it back to be sure everything was kept (length limits)
          try { W.Notebook.get(); } catch (e) {} // refresh the game's own notes pane
          cb(back !== null && back.trim() === raw.trim());
        });
      });
    } catch (e) { cb(false); }
  }

  function saveToNotes() {
    fetchNotes(function (notes) {
      if (notes === null) { warn(T('Could not read your notes')); return; }
      const block = notesBlock();
      const blk = findBlock(notes);
      const has = !!blk;
      const next = has
        ? notes.slice(0, blk.start) + block + notes.slice(blk.end)
        : (notes.trim() ? notes.replace(/\s+$/, '') + '\n\n' : '') + block;
      const write = function () {
        if (next === notes) { say(T('Your notes are already up to date')); return; }
        saveNotes(next, function (ok) {
          if (ok) say(T('Saved to your notes')); else warn(T('Saving to your notes failed or was cut off (too long?)'));
        });
      };
      if (has || !notes.trim()) write();
      else ask(T('Add your list to the end of your notes? Everything else in your notes stays unchanged.'), write);
    });
  }

  function loadFromNotes() {
    fetchNotes(function (notes) {
      if (notes === null) { warn(T('Could not read your notes')); return; }
      const res = parseNotes(notes);
      if (!res.clients.length) { warn(T('No customers found in your notes')); return; }
      const lineCount = (cs) => cs.reduce((n, c) => n + c.lines.length, 0);
      ask(T('Replace your list (%1 customers, %2 lines) with the list from your notes (%3 customers, %4 lines%5)?',
        state.clients.length, lineCount(state.clients), res.clients.length, lineCount(res.clients),
        res.ignored ? T('; %1 unrecognised lines ignored', res.ignored) : ''), function () {
        res.clients.forEach((nc) => { // keep what the notes cannot store
          const old = state.clients.find((c) => c.name.toLowerCase() === nc.name.toLowerCase());
          if (old) { nc.playerId = old.playerId; nc.level = old.level; nc.folded = old.folded; }
        });
        state.clients = res.clients;
        save(); renderList(); say(T('Loaded from your notes'));
      });
    });
  }

  // ---------- styles ----------
  function addStyles() {
    const st = document.createElement('style');
    st.textContent = `
      /* layout in percentages: the root fills the window, the list takes the remaining height */
      .${WIN_ID} .ft_root{box-sizing:border-box;width:100%;height:100%;display:flex;flex-direction:column;
        padding:.5% 1%;position:relative}
      .${WIN_ID} .ft_new{flex:none;display:flex;align-items:center;margin-bottom:1%}
      /* the game's text field, stretched to the share given in its inline width */
      .${WIN_ID} .ft_fluid{display:block;min-width:0;box-sizing:border-box}
      .${WIN_ID} .ft_fluid .tw2gui_textfield{display:block;width:100%;box-sizing:border-box}
      .${WIN_ID} .ft_fluid .tw2gui_textfield>span{display:block;width:100%;box-sizing:border-box}
      /* the input keeps the game's own box model (its padding makes it 30px tall); 8px = its right padding */
      .${WIN_ID} .ft_fluid input{box-sizing:content-box!important;width:calc(100% - 8px)!important}
      .${WIN_ID} .ft_results{position:absolute;left:1%;right:1%;z-index:20;max-height:40%;overflow-y:auto;
        background:#e8d8b2;border:1px solid #5a3d16;box-shadow:0 3px 8px rgba(0,0,0,.55)}
      .${WIN_ID} .ft_res{display:flex;align-items:center;gap:1.2%;padding:.5% 1.2%;cursor:pointer;
        border-bottom:1px solid rgba(140,106,55,.35)}
      .${WIN_ID} .ft_res.active{background:rgba(110,75,30,.30)}
      .${WIN_ID} .ft_res .nm{flex:1;font-weight:bold}
      .${WIN_ID} .ft_res .sub{font-size:11px;opacity:.8}
      .${WIN_ID} .ft_res.info{cursor:default;font-style:italic}
      .${WIN_ID} .ft_res.info:hover{background:none}
      .${WIN_ID} .ft_ch .lv{font-size:11px;opacity:.7;font-weight:normal;margin-left:.8%}
      .${WIN_ID} .ft_client{margin-bottom:1%;border:1px solid #8c6a37;background:rgba(255,235,190,.30);border-radius:3px}
      .${WIN_ID} .ft_ch{display:flex;align-items:center;gap:1.2%;padding:.5% 1%;background:rgba(110,75,30,.30);
        border-bottom:1px solid #8c6a37}
      .${WIN_ID} .ft_ch .nm{flex:1;font-weight:bold;cursor:pointer}
      .${WIN_ID} .ft_sum{font-size:11px}
      .${WIN_ID} .tw2gui_window_inset{overflow:hidden}
      .${WIN_ID} .tw2gui_window_inset::before,.${WIN_ID} .tw2gui_inner_window_bg2::before{content:"";position:absolute;left:0;right:0;bottom:420px;height:420px;background:inherit;transform:scaleY(-1);pointer-events:none}
      .${WIN_ID} .ft_lnk{cursor:pointer;font-size:11px;text-decoration:underline}
      .${WIN_ID} .ft_lnk:hover{color:#8a1f10}
      .${WIN_ID} .ft_line{display:flex;align-items:center;gap:1%;padding:.4% 1%;border-top:1px solid rgba(140,106,55,.35)}
      .${WIN_ID} .ft_line .pn{flex:1;font-weight:bold}
      /* table columns: shared widths for the header row and every line, so the numbers line up */
      .${WIN_ID} .ft_line .col,.${WIN_ID} .ft_th .col{flex:none;box-sizing:border-box;white-space:nowrap;text-align:right}
      .${WIN_ID} .col.have{width:24%}
      .${WIN_ID} .col.price{width:13%}
      .${WIN_ID} .col.tot{width:16%;font-weight:bold}
      .${WIN_ID} .col.x{width:3%}
      .${WIN_ID} .ft_line .have.enough{color:#2c6b1f;font-weight:bold}
      .${WIN_ID} .ft_th{flex:none;display:flex;align-items:center;gap:1%;padding:.3% 1%;font-size:11px;font-weight:bold;
        opacity:.85;border:1px solid #8c6a37;background:rgba(110,75,30,.30);border-radius:3px;margin-bottom:.5%}
      .${WIN_ID} .ft_th .pn{flex:1;padding-left:2.5%}
      .${WIN_ID} .ft_line.done .pn,.${WIN_ID} .ft_line.done .price,.${WIN_ID} .ft_line.done .tot{text-decoration:line-through;opacity:.55}
      .${WIN_ID} .ft_add{position:relative;padding:.5% 1%;border-top:1px solid rgba(140,106,55,.35)}
      .${WIN_ID} .ft_addrow{display:flex;align-items:center;gap:1.5%;margin:.4% 0}
      /* product dropdown: floats over the list; the script opens it downwards or upwards (see placeResults) */
      .${WIN_ID} .ft_itemres{position:absolute;left:1%;right:1%;z-index:30;overflow-y:auto;background:#e8d8b2;
        border:1px solid #5a3d16;box-shadow:0 3px 8px rgba(0,0,0,.55)}
      .${WIN_ID} .ft_line .pn .itemlink{font-weight:bold}
      .${WIN_ID} .ft_empty{padding:3%;text-align:center;font-style:italic}
      .${WIN_ID} .ft_foot{flex:none;display:flex;align-items:center;gap:1.2%;padding:.6% .3% 0;margin-bottom:2%}
      .${WIN_ID} .ft_footsum{flex:1;font-weight:bold}
      /* Bookkeeper tab */
      .${WIN_ID} .gd_root{padding:14px 12px 4px}
      .${WIN_ID} .gd_intro{flex:none;font-size:11px;opacity:.85;margin:0 2px 8px}
      .${WIN_ID} .gd_root .ft_th{margin:0 0 6px}
      .${WIN_ID} .gd_root .ft_th .pn{padding-left:6px}
      .${WIN_ID} .gd_root .ft_th .tot{padding-right:4px}
      .${WIN_ID} .gd_list{padding:0 4px 2px 0}
      .${WIN_ID} .gd_player{margin-bottom:6px}
      .${WIN_ID} .gd_player .ft_ch{padding:5px 8px;gap:10px}
      .${WIN_ID} .gd_player .ft_line{padding:3px 8px 3px 22px;gap:10px}
      .${WIN_ID} .gd_player .ft_line .tot{width:30%;font-weight:bold}
      .${WIN_ID} .gd_note{flex:none;font-size:11px;color:#8a1f10;margin:6px 2px 0}
      .${WIN_ID} .gd_root .ft_foot{padding:8px 2px 0;margin-bottom:6px;gap:10px}
      .${WIN_ID} .col.gdate{width:24%;font-size:11px;opacity:.8}
      /* settled sales: green with a check mark */
      .${WIN_ID} .gd_ok,.${WIN_ID} .gd_ok .nm,.${WIN_ID} .gd_ok .ft_sum{color:#2c6b1f}
      .${WIN_ID} .gd_player.gd_ok{border-color:#5f8a3a;background:rgba(120,170,80,.16)}
      .${WIN_ID} .gd_player.gd_ok .ft_ch{background:rgba(90,140,50,.22);border-bottom-color:#5f8a3a}
      .${WIN_ID} .gd_player .ft_line.gd_ok{border-top-color:rgba(95,138,58,.4);font-weight:bold}
      .${WIN_ID} .gd_player .ft_ch .ft_sum{margin-left:auto}
    `;
    document.head.appendChild(st);
  }

  // ---------- small UI builders (game components) ----------
  // `width` is a share of the row, e.g. '38%' (the CSS makes the game's text field stretch to it)
  function textfield(placeholder, width, numeric) {
    const t = new W.west.gui.Textfield('ft_' + uid());
    try { if (placeholder) t.setPlaceholder(placeholder); } catch (e) {}
    try { if (numeric) t.onlyNumeric(); } catch (e) {}
    $(t.getMainDiv()).addClass('ft_fluid').css('width', width || '100%');
    return t;
  }
  const tfEl = (t) => $(t.getMainDiv());
  const tfInput = (t) => tfEl(t).find('input');

  function button(caption, fn) {
    const b = new W.west.gui.Button(caption, fn);
    return $(b.getMainDiv ? b.getMainDiv() : b.divMain);
  }

  function link(text, fn) {
    return $('<span class="ft_lnk"></span>').text(text).on('click', fn);
  }

  // ---------- list rendering ----------
  function lineEl(c, l) {
    const row = $('<div class="ft_line"></div>').toggleClass('done', !!l.done);

    const cb = new W.west.gui.Checkbox();
    cb.setSelected(!!l.done, true);
    cb.setCallback(function () {
      l.done = cb.isSelected();
      save();
      // update in place: a full re-render would reset the scroll position
      row.toggleClass('done', !!l.done);
      const t = totals(c);
      row.closest('.ft_client').find('.ft_sum').first().text(money(t.open) + (t.inf ? ' + ' + INF : ''));
      updateFoot();
    });

    const pn = $('<span class="pn"></span>');
    const html = l.code ? itemLinkHtml(l.code) : null;
    if (html) pn.html(html); else pn.text(l.product || l.code || '?');

    row.append(
      $(cb.getMainDiv()),
      pn,
      $('<span class="col have"></span>').attr({ 'data-id': idOfCode(l.code), 'data-need': l.amount })
        .attr('title', T('In your bag / requested amount')).text(haveText(l)),
      $('<span class="col price"></span>').text(money(l.price)),
      $('<span class="col tot"></span>').text(l.amount > 0 ? money(l.price * l.amount) : INF), // line total
      $('<span class="col x"></span>').append(link('\u2715', function () {
        c.lines = c.lines.filter((x) => x !== l);
        save(); renderList();
      }))
    );
    return row;
  }

  // ---------- keyboard / mouse highlight for the two dropdowns ----------
  const KEY_NAMES = { 13: 'Enter', 27: 'Escape', 38: 'ArrowUp', 40: 'ArrowDown' };
  const keyOf = (e) => e.key || KEY_NAMES[e.which || e.keyCode] || '';
  // keys that must not trigger a new search / filter on keyup
  const NON_TEXT_KEYS = ['Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab',
    'Shift', 'Control', 'Alt', 'Meta', 'CapsLock'];

  const rowsOf = (results) => results.find('.ft_res').not('.info');

  function setActive(results, i) {
    const rows = rowsOf(results);
    if (!rows.length) return;
    i = (i + rows.length) % rows.length;
    rows.removeClass('active');
    const row = rows.eq(i).addClass('active')[0];
    const box = results[0]; // keep the highlighted row inside the visible part of the dropdown
    if (row.offsetTop < box.scrollTop) box.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight;
    }
  }

  function stepActive(results, delta) {
    const rows = rowsOf(results);
    const cur = rows.index(rows.filter('.active'));
    setActive(results, cur < 0 ? (delta > 0 ? 0 : rows.length - 1) : cur + delta);
  }

  function pickActive(results) {
    const row = results.find('.ft_res.active')[0];
    if (!row) return false;
    $(row).trigger('click');
    return true;
  }

  // the mouse moves the same highlight, so only one row is ever highlighted
  function hookResults(results) {
    results.on('mouseenter', '.ft_res:not(.info)', function () {
      rowsOf(results).removeClass('active');
      $(this).addClass('active');
    });
  }

  // read the value straight from the <input> (more reliable than the component's getValue)
  const tfVal = (t) => { const v = tfInput(t).val(); return String(v == null ? '' : v); };

  function addForm(c) {
    const form = $('<div class="ft_add"></div>');
    const search = textfield(T('Search item\u2026'), '38%', false);
    const amount = textfield(T('Amount (0 = %1)', INF), '22%', true);
    const price = textfield(T('$ / pcs'), '16%', true);
    const results = $('<div class="ft_itemres"></div>').hide();
    hookResults(results);
    let chosen = null;

    const choose = function (p) {
      chosen = p;
      results.hide();
      search.setValue(p.name);
    };

    // Open the dropdown below the field if it fits in the visible part of the list, otherwise upwards
    // (the list area ends at the window's lower edge and would hide it).
    const placeResults = function () {
      results.css({ 'max-height': '200px', top: 'auto', bottom: 'auto' });
      const clip = $(ui.scroll.getMainDiv())[0].getBoundingClientRect();
      const box = form[0].getBoundingClientRect();
      const below = clip.bottom - box.bottom;
      const above = box.top - clip.top;
      const wanted = Math.min(results[0].scrollHeight + 2, 200);
      const up = below < wanted && above > below;
      const room = Math.max(60, Math.floor((up ? above : below) - 6));
      results.css({
        'max-height': Math.min(wanted, room) + 'px',
        top: up ? 'auto' : '100%',
        bottom: up ? '100%' : 'auto'
      });
    };

    const showMatches = function () {
      const q = tfVal(search).trim();
      if (chosen && q !== chosen.name) chosen = null;
      if (!q) { results.hide(); return; }
      const list = findProducts(q);
      results.empty();
      if (!list.length) results.append($('<div class="ft_res info"></div>').text(T('No item found')));
      list.forEach(function (p) {
        results.append(
          $('<div class="ft_res"></div>').append(
            $('<span class="nm"></span>').text(p.name),
            $('<span class="sub"></span>').text((p.type ? p.type + ' \u00b7 ' : '') + codeOf(p.id))
          ).on('click', function () { choose(p); })
        );
      });
      results.show();
      placeResults();
      setActive(results, 0); // the first match is highlighted, so Enter picks it
    };

    const add = function () {
      if (!chosen) { // nothing clicked: accept a single unambiguous match of what was typed
        const q = tfVal(search).trim();
        const list = q ? findProducts(q) : [];
        const exact = list.filter((p) => norm(p.name) === norm(q));
        if (exact.length === 1) chosen = exact[0]; else if (list.length === 1) chosen = list[0];
      }
      if (!chosen) { warn(T('Pick an item from the list first')); return; }
      c.lines.push({
        id: uid(), code: codeOf(chosen.id), product: chosen.name,
        amount: num(tfVal(amount)), price: num(tfVal(price)), // amount 0 = unlimited
        done: false
      });
      save(); renderList();
    };

    tfInput(search).on('keydown', function (e) {
      const k = keyOf(e);
      if (k === 'ArrowDown' || k === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        if (results.is(':visible')) stepActive(results, k === 'ArrowDown' ? 1 : -1);
        else showMatches(); // reopen the matches for the current text
      } else if (k === 'Enter') {
        e.stopPropagation();
        if (results.is(':visible')) pickActive(results);
      } else if (k === 'Escape') {
        e.stopPropagation();
        results.hide();
      }
    });
    tfInput(search).on('keyup', function (e) {
      if (NON_TEXT_KEYS.indexOf(keyOf(e)) < 0) showMatches();
    });
    [amount, price].forEach((t) => tfInput(t).on('keyup', (e) => { if (keyOf(e) === 'Enter') add(); }));

    form.append(
      $('<div class="ft_addrow"></div>').append(tfEl(search), tfEl(amount), tfEl(price), button(T('Add'), add)),
      results
    );
    return form;
  }

  function clientEl(c) {
    const t = totals(c);
    const box = $('<div class="ft_client"></div>');
    const head = $('<div class="ft_ch"></div>');
    head.append(
      $('<span class="nm"></span>').text((c.folded ? '\u25b8 ' : '\u25be ') + c.name)
        .append(c.level ? $('<span class="lv"></span>').text('Lv ' + c.level) : null)
        .on('click', function () { c.folded = !c.folded; save(); renderList(); }),
      $('<span class="ft_sum"></span>').text(money(t.open) + (t.inf ? ' + ' + INF : '')),
      link(T('copy'), function () { copyText(exportText(c)); }),
      link('\u2715', function () {
        ask(T('Delete "%1" and all their lines?', c.name), function () {
          state.clients = state.clients.filter((x) => x !== c);
          save(); renderList();
        });
      })
    );
    box.append(head);
    if (!c.folded) {
      c.lines.forEach((l) => box.append(lineEl(c, l)));
      box.append(addForm(c));
    }
    return box;
  }

  function updateFoot() {
    if (!ui) return;
    let open = 0, inf = false;
    state.clients.forEach((c) => { const t = totals(c); open += t.open; inf = inf || t.inf; });
    ui.foot.text(T('Open value: %1', money(open) + (inf ? ' + ' + INF : '')));
  }

  // line the sticky header up with the rows: same left edge and width (the list has a scrollbar on its right)
  function fitHeader() {
    try {
      const row = $(ui.scroll.getContentPane()).find('.ft_client').first();
      if (!row.length) { ui.head.css({ 'margin-left': 0, 'margin-right': 0 }); return; }
      ui.head.css({ 'margin-left': 0, 'margin-right': 0 });
      const r = row[0].getBoundingClientRect(), h = ui.head[0].getBoundingClientRect();
      ui.head.css({ 'margin-left': Math.max(0, r.left - h.left) + 'px', 'margin-right': Math.max(0, h.right - r.right) + 'px' });
    } catch (e) {}
  }

  function renderList() {
    if (!ui) return;
    let pos = null;
    try { pos = ui.scroll.getScrollPos(); } catch (e) {}

    const pane = $(ui.scroll.getContentPane());
    pane.empty();
    const wrap = $('<div></div>');
    if (!state.clients.length) wrap.append($('<div class="ft_empty"></div>').text(T('No customers yet. Add one above.')));
    state.clients.forEach((c) => wrap.append(clientEl(c)));
    pane.append(wrap);

    updateFoot();
    refreshHave();
    fitHeader();

    // restore the scroll position (the bar moves in pulley pixels, so use the relative position)
    try {
      if (pos && pos.rely > 0) {
        const bar = ui.scroll.verticalBar;
        const area = $('div.tw2gui_scrollbar_pulley_area', bar.getMainDiv()).height();
        const pul = $('div.tw2gui_scrollbar_pulley', bar.getMainDiv()).height();
        bar.move(pos.rely * Math.max(0, area - pul), false, true);
      }
    } catch (e) {}
  }


  // ---------- Gold bookkeeping ----------
  // Players keep money on the market instead of in the bank: Gold is put up for crazy prices and bought by friends,
  // and at the end of a farming session the trades are reversed in one big trade. This tab keeps the ledger: every
  // sold Gold offer from your own listings (market tab "Sell"), who bought it and for how much, and the sum per player.
  const GOLD_ITEM = 52969000;               // market item id of Gold ([item=52969000])
  const GOLD_KEY_PREFIX = 'twFarmTracker_gold_v1_';
  let GOLD_KEY = null;
  const gold = { offers: {} };              // offer id -> entry (see ingestOffers)
  let goldLastSync = 0;
  let goldCapped = false;                   // the game returned a full, capped list (older offers hide newer ones)

  function goldSave() { if (GOLD_KEY) writeStore(GOLD_KEY, JSON.stringify(gold)); }
  function goldLoad() {
    GOLD_KEY = GOLD_KEY_PREFIX + location.hostname + '_' + W.Character.playerId;
    try {
      const raw = readStore(GOLD_KEY);
      const g = raw ? JSON.parse(raw) : null;
      if (g && g.offers && typeof g.offers === 'object') gold.offers = g.offers;
    } catch (e) {}
  }

  // An offer is a final sale when it has ended with a bid, or was bought at the immediate price.
  // state: 'owed' = sold, the money is still waiting on the market; 'pending' = has a bid but is still running;
  //        'collected' = you already took the money out (nothing left to reverse).
  function ingestOffers(list, fullList) {
    if (!Array.isArray(list)) return;
    let changed = false;
    list.forEach(function (o) {
      if (!o || o.item_id !== GOLD_ITEM || !(o.current_bid > 0)) return;
      const ended = o.auction_ends_in <= 0;
      const bought = ended || (o.max_price > 0 && o.current_bid >= o.max_price);
      const state = o.fetched_money ? 'collected' : (bought ? 'owed' : 'pending');
      const id = String(o.market_offer_id);
      const old = gold.offers[id];
      const e = {
        id: id,
        buyer: o.bidder_name || (old && old.buyer) || '?',
        buyerId: o.bidder_player_id || (old && old.buyerId) || 0,
        price: o.current_bid,
        count: o.item_count || 1,
        end: o.auction_end_date ? Math.round(o.auction_end_date) : (old && old.end) || 0,
        state: state,
        settled: !!(old && old.settled)
      };
      if (!old || old.buyer !== e.buyer || old.price !== e.price || old.state !== e.state || old.count !== e.count) changed = true;
      gold.offers[id] = e;
    });
    if (changed) goldSave();
  }

  // ask the game for your own listings (shared with the top bar: one request) and update the ledger
  function syncGold(cb) {
    goldLastSync = Date.now();
    CORE.market.fetch(true, cb);
  }

  const goldFolded = {};   // buyer name -> true when expanded

  function goldGroups() {
    const by = {};
    Object.keys(gold.offers).forEach(function (id) {
      const o = gold.offers[id];
      const g = by[o.buyer] || (by[o.buyer] = { name: o.buyer, owed: [], pending: [], settled: [], collected: [] });
      if (o.state === 'collected') g.collected.push(o);
      else if (o.settled) g.settled.push(o);
      else if (o.state === 'owed') g.owed.push(o);
      else g.pending.push(o);
    });
    return by;
  }
  const sumPrice = (a) => a.reduce((n, o) => n + o.price, 0);
  const sumCount = (a) => a.reduce((n, o) => n + o.count, 0);
  const dateText = (ts) => {
    if (!ts) return '';
    const d = new Date(ts * 1000), p = (n) => (n < 10 ? '0' : '') + n;
    return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  };

  function goldPlayerText(g) {
    return g.name + ': ' + sumCount(g.owed) + ' x ' + '[item=' + GOLD_ITEM + '] = ' + money(sumPrice(g.owed));
  }
  function goldAllText(groups) {
    const open = groups.filter((g) => g.owed.length);
    if (!open.length) return T('Gold bookkeeping: nothing open');
    return open.map(goldPlayerText).join('\n') + '\n' + T('Total:') + ' ' + money(open.reduce((n, g) => n + sumPrice(g.owed), 0));
  }

  function goldRowEl(o) {
    const row = $('<div class="ft_line gd_offer"></div>').toggleClass('gd_ok', !!o.settled);
    row.append(
      $('<span class="pn"></span>').text((o.settled ? '\u2713 ' : '') + o.count + ' x ' + T('Gold') + (o.state === 'pending' ? T(' (still running, not final)') : '')),
      $('<span class="col gdate"></span>').text(dateText(o.end)),
      $('<span class="col tot"></span>').text(money(o.price))
    );
    return row;
  }

  // One block per buyer. Open sales are black; settled sales stay in the list in green with a check mark.
  function goldPlayerEl(g) {
    const all = g.owed.concat(g.pending, g.settled);
    const key = g.name;
    const open = !!goldFolded[key];
    const owedSum = sumPrice(g.owed);
    const allDone = !g.owed.length && !g.pending.length && g.settled.length > 0;
    const box = $('<div class="ft_client gd_player"></div>').toggleClass('gd_ok', allDone);
    const head = $('<div class="ft_ch"></div>');
    const parts = [];
    if (g.owed.length) parts.push(money(owedSum) + ' (' + sumCount(g.owed) + ' ' + T('Gold') + ')');
    if (g.pending.length) parts.push(T('%1 running', g.pending.length));
    if (g.settled.length) parts.push('\u2713 ' + T('%1 settled', money(sumPrice(g.settled))));
    head.append(
      $('<span class="nm"></span>').text((open ? '\u25be ' : '\u25b8 ') + (allDone ? '\u2713 ' : '') + g.name)
        .on('click', function () { goldFolded[key] = !goldFolded[key]; renderGold(); }),
      $('<span class="ft_sum"></span>').text(parts.join('  \u00b7  '))
    );
    if (g.owed.length) {
      head.append(
        link(T('copy'), function () { copyText(goldPlayerText(g)); }),
        link(T('settled'), function () {
          ask(T('Mark all %1 open Gold sales to "%2" (%3) as settled?', g.owed.length, g.name, money(owedSum)), function () {
            g.owed.forEach(function (o) { o.settled = true; });
            goldSave(); renderGold();
          });
        }).attr('title', T('The trade was reversed with this player: mark their open sales as settled'))
      );
    }
    if (g.settled.length) {
      head.append(link(T('reopen'), function () {
        g.settled.forEach(function (o) { o.settled = false; });
        goldSave(); renderGold();
      }).attr('title', T('Mark the settled sales as open again')));
    }
    box.append(head);
    if (open) all.slice().sort((a, b) => a.end - b.end).forEach((o) => box.append(goldRowEl(o)));
    return box;
  }

  function renderGold() {
    if (!ui || !ui.gold) return;
    const g = ui.gold;
    let pos = null;
    try { pos = g.scroll.getScrollPos(); } catch (e) {}
    const by = goldGroups();
    const arr = Object.keys(by).map((k) => by[k]).filter((x) => x.owed.length || x.pending.length || x.settled.length);
    // players with open sales first (biggest first), fully settled players after them
    const rank = (x) => (x.owed.length || x.pending.length ? 0 : 1);
    arr.sort((a, b) => rank(a) - rank(b) || sumPrice(b.owed) - sumPrice(a.owed) || a.name.localeCompare(b.name));

    const pane = $(g.scroll.getContentPane());
    pane.empty();
    const wrap = $('<div class="gd_list"></div>');
    if (!arr.length) wrap.append($('<div class="ft_empty"></div>').text(T('No sold Gold found yet. Press Refresh (or open the market\u2019s Sell tab).')));
    arr.forEach((x) => wrap.append(goldPlayerEl(x)));
    pane.append(wrap);

    const openGroups = arr.filter((x) => x.owed.length);
    const total = openGroups.reduce((n, x) => n + sumPrice(x.owed), 0);
    const pend = arr.reduce((n, x) => n + x.pending.length, 0);
    const done = arr.reduce((n, x) => n + sumPrice(x.settled), 0);
    g.sum.text(T('Open: %1 from %2 %3', money(total), openGroups.length, pl(openGroups.length, 'player', 'players')) +
      (pend ? ' ' + T('(+%1 running)', pend) : '') + (done ? '  \u00b7  \u2713 ' + T('%1 settled', money(done)) : ''));
    g.note.text(goldCapped ? T('The game only lists the first ~100 of your offers; collect or delete old ones to see newer sales.') : '');
    g.note.toggle(goldCapped);
    g._text = goldAllText(openGroups);

    try {
      if (pos && pos.rely > 0) {
        const bar = g.scroll.verticalBar;
        const area = $('div.tw2gui_scrollbar_pulley_area', bar.getMainDiv()).height();
        const pul = $('div.tw2gui_scrollbar_pulley', bar.getMainDiv()).height();
        bar.move(pos.rely * Math.max(0, area - pul), false, true);
      }
    } catch (e) {}
  }

  function buildGoldTab() {
    const root = $('<div class="ft_root gd_root"></div>').css('display', 'none');
    const intro = $('<div class="gd_intro"></div>').text(
      T('Sold Gold from your own market listings, by buyer. "Open" is what the player still owes you when the trades are reversed.'));
    const head = $('<div class="ft_th"></div>').append(
      $('<span class="pn"></span>').text(T('Buyer / offers')), $('<span class="col tot" style="width:40%"></span>').text(T('Open sum')));
    const scroll = new W.west.gui.Scrollpane();
    $(scroll.getMainDiv()).css({ flex: '1 1 auto', 'min-height': 0, height: 'auto' });
    const note = $('<div class="gd_note"></div>').hide();
    const sum = $('<span class="ft_footsum"></span>');
    const g = { root, scroll, sum, note, _text: '' };
    const foot = $('<div class="ft_foot"></div>').append(
      sum,
      button(T('Refresh'), function () { syncGold(function (ok) { if (ok) renderGold(); }); }),
      button(T('Copy all'), function () { copyText(g._text || T('Gold bookkeeping: nothing open')); })
    );
    root.append(intro, head, $(scroll.getMainDiv()), note, foot);
    return g;
  }

  // ---------- window ----------
  function toggleWindow() {
    const existing = document.querySelector('.tw2gui_window.' + WIN_ID);
    if (existing) {
      try { ui.win.destroy(); } catch (e) { existing.remove(); }
      ui = null;
      return;
    }

    const winTitle = cfg.dealsCustomers ? 'The West Deals' : T('Bookkeeper');
    const win = W.wman.open(WIN_ID, winTitle, 'noreload');
    try { win.setMiniTitle(winTitle); } catch (e) {}
    // The game paints the parchment as one fixed-size picture (721x420) behind the content, so the window must
    // not grow beyond it (the frame adds about 26x34 px). Within these limits it starts at a share of the
    // browser window and can be resized by dragging its corner; everything inside follows (percentages).
    const MIN_W = 520, MIN_H = 320, MAX_W = 740, MAX_H = 860;
    const vw = W.innerWidth || 1200;
    const vh = W.innerHeight || 800;
    const clamp = (v, lo, hi) => Math.round(Math.min(Math.max(v, lo), hi));
    try { win.setSize(clamp(vw * 0.55, MIN_W, MAX_W), clamp(vh * 0.6, MIN_H, 450)); } catch (e) {}
    try { win.setMinSize(MIN_W, MIN_H); } catch (e) {}
    try { win.setMaxSize(MAX_W, MAX_H); } catch (e) {}
    try { win.setResizeable(true); } catch (e) {}

    const root = $('<div class="ft_root"></div>');

    // player search: looks the name up in the game's rankings, pick one of the matches to add a customer
    const searchTf = textfield(T('Search player to add as customer\u2026'), '100%', false);
    const bar = $('<div class="ft_new"></div>').append(tfEl(searchTf));
    const results = $('<div class="ft_results"></div>').hide();
    hookResults(results);
    let searchTimer = null;
    let reqId = 0;
    let shownFor = ''; // the search text the visible results belong to

    const showResults = function (rows, info) {
      results.empty();
      if (info) results.append($('<div class="ft_res info"></div>').text(info));
      (rows || []).forEach(function (p) {
        results.append(
          $('<div class="ft_res"></div>').append(
            $('<span class="nm"></span>').text(p.name),
            $('<span class="sub"></span>').text('Lv ' + p.level + (p.town_name ? ' \u00b7 ' + p.town_name : ''))
          ).on('click', function () { pick(p); })
        );
      });
      results.css('top', (bar.outerHeight(true) + 4) + 'px').show();
      setActive(results, 0); // the first match is highlighted, so Enter picks it
    };

    const pick = function (p) {
      results.hide();
      searchTf.setValue('');
      const dup = state.clients.find((c) =>
        (p.player_id && c.playerId === p.player_id) || c.name.toLowerCase() === String(p.name).toLowerCase());
      if (dup) { say(p.name + ' is already in the list'); return; }
      state.clients.push({ id: uid(), name: p.name, playerId: p.player_id, level: p.level, lines: [], folded: false });
      save(); renderList();
    };

    const doSearch = function () {
      const q = String(searchTf.getValue() || '').trim();
      if (q.length < 2) { results.hide(); return; }
      const my = ++reqId;
      showResults([], T('Searching\u2026'));
      W.Ajax.remoteCallMode('ranking', 'get_data', { search: q, tab: 'experience' }, function (json) {
        if (my !== reqId) return; // a newer search has been started
        if (!json || json.error) { showResults([], (json && json.msg) || T('Search failed')); return; }
        const rows = json.ranking || [];
        const exact = rows.filter((r) => r.highlight); // exact name: the game highlights that player
        const list = exact.length ? exact : rows;      // otherwise the rows are the partial matches
        shownFor = q;
        if (list.length) showResults(list); else showResults([], T('No player found'));
      });
    };

    tfInput(searchTf).on('keydown', function (e) {
      const k = keyOf(e);
      if (k === 'ArrowDown' || k === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        if (results.is(':visible')) stepActive(results, k === 'ArrowDown' ? 1 : -1);
      } else if (k === 'Enter') {
        e.stopPropagation();
        clearTimeout(searchTimer);
        // pick the highlighted player, but only if the results belong to what is typed now
        const q = String(searchTf.getValue() || '').trim();
        if (results.is(':visible') && shownFor === q && pickActive(results)) return;
        doSearch();
      } else if (k === 'Escape') {
        e.stopPropagation();
        clearTimeout(searchTimer);
        results.hide();
      }
    });
    tfInput(searchTf).on('keyup', function (e) {
      if (NON_TEXT_KEYS.indexOf(keyOf(e)) >= 0) return;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(doSearch, 450);
    });

    root.append(bar, results);

    // column headers stay above the scrolling list; fitHeader() makes them as wide as the list rows
    const head = $('<div class="ft_th"></div>').append(
      $('<span class="pn"></span>').text(T('Item')), $('<span class="col have"></span>').text(T('In bag / Amount')), $('<span class="col price"></span>').text(T('Price')), $('<span class="col tot"></span>').text(T('Total')), '<span class="col x"></span>');
    root.append(head);

    const scroll = new W.west.gui.Scrollpane();
    // the list takes whatever height is left between the search bar and the footer
    $(scroll.getMainDiv()).css({ flex: '1 1 auto', 'min-height': 0, height: 'auto' });
    root.append($(scroll.getMainDiv()));

    const sum = $('<span class="ft_footsum"></span>');
    const foot = $('<div class="ft_foot"></div>').append(
      sum, button(T('Save to notes'), saveToNotes), button(T('Load from notes'), loadFromNotes)
    );
    root.append(foot);

    const useC = cfg.dealsCustomers, useB = cfg.dealsBookkeeper;
    if (useC) win.appendToContentPane(root);   // (without the customers feature the list stays detached and unused)
    ui = { win, scroll, foot: sum, head };

    // tabs: customers (everything above) and the Bookkeeper; with only one of them there is no tab bar
    let gd = null;
    if (useB) {
      gd = buildGoldTab();
      win.appendToContentPane(gd.root);
      ui.gold = gd;
    }
    ui.goldActive = false;
    const showTab = function (gdActive) {
      if (!ui || !gd) return;
      ui.goldActive = gdActive;
      root.css('display', gdActive ? 'none' : 'flex');
      gd.root.css('display', gdActive ? 'flex' : 'none');
      if (gdActive) {
        renderGold();
        if (Date.now() - goldLastSync > 15000) syncGold(function (ok) { if (ok && ui && ui.goldActive) renderGold(); });
      } else {
        fitHeader();
      }
    };
    if (useC && useB) {
      try {
        win.addTab(T('Customers'), 'ft_tab_customers', function () { try { win.activateTab('ft_tab_customers', false); } catch (e) {} showTab(false); });
        win.addTab(T('Bookkeeper'), 'ft_tab_gold', function () { try { win.activateTab('ft_tab_gold', false); } catch (e) {} showTab(true); });
        win.activateTab('ft_tab_customers', false);
      } catch (e) { console.error('[The West QOL Toolkit] tabs', e); }
    } else if (useB) {
      showTab(true);
    }
    if (!haveTimer) haveTimer = setInterval(function () { refreshHave(); if (ui) fitHeader(); }, 3000); // bag changes while the window is open
    renderList();
  }

  // ---------- launcher button next to the HP / energy bars ----------
  function addLauncher() {
    CORE.addColumnSlot();
    CORE.makeLauncher({
      id: 'ft_launcher', top: 137, row: -200,
      tip: cfg.dealsCustomers ? 'The West Deals' : T('Bookkeeper'),
      click: toggleWindow
    });
  }

  // ---------- start once the game UI exists ----------
  function start() {
    let tries = 0;
    const timer = setInterval(function () {
      tries++;
      if (W.wman && W.west && W.west.gui && W.jQuery && W.Character && W.Character.playerId &&
          document.getElementById('ui_character_container')) {
        clearInterval(timer);
        $ = W.jQuery;
        if (cfg.dealsCustomers) initStorage();
        if (cfg.dealsBookkeeper) {
          goldLoad();
          // the shared market reader hands over your offers (market request or the market's own Sell tab)
          CORE.market.subscribe(function (list, capped) {
            goldCapped = !!capped;
            ingestOffers(list, true);
            if (ui && ui.goldActive) renderGold();
          });
        }
        addStyles();
        if (cfg.dealsCustomers || cfg.dealsBookkeeper) addLauncher();
      } else if (tries > 240) {
        clearInterval(timer);
      }
    }, 500);
  }
  return start;

  }


  // ======================================================================================================
  // MODULE: fair product price
  // ======================================================================================================
  function moduleFairPrice(CORE) {
    const $$ = () => W.jQuery;
    const KEY = () => 'twQol_fair_v1_' + location.hostname + '_' + (W.Character && W.Character.playerId);
    let store = { mult: 0, jobs: {} };   // mult: your product bonus factor, jobs: job id -> { items: item id -> % found in an hour }
    const load = () => {
      try {
        const raw = hasGM ? GM_getValue(KEY(), null) : localStorage.getItem(KEY());
        const s = raw ? JSON.parse(raw) : null;
        if (s && s.jobs) store = s;
      } catch (e) {}
    };
    const save = () => {
      const t = JSON.stringify(store);
      try { hasGM ? GM_setValue(KEY(), t) : localStorage.setItem(KEY(), t); } catch (e) {}
    };
    const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

    // learn from the job windows you open: the server tells the exact hourly chances there
    function hookJobs() {
      const P = W.west && W.west.job && W.west.job.Model && W.west.job.Model.prototype;
      if (!P || P.__twQolFair) return !!P;
      P.__twQolFair = true;
      const orig = P.mergeJobObject;
      P.mergeJobObject = function (b) {
        const r = orig.apply(this, arguments);
        try {
          const d = (b.durations || []).filter(function (x) { return x && x.duration === 3600; })[0];
          if (d && d.items && b.id) {
            // the market price is cached as the HIGHEST price ever seen, i.e. the LOWEST hourly chance per job and product,
            // so a bonus weekend (more products found) never makes the prices shrink
            const rec = store.jobs[b.id] || { items: {} };
            d.items.forEach(function (it) {
              const pct = (it.prop || 0) + (it.probBonus || 0);
              if (!(pct > 0)) return;
              rec.items[it.itemid] = rec.items[it.itemid] ? Math.min(rec.items[it.itemid], pct) : pct;
              if (it.prop > 0 && it.probBonus >= 0) { const m = pct / it.prop; store.mult = store.mult ? Math.min(store.mult, m) : m; }
            });
            store.jobs[b.id] = rec;
            save();
          }
        } catch (e) {}
        return r;
      };
      return true;
    }

    // best (highest) hourly chance for a product among the jobs that drop it: { pct, job, exact } or null
    function hourly(itemId) {
      let best = null;
      const jobs = W.JobList.getJobsByItemId(itemId) || [];
      jobs.forEach(function (job) {
        const y = job.yields && job.yields[itemId];
        if (!y) return;
        const known = store.jobs[job.id] && store.jobs[job.id].items[itemId];
        let pct = null, exact = false;
        if (known) { pct = known; exact = true; }
        else if (store.mult && y.prop) pct = y.prop * 600 * store.mult;   // 1 hour = 240 tasks, base 2.5x the job's listed chance per 15 s
        if (pct && (!best || pct > best.pct)) best = { pct: pct, job: job.name, exact: exact };
      });
      return best;
    }

    function block(itemId) {
      let jobs;
      try { jobs = W.JobList.getJobsByItemId(itemId) || []; } catch (e) { return ''; }
      if (!jobs.length) return '';
      const h = hourly(itemId);
      const head = '<div class="twqol_fair" style="text-align:center;margin:4px 0 2px;">';
      if (!h) {
        return head + '<span style="color:#7a6a55;font-size:11px;">' + T('Market price:') + ' ' + T('open any job window once to calculate it') + '</span></div>';
      }
      const price = cfg.fairHourlyRate / (h.pct / 100);
      return head + '<span style="font-weight:bold;color:#2f6d1d;">' + T('Market price:') + ' ' + (h.exact ? '' : '~') + money(price) + '</span></div>';
    }

    // used by the sell dialog helper: the market price of one piece, or null while nothing is known yet
    CORE.marketPrice = function (itemId) {
      try {
        const h = hourly(itemId);
        if (!h || !(h.pct > 0)) return null;
        return Math.max(1, Math.round(cfg.fairHourlyRate / (h.pct / 100)));
      } catch (e) { return null; }
    };

    function hookPopup() {
      const IP = W.ItemPopup;
      if (!IP || !IP.prototype || typeof IP.prototype.getXHTML !== 'function') return false;
      if (IP.prototype.getXHTML.__twQolFair) return true;
      const orig = IP.prototype.getXHTML;
      const wrapped = function () {
        const html = orig.apply(this, arguments);
        try {
          if (!cfg.fairPrice || typeof html !== 'string' || html.indexOf('twqol_fair') >= 0) return html;
          const o = this.item_obj;
          if (!o || o.type !== 'yield') return html;
          const b = block(o.item_id);
          if (!b) return html;
          // right after the shop prices; at the end if that part is not found
          const i = html.indexOf('inventory_popup_prices');
          if (i >= 0) {
            const j = html.indexOf('</div>', i);
            if (j >= 0) return html.slice(0, j + 6) + b + html.slice(j + 6);
          }
          return html + b;
        } catch (e) { return html; }
      };
      wrapped.__twQolFair = true;
      IP.prototype.getXHTML = wrapped;
      return true;
    }

    return function start() {
      if (!cfg.fairPrice) return;
      let tries = 0;
      const t = setInterval(function () {
        tries++;
        if (W.jQuery && W.Character && W.Character.playerId && W.JobList && W.ItemPopup && W.west && W.west.job) {
          clearInterval(t);
          load();
          hookJobs();
          hookPopup();
          // TWIR (and similar scripts) replace the popup builder after they start: put ours back on top whenever it was replaced
          setInterval(hookPopup, 2000);
        } else if (tries > 240) clearInterval(t);
      }, 500);
    };
  }


  // ======================================================================================================
  // MODULE: sell dialog helper buttons
  // ======================================================================================================
  function moduleSellHelper(CORE) {
    let itemId = null;   // the item of the open sell dialog (the game asks the server for other offers of it right before)

    function hookAjax() {
      const A = W.Ajax;
      if (!A || typeof A.remoteCall !== 'function' || A.remoteCall.__twQolSell) return !!A;
      const orig = A.remoteCall;
      A.remoteCall = function (action, method, params) {
        try { if (action === 'building_market' && method === 'get_other_offers' && params) itemId = params.item_id; } catch (e) {}
        return orig.apply(this, arguments);
      };
      A.remoteCall.__twQolSell = true;
      return true;
    }

    function build(win) {
      const $ = W.jQuery;
      const w = $(win);
      if (w.data('twQolSell')) return;
      const qty = w.find('#market_sell_itemStack');
      const max = w.find('#market_max_price');
      const min = w.find('#market_min_bid');
      if (!qty.length || !max.length || !min.length) return;
      w.data('twQolSell', true);

      let mode = null;          // null | 'free' | 'market'
      let minAuto = true;       // the minimum bid is filled in by us until you change it yourself
      let setting = false;      // true while we write into the inputs (so our own writes are not taken for yours)
      const shopPrice = function () {
        try { const it = W.ItemManager.get(itemId); return it && it.sell_price ? it.sell_price : 0; } catch (e) { return 0; }
      };
      const num = function (el) { const v = parseInt(String(el.val()).replace(/[^\d]/g, ''), 10); return v > 0 ? v : 0; };
      const fill = function (input, value) {
        setting = true;
        try { input.val(String(value)).trigger('input').trigger('keyup').trigger('change'); } finally { setting = false; }
      };

      // ---- the extra "price per piece" field (only visible in the market price mode) ----
      let piece;
      try {
        const tf = new W.west.gui.Textfield('twqol_piece_price');
        tf.setWidth(Math.max(60, Math.round(max.closest('.tw2gui_textfield').outerWidth() || 90) - 8));
        piece = $(tf.getMainDiv()).find('input');
        if (!piece.length) throw new Error('no input');
        piece.data('twHolder', $(tf.getMainDiv()));
      } catch (e) {
        piece = $('<input type="text" id="twqol_piece_price" style="width:' + Math.max(60, Math.round(max.outerWidth() || 90)) + 'px">');
        piece.data('twHolder', piece);
      }
      // two cells that line up with the "Azonnali vételár" label and input above them
      const pieceLabel = $('<label for="twqol_piece_price"></label>').text(T('Price per piece:')).add($('<span> $</span>'));
      const pieceBox = piece.data('twHolder').css('display', 'inline-block').css('vertical-align', 'middle').css('white-space', 'nowrap');
      const pieceRow = $().add(pieceLabel).add(pieceBox);

      const update = function () {
        if (mode === 'free') {
          const q = num(qty), u = shopPrice();
          if (q && u) fill(max, u * q);
        } else if (mode === 'market') {
          const q = num(qty), p = num(piece), u = shopPrice();
          if (q && p) fill(max, p * q);
          else if (q && !p) fill(max, '');
          if (minAuto && q && u) fill(min, u * q);
        }
      };

      // ---- the two mode buttons ----
      const mk = function (text, tip) {
        return $('<span class="twqol_sellbtn"></span>').text(text).attr('title', tip).css({
          display: 'inline-block', margin: '0 4px', padding: '2px 10px', cursor: 'pointer', 'font-size': '11px', 'font-weight': 'bold',
          color: '#f1dfb5', background: 'linear-gradient(#755331,#3f2916)', border: '1px solid #2a1a0c', 'border-radius': '3px',
          'line-height': '14px', 'user-select': 'none' });
      };
      const bFree = mk(T('Sell for free'), T('The immediate purchase price becomes the shop price of the whole stack (shop price x quantity).'));
      const bMarket = mk(T('Sell for market price'), T('Enter a price per piece: the immediate purchase price is that price x quantity, the minimum bid is the shop price x quantity.'));
      const look = function (btn, label, on) {
        btn.text((on ? '\u2713 ' : '') + label).css(on
          ? { background: 'linear-gradient(#5fae2e,#2f6d1d)', color: '#fff', 'border-color': '#1d4a10', 'box-shadow': '0 0 0 2px #9be25f' }
          : { background: 'linear-gradient(#755331,#3f2916)', color: '#f1dfb5', 'border-color': '#2a1a0c', 'box-shadow': 'none' });
      };
      const paint = function () {
        look(bFree, T('Sell for free'), mode === 'free');
        look(bMarket, T('Sell for market price'), mode === 'market');
        // hidden, not removed: the dialog keeps its size, so nothing jumps when the mode is switched
        pieceLabel.css('visibility', mode === 'market' ? 'visible' : 'hidden');
        pieceBox.css('visibility', mode === 'market' ? 'visible' : 'hidden');
      };
      const setMode = function (m) {
        mode = mode === m ? null : m;
        paint();
        update();
        if (mode === 'market') {
          // start from the market price when it is known (learned from the job windows you opened)
          if (!num(piece) && CORE.marketPrice) { const p = CORE.marketPrice(itemId); if (p) { piece.val(String(p)); update(); } }
          piece.focus();
        }
      };
      bFree.on('click', function (ev) { ev.preventDefault(); setMode('free'); });
      bMarket.on('click', function (ev) { ev.preventDefault(); setMode('market'); });

      // typing in the fields yourself: the price field leaves the mode, the minimum bid is never filled in again
      max.on('input keyup change', function () { if (!setting && mode) { mode = null; paint(); } });
      min.on('input keyup change', function () { if (!setting) minAuto = false; });
      qty.on('input keyup change', update);
      piece.on('input keyup change', function () { if (mode === 'market') update(); });

      // ---- placement: the buttons under the whole price table (below the recipient dropdown); the piece price in the spacer row below the prices ----
      const bar = $('<div class="twqol_bar" style="text-align:center;margin:8px 0 2px;"></div>').append(bFree).append(bMarket);
      const priceTable = max.closest('table');
      priceTable.after(bar);   // under the "sell to anyone" dropdown
      const tr = max.closest('tr');
      const next = tr.next('tr');
      pieceLabel.css('visibility', 'hidden');
      pieceBox.css('visibility', 'hidden');
      if (next.length && next.children('td').length === 1) {
        // split the one-cell spacer row into four cells like the row above, and use the last two
        const cells = tr.children('td');
        next.empty();
        for (let i = 0; i < 4; i++) next.append($('<td></td>').attr('style', (cells.eq(i).attr('style') || '')).css('white-space', 'nowrap'));
        next.children('td').eq(2).append(pieceLabel);
        next.children('td').eq(3).append(pieceBox);
      } else {
        priceTable.after($('<div style="text-align:center;margin:2px 0;"></div>').append(pieceLabel).append(pieceBox));
      }
    }

    function start() {
      const timer = setInterval(function () {
        if (W.jQuery && W.Ajax && W.ItemManager && document.body) {
          clearInterval(timer);
          hookAjax();
          const scan = function (root) {
            const el = root.id === 'market_createoffer_window' ? root : (root.querySelector && root.querySelector('#market_createoffer_window'));
            if (el) build(el);
          };
          new MutationObserver(function (muts) {
            for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) scan(n);
          }).observe(document.body, { childList: true, subtree: true });
          const open = document.getElementById('market_createoffer_window');
          if (open) build(open);
        }
      }, 500);
    }
    return function () { if (cfg.sellHelper) start(); };
  }

  // ======================================================================================================
  // MODULE: notification bar (left edge): show every button, no scrolling
  // ======================================================================================================
  function moduleNotiBar() {
    const BIG_VIEW = 99, MIN_CAP = 60;
    function apply() {
      const NB = W.WestUi && W.WestUi.NotiBar;
      const bar = NB && NB.main;
      if (!bar || typeof bar.setMaxView !== 'function' || !bar.list || !bar.content) return false;
      if (!bar.__twQolAll) {
        bar.__twQolAll = true;
        const view = bar.setMaxView, size = bar.setMaxSize;
        // whenever the game tries to limit the bar again, keep it unlimited
        bar.setMaxView = function () { return view.call(this, BIG_VIEW); };
        bar.setMaxSize = function (n) { return size.call(this, n === -1 ? -1 : Math.max(n || 0, MIN_CAP)); };
      }
      bar.setMaxSize(MIN_CAP);
      bar.setMaxView(BIG_VIEW);
      if (bar.offset) { bar.offset = 0; bar.update(); }
      return true;
    }
    return function () {
      if (!cfg.notiBarAll) return;
      let tries = 0;
      const t = setInterval(function () {
        tries++;
        if (apply() || tries > 240) clearInterval(t);
      }, 500);
    };
  }

  // ======================================================================================================
  // START
  // ======================================================================================================
  function startAll() {
    [moduleMarketFixer, moduleTopBar, moduleDeals, moduleFairPrice, moduleSellHelper, moduleNotiBar].forEach(function (m) {
      try { m(CORE)(); } catch (e) { console.error('[The West QOL Toolkit]', e); }
    });
    // settings button in the game's right-side menu column (where other scripts keep their buttons)
    let tries = 0;
    const t = setInterval(function () {
      tries++;
      const bar = document.getElementById('ui_menubar');
      if (bar) {
        clearInterval(t);
        if (document.getElementById('twqol_menu')) return;
        const c = document.createElement('div');
        c.className = 'ui_menucontainer';
        c.id = 'twqol_menu';
        const l = document.createElement('div');
        l.className = 'menulink';
        l.title = T('The West QOL Toolkit settings');
        l.style.cssText = 'background-image:linear-gradient(#755331,#3f2916);color:#f1dfb5;font:bold 17px/25px Arial,sans-serif;' +
          'text-align:center;padding:0;margin:0;box-sizing:border-box;border-radius:3px;';
        l.textContent = '\u2699';
        l.addEventListener('click', openSettings);
        const bt = document.createElement('div');
        bt.className = 'menucontainer_bottom';
        c.appendChild(l);
        c.appendChild(bt);
        bar.appendChild(c);
      } else if (tries > 240) clearInterval(t);
    }, 500);
  }
  startAll();
})();
