/**
 * ScoutPredict - Escanteios & Cartões
 * Single-file React component (default export) ready to be placed in a React app.
 * Tailwind classes were used in the original; here we rely on a small CSS file included.
 *
 * This component uses a mock/fallback dataset (season 2025/26) and includes clear hooks
 * where an API integration (API-Football) can be implemented later.
 */

import React, { useEffect, useState, useMemo } from "react";

const LEAGUES = [
  { id: "italy-serie-a", name: "Série A TIM (Itália)" },
  { id: "spain-laliga", name: "La Liga (Espanha)" },
  { id: "germany-bundesliga", name: "Bundesliga (Alemanha)" },
  { id: "france-ligue1", name: "Ligue 1 (França)" },
  { id: "england-premier", name: "Premier League (Inglaterra)" },
  { id: "brazil-serie-a", name: "Série A (Brasil)" },
];

function clamp(v, a = 0, b = 100) { return Math.max(a, Math.min(b, v)); }

function computeProbabilitiesForTeam(stats) {
  const corner35 = 3.5, corner45 = 4.5, cards15 = 1.5;
  const baseCornerScore = (stats.avgCornersFor - corner35) * 12 + (stats.avgCornersFor - stats.avgCornersAgainst) * 6;
  const pCorner35 = clamp(50 + baseCornerScore, 5, 98);
  const baseCorner45 = (stats.avgCornersFor - corner45) * 12 + (stats.avgCornersFor - stats.avgCornersAgainst) * 5;
  const pCorner45 = clamp(40 + baseCorner45, 3, 97);
  const baseCards = (stats.avgCardsFor - cards15) * 25 + (stats.avgCardsFor) * 8;
  const pCards15 = clamp(35 + baseCards, 2, 96);
  return { corner35: Math.round(pCorner35), corner45: Math.round(pCorner45), cards15: Math.round(pCards15) };
}

function makeMockMatch(id, league, home, away, dateOffsetDays = 0) {
  const randomAvg = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
  const homeStats = {
    avgCornersFor: randomAvg(2.5, 6.5),
    avgCornersAgainst: randomAvg(2.0, 5.0),
    avgCardsFor: randomAvg(0.8, 2.2),
    last5: Array.from({ length: 5 }, () => ({ corners: Math.floor(Math.random() * 8), cards: Math.floor(Math.random() * 4) })),
  };
  const awayStats = {
    avgCornersFor: randomAvg(2.0, 6.0),
    avgCornersAgainst: randomAvg(2.0, 5.5),
    avgCardsFor: randomAvg(0.7, 2.0),
    last5: Array.from({ length: 5 }, () => ({ corners: Math.floor(Math.random() * 8), cards: Math.floor(Math.random() * 4) })),
  };
  return {
    id,
    league,
    date: new Date(Date.now() + dateOffsetDays * 24 * 60 * 60 * 1000).toISOString(),
    home: { name: home, stats: homeStats },
    away: { name: away, stats: awayStats },
  };
}

