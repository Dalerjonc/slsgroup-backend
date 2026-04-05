const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());

// Data directory for dispatch board
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'SLS Group API Server' });
});

// Quote request endpoint
app.post('/api/quote-request', async (req, res) => {
  try {
    const { pickup, delivery, weight, loadType, contactName, contactEmail, contactPhone } = req.body;

    // Validate required fields
    if (!pickup || !delivery || !weight || !loadType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Load type labels
    const loadTypeLabels = {
      'dry-van': 'Dry Van',
      'reefer': 'Reefer',
      'flatbed': 'Flatbed',
      'step-deck': 'Step Deck',
      'power-only': 'Power Only'
    };

    // Email content
    const emailSubject = `New Quote Request - ${pickup} to ${delivery}`;
    const emailBody = `
      <h2>New Quote Request from SLS Group Website</h2>
      <p><strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EDT</p>
      
      <h3>Load Details:</h3>
      <ul>
        <li><strong>Pickup Location:</strong> ${pickup}</li>
        <li><strong>Delivery Location:</strong> ${delivery}</li>
        <li><strong>Weight:</strong> ${parseInt(weight).toLocaleString()} lbs</li>
        <li><strong>Load Type:</strong> ${loadTypeLabels[loadType] || loadType}</li>
      </ul>

      ${contactName || contactEmail || contactPhone ? `
      <h3>Contact Information:</h3>
      <ul>
        ${contactName ? `<li><strong>Name:</strong> ${contactName}</li>` : ''}
        ${contactEmail ? `<li><strong>Email:</strong> ${contactEmail}</li>` : ''}
        ${contactPhone ? `<li><strong>Phone:</strong> ${contactPhone}</li>` : ''}
      </ul>
      ` : ''}

      <p><em>Please respond to this quote request within 5 minutes.</em></p>
    `;

    // Dispatcher emails (can be comma-separated in env var)
    const dispatcherEmails = process.env.DISPATCHER_EMAILS?.split(',') || ['dispatch@slsgroupww.com'];

    // Send email
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: dispatcherEmails,
      subject: emailSubject,
      html: emailBody
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
      message: 'Quote request submitted successfully' 
    });

  } catch (error) {
    console.error('Error processing quote request:', error);
    res.status(500).json({ 
      error: 'Failed to submit quote request. Please try again or call us directly.' 
    });
  }
});

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Email content
    const emailSubject = `Contact Form: ${subject}`;
    const emailBody = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EDT</p>
      
      <h3>Contact Details:</h3>
      <ul>
        <li><strong>Name:</strong> ${name}</li>
        <li><strong>Email:</strong> ${email}</li>
        ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
        <li><strong>Subject:</strong> ${subject}</li>
      </ul>

      <h3>Message:</h3>
      <p>${message.replace(/\n/g, '<br>')}</p>

      <hr>
      <p><em>Reply to: ${email}</em></p>
    `;

    // Send to company email
    const companyEmails = process.env.CONTACT_EMAILS?.split(',') || process.env.DISPATCHER_EMAILS?.split(',') || ['info@slsgroupww.com'];

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: companyEmails,
      replyTo: email,
      subject: emailSubject,
      html: emailBody
    };

    await transporter.sendMail(mailOptions);

    // Send confirmation to customer
    const confirmationEmail = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Thank You for Contacting SLS Group Worldwide',
      html: `
        <h2>Thank You for Reaching Out!</h2>
        <p>Hi ${name},</p>
        <p>We've received your message and will get back to you within 24 hours.</p>
        
        <h3>Your Message:</h3>
        <p><strong>Subject:</strong> ${subject}</p>
        <p>${message.replace(/\n/g, '<br>')}</p>

        <hr>
        <p><strong>SLS Group Worldwide</strong><br>
        967 Street Rd, Southampton, PA 18966<br>
        Phone: (484) 966-8888<br>
        Email: info@slsgroupww.com</p>
      `
    };

    await transporter.sendMail(confirmationEmail);

    res.json({ 
      success: true, 
      message: 'Message sent successfully. We\'ll get back to you soon!' 
    });

  } catch (error) {
    console.error('Error processing contact form:', error);
    res.status(500).json({ 
      error: 'Failed to send message. Please try calling us directly at (484) 966-8888.' 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========================================
// DISPATCH BOARD API ENDPOINTS
// ========================================

// Helper functions for file operations
const getDataFilePath = (filename) => path.join(DATA_DIR, filename);

const readJSONFile = (filename, defaultValue = {}) => {
  const filepath = getDataFilePath(filename);
  try {
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
  }
  return defaultValue;
};

const writeJSONFile = (filename, data) => {
  const filepath = getDataFilePath(filename);
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    
    // Auto-backup to GitHub via API (no git required)
    if (process.env.GITHUB_TOKEN) {
      try {
        const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
        const https = require('https');
        
        const options = {
          hostname: 'api.github.com',
          path: `/repos/Dalerjonc/slsgroup-data/contents/${filename}`,
          method: 'PUT',
          headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`,
            'User-Agent': 'SLS-Backend',
            'Content-Type': 'application/json'
          }
        };
        
        // Get current file SHA first
        const getOptions = {
          ...options,
          method: 'GET'
        };
        
        https.get(getOptions, (getRes) => {
          let sha = '';
          if (getRes.statusCode === 200) {
            let body = '';
            getRes.on('data', chunk => body += chunk);
            getRes.on('end', () => {
              try {
                sha = JSON.parse(body).sha;
              } catch (e) {}
              
              // Now update the file
              const req = https.request(options, (res) => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                  console.log(`✓ ${filename} backed up to GitHub`);
                }
              });
              
              req.write(JSON.stringify({
                message: `Auto-save ${filename}`,
                content: content,
                sha: sha || undefined
              }));
              req.end();
            });
          }
        }).on('error', () => {});
        
      } catch (gitError) {
        console.log(`⚠ GitHub backup skipped for ${filename}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    return false;
  }
};

// Get all dispatch data
app.get('/api/dispatch/all', (req, res) => {
  try {
    const trucks = readJSONFile('trucks.json', []);
    const trailers = readJSONFile('trailers.json', []);
    const drivers = readJSONFile('drivers.json', []);
    const weeksData = readJSONFile('weeks-data.json', {});

    res.json({
      success: true,
      data: {
        trucks,
        trailers,
        drivers,
        weeksData
      }
    });
  } catch (error) {
    console.error('Error fetching dispatch data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch data' });
  }
});

// Save trucks
app.post('/api/dispatch/trucks', (req, res) => {
  try {
    const { trucks } = req.body;
    if (!Array.isArray(trucks)) {
      return res.status(400).json({ success: false, error: 'Invalid trucks data' });
    }
    
    const success = writeJSONFile('trucks.json', trucks);
    if (success) {
      res.json({ success: true, message: 'Trucks saved successfully' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save trucks' });
    }
  } catch (error) {
    console.error('Error saving trucks:', error);
    res.status(500).json({ success: false, error: 'Failed to save trucks' });
  }
});

// Save trailers
app.post('/api/dispatch/trailers', (req, res) => {
  try {
    const { trailers } = req.body;
    if (!Array.isArray(trailers)) {
      return res.status(400).json({ success: false, error: 'Invalid trailers data' });
    }
    
    const success = writeJSONFile('trailers.json', trailers);
    if (success) {
      res.json({ success: true, message: 'Trailers saved successfully' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save trailers' });
    }
  } catch (error) {
    console.error('Error saving trailers:', error);
    res.status(500).json({ success: false, error: 'Failed to save trailers' });
  }
});

// Save drivers
app.post('/api/dispatch/drivers', (req, res) => {
  try {
    const { drivers } = req.body;
    if (!Array.isArray(drivers)) {
      return res.status(400).json({ success: false, error: 'Invalid drivers data' });
    }
    
    const success = writeJSONFile('drivers.json', drivers);
    if (success) {
      res.json({ success: true, message: 'Drivers saved successfully' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save drivers' });
    }
  } catch (error) {
    console.error('Error saving drivers:', error);
    res.status(500).json({ success: false, error: 'Failed to save drivers' });
  }
});

// Save weeks data
app.post('/api/dispatch/weeks', (req, res) => {
  try {
    const { weeksData } = req.body;
    if (typeof weeksData !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid weeks data' });
    }
    
    const success = writeJSONFile('weeks-data.json', weeksData);
    if (success) {
      res.json({ success: true, message: 'Weeks data saved successfully' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save weeks data' });
    }
  } catch (error) {
    console.error('Error saving weeks data:', error);
    res.status(500).json({ success: false, error: 'Failed to save weeks data' });
  }
});

// Save all dispatch data at once
app.post('/api/dispatch/save-all', (req, res) => {
  try {
    const { trucks, trailers, drivers, weeksData } = req.body;
    
    let allSuccess = true;
    
    if (trucks && Array.isArray(trucks)) {
      allSuccess = allSuccess && writeJSONFile('trucks.json', trucks);
    }
    if (trailers && Array.isArray(trailers)) {
      allSuccess = allSuccess && writeJSONFile('trailers.json', trailers);
    }
    if (drivers && Array.isArray(drivers)) {
      allSuccess = allSuccess && writeJSONFile('drivers.json', drivers);
    }
    if (weeksData && typeof weeksData === 'object') {
      allSuccess = allSuccess && writeJSONFile('weeks-data.json', weeksData);
    }
    
    if (allSuccess) {
      res.json({ success: true, message: 'All data saved successfully' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save some data' });
    }
  } catch (error) {
    console.error('Error saving all data:', error);
    res.status(500).json({ success: false, error: 'Failed to save data' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ SLS Group API Server running on port ${PORT}`);
  console.log(`📊 Dispatch data directory: ${DATA_DIR}`);
});
