-- Migration: Make phone_number nullable in purchases table
-- Date: 2026-01-26

ALTER TABLE purchases ALTER COLUMN phone_number DROP NOT NULL;
