# Environment Variables Setup Guide

This guide explains where to set environment variables when your frontend and backend are deployed on different platforms.

## Important: Backend vs Frontend Variables

**Backend Environment Variables** (set these in your **backend** deployment platform):
- `SUPER_ADMIN_EMAIL` - Super admin email address
- `SUPER_ADMIN_PASSWORD` - Super admin password (optional, auto-generated if not set)
- `MONGO_URL` - MongoDB connection string
- `JWT_SECRET` - JWT secret key
- `PORT` - Server port (usually auto-set by platform)
- `NODE_ENV` - Environment (development/production)
- Email configuration variables (see EMAIL_SETUP.md)

**Frontend Environment Variables** (set these in your **frontend** deployment platform):
- `VITE_GRAPHQL_URI` - Backend GraphQL endpoint URL

---

## Common Backend Hosting Platforms

### 1. **Render** (render.com)

1. Go to your **backend service** dashboard
2. Navigate to **Environment** tab
3. Click **Add Environment Variable**
4. Add:
   ```
   SUPER_ADMIN_EMAIL=admin@yourcompany.com
   SUPER_ADMIN_PASSWORD=YourSecurePassword123!
   ```
5. Click **Save Changes** - service will automatically redeploy

**Note**: Render shows environment variables in the dashboard. Make sure `SUPER_ADMIN_PASSWORD` is marked as "Secret" if available.

---

### 2. **Railway** (railway.app)

1. Go to your **backend project**
2. Click on your **backend service**
3. Go to **Variables** tab
4. Click **+ New Variable**
5. Add:
   ```
   SUPER_ADMIN_EMAIL=admin@yourcompany.com
   SUPER_ADMIN_PASSWORD=YourSecurePassword123!
   ```
6. Railway will automatically redeploy

---

### 3. **Heroku** (heroku.com)

**Via Dashboard:**
1. Go to your **backend app** dashboard
2. Click **Settings** tab
3. Click **Reveal Config Vars**
4. Click **Add** and add:
   ```
   SUPER_ADMIN_EMAIL=admin@yourcompany.com
   SUPER_ADMIN_PASSWORD=YourSecurePassword123!
   ```
5. App will automatically restart

**Via CLI:**
```bash
heroku config:set SUPER_ADMIN_EMAIL=admin@yourcompany.com --app your-backend-app
heroku config:set SUPER_ADMIN_PASSWORD=YourSecurePassword123! --app your-backend-app
```

---

### 4. **AWS (Elastic Beanstalk / EC2 / ECS)**

**Elastic Beanstalk:**
1. Go to **Configuration** → **Software** → **Environment properties**
2. Add:
   ```
   SUPER_ADMIN_EMAIL=admin@yourcompany.com
   SUPER_ADMIN_PASSWORD=YourSecurePassword123!
   ```
3. Click **Apply**

**EC2 / ECS:**
- Set in your `.env` file or use AWS Systems Manager Parameter Store
- For ECS: Set in task definition environment variables
- For EC2: Use `.env` file or export in startup script

---

### 5. **DigitalOcean App Platform**

1. Go to your **backend app**
2. Click **Settings** → **App-Level Environment Variables**
3. Click **Edit** or **Add Variable**
4. Add:
   ```
   SUPER_ADMIN_EMAIL=admin@yourcompany.com
   SUPER_ADMIN_PASSWORD=YourSecurePassword123!
   ```
5. Click **Save** - app will redeploy

---

### 6. **Google Cloud Platform (Cloud Run / App Engine)**

**Cloud Run:**
1. Go to **Cloud Run** → Select your service
2. Click **Edit & Deploy New Revision**
3. Go to **Variables & Secrets** tab
4. Click **Add Variable**
5. Add:
   ```
   SUPER_ADMIN_EMAIL=admin@yourcompany.com
   SUPER_ADMIN_PASSWORD=YourSecurePassword123!
   ```
6. Click **Deploy**

**App Engine:**
- Add to `app.yaml`:
  ```yaml
  env_variables:
    SUPER_ADMIN_EMAIL: 'admin@yourcompany.com'
    SUPER_ADMIN_PASSWORD: 'YourSecurePassword123!'
  ```

---

### 7. **Azure (App Service)**

1. Go to your **App Service**
2. Navigate to **Configuration** → **Application settings**
3. Click **+ New application setting**
4. Add:
   ```
   Name: SUPER_ADMIN_EMAIL
   Value: admin@yourcompany.com
   ```
5. Repeat for `SUPER_ADMIN_PASSWORD`
6. Click **Save** - app will restart

---

### 8. **Fly.io**

**Via CLI:**
```bash
fly secrets set SUPER_ADMIN_EMAIL=admin@yourcompany.com -a your-backend-app
fly secrets set SUPER_ADMIN_PASSWORD=YourSecurePassword123! -a your-backend-app
```

**Via Dashboard:**
1. Go to your app dashboard
2. Click **Secrets** tab
3. Add secrets:
   ```
   SUPER_ADMIN_EMAIL=admin@yourcompany.com
   SUPER_ADMIN_PASSWORD=YourSecurePassword123!
   ```

---

### 9. **Docker / Docker Compose**

**docker-compose.yml:**
```yaml
services:
  backend:
    environment:
      - SUPER_ADMIN_EMAIL=admin@yourcompany.com
      - SUPER_ADMIN_PASSWORD=YourSecurePassword123!
```

**Or use `.env` file:**
```env
SUPER_ADMIN_EMAIL=admin@yourcompany.com
SUPER_ADMIN_PASSWORD=YourSecurePassword123!
```

Then reference in docker-compose.yml:
```yaml
services:
  backend:
    env_file:
      - .env
```

---

## Security Best Practices

1. **Never commit passwords to git** - Always use environment variables
2. **Use strong passwords** - Minimum 16 characters, mix of letters, numbers, symbols
3. **Rotate passwords regularly** - Especially in production
4. **Use different passwords** for development and production
5. **Mark as secret** - If your platform supports marking variables as "secret" or "sensitive", do so

---

## Testing After Setup

After setting environment variables:

1. **Redeploy your backend** (most platforms do this automatically)
2. **Check backend logs** for:
   ```
   ✅ Super admin created
   ✅ Super admin password set from SUPER_ADMIN_PASSWORD environment variable
   ```
3. **Test login** with the credentials you set

---

## Troubleshooting

### Password not working?
- Check that `SUPER_ADMIN_PASSWORD` is set correctly (no extra spaces)
- Verify the backend service restarted after setting variables
- Check backend logs for any errors

### Auto-generated password shown?
- This means `SUPER_ADMIN_PASSWORD` is not set
- Check your platform's environment variable configuration
- Ensure variable name is exactly `SUPER_ADMIN_PASSWORD` (case-sensitive)

### Variables not being read?
- Some platforms require a restart/redeploy after setting variables
- Check platform-specific documentation
- Verify variable names match exactly (case-sensitive)

---

## Quick Reference

**Required Backend Variables:**
- `MONGO_URL` - MongoDB connection string
- `JWT_SECRET` - JWT secret key

**Optional Backend Variables:**
- `SUPER_ADMIN_EMAIL` - Defaults to `admin@platform.com`
- `SUPER_ADMIN_PASSWORD` - Auto-generated if not set
- `PORT` - Usually auto-set by platform
- `NODE_ENV` - Set to `production` in production

**Frontend Variables (set in frontend platform):**
- `VITE_GRAPHQL_URI` - Your backend GraphQL URL (e.g., `https://api.yourdomain.com/graphql`)

