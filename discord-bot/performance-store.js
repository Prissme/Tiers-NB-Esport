'use strict';

const DEFAULT_PLAYER_TTL_MS = 60 * 1000;
const DEFAULT_MEMBER_TTL_MS = 30 * 1000;
const DEFAULT_RANKING_TTL_MS = 20 * 1000;

function normalizeId(value) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text.length ? text : null;
}

function nowMs() {
  return Date.now();
}

class TTLCache {
  constructor({ name, ttlMs, maxEntries = 5000, onEvict = null }) {
    this.name = name || 'ttl-cache';
    this.ttlMs = Number.isFinite(ttlMs) ? ttlMs : 0;
    this.maxEntries = Math.max(10, maxEntries);
    this.onEvict = typeof onEvict === 'function' ? onEvict : null;
    this.items = new Map();

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      expirations: 0
    };
  }

  get size() {
    return this.items.size;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  get(key) {
    const entry = this.items.get(key);
    if (!entry) {
      this.stats.misses += 1;
      return undefined;
    }

    if (entry.expiresAt <= nowMs()) {
      this.items.delete(key);
      this.stats.misses += 1;
      this.stats.expirations += 1;
      this.#callEvict(key, entry.value, 'expired');
      return undefined;
    }

    this.stats.hits += 1;
    return entry.value;
  }

  set(key, value, customTtlMs = null) {
    const ttlMs = Number.isFinite(customTtlMs) ? customTtlMs : this.ttlMs;
    const expiresAt = nowMs() + Math.max(1, ttlMs);

    this.items.set(key, {
      value,
      expiresAt,
      touchedAt: nowMs()
    });

    this.stats.sets += 1;
    this.#enforceLimit();
    return value;
  }

  delete(key, reason = 'manual') {
    const entry = this.items.get(key);
    if (!entry) {
      return false;
    }

    this.items.delete(key);
    this.stats.evictions += 1;
    this.#callEvict(key, entry.value, reason);
    return true;
  }

  clear(reason = 'clear') {
    if (!this.items.size) {
      return;
    }

    const snapshot = Array.from(this.items.entries());
    this.items.clear();
    this.stats.evictions += snapshot.length;

    if (this.onEvict) {
      for (const [key, entry] of snapshot) {
        this.#callEvict(key, entry.value, reason);
      }
    }
  }

  sweepExpired(limit = 1000) {
    const current = nowMs();
    let removed = 0;
    for (const [key, entry] of this.items.entries()) {
      if (entry.expiresAt > current) {
        continue;
      }

      this.items.delete(key);
      this.stats.expirations += 1;
      this.#callEvict(key, entry.value, 'expired');
      removed += 1;
      if (removed >= limit) {
        break;
      }
    }

    return removed;
  }

  inspect() {
    return {
      name: this.name,
      size: this.items.size,
      ttlMs: this.ttlMs,
      maxEntries: this.maxEntries,
      ...this.stats
    };
  }

  #enforceLimit() {
    if (this.items.size <= this.maxEntries) {
      return;
    }

    const overflow = this.items.size - this.maxEntries;
    const sortedByOldest = Array.from(this.items.entries()).sort((a, b) => a[1].touchedAt - b[1].touchedAt);

    for (let index = 0; index < overflow; index += 1) {
      const [key, entry] = sortedByOldest[index];
      this.items.delete(key);
      this.stats.evictions += 1;
      this.#callEvict(key, entry.value, 'capacity');
    }
  }

  #callEvict(key, value, reason) {
    if (!this.onEvict) {
      return;
    }

    try {
      this.onEvict({ key, value, reason, cache: this.name });
    } catch (_) {
      // ignore callback exceptions to avoid breaking runtime flow
    }
  }
}

class AsyncSingleFlight {
  constructor({ name }) {
    this.name = name || 'single-flight';
    this.inFlight = new Map();
  }

