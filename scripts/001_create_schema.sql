-- Heat Pump / SWH Project Management Database Schema

-- Projects table (main table - like "Home" sheet)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_no INTEGER UNIQUE NOT NULL,
  order_type TEXT NOT NULL, -- e.g., "Heat Pump", "SWH", "Boom Barrier"
  site_name TEXT NOT NULL,
  address TEXT,
  hp_type TEXT, -- e.g., "5HP", "10HP"
  hp_qty INTEGER DEFAULT 0, -- Heat Pump quantity
  tank_type TEXT, -- e.g., "GI Pressureized", "GI Non-Pressurized", "Enamel"
  tank_qty INTEGER DEFAULT 0,
  gl INTEGER DEFAULT 0, -- Gallon/Liter capacity
  sales_m_value DECIMAL(12, 2) DEFAULT 0, -- Material sales value
  m_outward_value DECIMAL(12, 2) DEFAULT 0, -- Material outward value
  m_balance DECIMAL(12, 2) DEFAULT 0, -- Material balance
  order_value DECIMAL(12, 2) DEFAULT 0, -- Total order value
  extra_work_value DECIMAL(12, 2) DEFAULT 0,
  payment_received DECIMAL(12, 2) DEFAULT 0,
  work_remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment terms table (linked to projects)
CREATE TABLE IF NOT EXISTS payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payment_term TEXT NOT NULL, -- e.g., "Advance", "Material on Site", "Installation", "Testing", "Retention"
  term_percentage DECIMAL(5, 2) DEFAULT 0,
  amount DECIMAL(12, 2) DEFAULT 0,
  received_amount DECIMAL(12, 2) DEFAULT 0,
  pending_amount DECIMAL(12, 2) DEFAULT 0, -- Amount pending for receipt
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ledger entries (transactions for each project)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sr_no INTEGER NOT NULL,
  date DATE NOT NULL,
  payment_type TEXT, -- e.g., "Advance", "Progress", etc.
  reference_number TEXT,
  invoice_no TEXT,
  particulars TEXT,
  bill_submitted BOOLEAN DEFAULT FALSE,
  sales_m_value DECIMAL(12, 2) DEFAULT 0,
  m_outward_value DECIMAL(12, 2) DEFAULT 0,
  order_value DECIMAL(12, 2) DEFAULT 0,
  extra_work_value DECIMAL(12, 2) DEFAULT 0,
  payment_received DECIMAL(12, 2) DEFAULT 0,
  work_remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table (per project)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sr_no INTEGER NOT NULL,
  date DATE NOT NULL,
  particular TEXT,
  expense DECIMAL(12, 2) DEFAULT 0, -- Expense amount
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calling records (call log per project)
CREATE TABLE IF NOT EXISTS calling_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  s_no INTEGER NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SWH Checklist items (equipment tracking per project)
CREATE TABLE IF NOT EXISTS swh_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  s_no INTEGER NOT NULL,
  item_name TEXT NOT NULL, -- e.g., "Heat Pump", "Circulation Pump", "Heat Pump Stand", etc.
  req_qty INTEGER DEFAULT 0,
  our_scope INTEGER DEFAULT 0,
  dispatch_qty INTEGER DEFAULT 0,
  dispatch_yes_no TEXT, -- "Yes" / "No"
  installed_qty INTEGER DEFAULT 0,
  installation_yes_no TEXT, -- "Yes" / "No"
  dispatch_balance_qty INTEGER DEFAULT 0,
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work remarks/notes (general remarks with date)
CREATE TABLE IF NOT EXISTS work_remarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sr_no INTEGER NOT NULL,
  date DATE NOT NULL,
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_id_no ON projects(id_no);
CREATE INDEX IF NOT EXISTS idx_payment_terms_project_id ON payment_terms(project_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_project_id ON ledger_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_calling_records_project_id ON calling_records(project_id);
CREATE INDEX IF NOT EXISTS idx_swh_checklist_project_id ON swh_checklist(project_id);
CREATE INDEX IF NOT EXISTS idx_work_remarks_project_id ON work_remarks(project_id);

-- Insert some sample data
INSERT INTO projects (id_no, order_type, site_name, address, order_value, work_remark)
VALUES 
  (18032, 'Boom Barrier', 'Eastern Elegance Hadapsar', 'Hadapsar', 44000, 'payment term 100% After installation')
ON CONFLICT (id_no) DO NOTHING;
