-- SQL Schema for TrackMyHours (Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Profiles Table
CREATE TABLE profiles (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT,
    school TEXT,
    school_address TEXT,
    program TEXT,
    student_type TEXT,
    position TEXT,
    department TEXT,
    required_hours INTEGER,
    completed_hours INTEGER DEFAULT 0,
    profile_picture TEXT,
    qr_token TEXT UNIQUE
);

-- Password Hashing Trigger
CREATE OR REPLACE FUNCTION hash_password()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR NEW.password IS DISTINCT FROM OLD.password) THEN
        NEW.password := crypt(NEW.password, gen_salt('bf'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hash_password
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION hash_password();

-- Authentication RPC Function
CREATE OR REPLACE FUNCTION authenticate_user(p_role TEXT, p_username TEXT, p_password TEXT)
RETURNS SETOF profiles AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM profiles
    WHERE role = p_role
      AND username = p_username
      AND password = crypt(p_password, password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- 2. Attendance Records Table

CREATE TABLE attendance_records (

    id TEXT PRIMARY KEY,

    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,

    date DATE NOT NULL,

    am_in TEXT,

    am_out TEXT,

    pm_in TEXT,

    pm_out TEXT,

    undertime_minutes INTEGER DEFAULT 0,

    total_daily_minutes INTEGER DEFAULT 0,

    is_locked BOOLEAN DEFAULT FALSE,

    is_pm_departure_locked BOOLEAN DEFAULT FALSE,

    remarks TEXT,

    is_merged BOOLEAN DEFAULT FALSE

);



-- 3. Notifications Table

CREATE TABLE notifications (

    id TEXT PRIMARY KEY,

    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,

    user_name TEXT NOT NULL,

    user_role TEXT NOT NULL,

    type TEXT NOT NULL,

    message TEXT NOT NULL,

    timestamp TIMESTAMPTZ DEFAULT NOW(),

    location_lat DOUBLE PRECISION,

    location_lng DOUBLE PRECISION,

    is_read BOOLEAN DEFAULT FALSE,

    attendance_record_id TEXT REFERENCES attendance_records(id) ON DELETE SET NULL

);



-- 4. Activity Logs Table

CREATE TABLE activity_logs (

    id TEXT PRIMARY KEY,

    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,

    action TEXT NOT NULL,

    timestamp TIMESTAMPTZ DEFAULT NOW(),

    location_lat DOUBLE PRECISION,

    location_lng DOUBLE PRECISION,

    network TEXT

);



-- Enable Row Level Security (RLS)

-- For simplicity in this demo, we can enable RLS and allow all access for anon key,

-- but in production you should restrict this.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access for profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access for attendance_records" ON attendance_records FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access for notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access for activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);

-- 5. Accomplishment Reports Table
CREATE TABLE accomplishment_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    date DATE NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    attachments TEXT[]
);

ALTER TABLE accomplishment_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access for accomplishment_reports" ON accomplishment_reports FOR ALL USING (true) WITH CHECK (true);
