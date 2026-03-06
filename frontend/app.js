const API_URL = 'http://localhost:5000/api';
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || '{}');
let map;
let markers = [];
let refreshInterval;

document.addEventListener('DOMContentLoaded', () => {
    if (token && currentUser.username) {
        showDashboard();
    }
});

function showTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (tab === 'login') {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
    } else {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
    }
}

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            token = data.token;
            currentUser = data.user;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(currentUser));
            showDashboard();
        } else {
            document.getElementById('loginError').textContent = data.error || 'Login failed';
        }
    } catch (err) {
        document.getElementById('loginError').textContent = 'Connection error. Ensure backend is running.';
    }
});

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        full_name: document.getElementById('regFullName').value,
        username: document.getElementById('regUsername').value,
        email: document.getElementById('regEmail').value,
        phone: document.getElementById('regPhone').value,
        password: document.getElementById('regPassword').value,
        role: document.getElementById('regRole').value
    };
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            document.getElementById('registerSuccess').textContent = 'Registration successful! Please login.';
            document.getElementById('registerError').textContent = '';
            document.getElementById('registerForm').reset();
            setTimeout(() => {
                document.querySelectorAll('.tab-btn')[0].click();
            }, 2000);
        } else {
            document.getElementById('registerError').textContent = result.error || 'Registration failed';
        }
    } catch (err) {
        document.getElementById('registerError').textContent = 'Connection error';
    }
});

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearInterval(refreshInterval);
    location.reload();
}

function showDashboard() {
    document.getElementById('authPage').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    document.getElementById('userName').textContent = currentUser.full_name;
    document.getElementById('userRole').textContent = currentUser.role.toUpperCase();
    
    if (currentUser.role === 'admin' || currentUser.role === 'officer') {
        document.getElementById('adminActions').style.display = 'block';
    }
    
    if (currentUser.role === 'admin') {
        document.getElementById('usersMenu').style.display = 'block';
    }
    
    initMap();
    loadDashboardData();
    refreshInterval = setInterval(loadDashboardData, 30000);
}

function initMap() {
    map = L.map('map').setView([13.0827, 80.2707], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
}

async function loadDashboardData() {
    try {
        const [incidents, resources, stats] = await Promise.all([
            apiGet('/incidents'),
            apiGet('/resources'),
            apiGet('/dashboard/stats')
        ]);
        
        updateStats(stats);
        updateMap(incidents, resources);
        updateRecentIncidents(incidents);
        updateNotifications(stats.critical);
    } catch (err) {
        console.error('Error:', err);
    }
}

function updateStats(stats) {
    const total = stats.incidents.reduce((sum, i) => sum + parseInt(i.total), 0);
    const available = stats.resources.find(r => r.status === 'available')?.total || 0;
    
    document.getElementById('totalIncidents').textContent = total;
    document.getElementById('criticalIncidents').textContent = stats.critical;
    document.getElementById('availableResources').textContent = available;
    document.getElementById('avgResponseTime').textContent = stats.avgResponseTime || 0;
    
    document.getElementById('sidebarActive').textContent = total;
    document.getElementById('sidebarCritical').textContent = stats.critical;
    document.getElementById('sidebarResources').textContent = available;
}

function updateNotifications(count) {
    document.getElementById('notificationBadge').textContent = count;
}

function updateMap(incidents, resources) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    
    incidents.filter(i => i.status !== 'resolved').forEach(incident => {
        if (incident.latitude && incident.longitude) {
            const color = incident.priority_score > 70 ? '#ef4444' : 
                         incident.priority_score > 50 ? '#f59e0b' : '#3b82f6';
            
            const icon = L.divIcon({
                className: 'custom-icon',
                html: `<div style="background: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">${incident.priority_score}</div>`,
                iconSize: [30, 30]
            });
            
            const marker = L.marker([incident.latitude, incident.longitude], { icon })
                .bindPopup(`
                    <div style="min-width: 200px;">
                        <h3 style="margin-bottom: 10px;">${incident.incident_type.toUpperCase()}</h3>
                        <p><strong>Location:</strong> ${incident.location_name}</p>
                        <p><strong>Priority:</strong> ${incident.priority_score}/100</p>
                        <p><strong>Status:</strong> ${incident.status}</p>
                        <button onclick="showIncidentDetails(${incident.id})" style="margin-top: 10px; padding: 8px 15px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">Details</button>
                    </div>
                `)
                .addTo(map);
            markers.push(marker);
        }
    });
    
    resources.filter(r => r.status === 'available').forEach(resource => {
        if (resource.latitude && resource.longitude) {
            const icon = L.divIcon({
                className: 'custom-icon',
                html: '<div style="background: #10b981; width: 25px; height: 25px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
                iconSize: [25, 25]
            });
            
            const marker = L.marker([resource.latitude, resource.longitude], { icon })
                .bindPopup(`<b>${resource.resource_name}</b><br>${resource.resource_type}`)
                .addTo(map);
            markers.push(marker);
        }
    });
}

