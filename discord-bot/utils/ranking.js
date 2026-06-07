'use strict';

const {
  DEFAULT_ELO,
  ELO_MAJOR_RANK_ORDER,
  ELO_RANKS,
  TIER_DISTRIBUTION,
  TIER_EMOJIS
} = require('../config/constants');

function computeTierBoundaries(totalPlayers) {
  if (!totalPlayers || totalPlayers <= 0) {
    return [];
  }

  let remaining = totalPlayers;
  const boundaries = [];

  for (let index = 0; index < TIER_DISTRIBUTION.length; index += 1) {
    const distribution = TIER_DISTRIBUTION[index];
    const isLastTier = index === TIER_DISTRIBUTION.length - 1;

    let count;
    if (isLastTier) {
      count = remaining;
    } else {
      const futureMin = TIER_DISTRIBUTION.slice(index + 1).reduce(
        (sum, entry) => sum + (entry.minCount || 0),
        0
      );

      count = Math.floor(totalPlayers * distribution.ratio);
      if (count < distribution.minCount) {
        count = distribution.minCount;
      }

      const maxAllowed = remaining - futureMin;
      if (count > maxAllowed) {
        count = Math.max(distribution.minCount || 0, maxAllowed);
      }
    }

    remaining -= count;
    boundaries.push({ tier: distribution.tier, endRank: totalPlayers - remaining });

    if (remaining <= 0) {
      break;
    }
  }

  return boundaries;
}

function getTierByRank(rank, boundaries) {
  if (!Array.isArray(boundaries) || boundaries.length === 0) {
    return null;
  }

  for (const boundary of boundaries) {
    if (rank <= boundary.endRank) {
      return boundary.tier;
    }
  }

  return null;
}


function normalizeRating(value) {
  return typeof value === 'number' ? value : DEFAULT_ELO;
}

function getEloRankByRating(rating) {
  const normalized = normalizeRating(rating);

  for (let index = 0; index < ELO_RANKS.length; index += 1) {
    const rank = ELO_RANKS[index];
    if (normalized >= rank.min) {
      return { ...rank, index };
    }
  }

  const fallback = ELO_RANKS[ELO_RANKS.length - 1];
  return { ...fallback, index: ELO_RANKS.length - 1 };
}

function getTierLabelByRank(rank, totalPlayers) {
  if (!rank || !totalPlayers) {
    return null;
  }

  const boundaries = computeTierBoundaries(totalPlayers);
  return getTierByRank(rank, boundaries);
}

function formatTierEmoji(tier) {
  if (!tier) {
    return null;
  }

  const normalizedTier = String(tier).toUpperCase().replace(/^TIER\s+/, '');
  return TIER_EMOJIS[normalizedTier] || tier;
}

function formatEloRankLabel(rankInfo) {
  if (!rankInfo) {
    return null;
  }

  const name = rankInfo.name || '';
  const numeral = rankInfo.numeral;
  const emoji = rankInfo.emoji || '';

  if (!numeral) {
    return `${emoji} ${name}`.trim();
  }

  return `${emoji} ${name} ${numeral}`.trim();
}

function formatEloRankEmoji(rankInfo) {
  if (!rankInfo) {
    return null;
  }

  return rankInfo.emoji || null;
}

function getNextEloRank(rankInfo) {
  if (!rankInfo || typeof rankInfo.index !== 'number') {
    return null;
  }

  if (rankInfo.index <= 0) {
    return null;
  }

  const nextRank = ELO_RANKS[rankInfo.index - 1];
  return nextRank ? { ...nextRank, index: rankInfo.index - 1 } : null;
}


function getEloMajorRankLevel(rating) {
  const rankInfo = getEloRankByRating(rating);
  return ELO_MAJOR_RANK_ORDER[rankInfo.name] ?? 0;
}

function getRankRoleKeyByRating(rating) {
  const normalized = normalizeRating(rating);

  if (normalized >= 2700) return 'verdoyant';
  if (normalized >= 2100) return 'grandmaster';
  if (normalized >= 1750) return 'master';
  if (normalized >= 1525) return 'legendaire';
  if (normalized >= 1350) return 'mythique';
  if (normalized >= 1220) return 'diamant';
  if (normalized >= 1120) return 'or';
  if (normalized >= 1050) return 'argent';
  if (normalized >= 1000) return 'bronze';
  return 'wished';
}


module.exports = {
  computeTierBoundaries,
  getTierByRank,
  normalizeRating,
  getEloRankByRating,
  getTierLabelByRank,
  formatTierEmoji,
  formatEloRankLabel,
  formatEloRankEmoji,
  getNextEloRank,
  getEloMajorRankLevel,
  getRankRoleKeyByRating
};
