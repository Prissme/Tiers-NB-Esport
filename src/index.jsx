import React, { useState } from "react";
import ReactDOM from "react-dom/client";

const players = [
  { tier: 'S', rank: 1, name: 'Bastien', score: 2400 },
  { tier: 'A', rank: 2, name: 'Lorex', score: 2300 },
  { tier: 'A', rank: 3, name: 'Shido', score: 2250 },
  { tier: 'A', rank: 4, name: 'Raxy', score: 2200 },
  { tier: 'B', rank: 5, name: 'Skusku', score: 2150 },
  { tier: 'B', rank: 6, name: 'Prissme', score: 2100 },
  { tier: 'B', rank: 7, name: 'Mxgic', score: 2050 },
  { tier: 'B', rank: 8, name: 'Saladeee', score: 2000 },
  { tier: 'B', rank: 9, name: 'Fernmtzzz', score: 1950 },
  { tier: 'B', rank: 10, name: 'Levy', score: 1900 },
  { tier: 'C', rank: 11, name: 'Kazuhaa', score: 1850 },
  { tier: 'C', rank: 12, name: 'Killer', score: 1825 },
  { tier: 'C', rank: 13, name: 'Achraff', score: 1800 },
  { tier: 'C', rank: 14, name: 'Giuk', score: 1775 },
  { tier: 'C', rank: 15, name: 'Naboo', score: 1750 },
  { tier: 'C', rank: 16, name: 'Dodo', score: 1725 },
  { tier: 'C', rank: 17, name: 'Eren', score: 1700 },
  { tier: 'C', rank: 18, name: 'Hutao', score: 1675 },
  { tier: 'C', rank: 19, name: 'Fortissaxx', score: 1650 },
  { tier: 'C', rank: 20, name: 'Rujo', score: 1625 },
  { tier: 'D', rank: 21, name: 'Mamba', score: 1600 },
  { tier: 'D', rank: 22, name: 'Wished', score: 1560 },
  { tier: 'D', rank: 23, name: 'Kawa', score: 1550 },
  { tier: 'D', rank: 24, name: 'Smooth', score: 1525 },
  { tier: 'D', rank: 25, name: 'Marlon', score: 1500 },
  { tier: 'D', rank: 26, name: 'MomiJn', score: 1475 },
  { tier: 'D', rank: 27, name: 'Sapeur', score: 1450 },
  { tier: 'D', rank: 28, name: 'Loyy', score: 1425 },
  { tier: 'D', rank: 29, name: 'Goshii', score: 1400 },
  { tier: 'D', rank: 30, name: 'Maxi', score: 1375 },
  { tier: 'D', rank: 31, name: 'Andre', score: 1350 },
  { tier: 'D', rank: 32, name: 'Astraaa', score: 1325 },
  { tier: 'D', rank: 33, name: 'Nyxia', score: 1300 },
  { tier: 'D', rank: 34, name: 'Rash', score: 1275 },
  { tier: 'D', rank: 35, name: 'Heyko', score: 1250 },
  { tier: 'E', rank: 36, name: 'Itachi', score: 1240 },
  { tier: 'E', rank: 37, name: 'Tht', score: 1200 },
  { tier: 'E', rank: 38, name: 'Drxp', score: 1175 },
  { tier: 'E', rank: 39, name: 'Fire', score: 1150 },
  { tier: 'E', rank: 40, name: 'Scylla', score: 1125 },
  { tier: 'E', rank: 41, name: 'Ryokk', score: 1100 },
  { tier: 'E', rank: 42, name: 'Melon', score: 1075 },
  { tier: 'E', rank: 43, name: 'Zedraxx', score: 1050 },
  { tier: 'E', rank: 44, name: 'Aben', score: 1025 },
  { tier: 'E', rank: 45, name: 'Skor', score: 1000 },
  { tier: 'E', rank: 46, name: 'Walid', score: 1000 },
  { tier: 'E', rank: 47, name: 'Techwood', score: 1000 },
  { tier: 'E', rank: 48, name: 'Fares', score: 1000 },
  { tier: 'E', rank: 49, name: 'Kyzonn', score: 1000 },
  { tier: 'E', rank: 50, name: 'LoniXx', score: 1000 },
];

const tierStyles = {
  S: 'bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-200',
  A: 'bg-gradient-to-r from-blue-400 via-purple-300 to-indigo-200',
  B: 'bg-gradient-to-r from-orange-600 via-orange-400 to-orange-200',
  C: 'bg-gradient-to-r from-pink-600 via-red-500 to-red-400',
  D: 'bg-gradient-to-r from-blue-400 via-purple-400 to-purple-300',
  E: 'bg-gradient-to-r from-green-700 via-green-500 to-green-300',
};

function DemonList() {
  const [query, setQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [sortBy, setSortBy] = useState('rank');

  const tiers = ['ALL','S','A','B','C','D','E'];

  const filtered = () => {
    let list = [...players];
    if (selectedTier !== 'ALL') list = list.filter(p => p.tier === selectedTier);
    if (query.trim() !== '') list = list.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    if (sortBy === 'rank') list.sort((a,b)=>a.rank-b.rank);
    if (sortBy === 'score') list.sort((a,b)=>b.score-a.score);
    if (sortBy === 'name') list.sort((a,b)=>a.name.localeCompare(b.name));
    return list;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <header className="max-w-5xl mx-auto mb-8">
        <h1 className="text-3xl font-extrabold mb-3">Nulls Brawl — Top 50</h1>
        <div className="flex gap-3 flex-wrap mb-3">
          <a href="https://discord.gg/prissme" target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-indigo-600 rounded hover:bg-indigo-500 transition">Discord</a>
          <a href="https://ko-fi.com/prissme" target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-yellow-500 rounded hover:bg-yellow-400 transition">Coaching 5€</a>
          <input placeholder="Recherche..." value={query} onChange={e=>setQuery(e.target.value)} className="px-2 py-1 rounded bg-gray-800" />
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="px-2 py-1 rounded bg-gray-800">
            <option value="rank">Rang</option>
            <option value="score">Score</option>
            <option value="name">Pseudo</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          {tiers.map(t => (
            <button key={t} onClick={()=>setSelectedTier(t)} className={`px-3 py-1 rounded-full text-sm font-semibold ${selectedTier===t?'bg-indigo-600 text-white':'bg-gray-800 text-gray-300'}`}>{t}</button>
          ))}
