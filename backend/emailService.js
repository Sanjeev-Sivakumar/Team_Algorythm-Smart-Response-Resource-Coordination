const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD
  }
});

async function sendIncidentAlert(incident, recipients) {
  const mailOptions = {
    from: process.env.EMAIL_ADDRESS,
    to: recipients.join(','),
    subject: `🚨 URGENT: ${incident.incident_type.toUpperCase()} - Priority ${incident.priority_score}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
          <h1>🚨 UrbanRescue AI Alert</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #e74c3c;">New Emergency Incident</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Type:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${incident.incident_type.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Location:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${incident.location_name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Priority:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><span style="background: #e74c3c; color: white; padding: 5px 10px; border-radius: 5px;">${incident.priority_score}/100</span></td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Severity:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${incident.severity}/10</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Description:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">${incident.description}</td>
            </tr>
            <tr>
              <td style="padding: 10px;"><strong>Time:</strong></td>
              <td style="padding: 10px;">${new Date(incident.created_at).toLocaleString()}</td>
            </tr>
          </table>
          <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107;">
            <strong>⚠️ Action Required:</strong> Please respond immediately to this incident.
          </div>
        </div>
        <div style="background: #2c3e50; color: white; padding: 15px; text-align: center; font-size: 12px;">
          UrbanRescue AI - Emergency Management System
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
}

async function sendWelcomeEmail(user) {
  const mailOptions = {
    from: process.env.EMAIL_ADDRESS,
    to: user.email,
    subject: '🎉 Welcome to UrbanRescue AI',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1>🚨 Welcome to UrbanRescue AI</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Hello ${user.full_name}!</h2>
          <p>Your account has been successfully created.</p>
          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Username:</strong> ${user.username}</p>
            <p><strong>Role:</strong> ${user.role.toUpperCase()}</p>
            <p><strong>Email:</strong> ${user.email}</p>
          </div>
          <p>You can now login to the UrbanRescue AI platform and start managing emergency incidents.</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Welcome email error:', error);
  }
}

module.exports = { sendIncidentAlert, sendWelcomeEmail };
