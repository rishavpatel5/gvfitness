-- GV FITNESS COMPLETE DATABASE SCHEMA FOR SUPABASE (PostgreSQL)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TRAINERS
CREATE TABLE IF NOT EXISTS trainers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT NOT NULL,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MEMBERS (One unified profile per person)
CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    member_code TEXT UNIQUE NOT NULL,
    device_user_id INTEGER UNIQUE, -- ID matched on eSSL K90 Pro fingerprint machine
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    dob DATE,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
    fitness_level TEXT DEFAULT 'Beginner' CHECK (fitness_level IN ('Beginner', 'Intermediate', 'Advance')),
    emergency_contact TEXT,
    notes TEXT,
    height_cm NUMERIC(5, 2),
    weight_kg NUMERIC(5, 2),
    bmi NUMERIC(5, 2),
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for phone and device search
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_device_user_id ON members(device_user_id);

-- 4. MEMBERSHIP PERIODS (GT or PT subscriptions)
CREATE TABLE IF NOT EXISTS membership_periods (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    membership_type TEXT NOT NULL CHECK (membership_type IN ('GT', 'PT')),
    trainer_id TEXT REFERENCES trainers(id) ON DELETE SET NULL, -- for PT members
    duration_months INTEGER NOT NULL DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    package_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_type TEXT DEFAULT 'none' CHECK (discount_type IN ('none', 'percentage', 'fixed')),
    discount_value NUMERIC(10, 2) DEFAULT 0.00,
    final_payable NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Upcoming', 'Expiring', 'Expired', 'Renewed')),
    renewed_into_period_id TEXT REFERENCES membership_periods(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_periods_member ON membership_periods(member_id);
CREATE INDEX IF NOT EXISTS idx_periods_expiry ON membership_periods(end_date, status);

-- 5. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    invoice_number TEXT UNIQUE NOT NULL,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    membership_period_id TEXT REFERENCES membership_periods(id) ON DELETE SET NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'Paid' CHECK (status IN ('Paid', 'Cancelled')),
    public_token TEXT UNIQUE NOT NULL, -- Secure token for dynamic URL link viewing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. PAYMENTS (Cash-basis financial core)
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Online')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- 7. EXPENSE CATEGORIES & EXPENSES
CREATE TABLE IF NOT EXISTS expense_categories (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT UNIQUE NOT NULL,
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    category_id TEXT REFERENCES expense_categories(id) ON DELETE SET NULL,
    category_name TEXT NOT NULL, -- Denormalized for quick reports
    title TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Online')),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- 8. INQUIRIES & LEADS
CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    preferred_type TEXT DEFAULT 'GT' CHECK (preferred_type IN ('GT', 'PT')),
    source TEXT DEFAULT 'Walk-in',
    status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Follow-up Required', 'Follow-up Needed', 'Trial Scheduled', 'Interested', 'Converted', 'Not Interested', 'Lost')),
    is_completed BOOLEAN DEFAULT FALSE, -- Triggers faded / strikethrough UI
    follow_up_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    converted_member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. eSSL K90 PRO FINGERPRINT BIOMETRIC SYSTEM
CREATE TABLE IF NOT EXISTS devices_whitelist (
    device_serial TEXT PRIMARY KEY,
    device_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Raw immutable punch log with strict unique constraint (idempotency)
CREATE TABLE IF NOT EXISTS attendance_raw (
    id BIGSERIAL PRIMARY KEY,
    device_serial TEXT NOT NULL,
    device_user_id INTEGER NOT NULL,
    punch_time_utc TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_device_punch UNIQUE (device_serial, device_user_id, punch_time_utc)
);

CREATE INDEX IF NOT EXISTS idx_raw_punch_user ON attendance_raw(device_user_id, punch_time_utc);

-- Derived session log (entry-only check-in system)
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    is_auto_closed BOOLEAN DEFAULT FALSE,
    check_in_source TEXT DEFAULT 'biometric' CHECK (check_in_source IN ('biometric', 'manual')),
    check_out_source TEXT DEFAULT 'biometric' CHECK (check_out_source IN ('biometric', 'manual', 'system_auto')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_member_date ON attendance_sessions(member_id, date);

-- Debug table for raw device HTTP transactions to troubleshoot eSSL K90 Pro ADMS handshakes
CREATE TABLE IF NOT EXISTS device_raw_debug (
    id BIGSERIAL PRIMARY KEY,
    endpoint TEXT,
    method TEXT,
    query_params JSONB,
    headers JSONB,
    body TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. WATI AUTOMATION & NOTIFICATION LOGS
CREATE TABLE IF NOT EXISTS notification_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    recipient_phone TEXT NOT NULL,
    member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('Expiry_7d', 'Expiry_3d', 'Expiry_1d', 'Expiry_0d', 'Birthday', 'Custom_Offer', 'Manual_Greeting')),
    template_name TEXT,
    idempotency_key TEXT UNIQUE NOT NULL, -- Prevents duplicate messages on cron retries
    status TEXT DEFAULT 'Queued' CHECK (status IN ('Queued', 'Sent', 'Delivered', 'Failed', 'Skipped')),
    wati_message_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. DIET PLAN MODULE
CREATE TABLE IF NOT EXISTS diet_bmi_ranges (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT NOT NULL,
    min_bmi NUMERIC(5, 2) NOT NULL,
    max_bmi NUMERIC(5, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diet_fitness_goals (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diet_plans (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    bmi_range_id TEXT NOT NULL REFERENCES diet_bmi_ranges(id) ON DELETE RESTRICT,
    fitness_level TEXT NOT NULL CHECK (fitness_level IN ('Beginner', 'Intermediate', 'Advance')),
    goal_id TEXT NOT NULL REFERENCES diet_fitness_goals(id) ON DELETE RESTRICT,
    dietary_preference TEXT NOT NULL CHECK (dietary_preference IN ('Vegetarian', 'Non-vegetarian')),
    gender TEXT NOT NULL DEFAULT 'Any' CHECK (gender IN ('Any', 'Male', 'Female')),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Draft', 'Active', 'Inactive')),
    meals JSONB NOT NULL DEFAULT '[]',
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_diet_plan_combo UNIQUE (bmi_range_id, fitness_level, goal_id, dietary_preference, gender)
);

CREATE TABLE IF NOT EXISTS diet_plan_shares (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    token TEXT UNIQUE NOT NULL,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    plan_snapshot JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diet_shares_token ON diet_plan_shares(token);
CREATE INDEX IF NOT EXISTS idx_diet_shares_expiry ON diet_plan_shares(expires_at);

-- 12. INITIAL SEED DATA
-- Default Categories
INSERT INTO expense_categories (name, is_custom) VALUES
('Rent', FALSE),
('Staff Salary', FALSE),
('Electricity & Water', FALSE),
('Equipment & Maintenance', FALSE),
('Supplements & Retail', FALSE),
('Mobile & Internet', FALSE),
('Marketing & Ads', FALSE),
('Miscellaneous', FALSE)
ON CONFLICT (name) DO NOTHING;

-- Default Trainers seen in existing records
INSERT INTO trainers (name, is_active) VALUES
('Saurabh Sir', TRUE),
('Gautam Sir', TRUE),
('Vinay Sir', TRUE),
('Naeem Sir', TRUE),
('Pratham Sir', TRUE),
('Akash Sir', TRUE)
ON CONFLICT DO NOTHING;

-- Default BMI Ranges
INSERT INTO diet_bmi_ranges (id, name, min_bmi, max_bmi, is_active, display_order) VALUES
('bmi_underweight', 'Underweight', 0.00, 18.49, TRUE, 1),
('bmi_normal', 'Normal Weight', 18.50, 24.99, TRUE, 2),
('bmi_overweight', 'Overweight', 25.00, 29.99, TRUE, 3),
('bmi_obese1', 'Obesity Grade 1', 30.00, 34.99, TRUE, 4),
('bmi_obese2', 'Obesity Grade 2+', 35.00, 50.00, TRUE, 5)
ON CONFLICT (id) DO NOTHING;

-- Default Fitness Goals
INSERT INTO diet_fitness_goals (id, name, is_active, display_order) VALUES
('goal_fat_loss', 'Fat Loss', TRUE, 1),
('goal_muscle_gain', 'Muscle Gain', TRUE, 2),
('goal_weight_gain', 'Weight Gain', TRUE, 3),
('goal_maintain', 'Maintain Weight', TRUE, 4),
('goal_cutting', 'Cutting', TRUE, 5),
('goal_bulking', 'Bulking', TRUE, 6),
('goal_recomp', 'Body Recomposition', TRUE, 7),
('goal_general', 'General Fitness', TRUE, 8)
ON CONFLICT (name) DO NOTHING;
