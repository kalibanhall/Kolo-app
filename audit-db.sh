#!/bin/bash
DB_NAME="kolo_db"

echo "=== ALL TABLES ==="
sudo -u postgres psql -d $DB_NAME -c "\dt"

echo ""
echo "=== USERS COLUMNS ==="
sudo -u postgres psql -d $DB_NAME -c "SELECT column_name, data_type, character_maximum_length, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;"

echo ""
echo "=== CAMPAIGNS COLUMNS ==="
sudo -u postgres psql -d $DB_NAME -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'campaigns' ORDER BY ordinal_position;"

echo ""
echo "=== PURCHASES COLUMNS ==="
sudo -u postgres psql -d $DB_NAME -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'purchases' ORDER BY ordinal_position;"

echo ""
echo "=== TICKETS COLUMNS ==="
sudo -u postgres psql -d $DB_NAME -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'tickets' ORDER BY ordinal_position;"

echo ""
echo "=== PROMO_CODES COLUMNS ==="
sudo -u postgres psql -d $DB_NAME -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'promo_codes' ORDER BY ordinal_position;"

echo ""
echo "=== DRAW_RESULTS COLUMNS ==="
sudo -u postgres psql -d $DB_NAME -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'draw_results' ORDER BY ordinal_position;"

echo ""
echo "=== APP_SETTINGS COLUMNS ==="
sudo -u postgres psql -d $DB_NAME -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'app_settings' ORDER BY ordinal_position;"

echo ""
echo "=== TICKET_RESERVATIONS COLUMNS ==="
sudo -u postgres psql -d $DB_NAME -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ticket_reservations' ORDER BY ordinal_position;"

echo ""
echo "=== ALL INDEXES ==="
sudo -u postgres psql -d $DB_NAME -c "SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;"

echo ""
echo "=== ALL CONSTRAINTS ==="
sudo -u postgres psql -d $DB_NAME -c "SELECT conname, conrelid::regclass AS table_name, contype FROM pg_constraint WHERE connamespace = 'public'::regnamespace ORDER BY conrelid::regclass::text, conname;"

echo ""
echo "=== ALL VIEWS ==="
sudo -u postgres psql -d $DB_NAME -c "SELECT viewname FROM pg_views WHERE schemaname = 'public';"

echo ""
echo "=== ALL FUNCTIONS ==="
sudo -u postgres psql -d $DB_NAME -c "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';"

echo ""
echo "=== ALL TRIGGERS ==="
sudo -u postgres psql -d $DB_NAME -c "SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public';"
