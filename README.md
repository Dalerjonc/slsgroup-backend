# SLS Group Website Backend

## Quote Request API

This backend handles quote requests from the website and emails them to dispatchers.

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your details:

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000

# Email Configuration (Gmail Example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourcompany@gmail.com
SMTP_PASS=your-app-password-here
SMTP_FROM=noreply@slsgroupww.com

# Dispatcher Emails (comma-separated for multiple recipients)
DISPATCHER_EMAILS=dispatcher1@slsgroupww.com,dispatcher2@slsgroupww.com
```

### 3. Gmail App Password Setup

If using Gmail:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification (if not already enabled)
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Generate a new app password for "Mail"
5. Copy the 16-character password to `SMTP_PASS` in `.env`

**Never use your regular Gmail password!**

### 4. Alternative Email Providers

#### Microsoft 365 / Outlook
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=yourcompany@outlook.com
SMTP_PASS=your-password
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.com
SMTP_PASS=your-mailgun-password
```

## Running the Server

### Development (with auto-restart)
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### POST `/api/quote-request`

Submit a new quote request.

**Request Body:**
```json
{
  "pickup": "Los Angeles, CA",
  "delivery": "New York, NY",
  "weight": "45000",
  "loadType": "dry-van",
  "contactName": "John Doe",
  "contactEmail": "john@company.com",
  "contactPhone": "(555) 123-4567"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Quote request submitted successfully"
}
```

**Response (Error):**
```json
{
  "error": "Failed to submit quote request"
}
```

### GET `/api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-03-24T10:30:00.000Z"
}
```

## Testing

Test the API with curl:

```bash
curl -X POST http://localhost:5000/api/quote-request \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": "Chicago, IL",
    "delivery": "Dallas, TX",
    "weight": "42000",
    "loadType": "reefer",
    "contactName": "Test User",
    "contactEmail": "test@example.com"
  }'
```

## Frontend Integration

Update your frontend `.env`:

```env
VITE_API_URL=http://localhost:5000
```

For production:
```env
VITE_API_URL=https://your-api-domain.com
```

## Deployment

### Option 1: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
cd backend
railway init
railway up
```

Add environment variables in Railway dashboard.

### Option 2: Render

1. Create a new Web Service
2. Connect your GitHub repo
3. Set build command: `cd backend && npm install`
4. Set start command: `cd backend && npm start`
5. Add environment variables

### Option 3: Heroku

```bash
heroku create slsgroup-api
heroku config:set SMTP_USER=yourmail@gmail.com
heroku config:set SMTP_PASS=your-app-password
heroku config:set DISPATCHER_EMAILS=dispatcher@slsgroupww.com
git subtree push --prefix backend heroku main
```

## Security Checklist

- [ ] Never commit `.env` file
- [ ] Use app-specific passwords (not main account password)
- [ ] Enable CORS only for your domain in production
- [ ] Use HTTPS in production
- [ ] Rate limit the quote endpoint (add `express-rate-limit`)
- [ ] Validate and sanitize all inputs
- [ ] Monitor email sending quotas

## Troubleshooting

### "Invalid login" error
- Check SMTP credentials
- Ensure 2FA is enabled (for Gmail)
- Use app password, not regular password
- Check if "Less secure app access" is needed (older accounts)

### Emails not arriving
- Check spam folder
- Verify dispatcher email addresses
- Check SMTP logs in console
- Test SMTP connection with telnet

### Port already in use
```bash
# Find process using port 5000
lsof -ti:5000

# Kill the process
kill -9 $(lsof -ti:5000)
```

## Future Enhancements

- [ ] Add rate limiting
- [ ] Add request logging
- [ ] Store requests in database
- [ ] Add admin dashboard to view requests
- [ ] Add SMS notifications
- [ ] Implement automatic quote calculation
- [ ] Add request status tracking

## Support

For issues or questions, contact the development team.