  run(key, factory) {
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = Promise.resolve()
      .then(() => factory())
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  get size() {
    return this.inFlight.size;
  }
}

class PlayerDataStore {
  constructor({ supabase, logger = console }) {
    this.supabase = supabase;
    this.logger = logger;

    this.playerByDiscordId = new TTLCache({
      name: 'player-by-discord-id',
      ttlMs: DEFAULT_PLAYER_TTL_MS,
      maxEntries: 15000
    });

    this.rankingSnapshot = new TTLCache({
      name: 'ranking-snapshot',
      ttlMs: DEFAULT_RANKING_TTL_MS,
      maxEntries: 2
    });

    this.singleFlight = new AsyncSingleFlight({ name: 'player-store' });
  }

  async getPlayerByDiscordId(discordId, { forceRefresh = false } = {}) {
    const normalizedId = normalizeId(discordId);
    if (!normalizedId) {
      return null;
    }

    if (!forceRefresh) {
      const cached = this.playerByDiscordId.get(normalizedId);
      if (cached !== undefined) {
        return cached;
      }
    }

    return this.singleFlight.run(`player:${normalizedId}`, async () => {
      const { data, error } = await this.supabase
        .from('players')
        .select('*')
        .eq('discord_id', normalizedId)
        .maybeSingle();

      if (error) {
        throw new Error(`Supabase error while fetching player ${normalizedId}: ${error.message}`);
      }

      const row = data || null;
      this.playerByDiscordId.set(normalizedId, row);
      return row;
    });
  }

  async getPlayersByDiscordIds(discordIds = [], { forceRefresh = false } = {}) {
    const ids = Array.from(new Set((discordIds || []).map((id) => normalizeId(id)).filter(Boolean)));
    if (!ids.length) {
      return new Map();
    }

    const result = new Map();
    const missing = [];

    if (!forceRefresh) {
      for (const id of ids) {
        const cached = this.playerByDiscordId.get(id);
        if (cached !== undefined) {
          result.set(id, cached);
        } else {
          missing.push(id);
        }
      }
    } else {
      missing.push(...ids);
    }

    if (missing.length) {
      const fetched = await this.singleFlight.run(
        `players-batch:${missing.sort().join(',')}`,
        async () => {
          const { data, error } = await this.supabase
            .from('players')
            .select('*')
            .in('discord_id', missing);

          if (error) {
            throw new Error(`Supabase error while fetching players batch: ${error.message}`);
          }

          return data || [];
        }
      );

      const fetchedById = new Map();
      for (const row of fetched) {
        const id = normalizeId(row?.discord_id);
        if (!id) {
          continue;
        }
        fetchedById.set(id, row);
      }

      for (const id of missing) {
        const row = fetchedById.has(id) ? fetchedById.get(id) : null;
        this.playerByDiscordId.set(id, row);
        result.set(id, row);
      }
    }

    return result;
  }

  cachePlayer(player) {
    const id = normalizeId(player?.discord_id);
    if (!id) {
      return player;
    }

    this.playerByDiscordId.set(id, player);
    this.invalidateRankingSnapshot();
    return player;
  }

  invalidatePlayer(discordId) {
    const id = normalizeId(discordId);
    if (!id) {
      return false;
    }

    const deleted = this.playerByDiscordId.delete(id, 'invalidate');
    this.invalidateRankingSnapshot();
    return deleted;
  }

  invalidatePlayers(discordIds = []) {
    let changed = 0;
    for (const id of discordIds) {
      if (this.invalidatePlayer(id)) {
        changed += 1;
      }
    }
    return changed;
  }

  invalidateRankingSnapshot() {
    this.rankingSnapshot.clear('invalidate');
  }

  async getRankingSnapshot({ includeInactive = false, forceRefresh = false } = {}) {
    const key = includeInactive ? 'all' : 'active';
    if (!forceRefresh) {
      const cached = this.rankingSnapshot.get(key);
      if (cached !== undefined) {
        return cached;
      }
    }

    return this.singleFlight.run(`ranking:${key}`, async () => {
      const { data, error } = await this.supabase
        .from('players')
        .select('discord_id, solo_elo, active')
        .not('discord_id', 'is', null);

      if (error) {
        throw new Error(error.message || 'Unable to fetch players for ranking snapshot');
      }

      const players = data || [];
      const source = includeInactive ? players : players.filter((player) => player.active !== false);

      const rankedPlayers = source
        .map((entry) => ({
          discord_id: normalizeId(entry.discord_id),
          weightedScore: Number.isFinite(entry.solo_elo) ? entry.solo_elo : 1000
        }))
        .filter((entry) => Boolean(entry.discord_id))
        .sort((a, b) => b.weightedScore - a.weightedScore);

      const rankingByDiscordId = new Map();
      rankedPlayers.forEach((player, index) => {
        rankingByDiscordId.set(player.discord_id, { rank: index + 1 });
      });

      const snapshot = {
        totalPlayers: rankedPlayers.length,
        rankedPlayers,
        rankingByDiscordId,
        builtAt: new Date().toISOString()
      };

      this.rankingSnapshot.set(key, snapshot);
      return snapshot;
    });
  }

