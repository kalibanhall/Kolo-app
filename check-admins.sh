#!/bin/bash
PGPASSWORD=vH3ahOqlCRi5QVUj6cSMfzEh psql -h localhost -U kolo -d kolo_db -c "SELECT id, email, is_admin, admin_level FROM users WHERE is_admin = TRUE"