function updateRecentIncidents(incidents) {
    const list = document.getElementById('recentIncidentsList');
    const recent = incidents.filter(i => i.status !== 'resolved').slice(0, 5);
    
    list.innerHTML = recent.map(incident => {
        const priorityClass = incident.priority_score > 70 ? 'critical' : 
                             incident.priority_score > 50 ? 'high' : 
                             incident.priority_score > 30 ? 'medium' : 'low';
        
        return `
            <div class="data-card" onclick="showIncidentDetails(${incident.id})">
                <div class="card-header">
                    <span class="card-title">${incident.incident_type.toUpperCase()}</span>
                    <span class="priority-badge priority-${priorityClass}">${incident.priority_score}/100</span>
                </div>
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">${incident.location_name}</p>
                <p style="color: #9ca3af; font-size: 12px;">${new Date(incident.created_at).toLocaleString()}</p>
            </div>
        `;
    }).join('');
}

function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${viewName}View`).classList.add('active');
    
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    event.target.classList.add('active');
    
    if (viewName === 'incidents') loadIncidents();
    if (viewName === 'resources') loadResources();
    if (viewName === 'hospitals') loadHospitals();
    if (viewName === 'analytics') loadAnalytics();
    if (viewName === 'users') loadUsers();
}

async function loadIncidents() {
    const incidents = await apiGet('/incidents');
    const list = document.getElementById('incidentsList');
    
    list.innerHTML = incidents.map(incident => {
        const priorityClass = incident.priority_score > 70 ? 'critical' : 
                             incident.priority_score > 50 ? 'high' : 
                             incident.priority_score > 30 ? 'medium' : 'low';
        
        return `
            <div class="data-card" onclick="showIncidentDetails(${incident.id})">
                <div class="card-header">
                    <div>
                        <span class="card-title">${incident.incident_type.toUpperCase()}</span>
                        <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">${incident.description || 'No description'}</p>
                    </div>
                    <span class="priority-badge priority-${priorityClass}">${incident.priority_score}/100</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                    <div>
                        <p style="font-size: 12px; color: #9ca3af;">Location</p>
                        <p style="font-weight: 600; color: #1f2937;">${incident.location_name}</p>
                    </div>
                    <div>
                        <p style="font-size: 12px; color: #9ca3af;">Status</p>
                        <p style="font-weight: 600; color: #1f2937;">${incident.status}</p>
                    </div>
                    <div>
                        <p style="font-size: 12px; color: #9ca3af;">Time</p>
                        <p style="font-weight: 600; color: #1f2937;">${new Date(incident.created_at).toLocaleTimeString()}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function loadResources() {
    const resources = await apiGet('/resources');
    const list = document.getElementById('resourcesList');
    
    list.innerHTML = resources.map(resource => `
        <div class="data-card">
            <div class="card-header">
                <div>
                    <span class="card-title">${resource.resource_name}</span>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">${resource.resource_type.toUpperCase()}</p>
                </div>
                <span class="status-badge status-${resource.status}">${resource.status.toUpperCase()}</span>
            </div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 14px; color: #6b7280;"><i class="fas fa-tools"></i> ${resource.equipment}</p>
            </div>
        </div>
    `).join('');
}

async function loadHospitals() {
    const hospitals = await apiGet('/hospitals');
    const list = document.getElementById('hospitalsList');
    
    list.innerHTML = hospitals.map(hospital => `
        <div class="data-card">
            <div class="card-header">
                <span class="card-title"><i class="fas fa-hospital"></i> ${hospital.name}</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">
                <div style="background: #f3f4f6; padding: 15px; border-radius: 10px;">
                    <p style="font-size: 12px; color: #6b7280;">General Beds</p>
                    <p style="font-size: 24px; font-weight: 700; color: #1f2937;">${hospital.available_beds}/${hospital.total_beds}</p>
                </div>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 10px;">
                    <p style="font-size: 12px; color: #6b7280;">ICU Beds</p>
                    <p style="font-size: 24px; font-weight: 700; color: ${hospital.available_icu_beds > 0 ? '#10b981' : '#ef4444'};">${hospital.available_icu_beds}/${hospital.icu_beds}</p>
                </div>
            </div>
        </div>
    `).join('');
}

