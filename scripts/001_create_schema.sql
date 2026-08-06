-- Heat Pump & SWH Project Management Complete Supabase Database Schema

-- 1. Projects table (main customer directory)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_no INTEGER UNIQUE NOT NULL,
  order_type TEXT NOT NULL,
  site_name TEXT NOT NULL,
  mobile_number TEXT,
  address TEXT,
  hp_type TEXT,
  hp_qty INTEGER DEFAULT 0,
  tank_type TEXT,
  tank_qty INTEGER DEFAULT 0,
  gl INTEGER DEFAULT 0,
  sales_m_value DECIMAL(12, 2) DEFAULT 0,
  m_outward_value DECIMAL(12, 2) DEFAULT 0,
  m_balance DECIMAL(12, 2) DEFAULT 0,
  order_value DECIMAL(12, 2) DEFAULT 0,
  extra_work_value DECIMAL(12, 2) DEFAULT 0,
  payment_received DECIMAL(12, 2) DEFAULT 0,
  work_remark TEXT,
  salesman_name TEXT,
  company_id TEXT DEFAULT 'insiya-solar',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Payment terms table
CREATE TABLE IF NOT EXISTS payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payment_term TEXT NOT NULL,
  term_percentage DECIMAL(5, 2) DEFAULT 0,
  amount DECIMAL(12, 2) DEFAULT 0,
  received_amount DECIMAL(12, 2) DEFAULT 0,
  pending_amount DECIMAL(12, 2) DEFAULT 0,
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ledger entries (financial transactions)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sr_no INTEGER NOT NULL,
  date DATE NOT NULL,
  payment_type TEXT,
  reference_number TEXT,
  invoice_no TEXT,
  particulars TEXT,
  bill_submitted BOOLEAN DEFAULT FALSE,
  payment_receipt BOOLEAN DEFAULT FALSE,
  sales_m_value DECIMAL(12, 2) DEFAULT 0,
  m_outward_value DECIMAL(12, 2) DEFAULT 0,
  order_value DECIMAL(12, 2) DEFAULT 0,
  extra_work_value DECIMAL(12, 2) DEFAULT 0,
  payment_received DECIMAL(12, 2) DEFAULT 0,
  work_remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sr_no INTEGER NOT NULL,
  date DATE NOT NULL,
  particular TEXT,
  expense DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Calling records
CREATE TABLE IF NOT EXISTS calling_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sr_no INTEGER DEFAULT 1,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SWH Checklist items
CREATE TABLE IF NOT EXISTS swh_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sr_no INTEGER DEFAULT 1,
  item_name TEXT NOT NULL,
  req_qty DECIMAL(12, 2) DEFAULT 0,
  customer_scope BOOLEAN DEFAULT FALSE,
  our_scope BOOLEAN DEFAULT FALSE,
  dispatch_qty DECIMAL(12, 2) DEFAULT 0,
  dispatch_yes_no BOOLEAN DEFAULT FALSE,
  installed_qty DECIMAL(12, 2) DEFAULT 0,
  installation_yes_no BOOLEAN DEFAULT FALSE,
  dispatch_balance_qty DECIMAL(12, 2) DEFAULT 0,
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Work remarks/notes
CREATE TABLE IF NOT EXISTS work_remarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sr_no INTEGER NOT NULL,
  date DATE NOT NULL,
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_projects_id_no ON projects(id_no);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_terms_project_id ON payment_terms(project_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_project_id ON ledger_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_calling_records_project_id ON calling_records(project_id);
CREATE INDEX IF NOT EXISTS idx_swh_checklist_project_id ON swh_checklist(project_id);
CREATE INDEX IF NOT EXISTS idx_work_remarks_project_id ON work_remarks(project_id);

--------------------------------------------------------------------------------
-- MIGRATION SCRIPT FOR EXISTING SUPABASE DATABASES
-- Copy and run the script below in Supabase SQL Editor to upgrade existing tables:
--------------------------------------------------------------------------------

ALTER TABLE projects ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS salesman_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'insiya-solar';

ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS payment_receipt BOOLEAN DEFAULT FALSE;

ALTER TABLE calling_records ADD COLUMN IF NOT EXISTS sr_no INTEGER DEFAULT 1;

ALTER TABLE swh_checklist ADD COLUMN IF NOT EXISTS sr_no INTEGER DEFAULT 1;
ALTER TABLE swh_checklist ADD COLUMN IF NOT EXISTS customer_scope BOOLEAN DEFAULT FALSE;

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'swh_checklist' AND column_name = 'our_scope' AND data_type != 'boolean'
    ) THEN
        ALTER TABLE swh_checklist DROP COLUMN our_scope;
        ALTER TABLE swh_checklist ADD COLUMN our_scope BOOLEAN DEFAULT FALSE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'swh_checklist' AND column_name = 'dispatch_yes_no' AND data_type != 'boolean'
    ) THEN
        ALTER TABLE swh_checklist DROP COLUMN dispatch_yes_no;
        ALTER TABLE swh_checklist ADD COLUMN dispatch_yes_no BOOLEAN DEFAULT FALSE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'swh_checklist' AND column_name = 'installation_yes_no' AND data_type != 'boolean'
    ) THEN
        ALTER TABLE swh_checklist DROP COLUMN installation_yes_no;
        ALTER TABLE swh_checklist ADD COLUMN installation_yes_no BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
