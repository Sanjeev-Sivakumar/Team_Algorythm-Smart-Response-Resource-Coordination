const fs = require('fs');
const path = require('path');

class MLTrainer {
  constructor() {
    this.incidentData = this.loadCSV('incident_training.csv');
    this.resourceData = this.loadCSV('resource_coordination.csv');
  }

  loadCSV(filename) {
    try {
      const filePath = path.join(__dirname, '..', 'datasets', filename);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      const headers = lines[0].split(',');
      
      return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = isNaN(values[i]) ? values[i] : parseFloat(values[i]);
        });
        return obj;
      });
    } catch (err) {
      console.error(`Error loading ${filename}:`, err.message);
      return [];
    }
  }

  trainPriorityModel() {
    const weights = { severity: 0, location: 0, density: 0, time: 0, traffic: 0 };
    let count = 0;

    this.incidentData.forEach(incident => {
      const severityContrib = (incident.severity / 10) * (incident.priority_score / 100);
      const locationScore = this.getLocationScore(incident.location_type);
      const densityScore = this.getDensityScore(incident.population_density);
      const timeScore = this.getTimeScore(incident.time_hour);
      const trafficScore = this.getTrafficScore(incident.traffic_level);

      weights.severity += severityContrib;
      weights.location += locationScore * (incident.priority_score / 100);
      weights.density += densityScore * (incident.priority_score / 100);
      weights.time += timeScore * (incident.priority_score / 100);
      weights.traffic += trafficScore * (incident.priority_score / 100);
      count++;
    });

    Object.keys(weights).forEach(key => weights[key] /= count);
    return weights;
  }

  getLocationScore(type) {
    const scores = {
      highway: 0.95, hospital_area: 0.90, school_zone: 0.85,
      market: 0.80, commercial: 0.65, industrial: 0.60, residential: 0.55
    };
    return scores[type] || 0.5;
  }

  getDensityScore(density) {
    return density === 'high' ? 0.9 : density === 'medium' ? 0.6 : 0.3;
  }

  getTimeScore(hour) {
    return (hour >= 6 && hour <= 22) ? 0.8 : 0.5;
  }

  getTrafficScore(level) {
    return level === 'high' ? 0.9 : level === 'medium' ? 0.6 : 0.3;
  }

  trainResourceModel() {
    const avgScores = {
      distance: 0, availability: 0, equipment: 0, traffic: 0, success: 0
    };
    let count = 0;

    this.resourceData.forEach(resource => {
      avgScores.distance += (5 - resource.distance_km) / 5;
      avgScores.availability += resource.availability_score;
      avgScores.equipment += resource.equipment_match;
      avgScores.traffic += resource.traffic_factor;
      avgScores.success += resource.response_success_rate;
      count++;
    });

    Object.keys(avgScores).forEach(key => avgScores[key] /= count);
    return avgScores;
  }
}

class SmartPriorityModel {
  constructor() {
    const trainer = new MLTrainer();
    this.weights = trainer.trainPriorityModel();
    this.locationScores = {
      highway: 0.95, hospital_area: 0.90, school_zone: 0.85,
      market: 0.80, commercial: 0.65, industrial: 0.60, residential: 0.55
    };
    this.densityScores = { high: 0.9, medium: 0.6, low: 0.3 };
    this.trafficScores = { high: 0.9, medium: 0.6, low: 0.3 };
  }

  predict(incident) {
    const severity = (incident.severity || 5) / 10;
    const locationScore = this.locationScores[incident.location_type] || 0.5;
    const densityScore = this.densityScores[incident.population_density] || 0.5;
    const hour = new Date().getHours();
    const timeScore = (hour >= 6 && hour <= 22) ? 0.8 : 0.5;
    const trafficScore = this.trafficScores[incident.traffic_level || 'medium'] || 0.6;

    const priorityScore = (
      severity * 0.35 +
      locationScore * 0.25 +
      densityScore * 0.20 +
      timeScore * 0.10 +
      trafficScore * 0.10
    ) * 100;

    return Math.min(100, Math.max(1, Math.round(priorityScore)));
  }

  getRecommendedActions(priority) {
    if (priority >= 90) return ['Immediate dispatch', 'Alert all units', 'Notify hospitals', 'Traffic control'];
    if (priority >= 70) return ['Priority dispatch', 'Alert nearby units', 'Prepare resources'];
    if (priority >= 50) return ['Standard response', 'Assign available unit'];
    return ['Monitor situation', 'Log incident'];
  }
}

