/* Кубок FIFA PS5 — экраны турнира. Данные: bracket.js и data-port.js. */
(function () {
  "use strict";

  var B = window.FifaBracket;
  var CFG = window.FIFA_CONFIG || {};
  var STORAGE_KEY = "fifa-ps5-cup-v1";

  var SCHEDULE = [
    { when: "12:00–12:45", title: "Сбор и жеребьёвка", text: "Регистрация, взносы и рассадка по консолям." },
    { when: "12:45–13:35", title: "1/16 финала", text: "16 матчей: 15 консолей сразу и один матч второй волны." },
    { when: "13:40–14:05", title: "1/8 финала", text: "Восемь матчей, победитель проходит дальше." },
    { when: "14:10–14:35", title: "1/4 финала", text: "Четыре матча." },
    { when: "14:35–14:50", title: "Перерыв", text: "Пятнадцать минут." },
    { when: "14:50–15:40", title: "Полуфиналы", text: "Два полуфинала, каждый из двух матчей. В зачёт идёт сумма." },
    { when: "15:45–16:10", title: "Матч за 3-е место", text: "Один матч за бронзу." },
    { when: "16:15–17:05", title: "Финал", text: "Два матча, победитель по сумме. Если равенство — пенальти." },
    { when: "17:15", title: "Награждение", text: "Подиум, призы и лучший гол дня." }
  ];

  var RULES = [
    ["Время", "Два тайма по 6 минут."],
    ["Ничья", "Дополнительное время, затем пенальти. В полуфинале и финале два матча, побеждает сумма голов. Остальные раунды — один матч."],
    ["Опоздание", "Опоздание на 10 минут — техническое поражение 0:3."],
    ["Паузы", "Не больше двух пауз, и только когда мяч вне игры."],
    ["Клуб", "Клуб закреплён за игроком на весь турнир и не меняется."],
    ["Споры", "Спорные моменты решает организатор. Его слово окончательное."],
    ["Консоли", "В клубе 15 PS5. В 1/16 пятнадцать матчей идут сразу, шестнадцатый — вторая волна."],
    ["Лучший гол", "Отдельный приз за лучший гол дня. Победителя называет организатор."]
  ];

  var TABS = [
    ["tournaments", "★", "Турниры"],
    ["players", "◎", "Жеребьёвка"],
    ["bracket", "▦", "Сетка"],
    ["schedule", "◷", "Расписание"],
    ["rules", "✦", "Правила"]
  ];

  var readOnly = false;
  var state = null;
  var repo = null;
  var participants = {};
  var organizer = false;
  var screen = "tournaments";
  var roundIndex = 0;
  var modal = null;
  var animating = false;
  var drawToken = 0;
  var deferredPrompt = null;
  var soundOn = false;
  try { soundOn = localStorage.getItem("fifa-sound") === "1"; } catch (e) {}
  var toastTimer = 0;
  var confettiTimer = 0;
  var confettiOn = false;
  var lastReady = false;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function money(n) {
    var v = Math.round(Number(n) || 0);
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + "\u00a0₽";
  }

  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return iso || "";
    var months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    var days = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number(m[3]) + " " + months[Number(m[2]) - 1] + " " + m[1] + ", " + days[d.getDay()];
  }

  function toast(text) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2600);
  }

  function isWide() {
    return window.matchMedia("(min-width: 1100px)").matches;
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function deviceKind() {
    var ua = navigator.userAgent || "";
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
    if (/Android/i.test(ua)) return "android";
    return "other";
  }

  function cryptoRandom() {
    if (window.crypto && crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] / 4294967296;
    }
    return Math.random();
  }

  function seedOvr(club) {
    if (!club) return "—";
    if (club.pot === 1) return 93 - club.id;
    return 84 - (club.id - 16);
  }

  function blip() {
    if (!soundOn) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!blip.ctx) blip.ctx = new Ctx();
      var ctx = blip.ctx;
      if (ctx.state === "suspended") ctx.resume();
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = "square";
      o.frequency.value = 720;
      g.gain.setValueAtTime(0.028, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.045);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.05);
    } catch (err) {}
  }

  function crestInk(hex) {
    var h = String(hex || "#000").replace("#", "");
    if (h.length < 6) return "#fff";
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? "#141414" : "#fff";
  }

  function crestHTML(club, small) {
    if (!club) return '<i class="crest" style="--a:#333;--b:#111;--inkc:#fff">?</i>';
    return '<i class="crest" style="--a:' + club.a + ";--b:" + club.b + ";--inkc:" + crestInk(club.a) + '">' + esc(club.short) + "</i>";
  }

  function trophySVG(cls) {
    return '<svg class="' + (cls || "trophy-svg") + '" viewBox="0 0 64 64" aria-hidden="true">' +
      '<path fill="url(#goldGrad)" d="M18 20h28l-2 8c-1 8-6 13-12 13s-11-5-12-13l-2-8z"/>' +
      '<path fill="none" stroke="url(#goldGrad)" stroke-width="3" stroke-linecap="round" d="M18 23c-8 1-10 8-7 12 2 3 7 3 9 0M46 23c8 1 10 8 7 12-2 3-7 3-9 0"/>' +
      '<rect x="29" y="39" width="6" height="8" rx="1" fill="url(#goldGrad)"/>' +
      '<rect x="20" y="47" width="24" height="5" rx="2" fill="url(#goldGrad)"/>' +
      '<polygon points="32,6 34.2,12 40.6,12.3 35.6,16.2 37.2,22.4 32,18.8 26.8,22.4 28.4,16.2 23.4,12.3 29.8,12" fill="url(#goldGrad)"/>' +
      "</svg>";
  }

  function activeTournament() {
    for (var i = 0; i < state.tournaments.length; i++) {
      if (state.tournaments[i].id === state.activeTournamentId) return state.tournaments[i];
    }
    return state.tournaments[0];
  }

  function parseLines(text) {
    var all = String(text || "").split(/\r?\n/).map(function (s) { return s.replace(/\s+/g, " ").trim(); }).filter(Boolean);
    return { names: all.slice(0, 32), extra: Math.max(0, all.length - 32) };
  }

  function championReady() {
    return !!(state.players && B.placements(state.players, state.matches).ready);
  }

  function bothKnown(m) {
    if (!state.players) return false;
    return !!(B.sidePlayer(state.players, state.matches, m, 0) && B.sidePlayer(state.players, state.matches, m, 1));
  }

  function unfinished(m) {
    return bothKnown(m) && B.matchWinnerSide(state.players, state.matches, m) == null;
  }

  function phase(m) {
    if (!state.players) return "wait";
    if (B.matchWinnerSide(state.players, state.matches, m) != null) return "done";
    if (!bothKnown(m)) return "wait";
    if (!m.console) return "ready";
    var others = state.matches.some(function (o) {
      return o.id !== m.id && o.console === m.console && unfinished(o);
    });
    if (m.wave2 && others) return "queued";
    return "live";
  }

  function phaseText(m) {
    var p = phase(m);
    var map = { wait: "Ожидание", ready: "Можно играть", live: "Идёт", queued: "Вторая волна", done: "Сыгран" };
    var label = map[p] || "";
    if (m.console && (p === "live" || p === "queued" || p === "ready" || p === "done")) label += " · PS5 " + m.console;
    return label;
  }

  function scoreText(m) {
    var t = B.totals(m);
    if (!t.ok) return "– : –";
    var s = t.h + " : " + t.a;
    if (t.h === t.a && (m.pens === 0 || m.pens === 1)) s += " пен.";
    return s;
  }

  function syncSnapshots() {
    if (readOnly) return;
    state.tournaments.forEach(function (t) {
      var list = participants[t.id] || [];
      t.paidSnapshot = list.filter(function (p) { return p.paid; }).length;
      t.listSnapshot = list.length;
    });
  }

  function paidCount(t) {
    if (!readOnly && participants[t.id]) return participants[t.id].filter(function (p) { return p.paid; }).length;
    return t.paidSnapshot || 0;
  }

  function spotsFull(t) {
    if (!readOnly) return (participants[t.id] || []).length >= 32;
    return (t.listSnapshot || 0) >= 32;
  }

  function persist() {
    if (readOnly) return;
    syncSnapshots();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function loadLocal() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!raw) return B.createInitialState(CFG);
      return B.sanitizeState(raw, CFG);
    } catch (e) {
      return B.createInitialState(CFG);
    }
  }

  function appBase() {
    var path = location.pathname;
    if (path.endsWith("/index.html")) path = path.slice(0, -"index.html".length);
    if (!path.endsWith("/")) path += "/";
    return location.origin + path;
  }

  function readPacked() {
    var h = location.hash || "";
    if (h.indexOf("#f1.") !== 0) return null;
    try {
      var json = LZString.decompressFromEncodedURIComponent(h.slice(4));
      if (!json) return null;
      return B.unpackState(JSON.parse(json));
    } catch (e) {
      return null;
    }
  }

  function shareUrl() {
    syncSnapshots();
    var packed = B.packState(state);
    return appBase() + "#f1." + LZString.compressToEncodedURIComponent(JSON.stringify(packed));
  }

  function configPlaceholder() {
    var blob = JSON.stringify((CFG && CFG.payment) || {}) + ((CFG.telegram && CFG.telegram.username) || "");
    return /0000 0000|900 000-00-00|ИМЯ ФАМИЛИЯ|organizer_username|PLACEHOLDER|REPLACE_WITH|НАЗВАНИЕ БАНКА/i.test(blob);
  }

  function tgUser() {
    return String((CFG.telegram && CFG.telegram.username) || "").replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "");
  }

  function regMessage(t, data) {
    return [
      "Заявка на турнир: " + t.title,
      "Дата: " + formatDate(t.date) + " " + t.time,
      "Имя: " + data.name,
      "Ник: " + (data.nickname || "—"),
      "Контакт: " + data.contact,
      "Взнос: " + money(t.fee),
      t.paymentType === "prepay" ? "оплатил" : "оплачу на месте"
    ].join("\n");
  }

  function telegramLink(t, data) {
    return "https://t.me/" + tgUser() + "?text=" + encodeURIComponent(regMessage(t, data));
  }

  function payLabel(t) {
    return t.paymentType === "prepay" ? "Предоплата" : "Оплата на месте";
  }

  async function reloadParticipants() {
    if (readOnly || !repo) return;
    try {
      participants = await repo.loadAll();
    } catch (e) {
      participants = participants || {};
    }
  }

  function render() {
    document.body.classList.toggle("wide", isWide());
    document.body.dataset.screen = screen;
    document.body.dataset.readonly = readOnly ? "1" : "0";
    document.body.dataset.organizer = organizer ? "1" : "0";
    document.body.dataset.champion = championReady() ? "1" : "0";
    document.body.dataset.sound = soundOn ? "1" : "0";
    document.getElementById("header").innerHTML = headerHTML();
    document.getElementById("nav").innerHTML = navHTML();
    var main = document.getElementById("app");
    var prev = main.scrollTop;
    main.innerHTML = mainHTML();
    main.classList.remove("screen-in");
    void main.offsetWidth;
    main.classList.add("screen-in");
    main.scrollTop = prev;
    document.getElementById("overlay").innerHTML = modal ? modalHTML() : "";
    if (screen === "podium" && championReady()) startConfetti();
    else stopConfetti();
    if (screen === "bracket" && isWide()) {
      layoutBoard();
      requestAnimationFrame(layoutBoard);
    }
    var scroller = document.getElementById("round-scroller");
    if (scroller) scroller.scrollLeft = roundIndex * scroller.clientWidth;
  }

  function headerHTML() {
    var cup = championReady()
      ? '<button type="button" class="icon-btn gold" data-act="goto" data-screen="podium" aria-label="Кубок">' + trophySVG("trophy-svg") + "</button>"
      : "";
    var org = readOnly ? "" : '<button type="button" class="icon-btn' + (organizer ? " on" : "") + '" data-act="open-pin" aria-label="Организатор">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2a5 5 0 00-5 5v2H6a2 2 0 00-2 2v9h16v-9a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 7V7a3 3 0 016 0v2H9z"/></svg></button>';
    return '<div class="brand"><div class="brand-mark">' + trophySVG("trophy-svg") + "</div><div><strong>Кубок FIFA PS5</strong><small>PlayStation клуб · 32 игрока</small></div></div>" +
      '<div class="head-actions">' +
      '<button type="button" class="icon-btn' + (soundOn ? " on" : "") + '" data-act="toggle-sound" aria-label="Звук" aria-pressed="' + (soundOn ? "true" : "false") + '"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3z"/><path fill="none" stroke="currentColor" stroke-width="2" d="' + (soundOn ? "M16 8a5 5 0 010 8" : "M16 9l5 6M21 9l-5 6") + '"/></svg></button>' +
      '<button type="button" class="icon-btn" data-act="open-share" aria-label="Поделиться сеткой"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M14 4l7 7-7 7v-4H9c-4 0-7 2-8 6 1-6 4-9 8-9h5V4z"/></svg></button>' +
      '<button type="button" class="icon-btn" data-act="open-install" aria-label="Установить"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 3l5 5h-3v6h-4V8H7l5-5zM5 19h14v2H5z"/></svg></button>' +
      org + cup + "</div>";
  }

  function navHTML() {
    return TABS.map(function (tab) {
      return '<button type="button" class="tab' + (screen === tab[0] ? " on" : "") + '" data-act="goto" data-screen="' + tab[0] + '"><span>' + tab[1] + "</span>" + tab[2] + "</button>";
    }).join("");
  }

  function mainHTML() {
    if (screen === "players") return playersHTML();
    if (screen === "bracket") return bracketHTML();
    if (screen === "schedule") return scheduleHTML();
    if (screen === "rules") return rulesHTML();
    if (screen === "podium") return podiumHTML();
    return tournamentsHTML();
  }

  function banner() {
    if (!readOnly) return "";
    return '<p class="readonly-banner">Режим просмотра · сетка только для чтения</p>';
  }

  function tournamentsHTML() {
    var t = activeTournament();
    var html = banner();
    html += '<p class="eyebrow">Главное меню</p><h1 class="gold-title">Кубок</h1>';
    html += '<p class="lead">Ночной турнир. Первые три кубка — наличные в клубе, дальше — предоплата.</p>';
    html += menuTiles();
    if (organizer && configPlaceholder()) {
      html += '<p class="warn">В config.js всё ещё стоят заглушки: PIN, СБП, карта и Telegram. Замените их до турнира.</p>';
    }
    html += heroCard(t, true);
    if (!isStandalone() && !localStorage.getItem("fifa-install-hide")) {
      html += '<section class="install-card"><h2>На экран телефона</h2><p class="muted">Кубок ставится на домашний экран и открывается как приложение.</p>' +
        '<button type="button" class="btn-ghost btn-block" data-act="open-install" style="margin-top:10px">Как установить</button></section>';
    }
    html += '<div class="section-head"><h2>Все турниры</h2>' +
      (organizer ? '<button type="button" class="btn-quiet" data-act="add-tournament">Новый</button>' : "") + "</div>";
    html += '<div class="tour-scroll">' + state.tournaments.map(function (item) {
      return '<button type="button" class="tour-mini' + (item.id === t.id ? " on" : "") + '" data-act="select-tournament" data-tid="' + esc(item.id) + '">' +
        '<span class="badge ' + (item.paymentType === "prepay" ? "badge-prepay" : "badge-onsite") + '">' + payLabel(item) + "</span>" +
        "<strong>" + esc(item.title) + "</strong>" +
        '<span class="muted">' + esc(formatDate(item.date)) + " · " + esc(item.time) + "</span>" +
        "<span>" + money(item.fee) + " · " + paidCount(item) + "/32</span></button>";
    }).join("") + "</div>";
    if (organizer) html += adminHTML(t);
    else if (!readOnly) html += '<p class="muted">Список игроков и оплаты открываются в режиме организатора.</p>';
    return html;
  }

  function menuTiles() {
    var tiles = [
      ["players", "Жеребьёвка", "32 игрока"],
      ["bracket", "Сетка", "Плей-офф"],
      ["schedule", "Расписание", "12:00–17:15"],
      ["rules", "Призы", "16 · 10 · 6"],
      ["podium", "Кубок", championReady() ? "Чемпион есть" : "Подиум"]
    ];
    return '<div class="menu-grid">' + tiles.map(function (tile) {
      return '<button type="button" class="menu-tile" data-act="goto" data-screen="' + tile[0] + '"><span>' + tile[1] + "</span><small>" + tile[2] + "</small></button>";
    }).join("") + "</div>";
  }

  function heroCard(t, big) {
    var full = spotsFull(t);
    return '<article class="ticket"><div class="star" aria-hidden="true">★</div>' +
      '<div class="ticket-kicker"><span class="badge ' + (t.paymentType === "prepay" ? "badge-prepay" : "badge-onsite") + '">' + payLabel(t) + "</span>" +
      (organizer ? '<button type="button" class="btn-quiet" data-act="edit-tournament" data-tid="' + esc(t.id) + '">Изменить</button>' : "") +
      "</div><h2>" + esc(t.title) + "</h2>" +
      '<p class="muted">' + esc(formatDate(t.date)) + " · " + esc(t.time) + " · 15 PS5</p>" +
      '<p class="fee">' + money(t.fee) + "</p>" +
      '<div class="prize-row">' +
      prizeChip("1 место", t.prizes[0], "p1") + prizeChip("2 место", t.prizes[1], "p2") + prizeChip("3 место", t.prizes[2], "p3") +
      "</div>" +
      '<p class="spots">Оплатили <b>' + paidCount(t) + "/32</b></p>" +
      (big ? '<button type="button" class="btn-gold btn-block" data-act="open-register" data-tid="' + esc(t.id) + '"' + (full ? " disabled" : "") + ">" +
        (full ? "Все места заняты" : "Записаться") + "</button>" : "") +
      "</article>";
  }

  function prizeChip(label, sum, cls) {
    return '<div class="prize ' + cls + '"><span>' + label + "</span><b>" + money(sum) + "</b></div>";
  }

  function adminHTML(t) {
    var list = participants[t.id] || [];
    var paid = list.filter(function (p) { return p.paid; }).length;
    var rows = list.map(function (p) {
      return '<article class="person"><div><b>' + esc(p.nickname || p.name) + "</b>" +
        (p.nickname ? '<div class="meta">' + esc(p.name) + "</div>" : "") +
        '<div class="meta">' + esc(p.contact || "без контакта") + "</div></div>" +
        '<div class="row-actions"><button type="button" class="paid' + (p.paid ? " on" : "") + '" data-act="toggle-paid" data-tid="' + esc(t.id) + '" data-id="' + esc(p.id) + '" data-paid="' + (p.paid ? "1" : "0") + '">' +
        (p.paid ? "Оплатил" : "Не оплатил") + "</button>" +
        '<button type="button" class="btn-danger" data-act="remove-participant" data-tid="' + esc(t.id) + '" data-id="' + esc(p.id) + '">Убрать</button></div></article>';
    }).join("");
    return '<section class="admin"><div class="admin-head"><div><p class="eyebrow">Организатор</p><h2>Участники</h2></div><div class="counter">' + paid + "/32</div></div>" +
      '<p class="muted">В жеребьёвку попадают только оплатившие. Счётчик — это они.</p>' +
      '<form id="add-player-form">' +
      '<label for="add-name">Имя</label><input id="add-name" type="text" maxlength="40" autocomplete="name">' +
      '<label for="add-nick">Ник</label><input id="add-nick" type="text" maxlength="40">' +
      '<label for="add-contact">Телефон или Telegram</label><input id="add-contact" type="text" maxlength="40">' +
      '<label class="check"><input id="add-paid" type="checkbox"> Уже оплатил</label>' +
      '<button class="btn-ghost btn-block" type="submit" style="margin-top:8px">Добавить игрока</button></form>' +
      rows +
      '<button type="button" class="btn-gold btn-block" style="margin-top:12px" data-act="transfer-draw"' + (paid ? "" : " disabled") + ">Перенести в жеребьёвку</button>" +
      "</section>";
  }

  function playersHTML() {
    var parsed = parseLines(state.draft);
    var html = banner() + '<p class="eyebrow">Жеребьёвка</p><h1 class="gold-title">32 имени</h1>';
    html += '<p class="lead">Первый в каждой паре 1/16 получает клуб из корзины 1, второй — из корзины 2. Клуб не меняется до конца дня.</p>';
    if (readOnly) {
      if (!state.players) return html + '<p class="muted">Жеребьёвка ещё не проведена.</p>';
      return html + pairsBlock();
    }
    html += '<label for="names-input">Имена, каждое с новой строки</label>';
    html += '<textarea id="names-input" maxlength="4000" placeholder="Артём&#10;Миша">' + esc(state.draft) + "</textarea>";
    html += '<div class="names-meta"><span><b id="names-count">' + parsed.names.length + "</b> / 32</span>" +
      (parsed.extra ? "<span>Лишние строки не войдут</span>" : "<span>Пустые места станут «Вакансия»</span>") + "</div>";
    html += '<div class="chips" id="name-preview">' + chipsHTML(state.draft) + "</div>";
    html += '<button type="button" class="btn-gold btn-block" style="margin-top:12px" data-act="start-draw">Провести жеребьёвку</button>';
    html += '<div class="row-actions" style="margin-top:10px">' +
      '<button type="button" class="btn-ghost" data-act="export-json">Экспорт</button>' +
      '<button type="button" class="btn-ghost" data-act="import-json">Импорт</button>' +
      '<button type="button" class="btn-danger" data-act="reset">Сбросить</button></div>';
    html += '<input id="import-file" type="file" accept="application/json" hidden>';
    if (state.players) html += pairsBlock();
    return html;
  }

  function chipsHTML(text) {
    var names = parseLines(text).names;
    if (!names.length) return '<span class="faint">Пока пусто</span>';
    return names.map(function (n, i) { return '<span class="chip">' + (i + 1) + ". " + esc(n) + "</span>"; }).join("");
  }

  function pairsBlock() {
    var html = '<h2 style="margin-top:18px">Пары 1/16</h2><div class="draw-list" style="margin-top:8px">';
    for (var i = 0; i < 16; i++) html += pairHTML(state.players[i * 2], state.players[i * 2 + 1], i);
    return html + "</div>";
  }

  function futCard(player, pot) {
    var club = B.club(player.clubId);
    return '<div class="fut" data-pot="' + pot + '"><div class="fut-top"><b class="fut-ovr">' + seedOvr(club) + '</b><span>К' + pot + '</span></div>' +
      crestHTML(club) + '<b class="fut-name">' + esc(player.name) + "</b><small>" + esc(club.name) + "</small></div>";
  }

  function pairHTML(home, away, i) {
    return '<div class="pair" data-pair="' + i + '">' + futCard(home, 1) + '<span class="vs">VS</span>' + futCard(away, 2) + "</div>";
  }

  function bracketHTML() {
    var t = activeTournament();
    var html = '<div class="screen screen-bracket">' + banner();
    html += '<div class="bracket-cta"><div><strong>' + esc(t.title) + "</strong><div class=\"muted\">" +
      esc(formatDate(t.date)) + " · " + payLabel(t) + " · " + paidCount(t) + "/32</div></div>" +
      '<div class="cta-actions">' +
      (readOnly ? "" : '<button type="button" class="btn-quiet" data-act="auto-consoles">Развести 15 консолей</button>') +
      '<button type="button" class="btn-gold" data-act="open-register" data-tid="' + esc(t.id) + '">Записаться</button></div></div>';
    html += liveStrip();
    if (!state.players) {
      return html + '<section class="panel"><h2>Сетки пока нет</h2><p class="muted">Сначала проведите жеребьёвку — пары сами встанут в 1/16.</p>' +
        '<button type="button" class="btn-gold" data-act="goto" data-screen="players">К жеребьёвке</button></section></div>';
    }
    if (isWide()) html += desktopBoard();
    else html += mobileBoard();
    return html + "</div>";
  }

  function liveStrip() {
    if (!state.players) return "";
    var items = state.matches.filter(function (m) {
      var p = phase(m);
      return p === "live" || p === "queued";
    });
    if (!items.length) return "";
    return '<div class="live-strip">' + items.map(function (m) {
      return '<button type="button" class="live-chip" data-act="open-match" data-id="' + m.id + '"><i class="dot"></i>' + esc(phaseText(m)) + "</button>";
    }).join("") + "</div>";
  }

  function mobileBoard() {
    var tabs = B.ROUNDS.map(function (r, i) {
      return '<button type="button" data-act="round-tab" data-round-tab data-i="' + i + '" class="' + (i === roundIndex ? "on" : "") + '">' + esc(r.title) + "</button>";
    }).join("");
    var pages = B.ROUNDS.map(function (r) {
      var cards = "";
      for (var i = 0; i < r.count; i++) cards += mobileCard(r.id + "-" + i);
      return '<section class="round-page">' + cards + "</section>";
    }).join("");
    return '<div class="round-tabs">' + tabs + '</div><div class="round-scroller" id="round-scroller">' + pages + "</div>";
  }

  function sideBlock(player, winnerSide, side) {
    if (!player) return '<div class="side"><b>—</b><small>ожидание</small></div>';
    var club = B.club(player.clubId);
    var cls = winnerSide == null ? "" : (winnerSide === side ? " win-name" : "");
    return '<div class="side"><div>' + crestHTML(club) + "</div><b class=\"" + cls + "\">" + esc(player.name) + "</b><small>" + esc(club.name) + "</small></div>";
  }

  function mobileCard(id) {
    var m = B.matchById(state.matches, id);
    var h = state.players ? B.sidePlayer(state.players, state.matches, m, 0) : null;
    var a = state.players ? B.sidePlayer(state.players, state.matches, m, 1) : null;
    var w = state.players ? B.matchWinnerSide(state.players, state.matches, m) : null;
    var p = phase(m);
    return '<button type="button" class="mcard fixture ' + p + '" data-act="open-match" data-open-match="' + m.id + '" data-id="' + m.id + '" data-legs="' + m.legs + '" data-phase="' + p + '" data-score="' + esc(scoreText(m)) + '">' +
      "<header><span>" + esc(roundName(m.round)) + " · матч " + (m.index + 1) + (m.wave2 ? " · II волна" : "") + "</span><span>" + esc(phaseText(m)) + "</span></header>" +
      '<div class="versus">' + sideBlock(h, w, 0) + '<div class="score">' + esc(scoreText(m)) + "</div>" + sideBlock(a, w, 1) + "</div>" +
      (m.legs === 2 ? '<div class="bmeta">' + legLine(m) + "</div>" : "") +
      "</button>";
  }

  function legLine(m) {
    return m.scores.map(function (s, i) {
      var hs = s.h == null ? "–" : s.h;
      var as = s.a == null ? "–" : s.a;
      return "матч " + (i + 1) + " " + hs + ":" + as;
    }).join(" · ");
  }

  function roundName(id) {
    for (var i = 0; i < B.ROUNDS.length; i++) if (B.ROUNDS[i].id === id) return B.ROUNDS[i].full;
    return id;
  }

  function desktopBoard() {
    function col(side, round, title) {
      var meta = { r32: 8, r16: 4, qf: 2, sf: 1 }[round];
      var start = side === "l" ? 0 : { r32: 8, r16: 4, qf: 2, sf: 1 }[round];
      var cards = "";
      for (var i = 0; i < meta; i++) {
        var index = start + i;
        cards += miniMatch(round + "-" + index, side, i);
      }
      return '<div class="bcol"><div class="blabel">' + title + "</div>" + cards + "</div>";
    }
    return '<div class="board-wrap"><div class="board" id="board">' +
      col("l", "r32", "1/16") + col("l", "r16", "1/8") + col("l", "qf", "1/4") + col("l", "sf", "1/2") +
      centerCol() +
      col("r", "sf", "1/2") + col("r", "qf", "1/4") + col("r", "r16", "1/8") + col("r", "r32", "1/16") +
      '<svg id="wires"></svg></div></div>';
  }

  function miniMatch(id, side, local) {
    var m = B.matchById(state.matches, id);
    var h = B.sidePlayer(state.players, state.matches, m, 0);
    var a = B.sidePlayer(state.players, state.matches, m, 1);
    var w = B.matchWinnerSide(state.players, state.matches, m);
    var t = B.totals(m);
    function row(player, sideIndex, goals) {
      var club = player ? B.club(player.clubId) : null;
      var cls = w == null ? "" : (w === sideIndex ? "win" : "lose");
      var nm = player ? player.name : "ожидание";
      var sc = t.ok ? goals : "–";
      return '<div class="brow ' + cls + '">' + (club ? crestHTML(club) : crestHTML(null)) +
        '<span class="nm" title="' + esc(nm) + '">' + esc(nm) + '</span><span class="sc">' + sc + "</span></div>";
    }
    return '<button type="button" class="bmatch ' + phase(m) + '" data-act="open-match" data-open-match="' + m.id + '" data-mid="' + m.id + '" data-round="' + m.round + '" data-side="' + side + '" data-local="' + local + '" data-phase="' + phase(m) + '" data-score="' + esc(scoreText(m)) + '">' +
      row(h, 0, t.h) + row(a, 1, t.a) +
      '<div class="bmeta">' + (m.round === "third" ? "3-е место · " : "") + esc(phaseText(m)) + (m.wave2 ? " · II" : "") + "</div></button>";
  }

  function centerCol() {
    return '<div class="bcol"><div class="blabel">Кубок</div>' +
      '<div class="trophy-slot" data-center="trophy">' + trophySVG("trophy-svg") + '<div class="center-label">ФИНАЛ</div></div>' +
      finalish("f-0", "final") + finalish("third-0", "third") + "</div>";
  }

  function finalish(id, kind) {
    var m = B.matchById(state.matches, id);
    var button = miniMatch(id, "c", 0).replace(' data-local="0"', "").replace(' data-side="c"', "");
    return button.replace('class="bmatch', 'data-center="' + kind + '" class="bmatch');
  }

  function scheduleHTML() {
    var t = activeTournament();
    var now = liveScheduleIndex();
    var html = banner() + '<p class="eyebrow">День турнира</p><h1 class="gold-title">' + esc(formatDate(t.date)) + "</h1>";
    html += '<p class="lead">Сценарий субботы в клубе. Полуфинал и финал — по два матча.</p>';
    html += '<div class="timeline">' + SCHEDULE.map(function (row, i) {
      return '<article class="slot' + (i === now ? " now" : "") + '"><div class="rail"><i></i><b></b></div><div class="body">' +
        '<div class="when">' + row.when + "</div><h2>" + row.title + "</h2><p class=\"muted\">" + row.text + "</p></div></article>";
    }).join("") + "</div>";
    return html;
  }

  function liveScheduleIndex() {
    var t = activeTournament();
    var now = new Date();
    var iso = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
    if (!t || t.date !== iso) return -1;
    var mins = now.getHours() * 60 + now.getMinutes();
    var ranges = [["12:00", "12:45"], ["12:45", "13:35"], ["13:40", "14:05"], ["14:10", "14:35"], ["14:35", "14:50"], ["14:50", "15:40"], ["15:45", "16:10"], ["16:15", "17:05"], ["17:15", "23:59"]];
    for (var i = 0; i < ranges.length; i++) {
      if (mins >= hhmm(ranges[i][0]) && mins < hhmm(ranges[i][1])) return i;
    }
    return -1;
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hhmm(s) { var p = s.split(":"); return Number(p[0]) * 60 + Number(p[1]); }

  function rulesHTML() {
    var t = activeTournament();
    var bank = t.fee * 32;
    var html = banner() + '<p class="eyebrow">Правила и призы</p><h1 class="gold-title">Как играем</h1>';
    html += '<p class="lead">Взнос ' + money(t.fee) + ". Банк при 32 игроках — " + money(bank) + ".</p>";
    html += '<div class="prize-row">' + prizeChip("1 место", t.prizes[0], "p1") + prizeChip("2 место", t.prizes[1], "p2") + prizeChip("3 место", t.prizes[2], "p3") + "</div>";
    html += '<div class="rules">' + RULES.map(function (r) {
      return "<article class=\"rule\"><h3>" + r[0] + "</h3><p class=\"muted\">" + r[1] + "</p></article>";
    }).join("") + "</div>";
    html += '<section class="panel"><h2>Лучший гол дня</h2>';
    if (state.bestGoal) html += "<p><b>" + esc(state.bestGoal) + "</b></p>";
    else html += '<p class="muted">Имя появится здесь, когда организатор выберет гол.</p>';
    if (organizer) {
      html += '<label for="best-goal">Кто забил</label><input id="best-goal" type="text" maxlength="40" value="' + esc(state.bestGoal) + '">';
    }
    html += "</section>";
    return html;
  }

  function podiumHTML() {
    var t = activeTournament();
    var p = state.players ? B.placements(state.players, state.matches) : { ready: false };
    if (!p.ready) {
      return banner() + '<section class="panel"><h2>Подиум ещё закрыт</h2><p class="muted">Он откроется, когда сыграны финал и матч за 3-е место.</p></section>';
    }
    function card(place, player, sum, cls, caption) {
      var club = player ? B.club(player.clubId) : null;
      return '<div class="place ' + cls + '"><div class="who-name">' + esc(player ? player.name : "—") + "</div>" +
        '<div class="club-name">' + (club ? esc(club.name) : "") + "</div>" +
        '<div class="stand"><div class="eyebrow">' + caption + "</div><b>" + money(sum) + "</b></div></div>";
    }
    return '<div class="podium-screen">' + banner() + trophySVG("trophy-svg hero-trophy") +
      '<p class="eyebrow">Чемпион дня</p><h1 class="gold-title champ-name">' + esc(p.first.name) + "</h1>" +
      '<p class="muted">' + esc(B.club(p.first.clubId).name) + " · " + esc(t.title) + "</p>" +
      '<div class="podium-row">' +
      card(2, p.second, t.prizes[1], "p2", "2 место") +
      card(1, p.first, t.prizes[0], "p1", "1 место") +
      card(3, p.third, t.prizes[2], "p3", "3 место") +
      "</div>" +
      '<section class="panel"><h2>Лучший гол</h2><p>' + (state.bestGoal ? esc(state.bestGoal) : "Организатор назовёт победителя отдельно.") + "</p></section>" +
      '<div class="bracket-cta" style="margin-top:14px;text-align:left"><div><strong>' + esc(t.title) + '</strong><div class="muted">' +
      esc(formatDate(t.date)) + " · " + payLabel(t) + "</div></div>" +
      '<button type="button" class="btn-gold" data-act="open-register" data-tid="' + esc(t.id) + '">Записаться</button></div></div>';
  }

  function modalHTML() {
    if (!modal) return "";
    if (modal.type === "draw") return drawModal();
    if (modal.type === "confirm") return confirmModal();
    if (modal.type === "pin") return pinModal();
    if (modal.type === "install") return installModal();
    if (modal.type === "share") return shareModal();
    if (modal.type === "register") return registerModal();
    if (modal.type === "payment") return paymentModal();
    if (modal.type === "match") return matchModal();
    if (modal.type === "edit") return editModal();
    return "";
  }

  function drawModal() {
    return '<div class="overlay draw-full"><div class="draw-inner"><div class="draw-head"><p class="eyebrow">Жеребьёвка</p>' +
      '<h2 class="gold-title">Корзина 1 × корзина 2</h2><p class="shuffle" id="shuffle-line">Клубы перемешиваются…</p></div>' +
      '<div class="draw-list" id="draw-list"></div>' +
      '<button type="button" class="btn-gold btn-block" id="draw-done" data-act="draw-to-bracket" hidden>К сетке</button></div></div>';
  }

  function confirmModal() {
    return '<div class="overlay"><div class="sheet"><h2>' + esc(modal.title) + "</h2><p>" + esc(modal.text) + "</p>" +
      '<div class="row-actions"><button type="button" class="btn-ghost" data-act="close">Отмена</button>' +
      '<button type="button" class="' + (modal.danger ? "btn-danger" : "btn-gold") + '" data-act="confirm-yes">' + esc(modal.ok) + "</button></div></div></div>";
  }

  function pinModal() {
    var dots = "";
    for (var i = 0; i < 4; i++) dots += '<b style="opacity:' + (modal.value.length > i ? "1" : ".25") + '">●</b> ';
    var keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"];
    return '<div class="overlay"><div class="sheet' + (modal.error ? " shake" : "") + '"><h2>Режим организатора</h2>' +
      '<p class="muted">PIN только прячет кнопки. Для настоящей защиты позже подключается база.</p>' +
      '<p style="letter-spacing:.4em;font-size:22px">' + dots + "</p>" +
      (modal.error ? '<p class="form-error">Неверный PIN</p>' : "") +
      '<div class="pinpad">' + keys.map(function (k) {
        if (k === "⌫") return '<button type="button" data-act="pin-back">' + k + "</button>";
        if (k === "OK") return '<button type="button" data-act="pin-ok">OK</button>';
        return '<button type="button" data-act="pin-digit" data-digit="' + k + '">' + k + "</button>";
      }).join("") + "</div>" +
      (organizer ? '<button type="button" class="btn-danger btn-block" style="margin-top:10px" data-act="lock-org">Выйти</button>' : "") +
      '<button type="button" class="btn-ghost btn-block" style="margin-top:8px" data-act="close">Закрыть</button></div></div>';
  }

  function installModal() {
    var kind = deviceKind();
    return '<div class="overlay"><div class="sheet"><h2>Установить приложение</h2>' +
      '<p class="muted">«Кубок FIFA PS5» открывается с домашнего экрана без браузерной рамки.</p>' +
      '<div class="install-steps"><article class="step' + (kind === "ios" ? " me" : "") + '"><h3>iPhone</h3><ol>' +
      "<li>Откройте сайт в Safari.</li><li>Нажмите «Поделиться».</li><li>Выберите «На экран Домой» и подтвердите «Добавить».</li>" +
      "</ol></article><article class=\"step" + (kind === "android" ? " me" : "") + "\"><h3>Android</h3><ol>" +
      "<li>Откройте сайт в Chrome.</li><li>Меню браузера → «Установить приложение».</li><li>Если пункта нет: меню → «Добавить на главный экран».</li>" +
      "</ol>" +
      '<button type="button" class="btn-gold btn-block" id="install-app-btn" data-act="do-install"' + (deferredPrompt ? "" : " hidden") + ">Установить приложение</button>" +
      "</article></div>" +
      '<button type="button" class="btn-ghost btn-block" style="margin-top:10px" data-act="close">Понятно</button></div></div>';
  }

  function shareModal() {
    var full = modal.full ? " qr-full" : "";
    return '<div class="overlay' + full + '"><div class="sheet"><h2>Поделиться сеткой</h2>' +
      '<p class="muted">Болельщики видят сетку и кнопку «Записаться». Счёт они менять не могут. Телефоны игроков в ссылку не попадают.</p>' +
      '<div class="qr-box">' + (modal.svg || "<p>Ссылка слишком длинная для QR — скопируйте её.</p>") + "</div>" +
      '<textarea class="url-box" id="share-url" readonly>' + esc(modal.url) + "</textarea>" +
      '<div class="row-actions"><button type="button" class="btn-gold" data-act="copy-share">Копировать ссылку</button>' +
      '<button type="button" class="btn-ghost" data-act="share-full">' + (modal.full ? "Свернуть" : "На весь экран") + "</button></div>" +
      '<button type="button" class="btn-quiet btn-block" style="margin-top:8px" data-act="close">Закрыть</button></div></div>';
  }

  function registerModal() {
    var t = activeTournament();
    return '<div class="overlay"><form class="sheet" id="reg-form"><h2>Записаться</h2><p>' + esc(t.title) + " · " + esc(formatDate(t.date)) + " · " + money(t.fee) + "</p>" +
      '<p class="badge ' + (t.paymentType === "prepay" ? "badge-prepay" : "badge-onsite") + '">' + payLabel(t) + "</p>" +
      '<label for="reg-name">Имя</label><input id="reg-name" type="text" maxlength="40" required value="' + esc(modal.name || "") + '">' +
      '<label for="reg-nick">Ник в клубе</label><input id="reg-nick" type="text" maxlength="40" value="' + esc(modal.nick || "") + '">' +
      '<label for="reg-contact">Телефон или Telegram</label><input id="reg-contact" type="text" maxlength="40" required value="' + esc(modal.contact || "") + '">' +
      '<p class="form-error" id="form-error">' + esc(modal.error || "") + "</p>" +
      '<button class="btn-gold btn-block" type="submit">Записаться</button>' +
      '<button type="button" class="btn-ghost btn-block" style="margin-top:8px" data-act="close">Закрыть</button></form></div>';
  }

  function paymentModal() {
    var t = state.tournaments.filter(function (x) { return x.id === modal.tid; })[0] || activeTournament();
    var data = modal.data;
    var link = telegramLink(t, data);
    var html = '<div class="overlay"><div class="sheet"><h2>' + (t.paymentType === "prepay" ? "Предоплата" : "Вы записаны") + "</h2>";
    html += "<p>" + esc(modal.note || "") + "</p>";
    if (t.paymentType === "onsite") {
      html += '<article class="pay-card"><p class="badge badge-onsite">Оплата на месте</p><h3>' + money(t.fee) + " наличными в клубе</h3>" +
        "<p>Отдайте взнос организатору в день турнира. Место в сетке — после отметки «оплатил».</p></article>";
    } else {
      var pay = CFG.payment || {};
      html += '<article class="pay-card"><p class="badge badge-prepay">Перевод</p>';
      html += payLine("Сумма", money(t.fee));
      html += payLine("СБП", pay.sbpPhone || "—");
      html += payLine("Карта", pay.cardNumber || "—");
      html += payLine("Получатель", pay.recipient || "—");
      html += payLine("Банк", pay.bank || "—");
      html += payLine("Назначение", pay.purpose || "—");
      html += "</article>";
      if (CFG.telegram && CFG.telegram.groupUrl) {
        html += '<p><a href="' + esc(CFG.telegram.groupUrl) + '" target="_blank" rel="noopener">Группа турнира в Telegram</a></p>';
      }
      html += "<p>В сообщении организатору уже есть слово «оплатил».</p>";
    }
    html += '<pre class="preview">' + esc(regMessage(t, data)) + "</pre>";
    html += '<a class="btn-gold btn-block tg-link" style="margin-top:8px" target="_blank" rel="noopener" href="' + esc(link) + '">Написать организатору</a>';
    if (modal.blocked) html += '<p class="warn">Браузер не открыл Telegram сам — нажмите кнопку выше.</p>';
    html += '<button type="button" class="btn-ghost btn-block" style="margin-top:8px" data-act="close">Готово</button></div></div>';
    return html;
  }

  function payLine(label, value) {
    return '<div class="pay-line"><span>' + esc(label) + "</span><b>" + esc(value) + '</b>' +
      '<button type="button" class="btn-quiet" data-act="copy" data-copy="' + esc(value) + '">Копия</button></div>';
  }

  function playerTitle(player, fallback) {
    if (!player) return fallback;
    return player.name;
  }

  function matchModal() {
    var m = B.matchById(state.matches, modal.id);
    if (!m) return "";
    var h = state.players ? B.sidePlayer(state.players, state.matches, m, 0) : null;
    var a = state.players ? B.sidePlayer(state.players, state.matches, m, 1) : null;
    var html = '<div class="overlay"><form class="sheet" id="match-form" data-id="' + m.id + '" data-legs="' + m.legs + '" data-pens="' + (m.pens == null ? "" : m.pens) + '" data-console="' + (m.console || "") + '" data-wave2="' + (m.wave2 ? "1" : "0") + '">';
    html += "<h2>" + esc(roundName(m.round)) + "</h2>";
    html += "<p>" + esc(playerTitle(h, "Хозяева")) + " — " + esc(playerTitle(a, "Гости")) + "</p>";
    if (!h || !a) html += '<p class="warn">Сначала должны определиться участники этого матча.</p>';
    for (var i = 0; i < m.legs; i++) {
      var s = m.scores[i] || { h: null, a: null };
      html += "<label>" + (m.legs === 2 ? ("Матч " + (i + 1)) : "Счёт") + "</label>";
      html += '<div class="score-row"><input class="score-input" inputmode="numeric" data-leg="' + i + '" data-side="h" value="' + (s.h == null ? "" : s.h) + '"' + (readOnly ? " readonly" : "") + ">" +
        "<span>:</span><input class=\"score-input\" inputmode=\"numeric\" data-leg=\"" + i + "\" data-side=\"a\" value=\"" + (s.a == null ? "" : s.a) + "\"" + (readOnly ? " readonly" : "") + "></div>";
    }
    html += '<p id="agg" class="muted"></p>';
    if (!readOnly) {
      html += '<div class="pens"><button type="button" data-act="pick-pens" data-pens="0" class="' + (m.pens === 0 ? "on" : "") + '">Пенальти: ' + esc(playerTitle(h, "хозяева")) + "</button>" +
        '<button type="button" data-act="pick-pens" data-pens="1" class="' + (m.pens === 1 ? "on" : "") + '">Пенальти: ' + esc(playerTitle(a, "гости")) + "</button></div>";
      html += "<label>Консоль PS5</label><div class=\"console-grid\">";
      for (var c = 1; c <= 15; c++) {
        html += '<button type="button" data-act="pick-console" data-n="' + c + '" class="' + (m.console === c ? "on" : "") + '">' + c + "</button>";
      }
      html += "</div>";
      if (m.round === "r32") {
        html += '<label class="check"><input id="wave2" type="checkbox"' + (m.wave2 ? " checked" : "") + "> Вторая волна</label>";
      }
      html += '<div class="row-actions" style="margin-top:8px"><button type="button" class="btn-quiet" data-act="forfeit" data-lose="a">Тех. 3:0</button>' +
        '<button type="button" class="btn-quiet" data-act="forfeit" data-lose="h">Тех. 0:3</button>' +
        '<button type="button" class="btn-danger" data-act="clear-score">Стереть счёт</button></div>';
      html += '<p class="form-error" id="form-error"></p>';
      html += '<button class="btn-gold btn-block" type="submit">Сохранить</button>';
    } else {
      html += '<p class="muted">Просмотр. ' + esc(phaseText(m)) + ". " + esc(legLine(m)) + "</p>";
    }
    html += '<button type="button" class="btn-ghost btn-block" style="margin-top:8px" data-act="close">Закрыть</button></form></div>';
    return html;
  }

  function editModal() {
    var t = state.tournaments.filter(function (x) { return x.id === modal.tid; })[0];
    if (!t) return "";
    return '<div class="overlay"><form class="sheet" id="edit-form" data-tid="' + esc(t.id) + '"><h2>Турнир</h2>' +
      '<label for="ed-title">Название</label><input id="ed-title" type="text" maxlength="60" value="' + esc(t.title) + '">' +
      '<label for="ed-date">Дата</label><input id="ed-date" type="date" value="' + esc(t.date) + '">' +
      '<label for="ed-time">Время</label><input id="ed-time" type="time" value="' + esc(t.time) + '">' +
      '<label for="ed-fee">Взнос, ₽</label><input id="ed-fee" type="number" min="0" max="1000000" value="' + t.fee + '">' +
      '<label for="ed-pay">Оплата</label><select id="ed-pay"><option value="onsite"' + (t.paymentType === "onsite" ? " selected" : "") + ">Оплата на месте</option>" +
      '<option value="prepay"' + (t.paymentType === "prepay" ? " selected" : "") + ">Предоплата переводом</option></select>" +
      '<label>Призы: 1 / 2 / 3</label><div class="split"><input id="ed-p1" type="number" min="0" value="' + t.prizes[0] + '">' +
      '<input id="ed-p2" type="number" min="0" value="' + t.prizes[1] + '"><input id="ed-p3" type="number" min="0" value="' + t.prizes[2] + '"></div>' +
      '<button class="btn-gold btn-block" type="submit" style="margin-top:12px">Сохранить</button>' +
      '<button type="button" class="btn-danger btn-block" style="margin-top:8px" data-act="delete-tournament" data-tid="' + esc(t.id) + '">Удалить турнир</button>' +
      '<button type="button" class="btn-ghost btn-block" style="margin-top:8px" data-act="close">Закрыть</button></form></div>';
  }

  function layoutBoard() {
    var board = document.getElementById("board");
    if (!board) return;
    var h = board.clientHeight - 6;
    if (h < 240) return;
    var n = 8;
    var labelH = 22;
    var cardH = Math.max(48, Math.min(76, Math.floor((h - labelH - 8 * n) / n)));
    var gap = (h - labelH - n * cardH) / (n + 1);
    if (gap < 3) { gap = 3; cardH = Math.max(44, Math.floor((h - labelH - gap * (n + 1)) / n)); }
    var tops = [];
    for (var i = 0; i < n; i++) tops.push(labelH + gap + i * (cardH + gap));
    function pair(arr) {
      var out = [];
      for (var k = 0; k < arr.length; k += 2) {
        var mid = (arr[k] + arr[k + 1] + cardH) / 2;
        out.push(mid - cardH / 2);
      }
      return out;
    }
    var map = { r32: tops, r16: pair(tops), qf: pair(pair(tops)), sf: pair(pair(pair(tops))) };
    board.querySelectorAll("[data-local]").forEach(function (el) {
      var arr = map[el.dataset.round];
      if (!arr) return;
      el.style.top = arr[Number(el.dataset.local)] + "px";
      el.style.height = cardH + "px";
    });
    var midY = map.sf[0] + cardH / 2;
    var thirdH = Math.min(cardH, 70);
    var thirdTop = h - thirdH - 2;
    var finalH = Math.min(108, cardH + 20);
    var finalTop = midY - finalH / 2;
    if (finalTop + finalH > thirdTop - 14) finalTop = thirdTop - 14 - finalH;
    if (finalTop < 78) finalTop = 78;
    var finalEl = board.querySelector('[data-center="final"]');
    var thirdEl = board.querySelector('[data-center="third"]');
    var trophy = board.querySelector('[data-center="trophy"]');
    if (finalEl) {
      finalEl.style.top = finalTop + "px";
      finalEl.style.height = finalH + "px";
    }
    if (trophy) trophy.style.top = Math.max(26, finalTop - 74) + "px";
    if (thirdEl) {
      thirdEl.style.top = thirdTop + "px";
      thirdEl.style.height = thirdH + "px";
    }
    drawWires(board);
    board.dataset.ready = "1";
  }

  function drawWires(board) {
    var svg = document.getElementById("wires");
    if (!svg) return;
    var br = board.getBoundingClientRect();
    svg.setAttribute("viewBox", "0 0 " + board.clientWidth + " " + board.clientHeight);
    function pos(el, side) {
      var r = el.getBoundingClientRect();
      return { x: (side === "right" ? r.right : r.left) - br.left, y: r.top + r.height / 2 - br.top };
    }
    function link(idA, idB, sideA, sideB) {
      var aEl = board.querySelector('[data-mid="' + idA + '"]');
      var bEl = board.querySelector('[data-mid="' + idB + '"]');
      if (!aEl || !bEl) return "";
      var a = pos(aEl, sideA);
      var b = pos(bEl, sideB);
      var mx = (a.x + b.x) / 2;
      return "M " + a.x.toFixed(1) + " " + a.y.toFixed(1) + " H " + mx.toFixed(1) + " V " + b.y.toFixed(1) + " H " + b.x.toFixed(1) + " ";
    }
    var d = "";
    var i;
    for (i = 0; i < 8; i++) d += link("r32-" + i, "r16-" + Math.floor(i / 2), "right", "left");
    for (i = 0; i < 4; i++) d += link("r16-" + i, "qf-" + Math.floor(i / 2), "right", "left");
    for (i = 0; i < 2; i++) d += link("qf-" + i, "sf-" + Math.floor(i / 2), "right", "left");
    d += link("sf-0", "f-0", "right", "left");
    for (i = 8; i < 16; i++) d += link("r32-" + i, "r16-" + Math.floor(i / 2), "left", "right");
    for (i = 4; i < 8; i++) d += link("r16-" + i, "qf-" + Math.floor(i / 2), "left", "right");
    for (i = 2; i < 4; i++) d += link("qf-" + i, "sf-" + Math.floor(i / 2), "left", "right");
    d += link("sf-1", "f-0", "left", "right");
    svg.innerHTML = '<path d="' + d + '" fill="none" stroke="rgba(232,197,107,0.6)" stroke-width="2"/>';
  }

  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  async function playDraw(players) {
    animating = true;
    drawToken += 1;
    var token = drawToken;
    document.body.dataset.drawState = "run";
    modal = { type: "draw" };
    render();
    var pairs = [];
    for (var i = 0; i < 16; i++) pairs.push([players[i * 2], players[i * 2 + 1]]);
    var line = document.getElementById("shuffle-line");
    if (!reduceMotion) {
      var t0 = performance.now();
      while (performance.now() - t0 < 1400) {
        if (token !== drawToken) return;
        if (line) {
          var c1 = B.CLUBS[Math.floor(Math.random() * 16)];
          var c2 = B.CLUBS[16 + Math.floor(Math.random() * 16)];
          line.textContent = c1.name + "  ×  " + c2.name;
        }
        await sleep(70);
      }
    }
    var list = document.getElementById("draw-list");
    for (var n = 0; n < pairs.length; n++) {
      if (token !== drawToken) return;
      if (line) line.textContent = "Пара " + (n + 1) + " из 16";
      if (list) {
        list.insertAdjacentHTML("beforeend", pairHTML(pairs[n][0], pairs[n][1], n));
        var last = list.lastElementChild;
        if (last) {
          last.classList.add("in");
          list.scrollTop = list.scrollHeight;
        }
      }
      if (!reduceMotion) await sleep(180);
    }
    if (line) line.textContent = "Готово · клубы закреплены до конца турнира";
    if (list) list.scrollTop = 0;
    var btn = document.getElementById("draw-done");
    if (btn) btn.hidden = false;
    document.body.dataset.drawState = "done";
    animating = false;
  }

  function startDraw() {
    var names = parseLines(state.draft).names;
    if (names.length < 2) { toast("Нужны минимум два имени"); return; }
    state.players = B.pairPlayers(names, cryptoRandom);
    state.matches = B.freshMatches();
    state.draft = names.join("\n");
    lastReady = false;
    persist();
    playDraw(state.players);
  }

  function doTransfer() {
    var t = activeTournament();
    var list = (participants[t.id] || []).filter(function (p) { return p.paid; }).slice(0, 32);
    state.draft = list.map(function (p) { return (p.nickname || p.name).trim(); }).join("\n");
    state.activeTournamentId = t.id;
    persist();
    screen = "players";
    modal = null;
    toast("В жеребьёвку: " + list.length);
    render();
  }

  function parseGoalInput(v) {
    if (v == null || String(v).trim() === "") return null;
    if (!/^\d+$/.test(String(v).trim())) return NaN;
    var n = Number(v);
    if (n > 30) return NaN;
    return n;
  }

  function saveMatchFromForm() {
    var form = document.getElementById("match-form");
    if (!form || readOnly) return;
    var id = form.dataset.id;
    var legs = Number(form.dataset.legs);
    var scores = [];
    for (var i = 0; i < legs; i++) {
      var h = parseGoalInput(form.querySelector('[data-leg="' + i + '"][data-side="h"]').value);
      var a = parseGoalInput(form.querySelector('[data-leg="' + i + '"][data-side="a"]').value);
      if (Number.isNaN(h) || Number.isNaN(a)) {
        var err = document.getElementById("form-error");
        if (err) err.textContent = "Счёт — целое число от 0 до 30";
        return;
      }
      scores.push({ h: h, a: a });
    }
    var pens = form.dataset.pens === "0" || form.dataset.pens === "1" ? Number(form.dataset.pens) : null;
    var consoleNo = form.dataset.console ? Number(form.dataset.console) : null;
    var waveBox = document.getElementById("wave2");
    var wave2 = waveBox ? waveBox.checked : form.dataset.wave2 === "1";
    var was = lastReady;
    state.matches = B.applyResult(state.matches, id, { scores: scores, pens: pens, console: consoleNo, wave2: wave2 });
    persist();
    var ready = championReady();
    modal = null;
    if (!was && ready) screen = "podium";
    lastReady = ready;
    render();
  }

  async function submitRegistration() {
    var t = activeTournament();
    var data = {
      name: B.cleanText(document.getElementById("reg-name").value, 40),
      nickname: B.cleanText(document.getElementById("reg-nick").value, 40),
      contact: B.cleanText(document.getElementById("reg-contact").value, 40)
    };
    function fail(msg) {
      modal = { type: "register", tid: t.id, name: document.getElementById("reg-name").value, nick: document.getElementById("reg-nick").value, contact: document.getElementById("reg-contact").value, error: msg };
      render();
    }
    if (!data.name) return fail("Введите имя");
    if (!data.contact) return fail("Оставьте телефон или Telegram");
    if (!readOnly) {
      var list = participants[t.id] || [];
      if (list.length >= 32) return fail("Все 32 места заняты");
      if (list.some(function (p) { return p.name.toLowerCase() === data.name.toLowerCase() && (p.contact || "").toLowerCase() === data.contact.toLowerCase(); })) {
        return fail("Такой игрок уже в списке");
      }
    } else if (spotsFull(t)) return fail("Все 32 места заняты");
    var opened = null;
    if (t.paymentType === "prepay") opened = window.open(telegramLink(t, data), "_blank", "noopener");
    var note = "";
    if (!readOnly) {
      try {
        await repo.add(t.id, { id: window.FifaData.uid(), name: data.name, nickname: data.nickname, contact: data.contact, paid: false, createdAt: Date.now() });
        await reloadParticipants();
        persist();
        note = repo.remote ? "Заявка записана в общую базу." : "Заявка добавлена на этом устройстве. С другого телефона она сама не приедет — отправьте Telegram.";
      } catch (e) {
        note = "База не ответила. Отправьте сообщение организатору.";
      }
    } else {
      note = "Это просмотр сетки: заявка не попадает в список сама. Напишите организатору, он отметит оплату.";
    }
    modal = { type: "payment", tid: t.id, data: data, note: note, blocked: t.paymentType === "prepay" && !opened };
    render();
  }

  async function saveTournamentFromForm() {
    var form = document.getElementById("edit-form");
    var id = form.dataset.tid;
    var fee = Number(document.getElementById("ed-fee").value);
    var prizes = [document.getElementById("ed-p1").value, document.getElementById("ed-p2").value, document.getElementById("ed-p3").value].map(Number);
    var next = B.sanitizeTournament({
      id: id,
      title: document.getElementById("ed-title").value,
      date: document.getElementById("ed-date").value,
      time: document.getElementById("ed-time").value,
      fee: fee,
      paymentType: document.getElementById("ed-pay").value,
      prizes: prizes,
      paidSnapshot: 0,
      listSnapshot: 0
    });
    if (!next) { toast("Проверьте поля"); return; }
    state.tournaments = state.tournaments.map(function (t) {
      if (t.id !== id) return t;
      next.paidSnapshot = t.paidSnapshot;
      next.listSnapshot = t.listSnapshot;
      return next;
    });
    try { await repo.saveTournaments(state.tournaments); } catch (e) { toast("База не сохранила турнир, на этом устройстве он обновлён"); }
    persist();
    modal = null;
    render();
  }

  async function addParticipantFromForm() {
    var t = activeTournament();
    var data = {
      id: window.FifaData.uid(),
      name: B.cleanText(document.getElementById("add-name").value, 40),
      nickname: B.cleanText(document.getElementById("add-nick").value, 40),
      contact: B.cleanText(document.getElementById("add-contact").value, 40),
      paid: document.getElementById("add-paid").checked,
      createdAt: Date.now()
    };
    if (!data.name) { toast("Введите имя"); return; }
    if ((participants[t.id] || []).length >= 32) { toast("Все 32 места заняты"); return; }
    await repo.add(t.id, data);
    await reloadParticipants();
    persist();
    toast(data.paid ? "Игрок добавлен, оплата отмечена" : "Игрок добавлен");
    render();
  }

  function exportJson() {
    syncSnapshots();
    var blob = new Blob([JSON.stringify({ app: "fifa-ps5-cup", v: 1, state: state, participants: participants }, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "fifa-cup-backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("Файл сохранён");
  }

  function importFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result || ""));
        if (!data || data.app !== "fifa-ps5-cup") throw new Error("format");
        state = B.sanitizeState(data.state, CFG);
        var apply = repo.replaceAll(data.participants || {});
        Promise.resolve(apply).then(function () { return reloadParticipants(); }).then(function () {
          lastReady = championReady();
          persist();
          screen = lastReady ? "podium" : "tournaments";
          toast("Копия загружена");
          render();
        });
      } catch (e) {
        toast("Не удалось прочитать файл");
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    var tours = state.tournaments;
    var active = state.activeTournamentId;
    var goal = state.bestGoal;
    state = B.createInitialState(CFG);
    state.tournaments = tours;
    state.activeTournamentId = active;
    state.bestGoal = goal;
    lastReady = false;
    persist();
    screen = "players";
    modal = null;
    toast("Сетка и жеребьёвка сброшены");
    render();
  }

  function makeQr(text) {
    var levels = ["M", "L"];
    for (var i = 0; i < levels.length; i++) {
      try {
        var qr = qrcode(0, levels[i]);
        qr.addData(text);
        qr.make();
        return qr.createSvgTag({ cellSize: 4, margin: 8, scalable: true });
      } catch (e) {}
    }
    return "";
  }

  function openShare() {
    var url = shareUrl();
    modal = { type: "share", url: url, svg: makeQr(url), full: isWide() };
    render();
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Скопировано");
    } catch (e) {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast("Скопировано"); } catch (err) { toast("Скопируйте ссылку вручную"); }
      ta.remove();
    }
  }

  function onClick(e) {
    var el = e.target.closest("[data-act]");
    if (!el) {
      if (e.target.classList && e.target.classList.contains("overlay") && !animating) {
        modal = null;
        render();
      }
      return;
    }
    if (animating) return;
    var act = el.dataset.act;
    if (act === "toggle-sound") {
      soundOn = !soundOn;
      try { localStorage.setItem("fifa-sound", soundOn ? "1" : "0"); } catch (err) {}
      render();
      if (soundOn) blip();
      return;
    }
    blip();
    if (act === "goto") { screen = el.dataset.screen; render(); return; }
    if (act === "close") { modal = null; render(); return; }
    if (act === "open-install") { modal = { type: "install" }; localStorage.setItem("fifa-install-hide", "1"); render(); return; }
    if (act === "do-install") {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; render(); });
      return;
    }
    if (act === "open-share") { openShare(); return; }
    if (act === "share-full") { modal.full = !modal.full; render(); return; }
    if (act === "copy-share") { copyText(modal.url); return; }
    if (act === "copy") { copyText(el.dataset.copy || ""); return; }
    if (act === "open-pin") {
      if (readOnly) return;
      modal = { type: "pin", value: "", error: false };
      render();
      return;
    }
    if (act === "pin-digit") {
      if (modal.value.length < 8) modal.value += el.dataset.digit;
      modal.error = false;
      render();
      return;
    }
    if (act === "pin-back") { modal.value = modal.value.slice(0, -1); modal.error = false; render(); return; }
    if (act === "pin-ok") {
      if (String(modal.value) === String(CFG.organizerPin || "")) {
        organizer = true;
        try { sessionStorage.setItem("fifa-org", "1"); } catch (err) {}
        modal = null;
        toast("Режим организатора");
        render();
      } else {
        modal.error = true;
        modal.value = "";
        render();
      }
      return;
    }
    if (act === "lock-org") {
      organizer = false;
      try { sessionStorage.removeItem("fifa-org"); } catch (err) {}
      modal = null;
      render();
      return;
    }
    if (act === "select-tournament") {
      state.activeTournamentId = el.dataset.tid;
      if (!readOnly) persist();
      render();
      return;
    }
    if (act === "open-register") {
      state.activeTournamentId = el.dataset.tid;
      if (!readOnly) persist();
      if (spotsFull(activeTournament())) { toast("Все 32 места заняты"); return; }
      modal = { type: "register", tid: el.dataset.tid, name: "", nick: "", contact: "", error: "" };
      render();
      return;
    }
    if (act === "edit-tournament") {
      if (!organizer) return;
      modal = { type: "edit", tid: el.dataset.tid };
      render();
      return;
    }
    if (act === "add-tournament") {
      if (!organizer) return;
      var created = B.newTournament(state.tournaments.length, CFG);
      state.tournaments.push(created);
      state.activeTournamentId = created.id;
      persist();
      repo.saveTournaments(state.tournaments).catch(function () {});
      modal = { type: "edit", tid: created.id };
      render();
      return;
    }
    if (act === "delete-tournament") {
      if (state.tournaments.length < 2) { toast("Должен остаться хотя бы один турнир"); return; }
      modal = { type: "confirm", title: "Удалить турнир?", text: "Карточка и список игроков этого турнира будут удалены с устройства.", ok: "Удалить", danger: true, next: "delete-now", tid: el.dataset.tid };
      render();
      return;
    }
    if (act === "remove-participant") {
      modal = { type: "confirm", title: "Убрать игрока?", text: "Его можно добавить снова.", ok: "Убрать", danger: true, next: "remove-now", tid: el.dataset.tid, pid: el.dataset.id };
      render();
      return;
    }
    if (act === "toggle-paid") {
      repo.update(el.dataset.tid, el.dataset.id, { paid: el.dataset.paid !== "1" }).then(function () {
        return reloadParticipants();
      }).then(function () { persist(); render(); });
      return;
    }
    if (act === "transfer-draw") {
      var paid = (participants[activeTournament().id] || []).filter(function (p) { return p.paid; });
      if (!paid.length) return;
      if (state.players) {
        modal = { type: "confirm", title: "Заменить список?", text: "Имена для новой жеребьёвки будут заменены оплатившими. Текущая сетка не изменится, пока вы снова не проведёте жеребьёвку.", ok: "Перенести", next: "transfer-now" };
        render();
        return;
      }
      doTransfer();
      return;
    }
    if (act === "confirm-yes") {
      var next = modal.next;
      var tid = modal.tid;
      var pid = modal.pid;
      if (next === "reset-now") resetAll();
      else if (next === "draw-now") startDraw();
      else if (next === "transfer-now") doTransfer();
      else if (next === "auto-now") {
        state.matches = B.autoConsoles(state.matches);
        persist();
        modal = null;
        toast("Консоли 1–15 назначены, 16-й матч — вторая волна на PS5 1");
        render();
      } else if (next === "remove-now") {
        repo.remove(tid, pid).then(reloadParticipants).then(function () { persist(); modal = null; render(); });
      } else if (next === "delete-now") {
        state.tournaments = state.tournaments.filter(function (t) { return t.id !== tid; });
        if (!state.tournaments.some(function (t) { return t.id === state.activeTournamentId; })) state.activeTournamentId = state.tournaments[0].id;
        repo.clearTournament(tid).catch(function () {});
        repo.saveTournaments(state.tournaments).catch(function () {});
        persist();
        modal = null;
        render();
      }
      return;
    }
    if (act === "start-draw") {
      var count = parseLines(state.draft).names.length;
      if (count < 2) { toast("Нужны минимум два имени"); return; }
      if (state.players) {
        modal = { type: "confirm", title: "Новая жеребьёвка?", text: "Текущие пары и все результаты будут стёрты.", ok: "Провести", danger: true, next: "draw-now" };
        render();
        return;
      }
      startDraw();
      return;
    }
    if (act === "draw-to-bracket") { modal = null; screen = "bracket"; render(); return; }
    if (act === "open-match") {
      var id = el.dataset.id || el.dataset.openMatch;
      if (!id) return;
      modal = { type: "match", id: id };
      render();
      updateAgg();
      return;
    }
    if (act === "pick-pens") {
      var form = document.getElementById("match-form");
      form.dataset.pens = form.dataset.pens === el.dataset.pens ? "" : el.dataset.pens;
      document.querySelectorAll('[data-act="pick-pens"]').forEach(function (b) {
        b.classList.toggle("on", b.dataset.pens === form.dataset.pens);
      });
      return;
    }
    if (act === "pick-console") {
      var form2 = document.getElementById("match-form");
      form2.dataset.console = form2.dataset.console === el.dataset.n ? "" : el.dataset.n;
      document.querySelectorAll('[data-act="pick-console"]').forEach(function (b) {
        b.classList.toggle("on", b.dataset.n === form2.dataset.console);
      });
      return;
    }
    if (act === "forfeit") {
      var form3 = document.getElementById("match-form");
      var legs = Number(form3.dataset.legs);
      for (var i = 0; i < legs; i++) {
        var hv = form3.querySelector('[data-leg="' + i + '"][data-side="h"]');
        var av = form3.querySelector('[data-leg="' + i + '"][data-side="a"]');
        if (i === 0) {
          hv.value = el.dataset.lose === "h" ? "0" : "3";
          av.value = el.dataset.lose === "h" ? "3" : "0";
        } else { hv.value = "0"; av.value = "0"; }
      }
      updateAgg();
      return;
    }
    if (act === "clear-score") {
      var form4 = document.getElementById("match-form");
      form4.querySelectorAll("input[data-leg]").forEach(function (input) { input.value = ""; });
      form4.dataset.pens = "";
      saveMatchFromForm();
      return;
    }
    if (act === "auto-consoles") {
      modal = { type: "confirm", title: "Развести консоли?", text: "Матчи 1–15 получат PS5 1–15. Шестнадцатый матч 1/16 встанет второй волной на PS5 1. Счета не сотрутся.", ok: "Назначить", next: "auto-now" };
      render();
      return;
    }
    if (act === "export-json") { exportJson(); return; }
    if (act === "import-json") {
      var input = document.getElementById("import-file");
      if (input) input.click();
      return;
    }
    if (act === "reset") {
      modal = { type: "confirm", title: "Сбросить сетку?", text: "Жеребьёвка и результаты сотрутся. Записи игроков и карточки турниров останутся.", ok: "Сбросить", danger: true, next: "reset-now" };
      render();
      return;
    }
    if (act === "round-tab") {
      roundIndex = Number(el.dataset.i) || 0;
      var scroller = document.getElementById("round-scroller");
      if (scroller) scroller.scrollTo({ left: roundIndex * scroller.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
      document.querySelectorAll("[data-round-tab]").forEach(function (btn, idx) { btn.classList.toggle("on", idx === roundIndex); });
    }
  }

  function updateAgg() {
    var form = document.getElementById("match-form");
    var agg = document.getElementById("agg");
    if (!form || !agg) return;
    var legs = Number(form.dataset.legs);
    var h = 0; var a = 0; var ok = true;
    for (var i = 0; i < legs; i++) {
      var hv = parseGoalInput(form.querySelector('[data-leg="' + i + '"][data-side="h"]').value);
      var av = parseGoalInput(form.querySelector('[data-leg="' + i + '"][data-side="a"]').value);
      if (hv == null || av == null || Number.isNaN(hv) || Number.isNaN(av)) ok = false;
      else { h += hv; a += av; }
    }
    agg.textContent = ok ? ("Сумма " + h + ":" + a + (h === a ? ". Нужен победитель пенальти, иначе пара не пройдёт дальше." : "")) : "Введите оба числа, чтобы увидеть сумму.";
  }

  function onInput(e) {
    if (e.target.id === "names-input") {
      state.draft = e.target.value.slice(0, 4000);
      var count = document.getElementById("names-count");
      if (count) count.textContent = String(parseLines(state.draft).names.length);
      var preview = document.getElementById("name-preview");
      if (preview) preview.innerHTML = chipsHTML(state.draft);
      persist();
      return;
    }
    if (e.target.id === "best-goal") {
      state.bestGoal = B.cleanText(e.target.value, 40);
      persist();
      return;
    }
    if (e.target.id === "wave2") {
      var form = document.getElementById("match-form");
      if (form) form.dataset.wave2 = e.target.checked ? "1" : "0";
    }
    if (e.target.matches && e.target.matches("[data-leg]")) updateAgg();
  }

  function onSubmit(e) {
    if (e.target.id === "reg-form") { e.preventDefault(); submitRegistration(); }
    else if (e.target.id === "match-form") { e.preventDefault(); saveMatchFromForm(); }
    else if (e.target.id === "edit-form") { e.preventDefault(); saveTournamentFromForm(); }
    else if (e.target.id === "add-player-form") { e.preventDefault(); addParticipantFromForm(); }
  }

  function startConfetti() {
    if (reduceMotion || confettiOn) return;
    confettiOn = true;
    var canvas = document.getElementById("confetti");
    var ctx = canvas.getContext("2d");
    var parts = [];
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    var colors = ["#e8c56b", "#fff1c9", "#3ee7ff", "#ff4d8d", "#ffffff", "#8b7cff", "#5dffa8"];
    for (var i = 0; i < 90; i++) {
      parts.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 3 + Math.random() * 5,
        c: colors[i % colors.length],
        v: 1 + Math.random() * 2.4,
        w: Math.random() * 0.08 + 0.02,
        a: Math.random() * Math.PI
      });
    }
    function tick() {
      if (!confettiOn) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts.forEach(function (p) {
        p.y += p.v;
        p.x += Math.sin(p.a) * 0.8;
        p.a += p.w;
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        ctx.restore();
      });
      confettiTimer = requestAnimationFrame(tick);
    }
    tick();
  }

  function startDust() {
    var canvas = document.getElementById("dust");
    if (!canvas || startDust.started) return;
    startDust.started = true;
    if (reduceMotion) return;
    var ctx = canvas.getContext("2d");
    var dots = [];
    function fit() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    fit();
    window.addEventListener("resize", fit);
    for (var i = 0; i < 36; i++) {
      dots.push({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, v: 0.00025 + Math.random() * 0.0007, p: Math.random() * 6 });
    }
    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach(function (d) {
        d.y -= d.v;
        d.p += 0.02;
        if (d.y < 0) d.y = 1;
        ctx.fillStyle = "rgba(210,255,230," + (0.12 + Math.sin(d.p) * 0.08) + ")";
        ctx.beginPath();
        ctx.arc(d.x * canvas.width, d.y * canvas.height, d.r, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(tick);
    }
    tick();
  }

  function stopConfetti() {
    confettiOn = false;
    cancelAnimationFrame(confettiTimer);
    var canvas = document.getElementById("confetti");
    if (canvas) {
      var ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  document.body.addEventListener("click", onClick);
  document.body.addEventListener("input", onInput);
  document.body.addEventListener("submit", onSubmit);
  document.body.addEventListener("change", function (e) {
    if (e.target.id === "import-file") importFile(e.target.files && e.target.files[0]);
    if (e.target.id === "wave2") {
      var form = document.getElementById("match-form");
      if (form) form.dataset.wave2 = e.target.checked ? "1" : "0";
    }
  });
  document.addEventListener("scroll", function (e) {
    if (!e.target || e.target.id !== "round-scroller") return;
    var w = e.target.clientWidth || 1;
    var i = Math.round(e.target.scrollLeft / w);
    if (i === roundIndex) return;
    roundIndex = i;
    document.querySelectorAll("[data-round-tab]").forEach(function (btn, idx) {
      btn.classList.toggle("on", idx === i);
    });
  }, true);
  window.addEventListener("resize", function () {
    if (animating) return;
    if (confettiOn) stopConfetti();
    render();
  });
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    var btn = document.getElementById("install-app-btn");
    if (btn) btn.hidden = false;
  });

  function bootHash() {
    if ((location.hash || "").indexOf("#f1.") !== 0) {
      state = loadLocal();
      return;
    }
    var packed = readPacked();
    if (packed) {
      state = B.sanitizeState(packed, CFG);
      readOnly = true;
    } else {
      state = loadLocal();
      setTimeout(function () { toast("Ссылка сетки повреждена"); }, 400);
    }
  }

  async function boot() {
    bootHash();
    try { organizer = !readOnly && sessionStorage.getItem("fifa-org") === "1"; } catch (e) { organizer = false; }
    repo = window.FifaData.createRepository(CFG);
    if (!readOnly && repo.remote) {
      try {
        var remote = await repo.loadTournaments();
        if (remote && remote.length) {
          state.tournaments = remote.map(B.sanitizeTournament).filter(Boolean);
          if (!state.tournaments.some(function (t) { return t.id === state.activeTournamentId; })) {
            state.activeTournamentId = state.tournaments[0].id;
          }
        } else {
          await repo.saveTournaments(state.tournaments);
        }
      } catch (e) {
        toast("База недоступна, показаны данные этого устройства");
      }
    }
    await reloadParticipants();
    syncSnapshots();
    lastReady = championReady();
    if (lastReady) screen = "podium";
    else if (state.players) screen = readOnly ? "bracket" : "tournaments";
    render();
    startDust();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js", { scope: "/pvprealcom-site/fifa/" }).catch(function () {});
    }
  }

  boot();
})();
