-- UrbanRescue AI Complete Database Schema

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('viewer', 'officer', 'admin')),
    full_name VARCHAR(200),
    email VARCHAR(150),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Incidents table
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    incident_type VARCHAR(50) NOT NULL,
    description TEXT,
    location_name VARCHAR(200),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    severity INTEGER CHECK (severity BETWEEN 1 AND 10),
    priority_score INTEGER CHECK (priority_score BETWEEN 0 AND 100),
    status VARCHAR(50) DEFAULT 'pending',
    reported_by INTEGER REFERENCES users(id),
    assigned_to INTEGER REFERENCES users(id),
    recommended_actions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Resources table
CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    resource_type VARCHAR(50) NOT NULL,
    resource_name VARCHAR(100),
    status VARCHAR(30) DEFAULT 'available',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    equipment TEXT,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incident timeline
CREATE TABLE incident_timeline (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hospitals
CREATE TABLE hospitals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    total_beds INTEGER,
    available_beds INTEGER,
    icu_beds INTEGER,
    available_icu_beds INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Risk zones
CREATE TABLE risk_zones (
    id SERIAL PRIMARY KEY,
    location_name VARCHAR(200),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    risk_type VARCHAR(50),
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
    predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default users (password: admin123)
INSERT INTO users (username, password_hash, role, full_name, email) VALUES
('admin', '$2b$10$Ew237X4aoxKqqRfVXTBE2ebGFDbQD.u4eu0cGxo6aCsynA5WnSovG', 'admin', 'System Administrator', 'admin@urbanrescue.ai'),
('officer1', '$2b$10$Ew237X4aoxKqqRfVXTBE2ebGFDbQD.u4eu0cGxo6aCsynA5WnSovG', 'officer', 'Response Officer 1', 'officer1@urbanrescue.ai'),
('viewer1', '$2b$10$Ew237X4aoxKqqRfVXTBE2ebGFDbQD.u4eu0cGxo6aCsynA5WnSovG', 'viewer', 'Public Viewer', 'viewer@urbanrescue.ai');

-- Insert sample resources
INSERT INTO resources (resource_type, resource_name, status, latitude, longitude, equipment) VALUES
('ambulance', 'Ambulance #1', 'available', 13.0827, 80.2707, 'Basic Life Support, AED, Oxygen'),
('ambulance', 'Ambulance #2', 'busy', 13.0475, 80.2145, 'Advanced Life Support, Ventilator'),
('ambulance', 'Ambulance #3', 'available', 13.0670, 80.2378, 'Basic Life Support, Stretcher'),
('fire_truck', 'Fire Truck #1', 'available', 13.0569, 80.2425, 'Water Tank 5000L, Ladder, Hose'),
('fire_truck', 'Fire Truck #2', 'available', 13.0358, 80.2464, 'Water Tank 3000L, Foam System'),
('police', 'Police Unit #1', 'available', 13.0827, 80.2707, 'Standard Equipment, Radio'),
('police', 'Police Unit #2', 'available', 13.0475, 80.2145, 'Traffic Control, Barricades'),
('police', 'Police Unit #3', 'busy', 13.0569, 80.2425, 'Patrol Vehicle, First Aid'),
('rescue_team', 'Rescue Team #1', 'available', 13.0670, 80.2378, 'Heavy Equipment, Cutting Tools'),
('rescue_team', 'Rescue Team #2', 'available', 13.0358, 80.2464, 'Search Equipment, Medical Kit');

-- Insert sample hospitals
INSERT INTO hospitals (name, latitude, longitude, total_beds, available_beds, icu_beds, available_icu_beds) VALUES
('City General Hospital', 13.0827, 80.2707, 200, 45, 20, 3),
('Emergency Care Center', 13.0475, 80.2145, 150, 30, 15, 5),
('Metro Medical Hospital', 13.0569, 80.2425, 180, 20, 18, 0),
('Community Health Center', 13.0670, 80.2378, 120, 35, 10, 4),
('Central Medical Institute', 13.0358, 80.2464, 250, 60, 25, 8);

-- Insert sample risk zones
INSERT INTO risk_zones (location_name, latitude, longitude, risk_type, risk_score) VALUES
('OMR Road Junction', 13.0827, 80.2707, 'accident_prone', 85),
('GST Road Highway', 13.0475, 80.2145, 'accident_prone', 92),
('Tambaram Market Area', 13.0569, 80.2425, 'crowd_risk', 78),
('Velachery Signal', 13.0670, 80.2378, 'accident_prone', 81),
('Porur Industrial Zone', 13.0358, 80.2464, 'fire_risk', 75);

-- Create indexes
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_priority ON incidents(priority_score DESC);
CREATE INDEX idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_incident_timeline_incident ON incident_timeline(incident_id);
