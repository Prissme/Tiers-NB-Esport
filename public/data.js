// Scrims récents
export const recentScrims = [
  { winner: 'Wished', loser: 'Lorex', score: '3-0' },
  { winner: 'Naboo', loser: 'Wished', score: '3-0' },
  { winner: 'Vortexaaa', loser: 'Marlon', score: '3-2' },
  { winner: 'Marlon', loser: 'Wished', score: '3-0' },
  { winner: 'Fire', loser: 'Wished', score: '3-2' },
  { winner: 'Vortexaaa', loser: 'Ovni', score: '3-2' },
  { winner: 'Saladeee', loser: 'Dubi', score: '3-0' },
  { winner: 'Mxgic', loser: 'Kazuhaa', score: '1-0 (FF)' },
  { winner: 'Wished', loser: 'Saladeee', score: '3-1' },
  { winner: 'Sapeur', loser: 'Wished', score: '3-2' },
  { winner: 'Prissme', loser: 'Techwood', score: '2-0' },
  { winner: 'Prissme', loser: 'DayloXx', score: '2-0' },
  { winner: 'Vortexaaa', loser: 'Wished', score: '3-2' },
];

// Liste des joueurs (MMR mis à jour avec ratio 1-3-6-10-15-15)
export const players = [
  // Tier S (1 joueur - Rang 1)
  { tier: 'S', rank: 1, name: 'Bastien', score: 2331 },
  
  // Tier A (3 joueurs - Rangs 2-4)
  { tier: 'A', rank: 2, name: 'Skusku', score: 2150 },
  { tier: 'A', rank: 3, name: 'Prissme', score: 2146 },
  { tier: 'A', rank: 4, name: 'Shido', score: 2134 },
  
  // Tier B (6 joueurs - Rangs 5-10)
  { tier: 'B', rank: 5, name: 'Mxgic', score: 2108 },
  { tier: 'B', rank: 6, name: 'Fernmtzzz', score: 2032 },
  { tier: 'B', rank: 7, name: 'Sparky', score: 1964 },
  { tier: 'B', rank: 8, name: 'Levy', score: 1935 },
  { tier: 'B', rank: 9, name: 'Achraff', score: 1900 },
  { tier: 'B', rank: 10, name: 'Killer', score: 1825 },
  
  // Tier C (10 joueurs - Rangs 11-20)
  { tier: 'C', rank: 11, name: 'Naboo', score: 1818 },
  { tier: 'C', rank: 12, name: 'Saladeee', score: 1806 },
  { tier: 'C', rank: 13, name: 'Serpent', score: 1798 },
  { tier: 'C', rank: 14, name: 'Hutao', score: 1778 },
  { tier: 'C', rank: 15, name: 'Giuk', score: 1775 },
  { tier: 'C', rank: 16, name: 'Dodo', score: 1725 },
  { tier: 'C', rank: 17, name: 'Eren', score: 1716 },
  { tier: 'C', rank: 18, name: 'Kazuhaa', score: 1657 },
  { tier: 'C', rank: 19, name: 'Rujo', score: 1651 },
  { tier: 'C', rank: 20, name: 'Fortissaxx', score: 1650 },
  
  // Tier D (15 joueurs - Rangs 21-35)
  { tier: 'D', rank: 21, name: 'Marlon', score: 1634 },
  { tier: 'D', rank: 22, name: 'Mamba', score: 1600 },
  { tier: 'D', rank: 23, name: 'Mehdi', score: 1579 },
  { tier: 'D', rank: 24, name: 'MomiJn', score: 1577 },
  { tier: 'D', rank: 25, name: 'Kawa', score: 1550 },
  { tier: 'D', rank: 26, name: 'Marlon', score: 1536 },
  { tier: 'D', rank: 27, name: 'Wished', score: 1527 },
  { tier: 'D', rank: 28, name: 'Sapeur', score: 1526 },
  { tier: 'D', rank: 29, name: 'Smooth', score: 1525 },
  { tier: 'D', rank: 30, name: 'Razz', score: 1495 },
  { tier: 'D', rank: 31, name: 'Dubi', score: 1484 },
  { tier: 'D', rank: 32, name: 'Anaray', score: 1484 },
  { tier: 'D', rank: 33, name: 'Andre', score: 1447 },
  { tier: 'D', rank: 34, name: 'Maxi', score: 1433 },
  { tier: 'D', rank: 35, name: 'Vortexaaa', score: 1429 },
  
  // Tier E (15 joueurs - Rangs 36-50)
  { tier: 'E', rank: 36, name: 'Berk', score: 1419 },
  { tier: 'E', rank: 37, name: 'DayloXx', score: 1406 },
  { tier: 'E', rank: 38, name: 'Goshii', score: 1400 },
  { tier: 'E', rank: 39, name: 'Heyko', score: 1342 },
  { tier: 'E', rank: 40, name: 'Astraaa', score: 1325 },
  { tier: 'E', rank: 41, name: 'Ovni', score: 1276 },
  { tier: 'E', rank: 42, name: 'Rash', score: 1275 },
  { tier: 'E', rank: 43, name: 'Fire', score: 1271 },
  { tier: 'E', rank: 44, name: 'Nyxia', score: 1252 },
  { tier: 'E', rank: 45, name: 'Spin', score: 1250 },
  { tier: 'E', rank: 46, name: 'Tht', score: 1200 },
  { tier: 'E', rank: 47, name: 'Drxp', score: 1175 },
  { tier: 'E', rank: 48, name: 'Scylla', score: 1125 },
  { tier: 'E', rank: 49, name: 'Sank1d', score: 1108 },
  { tier: 'E', rank: 50, name: 'Ryokk', score: 1100 },
  
  // No-tier (Reste - Rangs 51+)
  { tier: 'No-tier', rank: 51, name: 'Fares', score: 1099 },
  { tier: 'No-tier', rank: 52, name: 'Melon', score: 1075 },
  { tier: 'No-tier', rank: 53, name: 'Zedraxx', score: 1050 },
  { tier: 'No-tier', rank: 54, name: 'Aben', score: 1025 },
  { tier: 'No-tier', rank: 55, name: 'Skor', score: 1000 },
  { tier: 'No-tier', rank: 56, name: 'LoniXx', score: 1000 },
  { tier: 'No-tier', rank: 57, name: 'Walid', score: 1000 },
  { tier: 'No-tier', rank: 58, name: 'Kyzonn', score: 1000 },
  { tier: 'No-tier', rank: 59, name: 'Techwood', score: 987 },
];

// Configuration des tiers
export const tierStyles = {
  S: 'bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-200',
  A: 'bg-gradient-to-r from-blue-400 via-purple-300 to-indigo-200',
  B: 'bg-gradient-to-r from-orange-600 via-orange-400 to-orange-200',
  C: 'bg-gradient-to-r from-pink-600 via-red-500 to-red-400',
  D: 'bg-gradient-to-r from-blue-400 via-purple-400 to-purple-300',
  E: 'bg-gradient-to-r from-green-700 via-green-500 to-green-300',
  'No-tier': 'bg-gradient-to-r from-gray-600 via-gray-500 to-gray-400',
};

// Fonction utilitaire pour les médailles
export const getMedal = (rank) => {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `#${rank}`;
};
