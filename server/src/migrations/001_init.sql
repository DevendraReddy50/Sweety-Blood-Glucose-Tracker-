-- Enable UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Readings Table
CREATE TABLE IF NOT EXISTS readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    slot VARCHAR(50) NOT NULL CHECK (slot IN (
        'Morning (fasting)',
        'After breakfast',
        'After lunch',
        'After dinner'
    )),
    value INTEGER NOT NULL CHECK (value >= 40 AND value <= 600),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_date_slot UNIQUE (user_id, date, slot)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_readings_user_date ON readings(user_id, date);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
