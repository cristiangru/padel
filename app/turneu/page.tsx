"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Player = { id: number; name: string; present: boolean };

type MatchState = {
  id: string;
  index: number;
  teamA: Player[];
  teamB: Player[];
  sitting: Player[];
  scoreA: string;
  scoreB: string;
  target: number;
  saved: boolean;
};

type Standing = {
  id: number;
  name: string;
  points: number;
  matchesPlayed: number;
  goalDiff: number;
};

type Tab = "players" | "selection" | "matches" | "standings";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const INITIAL_PLAYERS: Player[] = [
  { id: 1, name: "Cristica" },
  { id: 2, name: "Alice" },
  { id: 3, name: "Victoraș" },
  { id: 4, name: "Ali" },
  { id: 5, name: "Sako" },
  { id: 6, name: "BiancaMarga" },
  { id: 7, name: "AndreiFig" },
  { id: 8, name: "Cristea" },
  { id: 9, name: "Edi" },
  { id: 10, name: "Karina" },
  { id: 11, name: "Junior" },
  { id: 12, name: "Manu" },
  { id: 13, name: "Sonelu" },
  { id: 15, name: "Georgi" },
  { id: 16, name: "Adeona" },
  { id: 17, name: "Luca" },
]
  .map((player) => ({ ...player, present: false }))
  .sort((a, b) => a.name.localeCompare(b.name));

const GAME_TARGETS = [8, 12, 16];

function calculateAmericanoMatches(playerCount: number) {
  return Math.ceil((playerCount * (playerCount - 1)) / 4);
}

function validateAndFixState(raw: unknown): {
  dbPlayers: Player[];
  target: number;
  tournament: MatchState[] | null;
  matchIndex: number;
  standings: Record<number, Standing>;
  tab: Tab;
} {
  const parsed =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};
  const legacyPresentIds = Array.isArray(parsed.presentIds)
    ? (parsed.presentIds.filter((id) => typeof id === "number") as number[])
    : [];
  const presentSet = new Set(legacyPresentIds);

  const players = Array.isArray(parsed.dbPlayers)
    ? parsed.dbPlayers
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const id = typeof item.id === "number" ? item.id : NaN;
          const name = typeof item.name === "string" ? item.name.trim() : "";
          const present =
            typeof item.present === "boolean"
              ? item.present
              : presentSet.has(id);
          if (!Number.isFinite(id) || !name) return null;
          return { id, name, present };
        })
        .filter((p): p is Player => Boolean(p))
    : INITIAL_PLAYERS;

  const uniquePlayers: Player[] = [];
  const seenIds = new Set<number>();
  players.forEach((player) => {
    if (!seenIds.has(player.id)) {
      seenIds.add(player.id);
      uniquePlayers.push(player);
    }
  });

  const dbPlayers = [...uniquePlayers].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const resolve = (id: number) => dbPlayers.find((p) => p.id === id);

  const target = GAME_TARGETS.includes(parsed.target as number)
    ? (parsed.target as number)
    : 12;

  const tournament = Array.isArray(parsed.tournament)
    ? parsed.tournament
        .map((match) => {
          if (!match || typeof match !== "object") return null;
          const t = match as Record<string, unknown>;
          const index = typeof t.index === "number" ? t.index : null;
          const targetValue = typeof t.target === "number" ? t.target : null;
          const scoreA = typeof t.scoreA === "string" ? t.scoreA : "";
          const scoreB = typeof t.scoreB === "string" ? t.scoreB : "";
          const saved = typeof t.saved === "boolean" ? t.saved : false;
          const id = typeof t.id === "string" ? t.id : null;

          const resolvePlayers = (arr: unknown): Player[] | null => {
            if (!Array.isArray(arr)) return null;
            const resolved = arr
              .map((item) => {
                if (!item || typeof item !== "object") return null;
                const pid =
                  typeof (item as any).id === "number" ? (item as any).id : NaN;
                return Number.isFinite(pid) ? (resolve(pid) ?? null) : null;
              })
              .filter((p): p is Player => Boolean(p));
            return resolved.length === arr.length ? resolved : null;
          };

          const teamA = resolvePlayers(t.teamA);
          const teamB = resolvePlayers(t.teamB);
          const sitting = resolvePlayers(t.sitting);
          if (
            index === null ||
            targetValue === null ||
            !id ||
            !teamA ||
            !teamB ||
            sitting === null
          )
            return null;

          return {
            id,
            index,
            teamA,
            teamB,
            sitting,
            scoreA,
            scoreB,
            target: targetValue,
            saved,
          };
        })
        .filter((m): m is MatchState => Boolean(m))
    : null;

  const standings =
    typeof parsed.standings === "object" && parsed.standings !== null
      ? Object.entries(parsed.standings).reduce<Record<number, Standing>>(
          (acc, [key, value]) => {
            if (!value || typeof value !== "object") return acc;
            const id = Number(key);
            if (!Number.isFinite(id) || !resolve(id)) return acc;
            const points =
              typeof (value as any).points === "number"
                ? (value as any).points
                : 0;
            const matchesPlayed =
              typeof (value as any).matchesPlayed === "number"
                ? (value as any).matchesPlayed
                : 0;
            const goalDiff =
              typeof (value as any).goalDiff === "number"
                ? (value as any).goalDiff
                : 0;
            const name =
              typeof (value as any).name === "string"
                ? (value as any).name
                : resolve(id)!.name;
            acc[id] = { id, name, points, matchesPlayed, goalDiff };
            return acc;
          },
          {},
        )
      : {};

  const tournamentSafe =
    tournament &&
    tournament.every(
      (match) => match.teamA.length === 2 && match.teamB.length === 2,
    )
      ? tournament
      : null;

  const matchIndex =
    typeof parsed.matchIndex === "number" && parsed.matchIndex >= 0
      ? Math.min(parsed.matchIndex, tournamentSafe ? tournamentSafe.length : 0)
      : 0;
  const tab = (
    parsed.tab === "players" ||
    parsed.tab === "selection" ||
    parsed.tab === "matches" ||
    parsed.tab === "standings"
      ? parsed.tab
      : "selection"
  ) as Tab;

  return {
    dbPlayers,
    target,
    tournament: tournamentSafe,
    matchIndex,
    standings,
    tab,
  };
}

