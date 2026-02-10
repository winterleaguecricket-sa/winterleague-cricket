-- Migration: Add approval_status and updated_at to form_submissions
-- Run this to ensure the table has all required columns

-- Add approval_status column if not exists
ALTER TABLE form_submissions 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending';

-- Add updated_at column if not exists
ALTER TABLE form_submissions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add form_id column as VARCHAR (since we're using integer IDs in app)
ALTER TABLE form_submissions 
DROP COLUMN IF EXISTS form_id;

ALTER TABLE form_submissions 
ADD COLUMN form_id VARCHAR(50);

-- Create index on form_id
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id_str ON form_submissions(form_id);

-- Create or update trigger for updated_at
CREATE OR REPLACE FUNCTION update_form_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_form_submissions_updated_at ON form_submissions;
CREATE TRIGGER update_form_submissions_updated_at 
    BEFORE UPDATE ON form_submissions
    FOR EACH ROW EXECUTE FUNCTION update_form_submissions_updated_at();

-- Enhanced Teams Table (drop and recreate with all fields)
DROP TABLE IF EXISTS team_players CASCADE;
DROP TABLE IF EXISTS team_revenue CASCADE;
DROP TABLE IF EXISTS team_messages CASCADE;
DROP TABLE IF EXISTS team_documents CASCADE;
DROP TABLE IF EXISTS payout_requests CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    form_submission_id INTEGER,
    team_name VARCHAR(255) NOT NULL,
    coach_name VARCHAR(255),
    manager_name VARCHAR(255),
    manager_phone VARCHAR(50),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    suburb VARCHAR(255),
    team_logo TEXT,
    shirt_design VARCHAR(255),
    primary_color VARCHAR(50),
    secondary_color VARCHAR(50),
    sponsor_logo TEXT,
    number_of_teams INTEGER DEFAULT 1,
    age_group_teams JSONB DEFAULT '[]',
    kit_pricing JSONB DEFAULT '{"basePrice": 150, "markup": 0}',
    entry_fee JSONB DEFAULT '{"baseFee": 500}',
    banking_details JSONB DEFAULT '{}',
    password VARCHAR(255) NOT NULL,
    submission_data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE team_players (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    sub_team VARCHAR(255),
    player_name VARCHAR(255) NOT NULL,
    player_email VARCHAR(255),
    player_phone VARCHAR(50),
    id_number VARCHAR(50),
    jersey_size VARCHAR(20),
    jersey_number INTEGER,
    position VARCHAR(100),
    registration_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_revenue (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    revenue_type VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    reference_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_messages (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_documents (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    document_url TEXT NOT NULL,
    document_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payout_requests (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    branch_code VARCHAR(50),
    account_type VARCHAR(50),
    breakdown JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    admin_notes TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teams_email ON teams(email);
CREATE INDEX IF NOT EXISTS idx_teams_team_name ON teams(team_name);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);
CREATE INDEX IF NOT EXISTS idx_team_players_team_id ON team_players(team_id);
CREATE INDEX IF NOT EXISTS idx_team_revenue_team_id ON team_revenue(team_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_team_id ON payout_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);

-- Update trigger for teams
CREATE TRIGGER update_teams_updated_at 
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_form_submissions_updated_at();
