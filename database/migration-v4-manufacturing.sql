-- Manufacturing Batch System
-- Tracks batches of player kits sent to manufacturer per team

CREATE TABLE IF NOT EXISTS manufacturing_batches (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  batch_number INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'created',  -- created, submitted, paid
  notes TEXT,
  total_players INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(team_id, batch_number)
);

-- Link table: which team_players belong to which batch
CREATE TABLE IF NOT EXISTS manufacturing_batch_players (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES manufacturing_batches(id) ON DELETE CASCADE,
  team_player_id INTEGER NOT NULL REFERENCES team_players(id),
  order_id UUID REFERENCES orders(id),
  -- Snapshot of kit details at time of batch creation
  player_name VARCHAR(255) NOT NULL,
  sub_team VARCHAR(255),
  shirt_size VARCHAR(100),
  pants_size VARCHAR(100),
  additional_items JSONB DEFAULT '[]',
  parent_name VARCHAR(255),
  parent_email VARCHAR(255),
  parent_phone VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_player_id)  -- A player can only be in one batch
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_mb_team_id ON manufacturing_batches(team_id);
CREATE INDEX IF NOT EXISTS idx_mb_status ON manufacturing_batches(status);
CREATE INDEX IF NOT EXISTS idx_mbp_batch_id ON manufacturing_batch_players(batch_id);
CREATE INDEX IF NOT EXISTS idx_mbp_team_player_id ON manufacturing_batch_players(team_player_id);
CREATE INDEX IF NOT EXISTS idx_mbp_order_id ON manufacturing_batch_players(order_id);
