/*
  # Create rooms and drawing elements tables

  1. New Tables
    - `rooms`
      - `id` (text, primary key) - Room code (e.g., ABC123)
      - `created_at` (timestamp)
      - `last_activity` (timestamp)
      - `max_users` (integer, default 50)
      - `is_public` (boolean, default true)
      - `allow_anonymous` (boolean, default true)
    - `drawing_elements`
      - `id` (text, primary key) - Element ID
      - `room_id` (text, foreign key to rooms)
      - `type` (text) - Element type (pen, rectangle, etc.)
      - `points` (jsonb) - Array of points
      - `style` (jsonb) - Style properties
      - `text` (text, nullable) - Text content for text elements
      - `user_id` (text) - User who created the element
      - `created_at` (timestamp)
    - `room_users`
      - `id` (uuid, primary key)
      - `room_id` (text, foreign key to rooms)
      - `user_id` (text) - User identifier
      - `name` (text) - User display name
      - `color` (text) - User cursor color
      - `joined_at` (timestamp)
      - `last_seen` (timestamp)
      - `is_active` (boolean, default true)

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (since it's a collaborative drawing app)
    - Add indexes for performance

  3. Functions
    - Function to clean up inactive rooms
    - Function to get room statistics
</sql>

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id text PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  max_users integer DEFAULT 50,
  is_public boolean DEFAULT true,
  allow_anonymous boolean DEFAULT true
);

-- Create drawing_elements table
CREATE TABLE IF NOT EXISTS drawing_elements (
  id text PRIMARY KEY,
  room_id text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  type text NOT NULL,
  points jsonb NOT NULL DEFAULT '[]',
  style jsonb NOT NULL DEFAULT '{}',
  text text,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create room_users table
CREATE TABLE IF NOT EXISTS room_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  name text NOT NULL,
  color text NOT NULL,
  joined_at timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_users ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can read rooms"
  ON rooms FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "Anyone can create rooms"
  ON rooms FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update rooms"
  ON rooms FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can read drawing elements"
  ON drawing_elements FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create drawing elements"
  ON drawing_elements FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update drawing elements"
  ON drawing_elements FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can delete drawing elements"
  ON drawing_elements FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can read room users"
  ON room_users FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create room users"
  ON room_users FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update room users"
  ON room_users FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can delete room users"
  ON room_users FOR DELETE
  TO anon, authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_drawing_elements_room_id ON drawing_elements(room_id);
CREATE INDEX IF NOT EXISTS idx_drawing_elements_created_at ON drawing_elements(created_at);
CREATE INDEX IF NOT EXISTS idx_room_users_room_id ON room_users(room_id);
CREATE INDEX IF NOT EXISTS idx_room_users_user_id ON room_users(user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_last_activity ON rooms(last_activity);

-- Function to clean up inactive rooms
CREATE OR REPLACE FUNCTION cleanup_inactive_rooms()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete rooms with no active users and no activity for 24 hours
  DELETE FROM rooms 
  WHERE last_activity < now() - interval '24 hours'
    AND id NOT IN (
      SELECT DISTINCT room_id 
      FROM room_users 
      WHERE is_active = true 
        AND last_seen > now() - interval '5 minutes'
    );
END;
$$;

-- Function to get room statistics
CREATE OR REPLACE FUNCTION get_room_stats()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_rooms', (SELECT count(*) FROM rooms),
    'active_rooms', (
      SELECT count(*) FROM rooms 
      WHERE last_activity > now() - interval '1 hour'
    ),
    'total_users', (
      SELECT count(*) FROM room_users 
      WHERE is_active = true 
        AND last_seen > now() - interval '5 minutes'
    ),
    'total_elements', (SELECT count(*) FROM drawing_elements)
  ) INTO result;
  
  RETURN result;
END;
$$;