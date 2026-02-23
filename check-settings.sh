#!/bin/bash
PGPASSWORD=vH3ahOqlCRi5QVUj6cSMfzEh psql -h localhost -U kolo -d kolo_db -c "SELECT * FROM app_settings"
