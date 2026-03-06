@echo off
echo ========================================
echo UrbanRescue AI - Setup Script
echo ========================================
echo.

echo Step 1: Creating PostgreSQL Database...
psql -U postgres -c "CREATE DATABASE urbanrescue_db;"
echo.

echo Step 2: Importing Database Schema...
psql -U postgres -d urbanrescue_db -f final.sql
echo.

echo Step 3: Installing Backend Dependencies...
cd backend
call npm install
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the application:
echo 1. Backend: cd backend && npm start
echo 2. Frontend: Open frontend/index.html in browser
echo.
echo Default Login:
echo   Admin: admin / admin123
echo   Officer: officer1 / admin123
echo   Viewer: viewer1 / admin123
echo.
pause
