const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeIncidentWithAI(description, location) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `Analyze this emergency incident and provide:
1. Incident type classification
2. Severity level (1-10)
3. Recommended response actions
4. Estimated resources needed

Incident: ${description}
Location: ${location}

Provide response in JSON format.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini AI error:', error);
    return null;
  }
}

async function generateIncidentSummary(incident) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `Create a concise 2-sentence summary of this emergency incident:
Type: ${incident.incident_type}
Description: ${incident.description}
Location: ${incident.location_name}
Severity: ${incident.severity}/10`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini AI error:', error);
    return incident.description.substring(0, 100) + '...';
  }
}

async function predictRiskWithAI(location, historicalData) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `Based on this data, predict risk level (0-100) and provide safety recommendations:
Location: ${location}
Historical incidents: ${historicalData}

Provide brief analysis.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini AI error:', error);
    return null;
  }
}

async function chatWithAI(userMessage, context) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `You are an AI assistant for UrbanRescue emergency management system.
Context: ${JSON.stringify(context)}
User question: ${userMessage}

Provide helpful, concise response about emergency management.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini AI error:', error);
    return 'I apologize, but I am unable to process your request at the moment.';
  }
}

module.exports = {
  analyzeIncidentWithAI,
  generateIncidentSummary,
  predictRiskWithAI,
  chatWithAI
};
