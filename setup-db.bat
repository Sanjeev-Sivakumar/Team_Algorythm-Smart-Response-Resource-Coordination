@echo off
echo Creating database and importing schema...
echo.

set PGPASSWORD=usersanjeev

"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "DROP DATABASE IF EXISTS urbanrescue_db;"
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE urbanrescue_db;"
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d urbanrescue_db -f final.sql

echo.
echo Database setup complete!
echo.
pause