class SmartResourceCoordinator {
  constructor() {
    const trainer = new MLTrainer();
    this.benchmarks = trainer.trainResourceModel();
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  coordinateResources(incident, resources) {
    const available = resources.filter(r => r.status === 'available');
    
    const scored = available.map(resource => {
      const distance = this.calculateDistance(
        incident.latitude, incident.longitude,
        resource.latitude, resource.longitude
      );
      
      const distanceScore = Math.max(0, 1 - (distance / 10));
      const availabilityScore = 1.0;
      const equipmentScore = this.getEquipmentMatch(incident.incident_type, resource.resource_type);
      const trafficScore = 0.7;
      
      const coordinationScore = (
        distanceScore * 0.35 +
        availabilityScore * 0.25 +
        equipmentScore * 0.25 +
        trafficScore * 0.15
      ) * 100;

      const eta = Math.round((distance / 40) * 60);

      return {
        ...resource,
        distance: distance.toFixed(2),
        eta_minutes: eta,
        coordination_score: Math.round(coordinationScore),
        recommendation: coordinationScore > 80 ? 'Highly Recommended' : 
                       coordinationScore > 60 ? 'Recommended' : 'Available'
      };
    });

    return scored.sort((a, b) => b.coordination_score - a.coordination_score);
  }

  getEquipmentMatch(incidentType, resourceType) {
    const matches = {
      accident: { ambulance: 1.0, police: 0.8, rescue_team: 0.7, fire_truck: 0.3 },
      fire: { fire_truck: 1.0, rescue_team: 0.8, ambulance: 0.6, police: 0.4 },
      medical: { ambulance: 1.0, rescue_team: 0.6, police: 0.3, fire_truck: 0.2 },
      infrastructure: { rescue_team: 1.0, police: 0.7, fire_truck: 0.5, ambulance: 0.3 },
      crowd: { police: 1.0, rescue_team: 0.7, ambulance: 0.5, fire_truck: 0.2 }
    };
    return matches[incidentType]?.[resourceType] || 0.5;
  }

  generateCoordinationPlan(incident, topResources) {
    return {
      incident_id: incident.id,
      priority: incident.priority_score,
      recommended_resources: topResources.slice(0, 3),
      estimated_total_response_time: Math.min(...topResources.map(r => r.eta_minutes)),
      coordination_strategy: this.getStrategy(incident.priority_score),
      backup_resources: topResources.slice(3, 5)
    };
  }

  getStrategy(priority) {
    if (priority >= 90) return 'Multi-unit immediate response with traffic priority';
    if (priority >= 70) return 'Priority response with backup unit on standby';
    if (priority >= 50) return 'Standard response with monitoring';
    return 'Single unit response with situation assessment';
  }
}

class RiskPredictor {
  predictRisk(location, hour, historicalIncidents, weather, trafficLevel) {
    let riskScore = 0;
    
    if (trafficLevel === 'high') riskScore += 30;
    else if (trafficLevel === 'medium') riskScore += 15;
    
    if (weather === 'rain' || weather === 'fog') riskScore += 20;
    
    const histScore = Math.min(historicalIncidents / 30, 1) * 40;
    riskScore += histScore;
    
    if (hour >= 17 && hour <= 20) riskScore += 10;
    
    return Math.min(100, Math.round(riskScore));
  }

  calculateSafetyScore(areaData) {
    const { incidents, population, area_km2 } = areaData;
    const incidentRate = incidents / (population / 1000);
    const densityFactor = population / area_km2;
    
    let safetyScore = 100 - (incidentRate * 10) - (densityFactor * 0.01);
    return Math.max(0, Math.min(100, Math.round(safetyScore)));
  }
}

class NLPAnalyzer {
  analyzeText(text) {
    const urgentKeywords = ['urgent', 'emergency', 'critical', 'severe', 'major', 'fire', 'accident', 'injured', 'death'];
    const tokens = text.toLowerCase().split(/\s+/);
    let urgencyScore = 0;
    
    tokens.forEach(token => {
      if (urgentKeywords.some(keyword => token.includes(keyword))) urgencyScore += 10;
    });
    
    return {
      urgencyScore: Math.min(100, urgencyScore),
      sentiment: urgencyScore > 20 ? 'urgent' : 'normal'
    };
  }

  summarizeIncident(description) {
    const sentences = description.split(/[.!?]+/);
    return sentences[0].trim() + (sentences.length > 1 ? '...' : '');
  }
}

module.exports = { 
  SmartPriorityModel, 
  SmartResourceCoordinator, 
  RiskPredictor, 
  NLPAnalyzer,
  MLTrainer
};
