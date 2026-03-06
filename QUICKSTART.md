# Quick Start Guide

## Setup Instructions

### 1. Install Dependencies
```bash
# Install Node.js from https://nodejs.org/
# Install PostgreSQL from https://www.postgresql.org/download/

# Install Python bcrypt (optional, for password generation)
pip install bcrypt
```

### 2. Database Setup
```bash
# Open PostgreSQL command line
psql -U postgres

# Create database
CREATE DATABASE urbanrescue_db;

# Exit psql
\q

# Import schema
psql -U postgres -d urbanrescue_db -f final.sql
```

### 3. Backend Setup
```bash
cd backend
npm install
npm start
```

Backend will run on http://localhost:5000

### 4. Frontend Setup
Open `frontend/index.html` in your browser

Or use a local server:
```bash
cd frontend
python -m http.server 8000
```

Then open http://localhost:8000

## Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Officer | officer1 | admin123 |
| Viewer | viewer1 | admin123 |

## Testing the System

1. Login as **admin**
2. Click "Create Incident" button
3. Fill in incident details:
   - Type: accident
   - Location: OMR Road
   - Latitude: 13.0827
   - Longitude: 80.2707
   - Severity: 8
4. View incident on map
5. Check dashboard statistics

## Project Structure

```
urbanrescue-ai/
├── backend/           # Node.js API server
├── frontend/          # Web interface
├── datasets/          # ML training data
└── final.sql          # Database schema
```

## Troubleshooting

**Cannot connect to database:**
- Ensure PostgreSQL is running
- Check password in backend/.env matches your PostgreSQL password

**Login fails:**
- Verify database was created and schema imported
- Check backend server is running on port 5000

**Map not showing:**
- Check internet connection (requires Leaflet CDN)
- Open browser console for errors
