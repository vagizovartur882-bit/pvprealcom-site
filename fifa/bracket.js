/* Bracket, draw and share-state helpers. No DOM. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FifaBracket = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var CLUBS = [
    { id: 0, pot: 1, name: "Реал Мадрид", short: "РМ", a: "#ffffff", b: "#c9a227" },
    { id: 1, pot: 1, name: "Манчестер Сити", short: "МС", a: "#6cabdd", b: "#1c2c5b" },
    { id: 2, pot: 1, name: "Бавария", short: "БАВ", a: "#dc052d", b: "#ffffff" },
    { id: 3, pot: 1, name: "ПСЖ", short: "ПСЖ", a: "#004170", b: "#da291c" },
    { id: 4, pot: 1, name: "Ливерпуль", short: "ЛИВ", a: "#c8102e", b: "#00b2a9" },
    { id: 5, pot: 1, name: "Барселона", short: "БАР", a: "#a50044", b: "#004d98" },
    { id: 6, pot: 1, name: "Арсенал", short: "АРС", a: "#ef0107", b: "#ffffff" },
    { id: 7, pot: 1, name: "Интер", short: "ИНТ", a: "#010e80", b: "#000000" },
    { id: 8, pot: 1, name: "Атлетико", short: "АТМ", a: "#cb3524", b: "#ffffff" },
    { id: 9, pot: 1, name: "Байер", short: "Б04", a: "#e32221", b: "#000000" },
    { id: 10, pot: 1, name: "Ювентус", short: "ЮВЕ", a: "#111111", b: "#ffffff" },
    { id: 11, pot: 1, name: "Милан", short: "МИЛ", a: "#fb090b", b: "#111111" },
    { id: 12, pot: 1, name: "Наполи", short: "НАП", a: "#12a0d7", b: "#ffffff" },
    { id: 13, pot: 1, name: "Боруссия Д", short: "БВД", a: "#fde100", b: "#111111" },
    { id: 14, pot: 1, name: "Челси", short: "ЧЕЛ", a: "#034694", b: "#dba111" },
    { id: 15, pot: 1, name: "Тоттенхэм", short: "ТОТ", a: "#132257", b: "#ffffff" },
    { id: 16, pot: 2, name: "Ньюкасл", short: "НЬЮ", a: "#241f20", b: "#ffffff" },
    { id: 17, pot: 2, name: "Астон Вилла", short: "АВЛ", a: "#95bfe5", b: "#670e36" },
    { id: 18, pot: 2, name: "Ман Юнайтед", short: "МЮ", a: "#da291c", b: "#fbe122" },
    { id: 19, pot: 2, name: "Аталанта", short: "АТА", a: "#1e71b8", b: "#111111" },
    { id: 20, pot: 2, name: "Рома", short: "РОМ", a: "#8e1f2f", b: "#f0bc42" },
    { id: 21, pot: 2, name: "Бенфика", short: "БЕН", a: "#e10600", b: "#ffffff" },
    { id: 22, pot: 2, name: "Порту", short: "ПОР", a: "#003399", b: "#ffffff" },
    { id: 23, pot: 2, name: "Спортинг", short: "СПО", a: "#008057", b: "#ffffff" },
    { id: 24, pot: 2, name: "Лейпциг", short: "ЛЕЙ", a: "#dd0741", b: "#ffffff" },
    { id: 25, pot: 2, name: "Марсель", short: "МАР", a: "#2faee0", b: "#ffffff" },
    { id: 26, pot: 2, name: "Монако", short: "МОН", a: "#e63946", b: "#ffffff" },
    { id: 27, pot: 2, name: "Севилья", short: "СЕВ", a: "#d70f21", b: "#ffffff" },
    { id: 28, pot: 2, name: "Вильярреал", short: "ВИЛ", a: "#ffe667", b: "#005187" },
    { id: 29, pot: 2, name: "Фенербахче", short: "ФЕН", a: "#ffed00", b: "#00205b" },
    { id: 30, pot: 2, name: "Галатасарай", short: "ГАЛ", a: "#a90432", b: "#fdb912" },
    { id: 31, pot: 2, name: "Лацио", short: "ЛАЦ", a: "#87d8f7", b: "#ffffff" }
  ];

  var ROUNDS = [
    { id: "r32", title: "1/16", full: "1/16 финала", count: 16, legs: 1 },
    { id: "r16", title: "1/8", full: "1/8 финала", count: 8, legs: 1 },
    { id: "qf", title: "1/4", full: "1/4 финала", count: 4, legs: 1 },
    { id: "sf", title: "1/2", full: "Полуфинал", count: 2, legs: 2 },
    { id: "third", title: "3-е", full: "Матч за 3-е место", count: 1, legs: 1 },
    { id: "f", title: "Финал", full: "Финал", count: 1, legs: 2 }
  ];

  function club(id) {
    return CLUBS[id] || null;
  }

  function shuffle(list, random) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function padNames(raw) {
    var names = (raw || []).map(function (n) {
      return String(n || "").replace(/\s+/g, " ").trim();
    }).filter(Boolean).slice(0, 32);
    while (names.length < 32) names.push("Вакансия " + (names.length + 1));
    return names;
  }

  function pairPlayers(rawNames, random) {
    var rnd = random || Math.random;
    var names = shuffle(padNames(rawNames), rnd);
    var pot1 = shuffle(CLUBS.filter(function (c) { return c.pot === 1; }).map(function (c) { return c.id; }), rnd);
    var pot2 = shuffle(CLUBS.filter(function (c) { return c.pot === 2; }).map(function (c) { return c.id; }), rnd);
    var players = [];
    for (var i = 0; i < 16; i++) {
      players.push({ name: names[i * 2], clubId: pot1[i] });
      players.push({ name: names[i * 2 + 1], clubId: pot2[i] });
    }
    return players;
  }

  function freshMatches() {
    var spec = [["r32", 16, 1], ["r16", 8, 1], ["qf", 4, 1], ["sf", 2, 2], ["f", 1, 2], ["third", 1, 1]];
    var out = [];
    spec.forEach(function (row) {
      for (var i = 0; i < row[1]; i++) {
        var scores = [];
        for (var l = 0; l < row[2]; l++) scores.push({ h: null, a: null });
        out.push({
          id: row[0] + "-" + i,
          round: row[0],
          index: i,
          legs: row[2],
          scores: scores,
          pens: null,
          console: null,
          wave2: false
        });
      }
    });
    return out;
  }

  function cloneMatches(matches) {
    return matches.map(function (m) {
      return {
        id: m.id, round: m.round, index: m.index, legs: m.legs,
        scores: m.scores.map(function (s) { return { h: s.h, a: s.a }; }),
        pens: m.pens, console: m.console, wave2: !!m.wave2
      };
    });
  }

  function sourceRefs(match) {
    var index = match.index;
    if (match.round === "r32") return [{ t: "p", i: index * 2 }, { t: "p", i: index * 2 + 1 }];
    if (match.round === "r16") return [{ t: "w", id: "r32-" + (index * 2) }, { t: "w", id: "r32-" + (index * 2 + 1) }];
    if (match.round === "qf") return [{ t: "w", id: "r16-" + (index * 2) }, { t: "w", id: "r16-" + (index * 2 + 1) }];
    if (match.round === "sf") return [{ t: "w", id: "qf-" + (index * 2) }, { t: "w", id: "qf-" + (index * 2 + 1) }];
    if (match.round === "f") return [{ t: "w", id: "sf-0" }, { t: "w", id: "sf-1" }];
    if (match.round === "third") return [{ t: "l", id: "sf-0" }, { t: "l", id: "sf-1" }];
    return [];
  }

  function sourcesOfId(id) {
    var parts = String(id).split("-");
    var round = parts[0];
    var index = Number(parts[1]);
    if (round === "r16") return ["r32-" + (index * 2), "r32-" + (index * 2 + 1)];
    if (round === "qf") return ["r16-" + (index * 2), "r16-" + (index * 2 + 1)];
    if (round === "sf") return ["qf-" + (index * 2), "qf-" + (index * 2 + 1)];
    if (round === "f" || round === "third") return ["sf-0", "sf-1"];
    return [];
  }

  function dependsOn(matchId, ancestorId) {
    if (matchId === ancestorId) return false;
    var seen = {};
    function walk(id) {
      if (seen[id]) return false;
      seen[id] = true;
      var src = sourcesOfId(id);
      for (var i = 0; i < src.length; i++) {
        if (src[i] === ancestorId) return true;
        if (walk(src[i])) return true;
      }
      return false;
    }
    return walk(matchId);
  }

  function goal(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    if (!isFinite(n) || Math.floor(n) !== n || n < 0 || n > 30) return null;
    return n;
  }

  function sanitizeScore(s) {
    if (!s || typeof s !== "object") return { h: null, a: null };
    return { h: goal(s.h), a: goal(s.a) };
  }

  function totals(match) {
    var h = 0;
    var a = 0;
    var ok = true;
    (match.scores || []).forEach(function (s) {
      if (s.h == null || s.a == null) ok = false;
      else { h += s.h; a += s.a; }
    });
    return { h: h, a: a, ok: ok };
  }

  function normalizedPens(scores, pens) {
    var t = totals({ scores: scores });
    if (!t.ok || t.h !== t.a) return null;
    return pens === 0 || pens === 1 ? pens : null;
  }

  function sanitizeConsole(v) {
    var n = Number(v);
    if (!isFinite(n) || n < 1 || n > 15) return null;
    return Math.floor(n);
  }

  function matchById(matches, id) {
    for (var i = 0; i < matches.length; i++) if (matches[i].id === id) return matches[i];
    return null;
  }

  function resolveRef(players, matches, ref, guard) {
    if (!ref || !players || guard > 16) return null;
    if (ref.t === "p") return players[ref.i] || null;
    var m = matchById(matches, ref.id);
    if (!m) return null;
    var w = matchWinnerSide(players, matches, m);
    if (w == null) return null;
    var src = sourceRefs(m);
    var chosen = ref.t === "w" ? src[w] : src[1 - w];
    return resolveRef(players, matches, chosen, guard + 1);
  }

  function sidePlayer(players, matches, match, side) {
    if (!match) return null;
    var refs = sourceRefs(match);
    return resolveRef(players, matches, refs[side], 0);
  }

  function matchWinnerSide(players, matches, match) {
    if (!players || !match) return null;
    if (!sidePlayer(players, matches, match, 0) || !sidePlayer(players, matches, match, 1)) return null;
    var t = totals(match);
    if (!t.ok) return null;
    if (t.h > t.a) return 0;
    if (t.a > t.h) return 1;
    if (match.pens === 0 || match.pens === 1) return match.pens;
    return null;
  }

  function clearResult(m) {
    m.scores = m.scores.map(function () { return { h: null, a: null }; });
    m.pens = null;
  }

  function sameScores(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i].h !== b[i].h || a[i].a !== b[i].a) return false;
    return true;
  }

  function applyResult(matches, id, patch) {
    var next = cloneMatches(matches);
    var m = matchById(next, id);
    if (!m) return next;
    var scores = m.scores.map(function (_, i) {
      return sanitizeScore(patch && patch.scores ? patch.scores[i] : null);
    });
    var requested = patch && (patch.pens === 0 || patch.pens === 1) ? patch.pens : null;
    var pens = normalizedPens(scores, requested);
    var changed = !sameScores(m.scores, scores) || m.pens !== pens;
    m.scores = scores;
    m.pens = pens;
    m.console = sanitizeConsole(patch && patch.console);
    m.wave2 = !!(patch && patch.wave2 && m.round === "r32");
    if (changed) {
      next.forEach(function (other) {
        if (other.id !== id && dependsOn(other.id, id)) clearResult(other);
      });
    }
    return next;
  }

  function autoConsoles(matches) {
    return cloneMatches(matches).map(function (m) {
      if (m.round !== "r32") return m;
      if (m.index < 15) return Object.assign(m, { console: m.index + 1, wave2: false });
      return Object.assign(m, { console: 1, wave2: true });
    });
  }

  function placements(players, matches) {
    var finalM = matchById(matches, "f-0");
    var thirdM = matchById(matches, "third-0");
    var fw = matchWinnerSide(players, matches, finalM);
    var tw = matchWinnerSide(players, matches, thirdM);
    return {
      first: fw == null ? null : sidePlayer(players, matches, finalM, fw),
      second: fw == null ? null : sidePlayer(players, matches, finalM, 1 - fw),
      third: tw == null ? null : sidePlayer(players, matches, thirdM, tw),
      ready: fw != null && tw != null
    };
  }

  function isoDate(d) {
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }

  function defaultFee(config) {
    var n = config && config.payment ? Number(config.payment.amountRub) : 1000;
    if (!isFinite(n) || n < 0) return 1000;
    return Math.round(n);
  }

  var SEED = [
    { id: "cup-1", title: "Субботний кубок I", date: "2026-11-21", paymentType: "onsite" },
    { id: "cup-2", title: "Субботний кубок II", date: "2026-11-28", paymentType: "onsite" },
    { id: "cup-3", title: "Субботний кубок III", date: "2026-12-05", paymentType: "onsite" },
    { id: "cup-4", title: "Зимний кубок", date: "2026-12-12", paymentType: "prepay" }
  ];

  function makeTournament(partial, config) {
    return sanitizeTournament(Object.assign({
      id: partial.id,
      title: partial.title,
      date: partial.date,
      time: "12:00",
      fee: defaultFee(config),
      paymentType: partial.paymentType,
      prizes: [16000, 10000, 6000],
      paidSnapshot: 0,
      listSnapshot: 0
    }, partial), config);
  }

  function createInitialState(config) {
    var tournaments = SEED.map(function (row) { return makeTournament(row, config); });
    return {
      v: 1,
      draft: "",
      players: null,
      matches: freshMatches(),
      tournaments: tournaments,
      activeTournamentId: tournaments[0].id,
      bestGoal: ""
    };
  }

  function newTournament(index, config) {
    var base = new Date(2026, 10, 21);
    base.setDate(base.getDate() + 7 * index);
    return makeTournament({
      id: "cup-" + Date.now().toString(36) + index.toString(36),
      title: "Кубок PS5 · " + (index + 1),
      date: isoDate(base),
      time: "12:00",
      fee: defaultFee(config),
      paymentType: index < 3 ? "onsite" : "prepay",
      prizes: [16000, 10000, 6000]
    }, config);
  }

  function cleanText(v, max) {
    return String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);
  }

  function sanitizeTournament(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = cleanText(raw.id, 40).replace(/[^\w-]/g, "");
    if (!id) return null;
    var date = /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : "2026-11-21";
    var time = /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.time) ? raw.time : "12:00";
    var fee = Number(raw.fee);
    if (!isFinite(fee) || fee < 0 || fee > 1000000) fee = 1000;
    var prizes = [0, 1, 2].map(function (i) {
      var n = Number(raw.prizes && raw.prizes[i]);
      if (!isFinite(n) || n < 0 || n > 100000000) return [16000, 10000, 6000][i];
      return Math.round(n);
    });
    var pay = raw.paymentType === "prepay" ? "prepay" : "onsite";
    return {
      id: id,
      title: cleanText(raw.title, 60) || "Турнир",
      date: date,
      time: time,
      fee: Math.round(fee),
      paymentType: pay,
      prizes: prizes,
      paidSnapshot: Math.max(0, Math.min(32, Math.round(Number(raw.paidSnapshot) || 0))),
      listSnapshot: Math.max(0, Math.min(64, Math.round(Number(raw.listSnapshot) || 0)))
    };
  }

  function sanitizePlayer(raw, index) {
    if (!raw || typeof raw !== "object") return null;
    var clubId = Number(raw.clubId);
    if (!isFinite(clubId) || clubId < 0 || clubId > 31) return null;
    var name = cleanText(raw.name, 40);
    if (!name) name = "Вакансия " + (index + 1);
    return { name: name, clubId: clubId };
  }

  function sanitizeState(raw, config) {
    var state = createInitialState(config);
    if (!raw || typeof raw !== "object") return state;
    if (typeof raw.draft === "string") state.draft = raw.draft.slice(0, 4000);
    if (typeof raw.bestGoal === "string") state.bestGoal = cleanText(raw.bestGoal, 40);
    if (Array.isArray(raw.tournaments) && raw.tournaments.length) {
      var tours = raw.tournaments.map(sanitizeTournament).filter(Boolean).slice(0, 24);
      if (tours.length) state.tournaments = tours;
    }
    if (state.tournaments.some(function (t) { return t.id === raw.activeTournamentId; })) {
      state.activeTournamentId = raw.activeTournamentId;
    }
    if (Array.isArray(raw.players) && raw.players.length === 32) {
      var players = raw.players.map(sanitizePlayer);
      var ids = players.map(function (p) { return p && p.clubId; });
      var unique = {};
      ids.forEach(function (id) { if (id != null) unique[id] = true; });
      var potsOk = players.every(function (p, i) {
        return p && club(p.clubId).pot === (i % 2 === 0 ? 1 : 2);
      });
      if (players.every(Boolean) && Object.keys(unique).length === 32 && potsOk) state.players = players;
    }
    if (Array.isArray(raw.matches)) {
      var byId = {};
      raw.matches.forEach(function (m) { if (m && m.id) byId[m.id] = m; });
      state.matches = state.matches.map(function (base) {
        var m = byId[base.id];
        if (!m) return base;
        var scores = base.scores.map(function (_, i) { return sanitizeScore(m.scores && m.scores[i]); });
        var pens = m.pens === 0 || m.pens === 1 ? m.pens : null;
        return {
          id: base.id,
          round: base.round,
          index: base.index,
          legs: base.legs,
          scores: scores,
          pens: normalizedPens(scores, pens),
          console: sanitizeConsole(m.console),
          wave2: (m.wave2 === true || m.wave2 === 1) && base.round === "r32"
        };
      });
    }
    return state;
  }

  function packState(state) {
    return {
      v: 1,
      d: state.players ? state.players.map(function (p) { return [p.name, p.clubId]; }) : null,
      m: state.matches.map(function (m) {
        var flat = [];
        m.scores.forEach(function (s) { flat.push(s.h, s.a); });
        var empty = flat.every(function (x) { return x == null; }) && m.pens == null && !m.console && !m.wave2;
        if (empty) return 0;
        return [flat, m.pens, m.console || 0, m.wave2 ? 1 : 0];
      }),
      t: state.tournaments.map(function (t) {
        return [t.id, t.title, t.date, t.time, t.fee, t.paymentType === "prepay" ? 1 : 0, t.prizes[0], t.prizes[1], t.prizes[2], t.paidSnapshot || 0, t.listSnapshot || 0];
      }),
      a: state.activeTournamentId,
      g: state.bestGoal || ""
    };
  }

  function unpackState(p) {
    if (!p || p.v !== 1) return null;
    var matches = freshMatches().map(function (base, i) {
      var row = p.m && p.m[i];
      if (!row) return base;
      var flat = row[0] || [];
      var scores = base.scores.map(function (_, li) {
        return { h: flat[li * 2], a: flat[li * 2 + 1] };
      });
      return {
        id: base.id, round: base.round, index: base.index, legs: base.legs,
        scores: scores,
        pens: row[1],
        console: row[2] || null,
        wave2: !!row[3]
      };
    });
    var players = Array.isArray(p.d) ? p.d.map(function (row) { return { name: row[0], clubId: row[1] }; }) : null;
    var tournaments = (p.t || []).map(function (row) {
      return {
        id: row[0], title: row[1], date: row[2], time: row[3], fee: row[4],
        paymentType: row[5] === 1 ? "prepay" : "onsite",
        prizes: [row[6], row[7], row[8]],
        paidSnapshot: row[9] || 0,
        listSnapshot: row[10] || 0
      };
    });
    return {
      v: 1,
      draft: "",
      players: players,
      matches: matches,
      tournaments: tournaments,
      activeTournamentId: p.a,
      bestGoal: p.g || ""
    };
  }

  return {
    CLUBS: CLUBS,
    ROUNDS: ROUNDS,
    club: club,
    shuffle: shuffle,
    padNames: padNames,
    pairPlayers: pairPlayers,
    freshMatches: freshMatches,
    cloneMatches: cloneMatches,
    sourceRefs: sourceRefs,
    dependsOn: dependsOn,
    totals: totals,
    sidePlayer: sidePlayer,
    matchWinnerSide: matchWinnerSide,
    applyResult: applyResult,
    autoConsoles: autoConsoles,
    placements: placements,
    createInitialState: createInitialState,
    newTournament: newTournament,
    sanitizeState: sanitizeState,
    sanitizeTournament: sanitizeTournament,
    packState: packState,
    unpackState: unpackState,
    cleanText: cleanText,
    matchById: matchById
  };
});
