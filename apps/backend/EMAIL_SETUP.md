# Email Setup Guide

## Quick Setup for Gmail (Development/Testing)

### Step 1: Configure Gmail App Password

1. **Go to your Gmail account**
2. **Enable 2-Factor Authentication**:
   - Go to Google Account settings
   - Security → 2-Step Verification
   - Follow the setup process

3. **Generate App Password**:
   - In Security → 2-Step Verification
   - Click "App passwords"
   - Select "Mail" and "Other (Custom name)"
   - Enter "Restaurant Management" as the name
   - Copy the 16-character password (format: xxxx-xxxx-xxxx-xxxx)

### Step 2: Configure Environment Variables

1. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file** with your Gmail credentials:
   ```env
   # Email Configuration
   EMAIL_SERVICE=gmail
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
   EMAIL_FROM=your-email@gmail.com
   EMAIL_FROM_NAME=Restaurant Management
   
   # Frontend URL
   FRONTEND_URL=http://localhost:5173
   
   # Other existing variables...
   MONGO_URL=mongodb://localhost:27017/restaurant
   JWT_SECRET=your-secret-key-change-in-production
   NODE_ENV=development
   ```

### Step 3: Test Email Functionality

1. **Run the test script**:
   ```bash
   npx tsx src/utils/testEmail.ts
   ```

2. **Test password reset**:
   - Go to your frontend
   - Click "Forgot Password?"
   - Enter your email address
   - Check your email inbox for the reset link

## Production Setup (SendGrid)

### Step 1: Create SendGrid Account

1. **Sign up at sendgrid.com** (free tier: 100 emails/day)
2. **Verify your sender email address**
3. **Create API Key**:
   - Go to Settings → API Keys
   - Create API Key with "Full Access"
   - Copy the API key (starts with SG.)

### Step 2: Configure Production Environment

**In Render dashboard, add these environment variables**:
```
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.your-api-key-here
EMAIL_FROM=verified-email@yourdomain.com
EMAIL_FROM_NAME=Restaurant Management
FRONTEND_URL=https://your-frontend-domain.com
```

## Troubleshooting

### Gmail Issues
- **"Invalid login"**: Check if 2FA is enabled and app password is correct
- **"Less secure app"**: Use App Password instead of regular password
- **"Authentication failed"**: Verify GMAIL_USER and GMAIL_APP_PASSWORD

### SendGrid Issues
- **"Unauthorized"**: Check SENDGRID_API_KEY is correct
- **"Forbidden"**: Verify sender email address is verified in SendGrid
- **"Invalid email"**: Check EMAIL_FROM format

### General Issues
- **"Email service not configured"**: Check EMAIL_SERVICE is set to 'gmail' or 'sendgrid'
- **"Frontend URL not set"**: Check FRONTEND_URL is configured correctly
- **"Token not working"**: Verify FRONTEND_URL matches your actual frontend URL

## Testing

### Manual Testing
1. Start your backend server
2. Go to frontend password reset page
3. Enter a valid email address
4. Check email inbox for reset link
5. Click the link and test password update

### Automated Testing
```bash
# Test email configuration
npx tsx src/utils/testEmail.ts

# Test password reset flow
npx tsx src/utils/testLoginFlow.ts
```

## Security Notes

- **Never commit `.env` file** to version control
- **Use different credentials** for development and production
- **Rotate API keys** regularly in production
- **Monitor email usage** to avoid hitting limits
- **Use HTTPS** for production frontend URLs