async function loadAnalytics() {
    const riskZones = await apiGet('/risk-zones');
    const riskList = document.getElementById('riskZonesList');
    
    riskList.innerHTML = riskZones.map(zone => `
        <div style="padding: 15px; background: #f3f4f6; border-radius: 10px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <p style="font-weight: 600; color: #1f2937;">${zone.location_name}</p>
                    <p style="font-size: 12px; color: #6b7280;">${zone.risk_type}</p>
                </div>
                <span style="background: #ef4444; color: white; padding: 5px 12px; border-radius: 20px; font-weight: 700;">${zone.risk_score}/100</span>
            </div>
        </div>
    `).join('');
    
    const areas = ['OMR Road', 'GST Road', 'Tambaram', 'Velachery', 'Porur'];
    const safetyList = document.getElementById('safetyScoresList');
    
    const safetyScores = await Promise.all(
        areas.map(area => apiGet(`/safety-score/${area}`))
    );
    
    safetyList.innerHTML = safetyScores.map(score => {
        const color = score.safetyScore > 70 ? '#10b981' : score.safetyScore > 40 ? '#f59e0b' : '#ef4444';
        return `
            <div style="padding: 15px; background: #f3f4f6; border-radius: 10px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <p style="font-weight: 600; color: #1f2937;">${score.area}</p>
                        <p style="font-size: 12px; color: #6b7280;">${score.incidents} incidents (30 days)</p>
                    </div>
                    <span style="background: ${color}; color: white; padding: 5px 12px; border-radius: 20px; font-weight: 700;">${score.safetyScore}/100</span>
                </div>
            </div>
        `;
    }).join('');
}

async function loadUsers() {
    const users = await apiGet('/users');
    const list = document.getElementById('usersList');
    
    list.innerHTML = users.map(user => `
        <div class="data-card">
            <div class="card-header">
                <div>
                    <span class="card-title">${user.full_name}</span>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">@${user.username}</p>
                </div>
                <span class="role-badge">${user.role.toUpperCase()}</span>
            </div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 14px; color: #6b7280;"><i class="fas fa-envelope"></i> ${user.email}</p>
                <p style="font-size: 14px; color: #6b7280; margin-top: 5px;"><i class="fas fa-phone"></i> ${user.phone || 'N/A'}</p>
            </div>
        </div>
    `).join('');
}

function showCreateIncident() {
    document.getElementById('createIncidentModal').classList.add('show');
}

function showCreateUser() {
    document.getElementById('createUserModal').classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function useMyLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById('latitude').value = position.coords.latitude.toFixed(6);
                document.getElementById('longitude').value = position.coords.longitude.toFixed(6);
                alert('✓ Location captured successfully!');
                predictPriority();
            },
            (error) => {
                alert('Unable to get location. Please enter manually.');
            }
        );
    } else {
        alert('Geolocation not supported by browser.');
    }
}

