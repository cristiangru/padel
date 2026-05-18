"use client";
import React, { useMemo, useState, useEffect } from "react";

type Player = {
  id: number;
  name: string;
};

type PlayerState = Player & {
  matchesPlayed: number;
  points: number;
  goalDiff: number;
};

type MatchState = {
  id: string;
  teamA: Player[];
  teamB: Player[];
  scoreA: string;
  scoreB: string;
  target: number;
  saved: boolean;
};

const INITIAL_PLAYERS: Player[] = [
  { id: 1, name: "Cristica" },
  { id: 2, name: "Alice" },
  { id: 3, name: "Victoraș" },
  { id: 4, name: "Ali" },
  { id: 5, name: "Sako" },
  { id: 6, name: "Bianca Marga" },
  { id: 7, name: "Andrei Fig" },
  { id: 8, name: "Cristea" },
  { id: 9, name: "Edi" },
  { id: 10, name: "Karina" },
  { id: 11, name: "Junior" },
  { id: 12, name: "Manu" },
  { id: 13, name: "Sonelu" },
  { id: 15, name: "Georgi" },
  { id: 16, name: "Adeona" },
];

const GAME_TARGETS = [8, 12, 16];

export default function Page() {
  const [tab, setTab] = useState<"players" | "selection" | "matches" | "standings">("players");
  const [target, setTarget] = useState<number>(12);

  const [dbPlayers, setDbPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [presentIds, setPresentIds] = useState<number[]>(INITIAL_PLAYERS.map((p) => p.id));
  
  const [allMatches, setAllMatches] = useState<MatchState[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [tournamentStarted, setTournamentStarted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [newPlayerName, setNewPlayerName] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const [inputScoreA, setInputScoreA] = useState<string>("");
  const [inputScoreB, setInputScoreB] = useState<string>("");

  // --- EFECTE: PERSISTENȚĂ ÎN LOCAL STORAGE ---
  useEffect(() => {
    const savedDbPlayers = localStorage.getItem("padel_dbPlayers");
    const savedPresentIds = localStorage.getItem("padel_presentIds");
    const savedPlayers = localStorage.getItem("padel_players");
    const savedMatches = localStorage.getItem("padel_allMatches");
    const savedIdx = localStorage.getItem("padel_currentMatchIndex");
    const savedStarted = localStorage.getItem("padel_tournamentStarted");
    const savedTarget = localStorage.getItem("padel_target");

    if (savedDbPlayers) setDbPlayers(JSON.parse(savedDbPlayers));
    if (savedPresentIds) setPresentIds(JSON.parse(savedPresentIds));
    if (savedPlayers) setPlayers(JSON.parse(savedPlayers));
    if (savedMatches) setAllMatches(JSON.parse(savedMatches));
    if (savedIdx) setCurrentMatchIndex(Number(savedIdx));
    if (savedStarted) setTournamentStarted(JSON.parse(savedStarted));
    if (savedTarget) setTarget(Number(savedTarget));
  }, []);

  useEffect(() => {
    localStorage.setItem("padel_dbPlayers", JSON.stringify(dbPlayers));
    localStorage.setItem("padel_presentIds", JSON.stringify(presentIds));
    localStorage.setItem("padel_players", JSON.stringify(players));
    localStorage.setItem("padel_allMatches", JSON.stringify(allMatches));
    localStorage.setItem("padel_currentMatchIndex", currentMatchIndex.toString());
    localStorage.setItem("padel_tournamentStarted", JSON.stringify(tournamentStarted));
    localStorage.setItem("padel_target", target.toString());
  }, [dbPlayers, presentIds, players, allMatches, currentMatchIndex, tournamentStarted, target]);

  // --- MANAGEMENT JUCĂTORI ---
  function handleAddPlayer() {
    if (!newPlayerName.trim()) return;
    const newPlayer: Player = { id: Date.now(), name: newPlayerName.trim() };
    setDbPlayers((prev) => [...prev, newPlayer]);
    setPresentIds((prev) => [...prev, newPlayer.id]);
    setNewPlayerName("");
    setMessage(`✅ Jucătorul "${newPlayer.name}" a fost adăugat.`);
  }

  function handleStartEdit(player: Player) {
    setEditingPlayerId(player.id);
    setEditingName(player.name);
  }

  function handleSaveEdit(id: number) {
    if (!editingName.trim()) return;
    setDbPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name: editingName.trim() } : p)));
    setEditingPlayerId(null);
    setEditingName("");
    setMessage("📝 Numele jucătorului a fost actualizat.");
  }

  function handleDeletePlayer(id: number) {
    if (tournamentStarted) {
      setMessage("❌ Nu poți șterge jucători în timpul unui turneu activ!");
      return;
    }
    const playerToDelete = dbPlayers.find((p) => p.id === id);
    setDbPlayers((prev) => prev.filter((p) => p.id !== id));
    setPresentIds((prev) => prev.filter((presentId) => presentId !== id));
    if (playerToDelete) setMessage(`🗑️ Jucătorul "${playerToDelete.name}" a fost șters.`);
  }

  // --- ALGORITM GENERARE PADEL AMERICANO (OPTIMIZAT COMPLET) ---
  function generateTournamentMatches(selectedIds: number[]): MatchState[] {
    const list: MatchState[] = [];
    const n = selectedIds.length;
    const activePlayers = dbPlayers.filter(p => selectedIds.includes(p.id));

    // Generăm toate combinațiile unice de 4 jucători
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        for (let k = j + 1; k < n; k++) {
          for (let l = k + 1; l < n; l++) {
            const p1 = activePlayers[i];
            const p2 = activePlayers[j];
            const p3 = activePlayers[k];
            const p4 = activePlayers[l];

            if (p1 && p2 && p3 && p4) {
              // Pentru fiecare grup de 4 jucători, există exact 3 combinații unice de meciuri:
              const matchCombinations = [
                { tA: [p1, p2], tB: [p3, p4], type: "v1" },
                { tA: [p1, p3], tB: [p2, p4], type: "v2" },
                { tA: [p1, p4], tB: [p2, p3], type: "v3" }
              ];

              matchCombinations.forEach((combo) => {
                list.push({
                  // ID stabil și predictibil format din id-urile unice ale jucătorilor ordonați crescător
                  id: `m-${p1.id}-${p2.id}-${p3.id}-${p4.id}-${combo.type}`,
                  teamA: combo.tA,
                  teamB: combo.tB,
                  scoreA: "",
                  scoreB: "",
                  target: target,
                  saved: false,
                });
              });
            }
          }
        }
      }
    }

    // Amestecăm meciurile pentru varietate pe teren
    return list.sort(() => Math.random() - 0.5);
  }

  function startTournament() {
    const validPresentIds = presentIds.filter(id => dbPlayers.some(p => p.id === id));
    if (validPresentIds.length < 4) {
      setMessage("❌ Selectează cel puțin 4 jucători pentru a putea forma un meci!");
      return;
    }
    setMessage(null);
    setPlayers(dbPlayers.filter(p => validPresentIds.includes(p.id)).map(p => ({ ...p, matchesPlayed: 0, points: 0, goalDiff: 0 })));

    const schedule = generateTournamentMatches(validPresentIds);
    if (schedule.length === 0) {
      setMessage("❌ Eroare la generarea meciurilor.");
      return;
    }

    setAllMatches(schedule);
    setCurrentMatchIndex(0);
    setInputScoreA("");
    setInputScoreB("");
    setTournamentStarted(true);
    setTab("matches");
  }

  // --- LOGICĂ CONTROL MECIURI ---
  function saveCurrentScore() {
    const currentMatch = allMatches[currentMatchIndex];
    if (!currentMatch) return;

    const valA = inputScoreA.trim();
    const valB = inputScoreB.trim();

    if (valA === "" || valB === "") {
      setMessage("⚠️ Introdu scorul complet pentru ambele echipe.");
      return;
    }

    const a = parseInt(valA, 10);
    const b = parseInt(valB, 10);

    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) {
      setMessage("⚠️ Scorul trebuie să conțină doar numere pozitive.");
      return;
    }

    if (a + b !== currentMatch.target) {
      setMessage(`❌ EROARE: Suma punctelor (${a} + ${b} = ${a + b}) trebuie să fie EXACT ${currentMatch.target}!`);
      return;
    }

    setMessage(null);

    // Salvare în clasament individual
    setPlayers((prev) =>
      prev.map((pl) => {
        const isTeamA = currentMatch.teamA.some((x) => x.id === pl.id);
        const isTeamB = currentMatch.teamB.some((x) => x.id === pl.id);
        if (isTeamA) return { ...pl, matchesPlayed: pl.matchesPlayed + 1, points: pl.points + a, goalDiff: pl.goalDiff + (a - b) };
        if (isTeamB) return { ...pl, matchesPlayed: pl.matchesPlayed + 1, points: pl.points + b, goalDiff: pl.goalDiff + (b - a) };
        return pl;
      })
    );

    // Salvare starea meciului curent
    setAllMatches((prev) => {
      const copy = [...prev];
      copy[currentMatchIndex] = { ...copy[currentMatchIndex], saved: true, scoreA: String(a), scoreB: String(b) };
      return copy;
    });

    setInputScoreA("");
    setInputScoreB("");

    const nextIdx = currentMatchIndex + 1;
    if (nextIdx < allMatches.length) {
      setCurrentMatchIndex(nextIdx);
    } else {
      setTournamentStarted(false);
      setTab("standings");
      setMessage("🏆 Felicitări! Toate meciurile au fost salvate și turneul s-a încheiat.");
    }
  }

  function handleGoToPreviousMatch() {
    if (currentMatchIndex === 0) return;

    const prevIdx = currentMatchIndex - 1;
    const prevMatch = allMatches[prevIdx];
    if (!prevMatch) return;

    setMessage(`🔄 Te-ai întors la Meciul ${prevIdx + 1}. Clasamentul a fost recalculat.`);

    if (prevMatch.saved) {
      const oldA = parseInt(prevMatch.scoreA, 10) || 0;
      const oldB = parseInt(prevMatch.scoreB, 10) || 0;

      setPlayers((prev) =>
        prev.map((pl) => {
          const isTeamA = prevMatch.teamA.some((x) => x.id === pl.id);
          const isTeamB = prevMatch.teamB.some((x) => x.id === pl.id);
          if (isTeamA) {
            return { ...pl, matchesPlayed: Math.max(0, pl.matchesPlayed - 1), points: Math.max(0, pl.points - oldA), goalDiff: pl.goalDiff - (oldA - oldB) };
          }
          if (isTeamB) {
            return { ...pl, matchesPlayed: Math.max(0, pl.matchesPlayed - 1), points: Math.max(0, pl.points - oldB), goalDiff: pl.goalDiff - (oldB - oldA) };
          }
          return pl;
        })
      );
    }

    setAllMatches((prev) => {
      const copy = [...prev];
      copy[prevIdx] = { ...copy[prevIdx], saved: false };
      return copy;
    });

    setInputScoreA(prevMatch.scoreA);
    setInputScoreB(prevMatch.scoreB);
    setCurrentMatchIndex(prevIdx);
  }

  function handleResetCurrentMatch() {
    setInputScoreA("");
    setInputScoreB("");
    setMessage("🧹 Scorul meciului curent a fost șters de pe ecran.");
  }

  function handleResetEntireTournament() {
    if (window.confirm("Sigur vrei să resetezi complet turneul? Toate scorurile se vor șterge!")) {
      setTournamentStarted(false);
      setAllMatches([]);
      setCurrentMatchIndex(0);
      setInputScoreA("");
      setInputScoreB("");
      setPlayers([]);
      setMessage("🔄 Turneul a fost resetat complet. Poți configura o nouă listă.");
      setTab("selection");
      localStorage.removeItem("padel_players");
      localStorage.removeItem("padel_allMatches");
      localStorage.removeItem("padel_currentMatchIndex");
      localStorage.removeItem("padel_tournamentStarted");
    }
  }

  function skipCurrentMatch() {
    if (!tournamentStarted || allMatches.length <= 1) return;
    const currentMatch = allMatches[currentMatchIndex];
    if (!currentMatch || currentMatch.saved) return;

    setMessage("🔄 Meci trimis la coadă!");

    const skippedMatch: MatchState = {
      ...currentMatch,
      scoreA: "",
      scoreB: ""
    };

    setAllMatches((prev) => {
      const copy = [...prev];
      copy.splice(currentMatchIndex, 1);
      copy.push(skippedMatch);
      return copy;
    });

    setInputScoreA("");
    setInputScoreB("");
  }

  const currentMatch = allMatches[currentMatchIndex] || null;
  const nextMatch = allMatches[currentMatchIndex + 1] || null;

  const sittingPlayers = useMemo(() => {
    if (!currentMatch) return [];
    const playingIds = [...currentMatch.teamA.map((p) => p.id), ...currentMatch.teamB.map((p) => p.id)];
    return players.filter((p) => presentIds.includes(p.id) && !playingIds.includes(p.id));
  }, [players, currentMatch, presentIds]);

  const standings = useMemo(() => {
    return [...players]
      .filter((p) => presentIds.includes(p.id))
      .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff);
  }, [players, presentIds]);

  return (
    <div className="min-h-screen bg-[#09090e] text-[#f1f1f7] pb-24 font-sans selection:bg-green-500 selection:text-black">
      <div className="max-w-md mx-auto p-4">
        
        <header className="mb-6 flex items-center justify-between bg-[#11111a] p-4 rounded-2xl border border-gray-800/60 shadow-lg">
          <div>
            <h1 className="text-xl font-black tracking-wider text-green-400 uppercase">Padel American</h1>
            <p className="text-xs text-gray-500 font-medium">
              {tournamentStarted ? `Meciul ${currentMatchIndex + 1} din ${allMatches.length}` : "Configurare Turneu"}
            </p>
          </div>
          {tournamentStarted && (
            <button 
              onClick={handleResetEntireTournament}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase transition-all"
            >
              Reset Turneu 🚨
            </button>
          )}
        </header>

        {message && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs font-semibold text-center">
            {message}
          </div>
        )}

        {/* TAB JUCĂTORI */}
        {tab === "players" && (
          <section className="space-y-4">
            <div className="bg-[#11111a] p-4 rounded-2xl border border-gray-800/60 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Adaugă jucător nou</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nume..."
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="flex-1 bg-[#161622] px-4 py-3 rounded-xl border border-gray-800 text-sm font-semibold text-white outline-none focus:border-green-500"
                />
                <button onClick={handleAddPlayer} className="bg-green-500 hover:bg-green-400 text-black font-black px-4 rounded-xl text-base">＋</button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">Jucători în sistem</h3>
              <div className="grid gap-2 max-h-[48vh] overflow-y-auto pr-1">
                {dbPlayers.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-[#11111a] border border-gray-800/60 rounded-xl">
                    {editingPlayerId === p.id ? (
                      <div className="flex gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 bg-[#161622] px-3 py-1.5 rounded-lg border border-gray-700 text-xs font-semibold text-white outline-none"
                        />
                        <button onClick={() => handleSaveEdit(p.id)} className="bg-green-500 text-black text-[10px] font-black px-2.5 rounded-lg uppercase">Salvați</button>
                      </div>
                    ) : (
                      <span className="font-semibold text-sm text-gray-200">{p.name}</span>
                    )}
                    <div className="flex gap-3 text-sm">
                      {editingPlayerId !== p.id && <button onClick={() => handleStartEdit(p)} className="text-gray-400 hover:text-green-400">✏️</button>}
                      <button onClick={() => handleDeletePlayer(p.id)} className="text-gray-500 hover:text-red-400">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TAB PREZENȚĂ */}
        {tab === "selection" && (
          <section className="space-y-5">
            <div className="bg-[#11111a] p-4 rounded-2xl border border-gray-800/60 shadow-sm">
              <div className="flex items-center justify-between mb-3 text-[11px] text-gray-400 uppercase tracking-widest font-bold">
                <span>Puncte țintă per meci</span>
                <span className="text-green-400 font-black">{target} PCT</span>
              </div>
              <div className="flex gap-2">
                {GAME_TARGETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={tournamentStarted}
                    onClick={() => setTarget(t)}
                    className={`flex-1 py-3 rounded-xl text-sm font-black border transition-all ${target === t ? "border-green-500 text-green-400 bg-green-500/10" : "border-gray-800 text-gray-500 bg-[#161622]"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">Cine joacă în turneul ăsta?:</h3>
              <div className="grid gap-2 max-h-[42vh] overflow-y-auto pr-1">
                {dbPlayers.map((p) => {
                  const isChecked = presentIds.includes(p.id);
                  return (
                    <label key={p.id} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${isChecked ? 'bg-green-500/5 border-green-500/30' : 'bg-[#11111a] border-gray-800/60'}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          disabled={tournamentStarted}
                          checked={isChecked}
                          onChange={() => setPresentIds((prev) => prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id])}
                          className="w-4 h-4 text-green-500 accent-green-500"
                        />
                        <span className={`font-semibold text-sm ${isChecked ? 'text-gray-100' : 'text-gray-400'}`}>{p.name}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <button onClick={startTournament} className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-4 rounded-xl shadow-lg uppercase tracking-wider text-xs">
              🚀 Generează Configurație
            </button>
          </section>
        )}

        {/* TAB JOC LIVE */}
        {tab === "matches" && (
          <section className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentMatchIndex === 0}
                onClick={handleGoToPreviousMatch}
                className="flex-1 bg-[#11111a] hover:bg-[#161622] text-xs font-bold text-gray-400 py-2.5 rounded-xl border border-gray-800/80 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                ⬅ Meciul Anterior
              </button>
              <button
                type="button"
                onClick={handleResetCurrentMatch}
                className="flex-1 bg-[#11111a] hover:bg-[#161622] text-xs font-bold text-gray-400 py-2.5 rounded-xl border border-gray-800/80 transition-all"
              >
                🧹 Golește Scorul
              </button>
            </div>

            {sittingPlayers.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-400/20 rounded-xl p-3">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1.5">⏳ Pe bancă tura asta:</div>
                <div className="flex flex-wrap gap-1">
                  {sittingPlayers.map(p => (
                    <span key={p.id} className="bg-amber-400/10 text-amber-400 text-[11px] px-2 py-0.5 rounded-md font-medium">{p.name.split(' ')[0]}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[#11111a] p-5 rounded-2xl border border-gray-800/60 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800/50 pb-3">
                <span className="text-[10px] bg-green-500/10 text-green-400 font-black px-2.5 py-1 rounded-md uppercase">Meciul Activ</span>
                <span className="text-xs text-gray-400 font-bold">🎯 LIMITĂ {currentMatch?.target} PCT FIX</span>
              </div>

              {currentMatch ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#161622] p-3 rounded-xl border border-gray-800/30 text-center">
                      <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Echipa A</div>
                      <div className="text-sm font-semibold text-gray-200">{currentMatch.teamA.map(p => p.name.split(' ')[0]).join(" + ")}</div>
                    </div>
                    <div className="bg-[#161622] p-3 rounded-xl border border-gray-800/30 text-center">
                      <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Echipa B</div>
                      <div className="text-sm font-semibold text-gray-200">{currentMatch.teamB.map(p => p.name.split(' ')[0]).join(" + ")}</div>
                    </div>
                  </div>

                  <div className="flex justify-center items-center gap-4 py-1">
                    <input type="number" placeholder="0" value={inputScoreA || ""} onChange={(e) => setInputScoreA(e.target.value)} className="w-16 h-14 bg-[#161622] text-center rounded-xl font-black text-white border border-gray-800 text-2xl focus:border-green-500 outline-none" />
                    <span className="font-bold text-gray-600 text-sm uppercase">vs</span>
                    <input type="number" placeholder="0" value={inputScoreB || ""} onChange={(e) => setInputScoreB(e.target.value)} className="w-16 h-14 bg-[#161622] text-center rounded-xl font-black text-white border border-gray-800 text-2xl focus:border-green-500 outline-none" />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={skipCurrentMatch} className="flex-1 py-3.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs uppercase tracking-wider border border-gray-700">🕒 Sări meci</button>
                    <button type="button" onClick={saveCurrentScore} className="flex-[1.5] py-3.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-black text-xs uppercase tracking-wider shadow-md">Trimite & Salvează ✓</button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-gray-500">Toate meciurile s-au încheiat!</div>
              )}
            </div>

            <div className="bg-[#11111a] p-4 rounded-2xl border border-gray-800/60 shadow-sm">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Următorii la rând:</h3>
              {nextMatch ? (
                <div className="text-xs font-semibold bg-[#161622] p-3 rounded-xl border border-gray-800/30 text-gray-300 flex justify-between items-center">
                  <span>{nextMatch.teamA.map(p=>p.name.split(' ')[0]).join(' + ')}</span>
                  <span className="text-gray-600 font-black text-[9px]">VS</span>
                  <span>{nextMatch.teamB.map(p=>p.name.split(' ')[0]).join(' + ')}</span>
                </div>
              ) : (
                <div className="text-xs text-gray-500 font-medium bg-[#161622]/40 p-3 rounded-xl text-center border border-dashed border-gray-800">Acesta este ultimul meci!</div>
              )}
            </div>
          </section>
        )}

        {/* TAB CLASAMENT */}
        {tab === "standings" && (
          <section className="space-y-4">
            <div className="bg-[#11111a] rounded-2xl border border-gray-800/60 shadow-md overflow-hidden">
              <div className="grid grid-cols-12 bg-[#161622] p-3 text-[10px] font-black text-gray-500 uppercase border-b border-gray-800/60">
                <span className="col-span-2 text-center">Poz</span>
                <span className="col-span-6">Jucător</span>
                <span className="col-span-2 text-center">Meciuri</span>
                <span className="col-span-2 text-center">Pct</span>
              </div>
              <div className="divide-y divide-gray-800/40">
                {standings.map((p, idx) => (
                  <div key={p.id} className="grid grid-cols-12 p-3.5 text-xs items-center">
                    <span className="col-span-2 text-center font-bold text-gray-500">#{idx + 1}</span>
                    <span className="col-span-6 font-semibold text-gray-200">{p.name}</span>
                    <span className="col-span-2 text-center font-medium text-gray-400">{p.matchesPlayed}</span>
                    <span className="col-span-2 text-center font-black text-green-400 text-sm">{p.points}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#11111a] p-4 rounded-2xl border border-gray-800/60 text-center">
              <p className="text-xs text-gray-500">Turneu activ: {allMatches.filter(m => m.saved).length} / {allMatches.length} meciuri încheiate.</p>
            </div>
          </section>
        )}

        {/* NAVIGARE */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#11111a]/95 backdrop-blur-md border-t border-gray-800/80 h-16 flex justify-around items-center rounded-t-2xl z-50">
     
          <button onClick={() => setTab("selection")} className={`flex flex-col items-center justify-center w-full h-full text-[9px] font-black tracking-widest uppercase ${tab === "selection" ? "text-green-400" : "text-gray-500"}`}><span>👥</span>Start</button>
          <button onClick={() => setTab("matches")} className={`flex flex-col items-center justify-center w-full h-full text-[9px] font-black tracking-widest uppercase ${tab === "matches" ? "text-green-400" : "text-gray-500"}`}><span>🎾</span>Meciuri</button>
          <button onClick={() => setTab("standings")} className={`flex flex-col items-center justify-center w-full h-full text-[9px] font-black tracking-widest uppercase ${tab === "standings" ? "text-green-400" : "text-gray-500"}`}><span>🏆</span>Clasament</button>
               <button onClick={() => setTab("players")} className={`flex flex-col items-center justify-center w-full h-full text-[9px] font-black tracking-widest uppercase ${tab === "players" ? "text-green-400" : "text-gray-500"}`}><span>⚙️</span>Jucători</button>
        </nav>

      </div>
    </div>
  );
}