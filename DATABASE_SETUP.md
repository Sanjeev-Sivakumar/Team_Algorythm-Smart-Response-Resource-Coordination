# Database Setup Instructions

## Option 1: Using pgAdmin (Recommended)

1. Open pgAdmin
2. Connect to PostgreSQL server
3. Right-click on "Databases" → Create → Database
4. Name: `urbanrescue_db`
5. Click Save
6. Right-click on `urbanrescue_db` → Query Tool
7. Open file: `final.sql`
8. Click Execute (F5)

## Option 2: Using Command Line

Open Command Prompt and run:

```cmd
cd "c:\Users\Sanjeev Kumar S\Desktop\HACKATHONS\Tetherx\Round 2\urbanrescue-ai"

REM Set password
set PGPASSWORD=usersanjeev

REM Create database
psql -U postgres -c "CREATE DATABASE urbanrescue_db;"

REM Import schema
psql -U postgres -d urbanrescue_db -f final.sql
```

## Option 3: Using Batch Script

Double-click `setup-database.bat` file

## Verify Setup

Run this to check tables were created:

```cmd
psql -U postgres -d urbanrescue_db -c "\dt"
```

You should see:
- users
- incidents
- resources
- hospitals
- incident_timeline
- risk_zones

## If You Get Errors

1. Make sure PostgreSQL is installed
2. Verify password is correct: `usersanjeev`
3. Check PostgreSQL service is running
4. Try using pgAdmin instead

## After Database Setup

```cmd
cd backend
npm install
npm start
```

Then open `frontend/index.html` in browser.
