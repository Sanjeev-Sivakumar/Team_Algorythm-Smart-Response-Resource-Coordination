const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const { SmartPriorityModel, SmartResourceCoordinator, RiskPredictor, NLPAnalyzer } = require('./mlModel');
const { sendIncidentAlert, sendWelcomeEmail } = require('./emailService');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const priorityModel = new SmartPriorityModel();
const resourceCoordinator = new SmartResourceCoordinator();
const riskPredictor = new RiskPredictor();
const nlpAnalyzer = new NLPAnalyzer();

console.log('ML Models loaded and trained successfully');

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const checkRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// AUTH
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, full_name, email, phone, role } = req.body;
    
    const existing = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role || 'viewer';
    
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, role, full_name, email, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, role, full_name, email',
      [username, hashedPassword, userRole, full_name, email, phone]
    );
    
    await sendWelcomeEmail(result.rows[0]);
    res.json({ message: 'Registration successful', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND is_active = TRUE', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// INCIDENTS
app.get('/api/incidents', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT i.*, u.full_name as assigned_officer FROM incidents i LEFT JOIN users u ON i.assigned_to = u.id ORDER BY i.priority_score DESC, i.created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/incidents', authenticateToken, checkRole(['admin', 'officer']), async (req, res) => {
  try {
    const { incident_type, description, location_name, latitude, longitude, severity, location_type, population_density, traffic_level } = req.body;
    
    const nlpResult = nlpAnalyzer.analyzeText(description);
    const priority_score = priorityModel.predict({ severity, location_type, population_density, traffic_level });
    const actions = priorityModel.getRecommendedActions(priority_score);
    
    const result = await pool.query(
      `INSERT INTO incidents (incident_type, description, location_name, latitude, longitude, severity, priority_score, reported_by, status, recommended_actions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9) RETURNING *`,
      [incident_type, description, location_name, latitude, longitude, severity, priority_score, req.user.id, JSON.stringify(actions)]
    );
    
    await pool.query(
      'INSERT INTO incident_timeline (incident_id, user_id, action) VALUES ($1, $2, $3)',
      [result.rows[0].id, req.user.id, 'Incident created with AI priority analysis']
    );
    
    if (priority_score > 70) {
      const officers = await pool.query('SELECT email FROM users WHERE role IN ($1, $2) AND is_active = TRUE', ['admin', 'officer']);
      const emails = officers.rows.map(o => o.email).filter(e => e);
      if (emails.length > 0) {
        await sendIncidentAlert(result.rows[0], emails);
      }
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/incidents/:id', authenticateToken, checkRole(['admin', 'officer']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, notes } = req.body;
    
    const updates = [];
    const params = [];
    let paramCount = 1;
    
    if (status) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);
      if (status === 'resolved') {
        updates.push(`resolved_at = CURRENT_TIMESTAMP`);
      }
    }
    if (assigned_to) {
      updates.push(`assigned_to = $${paramCount++}`);
      params.push(assigned_to);
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    
    const query = `UPDATE incidents SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, params);
    
    await pool.query(
      'INSERT INTO incident_timeline (incident_id, user_id, action, notes) VALUES ($1, $2, $3, $4)',
      [id, req.user.id, status ? `Status: ${status}` : 'Updated', notes]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/incidents/:id/timeline', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT t.*, u.full_name FROM incident_timeline t 
       LEFT JOIN users u ON t.user_id = u.id 
       WHERE t.incident_id = $1 ORDER BY t.created_at ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SMART RESOURCE COORDINATION
app.post('/api/coordination/recommend', authenticateToken, async (req, res) => {
  try {
    const { incident } = req.body;
    const resources = await pool.query('SELECT * FROM resources');
    
    const recommendations = resourceCoordinator.coordinateResources(incident, resources.rows);
    const plan = resourceCoordinator.generateCoordinationPlan(incident, recommendations);
    
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/resources', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM resources ORDER BY status, resource_type');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/resources/:id', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, latitude, longitude } = req.body;
    
    const result = await pool.query(
      'UPDATE resources SET status = $1, latitude = $2, longitude = $3, last_active = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [status, latitude, longitude, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// HOSPITALS
app.get('/api/hospitals', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM hospitals ORDER BY available_beds DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/hospitals/nearest', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    const hospitals = await pool.query('SELECT * FROM hospitals WHERE available_beds > 0');
    
    const nearest = hospitals.rows.map(h => ({
      ...h,
      distance: resourceCoordinator.calculateDistance(
        parseFloat(latitude), parseFloat(longitude),
        h.latitude, h.longitude
      ).toFixed(2)
    })).sort((a, b) => a.distance - b.distance);
    
    res.json(nearest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ANALYTICS
app.get('/api/risk-zones', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM risk_zones WHERE risk_score > 60 ORDER BY risk_score DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/safety-score/:area', authenticateToken, async (req, res) => {
  try {
    const { area } = req.params;
    const incidents = await pool.query(
      'SELECT COUNT(*) as count FROM incidents WHERE location_name ILIKE $1 AND created_at > NOW() - INTERVAL \'30 days\'',
      [`%${area}%`]
    );
    
    const safetyScore = riskPredictor.calculateSafetyScore({
      incidents: parseInt(incidents.rows[0].count),
      population: 100000,
      area_km2: 10
    });
    
    res.json({ area, safetyScore, incidents: incidents.rows[0].count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DASHBOARD
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const incidents = await pool.query('SELECT COUNT(*) as total, status FROM incidents GROUP BY status');
    const resources = await pool.query('SELECT COUNT(*) as total, status FROM resources GROUP BY status');
    const criticalIncidents = await pool.query('SELECT COUNT(*) as count FROM incidents WHERE priority_score > 70 AND status != $1', ['resolved']);
    const todayIncidents = await pool.query('SELECT COUNT(*) as count FROM incidents WHERE DATE(created_at) = CURRENT_DATE');
    const avgResponseTime = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60) as avg_time 
       FROM incidents WHERE resolved_at IS NOT NULL AND created_at > NOW() - INTERVAL '7 days'`
    );
    
    res.json({
      incidents: incidents.rows,
      resources: resources.rows,
      critical: criticalIncidents.rows[0].count,
      today: todayIncidents.rows[0].count,
      avgResponseTime: Math.round(avgResponseTime.rows[0].avg_time || 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// USERS
app.get('/api/users', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role, full_name, email, phone, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const { username, password, role, full_name, email, phone } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, role, full_name, email, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, role, full_name, email',
      [username, hashedPassword, role, full_name, email, phone]
    );
    
    await sendWelcomeEmail(result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 UrbanRescue AI Server running on port ${PORT}`));
