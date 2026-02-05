-- Add shield columns to players table
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS shield_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS shield_threshold INTEGER DEFAULT 0;

-- Add index for shield lookups
CREATE INDEX IF NOT EXISTS idx_players_shield ON players(shield_active, shield_threshold);