function predictPriority() {
    const severity = parseInt(document.getElementById('severity').value);
    const locationType = document.getElementById('locationType').value;
    const density = document.getElementById('populationDensity').value;
    
    if (severity && locationType && density) {
        const locationScores = {
            highway: 0.95, hospital_area: 0.90, school_zone: 0.85,
            market: 0.80, commercial: 0.65, industrial: 0.60, residential: 0.55
        };
        const densityScores = { high: 0.9, medium: 0.6, low: 0.3 };
        
        const sev = severity / 10;
        const loc = locationScores[locationType] || 0.5;
        const den = densityScores[density] || 0.5;
        const time = 0.7;
        
        const priority = Math.round((sev * 0.35 + loc * 0.25 + den * 0.20 + time * 0.20) * 100);
        
        const actions = priority >= 90 ? ['Immediate dispatch', 'Alert all units', 'Traffic control'] :
                       priority >= 70 ? ['Priority dispatch', 'Alert nearby units'] :
                       priority >= 50 ? ['Standard response'] : ['Monitor situation'];
        
        document.getElementById('mlInsights').style.display = 'block';
        document.getElementById('mlPrediction').innerHTML = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 10px; margin-top: 10px;">
                <p style="font-size: 14px; margin-bottom: 10px;"><strong>🤖 ML Prediction:</strong></p>
                <p style="font-size: 24px; font-weight: 700; margin-bottom: 10px;">Priority Score: ${priority}/100</p>
                <p style="font-size: 13px; opacity: 0.9;"><strong>Recommended Actions:</strong></p>
                <ul style="margin-top: 5px; padding-left: 20px;">
                    ${actions.map(a => `<li style="font-size: 13px;">${a}</li>`).join('')}
                </ul>
            </div>
        `;
    }
}

document.getElementById('severity')?.addEventListener('change', predictPriority);
document.getElementById('locationType')?.addEventListener('change', predictPriority);
document.getElementById('populationDensity')?.addEventListener('change', predictPriority);

async function showIncidentDetails(id) {
    const incidents = await apiGet('/incidents');
    const incident = incidents.find(i => i.id === id);
    const timeline = await apiGet(`/incidents/${id}/timeline`);
    
    const content = document.getElementById('incidentDetailsContent');
    content.innerHTML = `
        <div style="padding: 30px;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px;">
                <div>
                    <p style="font-size: 12px; color: #6b7280;">Type</p>
                    <p style="font-size: 18px; font-weight: 600; color: #1f2937;">${incident.incident_type.toUpperCase()}</p>
                </div>
                <div>
                    <p style="font-size: 12px; color: #6b7280;">Priority</p>
                    <p style="font-size: 18px; font-weight: 600; color: #ef4444;">${incident.priority_score}/100</p>
                </div>
                <div>
                    <p style="font-size: 12px; color: #6b7280;">Location</p>
                    <p style="font-size: 18px; font-weight: 600; color: #1f2937;">${incident.location_name}</p>
                </div>
                <div>
                    <p style="font-size: 12px; color: #6b7280;">Status</p>
                    <p style="font-size: 18px; font-weight: 600; color: #1f2937;">${incident.status}</p>
                </div>
            </div>
            <div style="margin-bottom: 20px;">
                <p style="font-size: 12px; color: #6b7280;">Description</p>
                <p style="font-size: 14px; color: #1f2937; margin-top: 5px;">${incident.description || 'No description'}</p>
            </div>
            <h3 style="margin-bottom: 15px;">Timeline</h3>
            ${timeline.map(t => `
                <div style="padding: 15px; background: #f3f4f6; border-radius: 10px; margin-bottom: 10px;">
                    <p style="font-weight: 600; color: #1f2937;">${t.action}</p>
                    <p style="font-size: 12px; color: #6b7280; margin-top: 5px;">By ${t.full_name || 'System'} - ${new Date(t.created_at).toLocaleString()}</p>
                    ${t.notes ? `<p style="font-size: 14px; color: #1f2937; margin-top: 5px;">${t.notes}</p>` : ''}
                </div>
            `).join('')}
        </div>
    `;
    
    document.getElementById('incidentDetailsModal').classList.add('show');
}

document.getElementById('createIncidentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        incident_type: document.getElementById('incidentType').value,
        description: document.getElementById('description').value,
        location_name: document.getElementById('locationName').value,
        latitude: parseFloat(document.getElementById('latitude').value),
        longitude: parseFloat(document.getElementById('longitude').value),
        severity: parseInt(document.getElementById('severity').value),
        location_type: document.getElementById('locationType').value,
        population_density: document.getElementById('populationDensity').value,
        traffic_level: 'medium'
    };
    
    const result = await apiPost('/incidents', data);
    if (result) {
        closeModal('createIncidentModal');
        document.getElementById('createIncidentForm').reset();
        document.getElementById('mlInsights').style.display = 'none';
        loadDashboardData();
        alert('✓ Incident created successfully with ML priority: ' + result.priority_score + '/100');
    }
});

document.getElementById('createUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        full_name: document.getElementById('userFullName').value,
        username: document.getElementById('userUsername').value,
        email: document.getElementById('userEmail').value,
        phone: document.getElementById('userPhone').value,
        role: document.getElementById('userRole').value,
        password: document.getElementById('userPassword').value
    };
    
    const result = await apiPost('/users', data);
    if (result) {
        closeModal('createUserModal');
        document.getElementById('createUserForm').reset();
        loadUsers();
        alert('✓ User created successfully!');
    }
});

async function apiGet(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
}

async function apiPost(endpoint, data) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        return response.json();
    } catch (err) {
        alert('Error: ' + err.message);
        return null;
    }
}

function refreshMap() {
    loadDashboardData();
}

function toggleHeatmap() {
    alert('Heatmap view - showing incident density zones');
}

function filterIncidents() {
    loadIncidents();
}