export default function ScoutPredict() {
  const [matches, setMatches] = useState([]);
  const [leagueFilter, setLeagueFilter] = useState(LEAGUES[0].id);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  async function loadMatches() {
    setLoading(true);
    try {
      const generated = [];
      let id = 1;
      LEAGUES.forEach((l) => {
        for (let i = 0; i < 6; i++) {
          const home = `Time ${l.id.split("-")[0]}_${i * 2 + 1}`;
          const away = `Time ${l.id.split("-")[0]}_${i * 2 + 2}`;
          generated.push(makeMockMatch(`${id++}`, l.id, home, away, i - 1));
        }
      });
      setMatches(generated);
    } catch (err) {
      console.error("Erro ao carregar partidas:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMatches(); }, []);

  const matchesWithPredictions = useMemo(() => {
    return matches.map((m) => {
      const h = computeProbabilitiesForTeam(m.home.stats);
      const a = computeProbabilitiesForTeam(m.away.stats);
      const summary = pickBestOpportunity(h, a);
      return { ...m, predictions: { home: h, away: a, suggestion: summary } };
    });
  }, [matches]);

  function pickBestOpportunity(homePred, awayPred) {
    const items = [
      { team: "home", market: "+3.5 escanteios", p: homePred.corner35 },
      { team: "home", market: "+4.5 escanteios", p: homePred.corner45 },
      { team: "home", market: "+1.5 cartões", p: homePred.cards15 },
      { team: "away", market: "+3.5 escanteios", p: awayPred.corner35 },
      { team: "away", market: "+4.5 escanteios", p: awayPred.corner45 },
      { team: "away", market: "+1.5 cartões", p: awayPred.cards15 },
    ];
    items.sort((a, b) => b.p - a.p);
    return items[0];
  }

  function onUpdateData() { loadMatches(); }
  function onSaveToHistory(match) {
    setHistory((s) => [{ timestamp: new Date().toISOString(), matchId: match.id, match, predictions: match.predictions }, ...s]);
  }
  function exportCSV(filteredMatches) {
    const rows = [];
    rows.push(["League", "Date", "Match", "Market", "Team", "Probability"]);
    filteredMatches.forEach((m) => {
      const date = new Date(m.date).toLocaleString();
      const pushRow = (teamName, market, p) => rows.push([m.league, date, `${m.home.name} x ${m.away.name}`, market, teamName, `${p}%`]);
      pushRow(m.home.name, "+3.5 escanteios", m.predictions.home.corner35);
      pushRow(m.home.name, "+4.5 escanteios", m.predictions.home.corner45);
      pushRow(m.home.name, "+1.5 cartões", m.predictions.home.cards15);
      pushRow(m.away.name, "+3.5 escanteios", m.predictions.away.corner35);
      pushRow(m.away.name, "+4.5 escanteios", m.predictions.away.corner45);
      pushRow(m.away.name, "+1.5 cartões", m.predictions.away.cards15);
    });
    const csvContent = rows.map((r) => r.map((c) => `\"${String(c).replace(/\"/g, '\"\"')}\"`).join(',')).join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scoutpredict_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = matchesWithPredictions.filter((m) => m.league === leagueFilter && (m.home.name.toLowerCase().includes(query.toLowerCase()) || m.away.name.toLowerCase().includes(query.toLowerCase())));

  return (
    <div className="app">
      <header className="header">
        <h1>ScoutPredict — Escanteios & Cartões</h1>
        <div style={{display:'flex',gap:8}}>
          <button onClick={onUpdateData} style={{padding:'8px 12px',borderRadius:8}}>Atualizar Dados</button>
          <button onClick={() => exportCSV(filtered)} style={{padding:'8px 12px',borderRadius:8}}>Exportar CSV</button>
        </div>
      </header>

      <section style={{display:'flex',gap:8,marginBottom:12}}>
        <select value={leagueFilter} onChange={(e)=>setLeagueFilter(e.target.value)} style={{padding:8,borderRadius:8,background:'#0f1724',color:'#e6eef6'}}>
          {LEAGUES.map(l=> <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar time..." style={{padding:8,borderRadius:8,background:'#0f1724',color:'#e6eef6',flex:1}} />
      </section>

      <main style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:12}}>
        {loading && <div className="card">Carregando partidas...</div>}
        {filtered.map((m) => (
          <article key={m.id} className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:12,color:'#9aa6b2'}}>{LEAGUES.find(l => l.id === m.league)?.name}</div>
                <div style={{fontSize:18,fontWeight:700}}>{m.home.name} <span style={{color:'#9aa6b2'}}>x</span> {m.away.name}</div>
                <div style={{fontSize:12,color:'#9aa6b2'}}>{new Date(m.date).toLocaleString()}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:12}}>Sugestão:</div>
                <div style={{fontWeight:800}}>{m.predictions.suggestion.team === 'home' ? m.home.name : m.away.name} {m.predictions.suggestion.market} ({m.predictions.suggestion.p}%)</div>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12}}>
              <PredictionCard team={m.home} preds={m.predictions.home} />
              <PredictionCard team={m.away} preds={m.predictions.away} />
            </div>

            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={() => onSaveToHistory(m)} style={{padding:'8px 10px',borderRadius:8}}>Salvar histórico</button>
              <button onClick={() => alert('Detalhes não implementados no demo')} style={{padding:'8px 10px',borderRadius:8}}>Ver detalhes</button>
            </div>
          </article>
        ))}
      </main>

    </div>
  );
}

function PredictionCard({ team, preds }) {
  return (
    <div style={{padding:12,background:'#0b1320',borderRadius:8}}>
      <div style={{fontWeight:700,marginBottom:6}}>{team.name}</div>
      <Metric label={"+3.5 escanteios"} value={preds.corner35} />
      <Metric label={"+4.5 escanteios"} value={preds.corner45} />
      <Metric label={"+1.5 cartões"} value={preds.cards15} />
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={{marginBottom:8}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#cbd5e1'}}><span>{label}</span><span style={{fontWeight:800}}>{value}%</span></div>
      <div style={{height:10,background:'#071827',borderRadius:8,overflow:'hidden',marginTop:6}}>
        <div style={{width:`${value}%`,height:'100%',background:'linear-gradient(90deg,#2563eb,#0ea5a4)'}}></div>
      </div>
    </div>
  );
}
