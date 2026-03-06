@echo off
echo ========================================
echo UrbanRescue AI - Database Setup
echo ========================================
echo.

set PGPASSWORD=usersanjeev

REM Try different PostgreSQL installation paths
set PSQL_PATH=

if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
    set PSQL_PATH=C:\Program Files\PostgreSQL\16\bin\psql.exe
) else if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" (
    set PSQL_PATH=C:\Program Files\PostgreSQL\15\bin\psql.exe
) else if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" (
    set PSQL_PATH=C:\Program Files\PostgreSQL\14\bin\psql.exe
) else if exist "C:\Program Files\PostgreSQL\13\bin\psql.exe" (
    set PSQL_PATH=C:\Program Files\PostgreSQL\13\bin\psql.exe
) else if exist "C:\Program Files\PostgreSQL\12\bin\psql.exe" (
    set PSQL_PATH=C:\Program Files\PostgreSQL\12\bin\psql.exe
) else (
    echo PostgreSQL not found in standard locations!
    echo Please run these commands manually in pgAdmin or psql:
    echo.
    echo CREATE DATABASE urbanrescue_db;
    echo \c urbanrescue_db
    echo \i final.sql
    echo.
    pause
    exit /b 1
)

echo Found PostgreSQL at: %PSQL_PATH%
echo.

echo Step 1: Dropping existing database (if any)...
"%PSQL_PATH%" -U postgres -c "DROP DATABASE IF EXISTS urbanrescue_db;"

echo Step 2: Creating database...
"%PSQL_PATH%" -U postgres -c "CREATE DATABASE urbanrescue_db;"

echo Step 3: Importing schema...
"%PSQL_PATH%" -U postgres -d urbanrescue_db -f final.sql

echo.
echo ========================================
echo Database setup complete!
echo ========================================
echo.
echo You can now:
echo 1. cd backend
echo 2. npm install
echo 3. npm start
echo.
pause
