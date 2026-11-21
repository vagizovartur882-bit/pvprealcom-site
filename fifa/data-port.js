/* Регистрация игроков.
   Сейчас работает LocalRegistrationRepository (localStorage этого браузера).
   Когда появится Supabase, заполните FIFA_CONFIG.supabase — код ниже
   переключится сам, экраны менять не нужно.

   Таблицы:

   create table public.tournaments (
     id text primary key,
     title text not null,
     date text not null,
     time text not null,
     fee integer not null,
     payment_type text not null check (payment_type in ('onsite','prepay')),
     prize1 integer not null,
     prize2 integer not null,
     prize3 integer not null,
     sort_index integer not null default 0
   );
   create table public.participants (
     id text primary key,
     tournament_id text not null references public.tournaments(id) on delete cascade,
     name text not null,
     nickname text,
     contact text,
     paid boolean not null default false,
     created_at timestamptz not null default now()
   );
   alter table public.tournaments enable row level security;
   alter table public.participants enable row level security;
   -- Открытая политика только для старта. Перед боевым турниром закройте запись.
   create policy "public all tournaments" on public.tournaments for all using (true) with check (true);
   create policy "public all participants" on public.participants for all using (true) with check (true);
*/
(function (root) {
  "use strict";

  var KEY = "fifa-ps5-participants-v1";

  function uid() {
    if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
    return "id-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function cleanParticipant(p) {
    if (!p || typeof p !== "object") return null;
    var name = String(p.name || "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (!name) return null;
    var id = String(p.id || uid()).replace(/[^\w-]/g, "").slice(0, 48);
    return {
      id: id || uid(),
      name: name,
      nickname: String(p.nickname || "").replace(/\s+/g, " ").trim().slice(0, 40),
      contact: String(p.contact || "").replace(/\s+/g, " ").trim().slice(0, 40),
      paid: !!p.paid,
      createdAt: Number(p.createdAt) || Date.now()
    };
  }

  function LocalRegistrationRepository() {
    this.remote = false;
  }

  LocalRegistrationRepository.prototype._read = function () {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch (e) {
      return {};
    }
  };

  LocalRegistrationRepository.prototype._write = function (map) {
    localStorage.setItem(KEY, JSON.stringify(map));
  };

  LocalRegistrationRepository.prototype.list = async function (tournamentId) {
    var map = this._read();
    return (map[tournamentId] || []).map(cleanParticipant).filter(Boolean);
  };

  LocalRegistrationRepository.prototype.loadAll = async function () {
    var map = this._read();
    var out = {};
    Object.keys(map).forEach(function (id) {
      out[id] = (map[id] || []).map(cleanParticipant).filter(Boolean);
    });
    return out;
  };

  LocalRegistrationRepository.prototype.add = async function (tournamentId, participant) {
    var row = cleanParticipant(participant);
    if (!row) throw new Error("bad participant");
    var map = this._read();
    var list = map[tournamentId] || [];
    list.push(row);
    map[tournamentId] = list;
    this._write(map);
    return row;
  };

  LocalRegistrationRepository.prototype.update = async function (tournamentId, id, patch) {
    var map = this._read();
    var list = map[tournamentId] || [];
    var found = null;
    list.forEach(function (p) {
      if (p.id === id) {
        if (patch.name != null) p.name = patch.name;
        if (patch.nickname != null) p.nickname = patch.nickname;
        if (patch.contact != null) p.contact = patch.contact;
        if (patch.paid != null) p.paid = !!patch.paid;
        found = cleanParticipant(p);
      }
    });
    map[tournamentId] = list.map(cleanParticipant).filter(Boolean);
    this._write(map);
    return found;
  };

  LocalRegistrationRepository.prototype.remove = async function (tournamentId, id) {
    var map = this._read();
    map[tournamentId] = (map[tournamentId] || []).filter(function (p) { return p.id !== id; });
    this._write(map);
  };

  LocalRegistrationRepository.prototype.clearTournament = async function (tournamentId) {
    var map = this._read();
    delete map[tournamentId];
    this._write(map);
  };

  LocalRegistrationRepository.prototype.replaceAll = async function (map) {
    var out = {};
    Object.keys(map || {}).forEach(function (id) {
      out[id] = (map[id] || []).map(cleanParticipant).filter(Boolean);
    });
    this._write(out);
  };

  LocalRegistrationRepository.prototype.loadTournaments = async function () {
    return null;
  };

  LocalRegistrationRepository.prototype.saveTournaments = async function () {
    return null;
  };

  function supabaseOn(config) {
    var sb = config && config.supabase;
    if (!sb) return null;
    var url = String(sb.url || "").trim().replace(/\/$/, "");
    var key = String(sb.anonKey || "").trim();
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) return null;
    if (key.length < 20) return null;
    return { url: url, key: key };
  }

  function SupabaseRegistrationRepository(opts) {
    this.remote = true;
    this.url = opts.url;
    this.key = opts.key;
  }

  SupabaseRegistrationRepository.prototype.request = async function (method, path, body, prefer) {
    var headers = {
      apikey: this.key,
      Authorization: "Bearer " + this.key,
      "Content-Type": "application/json"
    };
    if (prefer) headers.Prefer = prefer;
    var res = await fetch(this.url + "/rest/v1" + path, {
      method: method,
      headers: headers,
      body: body == null ? undefined : JSON.stringify(body)
    });
    if (!res.ok) {
      var text = await res.text();
      throw new Error("supabase " + res.status + " " + text.slice(0, 180));
    }
    if (res.status === 204) return null;
    var ctype = res.headers.get("content-type") || "";
    if (ctype.indexOf("json") === -1) return null;
    return res.json();
  };

  function toParticipant(row) {
    return cleanParticipant({
      id: row.id,
      name: row.name,
      nickname: row.nickname,
      contact: row.contact,
      paid: row.paid,
      createdAt: row.created_at ? Date.parse(row.created_at) : Date.now()
    });
  }

  SupabaseRegistrationRepository.prototype.list = async function (tournamentId) {
    var rows = await this.request("GET", "/participants?tournament_id=eq." + encodeURIComponent(tournamentId) + "&select=*&order=created_at.asc");
    return (rows || []).map(toParticipant).filter(Boolean);
  };

  SupabaseRegistrationRepository.prototype.loadAll = async function () {
    var rows = await this.request("GET", "/participants?select=*&order=created_at.asc");
    var out = {};
    (rows || []).forEach(function (row) {
      var p = toParticipant(row);
      if (!p) return;
      if (!out[row.tournament_id]) out[row.tournament_id] = [];
      out[row.tournament_id].push(p);
    });
    return out;
  };

  SupabaseRegistrationRepository.prototype.add = async function (tournamentId, participant) {
    var row = cleanParticipant(participant);
    var created = await this.request("POST", "/participants", {
      id: row.id,
      tournament_id: tournamentId,
      name: row.name,
      nickname: row.nickname,
      contact: row.contact,
      paid: row.paid
    }, "return=representation");
    return (created && created[0] && toParticipant(created[0])) || row;
  };

  SupabaseRegistrationRepository.prototype.update = async function (tournamentId, id, patch) {
    var body = {};
    if (patch.name != null) body.name = patch.name;
    if (patch.nickname != null) body.nickname = patch.nickname;
    if (patch.contact != null) body.contact = patch.contact;
    if (patch.paid != null) body.paid = !!patch.paid;
    var rows = await this.request("PATCH", "/participants?id=eq." + encodeURIComponent(id) + "&tournament_id=eq." + encodeURIComponent(tournamentId), body, "return=representation");
    return rows && rows[0] ? toParticipant(rows[0]) : null;
  };

  SupabaseRegistrationRepository.prototype.remove = async function (tournamentId, id) {
    await this.request("DELETE", "/participants?id=eq." + encodeURIComponent(id) + "&tournament_id=eq." + encodeURIComponent(tournamentId));
  };

  SupabaseRegistrationRepository.prototype.clearTournament = async function (tournamentId) {
    await this.request("DELETE", "/participants?tournament_id=eq." + encodeURIComponent(tournamentId));
  };

  SupabaseRegistrationRepository.prototype.replaceAll = async function (map) {
    var self = this;
    var ids = Object.keys(map || {});
    for (var i = 0; i < ids.length; i++) {
      await self.clearTournament(ids[i]);
      var list = map[ids[i]] || [];
      for (var j = 0; j < list.length; j++) await self.add(ids[i], list[j]);
    }
  };

  function tournamentToRow(t, index) {
    return {
      id: t.id,
      title: t.title,
      date: t.date,
      time: t.time,
      fee: t.fee,
      payment_type: t.paymentType,
      prize1: t.prizes[0],
      prize2: t.prizes[1],
      prize3: t.prizes[2],
      sort_index: index
    };
  }

  function rowToTournament(row) {
    return {
      id: row.id,
      title: row.title,
      date: row.date,
      time: row.time,
      fee: row.fee,
      paymentType: row.payment_type,
      prizes: [row.prize1, row.prize2, row.prize3],
      paidSnapshot: 0,
      listSnapshot: 0
    };
  }

  SupabaseRegistrationRepository.prototype.loadTournaments = async function () {
    var rows = await this.request("GET", "/tournaments?select=*&order=sort_index.asc");
    return (rows || []).map(rowToTournament);
  };

  SupabaseRegistrationRepository.prototype.saveTournaments = async function (list) {
    var rows = (list || []).map(tournamentToRow);
    if (rows.length) {
      await this.request("POST", "/tournaments?on_conflict=id", rows, "resolution=merge-duplicates,return=minimal");
    }
    var ids = rows.map(function (r) { return r.id; }).join(",");
    if (ids) await this.request("DELETE", "/tournaments?id=not.in.(" + ids + ")");
  };

  function createRepository(config) {
    var opts = supabaseOn(config);
    if (opts) return new SupabaseRegistrationRepository(opts);
    return new LocalRegistrationRepository();
  }

  root.FifaData = {
    createRepository: createRepository,
    cleanParticipant: cleanParticipant,
    uid: uid,
    LocalRegistrationRepository: LocalRegistrationRepository,
    SupabaseRegistrationRepository: SupabaseRegistrationRepository
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
