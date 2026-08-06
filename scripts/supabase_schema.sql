ALTER TABLE projects ADD COLUMN IF NOT EXISTS party_print_name TEXT;

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

INSERT INTO app_settings (id, value)
VALUES ('admin_credentials', '{"email": "admin@insiya.com", "password": "admin@123"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on app_settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Allow public update on app_settings" ON app_settings FOR UPDATE USING (true);
CREATE POLICY "Allow public insert on app_settings" ON app_settings FOR INSERT WITH CHECK (true);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS firm_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS party_print_name TEXT;
