const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'usersanjeev',
  port: 5432,
});

async function setupDatabase() {
  try {
    console.log('Creating database...');
    await pool.query('DROP DATABASE IF EXISTS urbanrescue_db');
    await pool.query('CREATE DATABASE urbanrescue_db');
    console.log('Database created!');
    
    await pool.end();
    
    const dbPool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'urbanrescue_db',
      password: 'usersanjeev',
      port: 5432,
    });
    
    console.log('Creating tables...');
    const sqlPath = path.join(__dirname, '..', 'final.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await dbPool.query(sql);
    
    console.log('✅ Database setup complete!');
    console.log('You can now start the server with: npm start');
    
    await dbPool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

setupDatabase();