// ─── ALGORITHM: SINGLE COURT AMERICANO ───────────────────────────────────────
// One court at a time. Each match: 4 play, rest sit out.
// Fair rotation: those who sat out longest get priority to play next.
// Partner rotation: minimise repetition across the session.

function generateSingleCourtAmericano(
  ids: number[],
  allPlayers: Player[],
  totalMatches: number,
  target: number,
): MatchState[] {
  const n = ids.length;
  if (n < 4) return [];

  const matches: MatchState[] = [];
  const partnerCount: Record<string, number> = {};
  // sitWeight: higher = hasn't played recently, should play next
  const playWeight: Record<number, number> = {};
  ids.forEach((id) => (playWeight[id] = 0));

  function pairKey(a: number, b: number) {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }
  function getPairScore(a: number, b: number) {
    return partnerCount[pairKey(a, b)] ?? 0;
  }
  function recordPair(a: number, b: number) {
    const k = pairKey(a, b);
    partnerCount[k] = (partnerCount[k] ?? 0) + 1;
  }

  const resolve = (id: number) => allPlayers.find((p) => p.id === id)!;

  for (let m = 0; m < totalMatches; m++) {
    // Sort by weight descending: those who sat out more go first
    const sorted = [...ids].sort((a, b) => playWeight[b] - playWeight[a]);
    const playIds = sorted.slice(0, 4);
    const sittingIds = sorted.slice(4);

    // Pick pairing that minimises partner repetition
    const options: [[number, number], [number, number]][] = [
      [
        [playIds[0], playIds[1]],
        [playIds[2], playIds[3]],
      ],
      [
        [playIds[0], playIds[2]],
        [playIds[1], playIds[3]],
      ],
      [
        [playIds[0], playIds[3]],
        [playIds[1], playIds[2]],
      ],
    ];
    let best = options[0];
    let bestScore = Infinity;
    for (const opt of options) {
      const s =
        getPairScore(opt[0][0], opt[0][1]) + getPairScore(opt[1][0], opt[1][1]);
      if (s < bestScore) {
        bestScore = s;
        best = opt;
      }
    }

    recordPair(best[0][0], best[0][1]);
    recordPair(best[1][0], best[1][1]);

    // Players who played lose weight; sitting players gain weight
    playIds.forEach((id) => {
      playWeight[id] -= n;
    });
    sittingIds.forEach((id) => {
      playWeight[id] += 4;
    });

    matches.push({
      id: `m-${m}`,
      index: m,
      teamA: best[0].map(resolve),
      teamB: best[1].map(resolve),
      sitting: sittingIds.map(resolve),
      scoreA: "",
      scoreB: "",
      target,
      saved: false,
    });
  }

  return matches;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function firstName(name: string) {
  return name.split(" ")[0];
}
function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function Page() {
  const [tab, setTab] = useState<Tab>("selection");
  const [dbPlayers, setDbPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [target, setTargetState] = useState(12);
  const [tournament, setTournament] = useState<MatchState[] | null>(null);
  const [matchIndex, setMatchIndex] = useState(0);
  const [standings, setStandings] = useState<Record<number, Standing>>({});
  const [message, setMessage] = useState<{
    text: string;
    type: "ok" | "warn" | "err";
  } | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [scoreA, setScoreA] = useState("");

  const sortedPlayers = useMemo(
    () => [...dbPlayers].sort((a, b) => a.name.localeCompare(b.name)),
    [dbPlayers],
  );
  const presentPlayers = useMemo(
    () => dbPlayers.filter((p) => p.present),
    [dbPlayers],
  );
  const [scoreB, setScoreB] = useState("");

  // ── Persistence ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem("padel_v4");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const safe = validateAndFixState(parsed);
      setDbPlayers(safe.dbPlayers);
      setTargetState(safe.target);
      setTournament(safe.tournament);
      setMatchIndex(safe.matchIndex);
      setStandings(safe.standings);
      setTab(safe.tab);
    } catch (_) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "padel_v4",
        JSON.stringify({
          dbPlayers: dbPlayers.map(({ id, name, present }) => ({
            id,
            name,
            present,
          })),
          target,
          tournament,
          matchIndex,
          standings,
          tab,
        }),
      );
    } catch (_) {}
  }, [dbPlayers, target, tournament, matchIndex, standings, tab]);

  const showMsg = useCallback(
    (text: string, type: "ok" | "warn" | "err" = "warn") => {
      setMessage({ text, type });
      setTimeout(() => setMessage(null), 4000);
    },
    [],
  );

  // ── Players ──
  function handleAddPlayer() {
    const name = newPlayerName.trim();
    if (!name) {
      showMsg("Introdu un nume valid.");
      return;
    }
    const p: Player = { id: Date.now(), name, present: true };
    setDbPlayers((prev) =>
      [...prev, p].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setNewPlayerName("");
    showMsg(`"${name}" adăugat!`, "ok");
  }

  function handleDeletePlayer(id: number) {
    if (tournament) {
      showMsg("Nu poți șterge în timpul turneului!", "err");
      return;
    }
    setDbPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  function handleSaveEdit(id: number) {
    const name = editingName.trim();
    if (!name) return;
    setDbPlayers((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, name } : p))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    setEditingId(null);
  }

  // ── Tournament ──
  function startTournament() {
    if (presentPlayers.length < 4) {
      showMsg("Minim 4 jucători necesari!", "err");
      return;
    }
    const validIds = presentPlayers.map((p) => p.id);
    const autoMatchCount = calculateAmericanoMatches(validIds.length);
    const matches = generateSingleCourtAmericano(
      validIds,
      dbPlayers,
      autoMatchCount,
      target,
    );
    const initS: Record<number, Standing> = {};
    presentPlayers.forEach((p) => {
      initS[p.id] = {
        id: p.id,
        name: p.name,
        points: 0,
        matchesPlayed: 0,
        goalDiff: 0,
      };
    });
    setStandings(initS);
    setTournament(matches);
    setMatchIndex(0);
    setScoreA("");
    setScoreB("");
    setTab("matches");
  }

  function resetTournament() {
    if (!window.confirm("Resetezi turneul? Toate scorurile se pierd.")) return;
    setTournament(null);
    setMatchIndex(0);
    setStandings({});
    setScoreA("");
    setScoreB("");
    setTab("selection");
  }

  function saveScore() {
    if (!tournament) return;
    const m = tournament[matchIndex];
    if (!m) return;
    const a = parseInt(scoreA, 10);
    const b = parseInt(scoreB, 10);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) {
      showMsg("Introdu scoruri valide.", "err");
      return;
    }
    if (a + b !== m.target) {
      showMsg(`Suma trebuie să fie ${m.target}. Acum e ${a + b}.`, "err");
      return;
    }

    setStandings((prev) => {
      const next = { ...prev };
      m.teamA.forEach((p) => {
        if (next[p.id])
          next[p.id] = {
            ...next[p.id],
            points: next[p.id].points + a,
            matchesPlayed: next[p.id].matchesPlayed + 1,
            goalDiff: next[p.id].goalDiff + (a - b),
          };
      });
      m.teamB.forEach((p) => {
        if (next[p.id])
          next[p.id] = {
            ...next[p.id],
            points: next[p.id].points + b,
            matchesPlayed: next[p.id].matchesPlayed + 1,
            goalDiff: next[p.id].goalDiff + (b - a),
          };
      });
      return next;
    });
    setTournament((prev) => {
      if (!prev) return prev;
      const copy = [...prev];
      copy[matchIndex] = {
        ...copy[matchIndex],
        scoreA: String(a),
        scoreB: String(b),
        saved: true,
      };
      return copy;
    });
    setScoreA("");
    setScoreB("");
    const next = matchIndex + 1;
    setMatchIndex(next);
    if (next >= tournament.length) {
      showMsg("Turneu finalizat! 🏆", "ok");
      setTimeout(() => setTab("standings"), 900);
    }
  }

  function prevMatch() {
    if (!tournament || matchIndex === 0) return;
    const prev = tournament[matchIndex - 1];
    if (!prev) return;
    if (prev.saved) {
      const a = parseInt(prev.scoreA, 10) || 0;
      const b = parseInt(prev.scoreB, 10) || 0;
      setStandings((s) => {
        const next = { ...s };
        prev.teamA.forEach((p) => {
          if (next[p.id])
            next[p.id] = {
              ...next[p.id],
              points: Math.max(0, next[p.id].points - a),
              matchesPlayed: Math.max(0, next[p.id].matchesPlayed - 1),
              goalDiff: next[p.id].goalDiff - (a - b),
            };
        });
        prev.teamB.forEach((p) => {
          if (next[p.id])
            next[p.id] = {
              ...next[p.id],
              points: Math.max(0, next[p.id].points - b),
              matchesPlayed: Math.max(0, next[p.id].matchesPlayed - 1),
              goalDiff: next[p.id].goalDiff - (b - a),
            };
        });
        return next;
      });
      setTournament((t) => {
        if (!t) return t;
        const c = [...t];
        c[matchIndex - 1] = {
          ...c[matchIndex - 1],
          saved: false,
          scoreA: "",
          scoreB: "",
        };
        return c;
      });
      setScoreA(prev.scoreA);
      setScoreB(prev.scoreB);
    }
    setMatchIndex((i) => i - 1);
  }

  function skipMatch() {
    if (!tournament) return;
    const m = tournament[matchIndex];
    if (!m || m.saved) return;
    setTournament((prev) => {
      if (!prev) return prev;
      const copy = [...prev];
      const [sk] = copy.splice(matchIndex, 1);
      copy.push({ ...sk, scoreA: "", scoreB: "" });
      return copy;
    });
    showMsg("Meci trimis la coadă.");
  }

  // ── Derived ──
  const currentMatch = tournament?.[matchIndex] ?? null;
  const nextMatches = tournament?.slice(matchIndex + 1, matchIndex + 6) ?? [];
  const totalMatches = tournament?.length ?? 0;
  const doneMatches = tournament?.filter((m) => m.saved).length ?? 0;
  const progress =
    totalMatches > 0 ? Math.round((doneMatches / totalMatches) * 100) : 0;
  const validN = presentPlayers.length;

  const sortedStandings = useMemo(
    () =>
      Object.values(standings).sort(
        (a, b) => b.points - a.points || b.goalDiff - a.goalDiff,
      ),
    [standings],
  );

  const medals = ["🥇", "🥈", "🥉"];

  const navBtn = (t: Tab, icon: string, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`flex flex-col items-center justify-center flex-1 gap-0.5 py-2 transition-all ${tab === t ? "text-[#00ff88]" : "text-gray-600 hover:text-gray-400"}`}
    >
      <span
        className={`text-xl transition-transform ${tab === t ? "scale-110" : ""}`}
      >
        {icon}
      </span>
      <span className="text-[8px] font-black tracking-[0.12em] uppercase">
        {label}
      </span>
      {tab === t && (
        <span className="block w-4 h-0.5 bg-[#00ff88] rounded-full mt-0.5" />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#06070f] text-[#e8e8f0] pb-20 antialiased">
      <div className="max-w-md mx-auto px-4 pt-5">
        {/* ── HEADER ── */}
        <header className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] font-black tracking-[0.3em] uppercase text-[#00ff88]/70 mb-1">
                Un teren · Americano
              </p>
              <h1 className="text-[28px] font-black uppercase tracking-tight leading-none text-white">
                Padel
                <br />
                <span className="text-[#00ff88]">Americano</span>
              </h1>
            </div>
            <div className="text-right">
              {tournament ? (
                <div className="text-right">
                  <p className="text-[9px] text-gray-600 uppercase tracking-widest font-black mb-1">
                    Progres
                  </p>
                  <p className="text-2xl font-black tabular-nums text-white leading-none">
                    {doneMatches}
                    <span className="text-gray-600 text-sm font-medium">
                      /{totalMatches}
                    </span>
                  </p>
                  <button
                    onClick={resetTournament}
                    className="mt-2 text-[9px] font-black uppercase tracking-wider text-red-500 border border-red-500/25 px-2.5 py-1 rounded-lg hover:bg-red-500/8 transition-all"
                  >
                    Reset 🚨
                  </button>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl border border-[#00ff88]/15 bg-[#00ff88]/4 flex items-center justify-center text-2xl">
                  🎾
                </div>
              )}
            </div>
          </div>

          {tournament && (
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                  {progress}% complet
                </span>
                <span className="text-[9px] font-bold text-gray-600">
                  Meci {Math.min(matchIndex + 1, totalMatches)} din{" "}
                  {totalMatches}
                </span>
              </div>
              <div className="h-[3px] bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00ff88] rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </header>

        {/* ── MESSAGE ── */}
        {message && (
          <div
            className={`mb-4 px-4 py-2.5 rounded-xl text-xs font-bold text-center border ${
              message.type === "ok"
                ? "bg-[#00ff88]/8 border-[#00ff88]/20 text-[#00ff88]"
                : message.type === "err"
                  ? "bg-red-500/8 border-red-500/20 text-red-400"
                  : "bg-amber-500/8 border-amber-500/20 text-amber-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* ══════════ TAB: SELECȚIE ══════════ */}
        {tab === "selection" && (
          <section className="space-y-5">
            {/* Config */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500 mb-3">
                  Puncte țintă per meci
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {GAME_TARGETS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTargetState(t)}
                      disabled={!!tournament}
                      className={`py-3 rounded-xl text-sm font-black border transition-all disabled:opacity-40 ${
                        target === t
                          ? "border-[#00ff88]/50 text-[#00ff88] bg-[#00ff88]/8"
                          : "border-white/8 text-gray-500 hover:border-white/15 hover:text-gray-300"
                      }`}
                    >
                      {t}{" "}
                      <span className="text-[9px] font-semibold opacity-70">
                        pct
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#00ff88]/10 bg-[#00ff88]/5 p-4 text-sm font-black text-[#00ff88]">
                <p className="uppercase tracking-[0.25em] text-[9px] text-[#d3ffcc] mb-2">
                  Americano complet generat automat
                </p>
                <p className="leading-tight">
                  Numărul de meciuri este calculat automat pentru {validN}{" "}
                  jucători și acoperă rotația echilibrată cu odihnă corectă.
                </p>
              </div>
            </div>

            {/* Info pill */}
            <div
              className={`flex items-center justify-between px-4 py-3 rounded-xl border text-[11px] font-bold ${
                validN < 4
                  ? "border-red-500/20 bg-red-500/5 text-red-400"
                  : "border-[#00ff88]/15 bg-[#00ff88]/4 text-[#00ff88]"
              }`}
            >
              {validN < 4 ? (
                <span>❌ Minim 4 jucători necesari</span>
              ) : (
                <>
                  <span>
                    ✓ {validN} selectați · {calculateAmericanoMatches(validN)}{" "}
                    meciuri
                  </span>
                  <span className="text-gray-500">
                    {validN - 4} pe bancă per meci
                  </span>
                </>
              )}
            </div>

            {/* Player grid */}
            <div>
              <div className="flex items-center justify-between mb-3 px-0.5">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500">
                  Cine joacă azi?
                </p>
                <button
                  onClick={() =>
                    setDbPlayers((prev) =>
                      prev.map((p) => ({
                        ...p,
                        present: presentPlayers.length !== prev.length,
                      })),
                    )
                  }
                  className="text-[9px] font-black text-gray-600 hover:text-[#00ff88] uppercase tracking-wider transition-colors"
                >
                  {presentPlayers.length === dbPlayers.length
                    ? "Deselectează tot"
                    : "Selectează tot"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {sortedPlayers.map((p) => {
                  const on = p.present;
                  return (
                    <button
                      key={p.id}
                      disabled={!!tournament}
                      onClick={() =>
                        setDbPlayers((prev) =>
                          prev.map((item) =>
                            item.id === p.id
                              ? { ...item, present: !item.present }
                              : item,
                          ),
                        )
                      }
                      className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-left transition-all disabled:opacity-50 active:scale-[.97] ${
                        on
                          ? "border-[#00ff88]/30 bg-[#00ff88]/5 text-white"
                          : "border-white/7 bg-white/[0.02] text-gray-500 hover:border-white/12"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-black border ${
                          on
                            ? "bg-[#00ff88]/12 border-[#00ff88]/35 text-[#00ff88]"
                            : "bg-white/4 border-white/8 text-gray-600"
                        }`}
                      >
                        {initials(p.name)}
                      </div>
                      <span
                        className={`text-xs font-bold leading-tight flex-1 ${on ? "text-white" : "text-gray-500"}`}
                      >
                        {firstName(p.name)}
                      </span>
                      {on && (
                        <span className="text-[#00ff88] text-xs font-black ml-auto">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={startTournament}
              className="w-full py-4 bg-[#00ff88] hover:bg-[#00e87a] active:scale-[.98] text-[#06070f] font-black text-sm uppercase tracking-[0.15em] rounded-2xl transition-all shadow-lg shadow-[#00ff88]/10 mt-1"
            >
              Generează Turneul →
            </button>
          </section>
        )}

        {/* ══════════ TAB: MECIURI ══════════ */}
        {tab === "matches" && (
          <section className="space-y-3">
            {!currentMatch && tournament && matchIndex >= tournament.length ? (
              /* Finished */
              <div className="rounded-2xl border border-[#00ff88]/20 bg-[#00ff88]/4 p-10 text-center space-y-3">
                <p className="text-5xl">🏆</p>
                <p className="text-lg font-black text-[#00ff88] uppercase tracking-widest">
                  Turneu Finalizat
                </p>
                <p className="text-xs text-gray-500">Vezi clasamentul final</p>
              </div>
            ) : !currentMatch ? (
              <div className="rounded-2xl border border-white/8 p-10 text-center text-gray-500 text-sm">
                Niciun turneu activ. Mergi la Selecție!
              </div>
            ) : (
              <>
                {/* Bench */}
                {currentMatch.sitting.length > 0 && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/4 border border-amber-500/12">
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-500/60 flex-shrink-0">
                      Bancă:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentMatch.sitting.map((p) => (
                        <span
                          key={p.id}
                          className="text-[10px] font-bold text-amber-400/80 bg-amber-400/8 px-2 py-0.5 rounded-full border border-amber-400/15"
                        >
                          {firstName(p.name)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Match card */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                  {/* Header strip */}
                  <div className="bg-[#00ff88]/6 border-b border-[#00ff88]/12 px-5 py-3 flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#00ff88]">
                      Meci {matchIndex + 1} din {totalMatches}
                    </span>
                    <span className="text-[9px] font-bold text-gray-600">
                      🎯 {currentMatch.target} puncte total
                    </span>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Teams */}
                    <div className="grid grid-cols-[1fr_28px_1fr] gap-2 items-center">
                      <div className="text-center">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00ff88]/50 mb-2.5">
                          Echipa A
                        </p>
                        {currentMatch.teamA.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-center gap-1.5 mb-1.5"
                          >
                            <div className="w-7 h-7 rounded-full bg-[#00ff88]/8 border border-[#00ff88]/20 flex items-center justify-center text-[9px] font-black text-[#00ff88]">
                              {initials(p.name)}
                            </div>
                            <span className="text-sm font-bold text-white">
                              {firstName(p.name)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col items-center gap-1.5 self-stretch justify-center">
                        <div className="flex-1 w-px bg-white/6" />
                        <span className="text-[9px] font-black text-gray-700 uppercase">
                          vs
                        </span>
                        <div className="flex-1 w-px bg-white/6" />
                      </div>

                      <div className="text-center">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-400/50 mb-2.5">
                          Echipa B
                        </p>
                        {currentMatch.teamB.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-center gap-1.5 mb-1.5"
                          >
                            <div className="w-7 h-7 rounded-full bg-sky-400/8 border border-sky-400/20 flex items-center justify-center text-[9px] font-black text-sky-400">
                              {initials(p.name)}
                            </div>
                            <span className="text-sm font-bold text-white">
                              {firstName(p.name)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Score inputs */}
                    <div className="flex items-center justify-center gap-5">
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={scoreA}
                        onChange={(e) => setScoreA(e.target.value)}
                        className="w-[76px] h-[68px] bg-[#00ff88]/4 border-2 border-[#00ff88]/20 focus:border-[#00ff88]/60 rounded-2xl text-[#00ff88] font-black text-4xl text-center outline-none transition-all tabular-nums"
                      />
                      <div className="text-center">
                        <p className="text-[10px] font-black tabular-nums text-gray-600">
                          {(parseInt(scoreA) || 0) + (parseInt(scoreB) || 0)}
                          <span className="text-gray-700">
                            /{currentMatch.target}
                          </span>
                        </p>
                      </div>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={scoreB}
                        onChange={(e) => setScoreB(e.target.value)}
                        className="w-[76px] h-[68px] bg-sky-400/4 border-2 border-sky-400/20 focus:border-sky-400/60 rounded-2xl text-sky-400 font-black text-4xl text-center outline-none transition-all tabular-nums"
                      />
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={prevMatch}
                        disabled={matchIndex === 0}
                        className="py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-600 border border-white/8 hover:border-white/15 hover:text-gray-400 transition-all disabled:opacity-25"
                      >
                        ← Înapoi
                      </button>
                      <button
                        onClick={skipMatch}
                        className="py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-600 border border-white/8 hover:border-white/15 hover:text-gray-400 transition-all"
                      >
                        Sari →
                      </button>
                      <button
                        onClick={saveScore}
                        className="py-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#00ff88] text-[#06070f] hover:bg-[#00e87a] active:scale-[.97] transition-all"
                      >
                        Salvează ✓
                      </button>
                    </div>
                  </div>
                </div>

                {/* Upcoming */}
                {nextMatches.length > 0 && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-600 mb-2 px-0.5">
                      Urmează
                    </p>
                    <div className="space-y-1.5">
                      {nextMatches.map((m, i) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/5"
                        >
                          <span className="text-[9px] font-black text-gray-700 tabular-nums w-5">
                            #{matchIndex + 2 + i}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-400">
                            {m.teamA.map((p) => firstName(p.name)).join(" & ")}
                          </span>
                          <span className="text-[9px] font-black text-gray-700 uppercase px-0.5">
                            vs
                          </span>
                          <span className="text-[11px] font-semibold text-gray-400">
                            {m.teamB.map((p) => firstName(p.name)).join(" & ")}
                          </span>
                          {m.sitting.length > 0 && (
                            <span className="ml-auto text-[9px] text-amber-500/50 font-semibold flex-shrink-0">
                              {m.sitting
                                .map((p) => firstName(p.name))
                                .join(", ")}{" "}
                              stă
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ══════════ TAB: CLASAMENT ══════════ */}
        {tab === "standings" && (
          <section className="space-y-3">
            {sortedStandings.length === 0 ? (
              <div className="rounded-2xl border border-white/8 p-10 text-center text-gray-500 text-sm">
                Niciun turneu activ.
              </div>
            ) : (
              <>
                {/* Podium */}
                {sortedStandings.length >= 3 && (
                  <div className="grid grid-cols-3 gap-2 mb-1">
                    {[
                      sortedStandings[1],
                      sortedStandings[0],
                      sortedStandings[2],
                    ].map((p, visIdx) => {
                      const rank = visIdx === 1 ? 0 : visIdx === 0 ? 1 : 2;
                      const heights = ["h-24", "h-32", "h-20"];
                      const styles = [
                        "border-sky-400/25 bg-sky-400/4 text-sky-400",
                        "border-[#00ff88]/35 bg-[#00ff88]/6 text-[#00ff88]",
                        "border-amber-500/25 bg-amber-500/4 text-amber-500",
                      ];
                      return (
                        <div
                          key={p.id}
                          className={`flex flex-col items-center justify-end rounded-2xl border ${styles[rank]} ${heights[rank]} pb-3 pt-2 px-2`}
                        >
                          <span className="text-xl mb-1">{medals[rank]}</span>
                          <span className="text-[10px] font-black text-center text-white leading-tight">
                            {firstName(p.name)}
                          </span>
                          <span className="text-lg font-black tabular-nums">
                            {p.points}
                          </span>
                          <span className="text-[8px] opacity-50 font-bold">
                            pct
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Table */}
                <div className="rounded-2xl border border-white/8 overflow-hidden">
                  <div className="grid grid-cols-12 bg-white/3 px-4 py-2.5 border-b border-white/6">
                    <span className="col-span-1 text-[8px] font-black text-gray-600 uppercase">
                      #
                    </span>
                    <span className="col-span-6 text-[8px] font-black text-gray-600 uppercase">
                      Jucător
                    </span>
                    <span className="col-span-2 text-[8px] font-black text-gray-600 uppercase text-center">
                      Jocuri
                    </span>
                    <span className="col-span-3 text-[8px] font-black text-gray-600 uppercase text-right">
                      Pct
                    </span>
                  </div>
                  <div className="divide-y divide-white/4">
                    {sortedStandings.map((p, idx) => (
                      <div
                        key={p.id}
                        className={`grid grid-cols-12 px-4 py-3 items-center ${idx === 0 ? "bg-[#00ff88]/3" : ""}`}
                      >
                        <span className="col-span-1">
                          {idx < 3 ? (
                            <span className="text-base">{medals[idx]}</span>
                          ) : (
                            <span className="text-[10px] font-black text-gray-600">
                              {idx + 1}
                            </span>
                          )}
                        </span>
                        <div className="col-span-6 flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 ${idx === 0 ? "bg-[#00ff88]/12 border border-[#00ff88]/30 text-[#00ff88]" : "bg-white/4 border border-white/8 text-gray-600"}`}
                          >
                            {initials(p.name)}
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-white leading-none">
                              {p.name}
                            </p>
                            <p
                              className={`text-[9px] font-semibold mt-0.5 ${p.goalDiff >= 0 ? "text-gray-600" : "text-red-500/70"}`}
                            >
                              {p.goalDiff > 0 ? "+" : ""}
                              {p.goalDiff} diff
                            </p>
                          </div>
                        </div>
                        <span className="col-span-2 text-center text-[11px] text-gray-600 font-semibold tabular-nums">
                          {p.matchesPlayed}
                        </span>
                        <span
                          className={`col-span-3 text-right font-black text-base tabular-nums ${idx === 0 ? "text-[#00ff88]" : "text-white"}`}
                        >
                          {p.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 py-1">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[9px] font-black text-gray-600 uppercase tracking-wider">
                    {doneMatches}/{totalMatches} meciuri
                    {doneMatches === totalMatches && totalMatches > 0
                      ? " · Finalizat 🏆"
                      : ""}
                  </span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
              </>
            )}
          </section>
        )}

        {/* ══════════ TAB: JUCĂTORI ══════════ */}
        {tab === "players" && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500">
                Adaugă jucător
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Numele jucătorului..."
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
                  className="flex-1 bg-white/4 border border-white/8 focus:border-[#00ff88]/40 text-white text-sm font-semibold px-4 py-3 rounded-xl outline-none transition-all placeholder:text-gray-700"
                />
                <button
                  onClick={handleAddPlayer}
                  className="bg-[#00ff88] hover:bg-[#00e87a] active:scale-95 text-[#06070f] font-black px-5 rounded-xl text-lg transition-all"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-0.5 mb-1">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500">
                Jucători înregistrați
              </p>
              <span className="text-[9px] font-bold text-gray-600">
                {dbPlayers.length} total
              </span>
            </div>

            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-0.5">
              {sortedPlayers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/7 bg-white/[0.02] hover:bg-white/3 transition-all"
                >
                  {editingId === p.id ? (
                    <div className="flex gap-2 flex-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSaveEdit(p.id)
                        }
                        autoFocus
                        className="flex-1 bg-white/5 border border-[#00ff88]/25 text-white text-xs font-semibold px-3 py-2 rounded-lg outline-none"
                      />
                      <button
                        onClick={() => handleSaveEdit(p.id)}
                        className="bg-[#00ff88] text-[#06070f] text-[10px] font-black px-3 py-2 rounded-lg"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="bg-white/6 text-gray-500 text-[10px] font-black px-3 py-2 rounded-lg"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/8 flex items-center justify-center text-[10px] font-black text-gray-500">
                        {initials(p.name)}
                      </div>
                      <span className="flex-1 text-sm font-semibold text-gray-300">
                        {p.name}
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(p.id);
                          setEditingName(p.name);
                        }}
                        className="text-gray-700 hover:text-gray-400 transition-colors text-sm p-1"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeletePlayer(p.id)}
                        className="text-gray-700 hover:text-red-400 transition-colors text-sm p-1"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50">
        <div className="bg-[#06070f]/96 backdrop-blur-xl border-t border-white/7 flex">
          {navBtn("selection", "👥", "Start")}
          {navBtn("matches", "🎾", "Meciuri")}
          {navBtn("standings", "🏆", "Clasament")}
          {navBtn("players", "⚙️", "Jucători")}
        </div>
      </nav>
    </div>
  );
}
