-- Profile image URL for users (auth + users module share this table).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar TEXT;