  inspect() {
    return {
      playerByDiscordId: this.playerByDiscordId.inspect(),
      rankingSnapshot: this.rankingSnapshot.inspect(),
      inFlight: this.singleFlight.size
    };
  }
}

class GuildMemberStore {
  constructor({ logger = console }) {
    this.logger = logger;
    this.memberByGuildAndUser = new TTLCache({
      name: 'member-by-guild-user',
      ttlMs: DEFAULT_MEMBER_TTL_MS,
      maxEntries: 15000
    });
    this.singleFlight = new AsyncSingleFlight({ name: 'guild-member-store' });
  }

  getCacheKey(guildId, userId) {
    const normalizedGuildId = normalizeId(guildId);
    const normalizedUserId = normalizeId(userId);
    if (!normalizedGuildId || !normalizedUserId) {
      return null;
    }

    return `${normalizedGuildId}:${normalizedUserId}`;
  }

  async fetchMember(guildContext, userId, { forceRefresh = false } = {}) {
    const cacheKey = this.getCacheKey(guildContext?.id, userId);
    if (!cacheKey) {
      return null;
    }

    if (!forceRefresh) {
      const cached = this.memberByGuildAndUser.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    return this.singleFlight.run(`member:${cacheKey}`, async () => {
      const member = await guildContext?.members?.fetch(userId).catch(() => null);
      this.memberByGuildAndUser.set(cacheKey, member || null);
      return member || null;
    });
  }

  async fetchMembers(guildContext, userIds = [], { forceRefresh = false } = {}) {
    const ids = Array.from(new Set((userIds || []).map((id) => normalizeId(id)).filter(Boolean)));
    const result = new Map();

    if (!ids.length) {
      return result;
    }

    const fetchTasks = ids.map(async (userId) => {
      const member = await this.fetchMember(guildContext, userId, { forceRefresh });
      result.set(userId, member);
    });

    await Promise.all(fetchTasks);
    return result;
  }

  invalidateMember(guildId, userId) {
    const key = this.getCacheKey(guildId, userId);
    if (!key) {
      return false;
    }

    return this.memberByGuildAndUser.delete(key, 'invalidate');
  }

  invalidateGuild(guildId) {
    const normalizedGuildId = normalizeId(guildId);
    if (!normalizedGuildId) {
      return 0;
    }

    let removed = 0;
    for (const key of this.memberByGuildAndUser.items.keys()) {
      if (!key.startsWith(`${normalizedGuildId}:`)) {
        continue;
      }

      this.memberByGuildAndUser.delete(key, 'invalidate-guild');
      removed += 1;
    }

    return removed;
  }

  inspect() {
    return {
      memberByGuildAndUser: this.memberByGuildAndUser.inspect(),
      inFlight: this.singleFlight.size
    };
  }
}

function createPerformanceStores({ supabase, logger = console }) {
  const playerStore = new PlayerDataStore({ supabase, logger });
  const memberStore = new GuildMemberStore({ logger });

  return {
    playerStore,
    memberStore,
    inspect: () => ({
      playerStore: playerStore.inspect(),
      memberStore: memberStore.inspect()
    })
  };
}

module.exports = {
  DEFAULT_MEMBER_TTL_MS,
  DEFAULT_PLAYER_TTL_MS,
  DEFAULT_RANKING_TTL_MS,
  TTLCache,
  AsyncSingleFlight,
  PlayerDataStore,
  GuildMemberStore,
  createPerformanceStores
};
