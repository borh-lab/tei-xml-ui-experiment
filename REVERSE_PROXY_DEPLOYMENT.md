# Reverse Proxy Deployment Guide

This guide explains how to deploy the TEI XML Editor under a reverse proxy with a subpath like `https://nlp.lang.osaka-u.ac.jp/dhlab-experiment-ui`.

## Overview

When deploying under a reverse proxy with a subpath, Next.js needs to be configured to:
- Serve all assets from the base path (e.g., `/dhlab-experiment-ui/`)
- Handle routing correctly with the base path prefix
- Ensure API routes and static assets work properly

## Quick Start (Recommended)

**The application is already configured for reverse proxy deployment!** The `basePath` is set via environment variable.

### Build for your reverse proxy path:

```bash
npm run build:proxy
```

This builds with `NEXT_PUBLIC_BASE_PATH=/dhlab-experiment-ui` automatically.

### For different paths:

```bash
# Custom path
NEXT_PUBLIC_BASE_PATH=/your-path npm run build

# Root deployment (no subpath)
npm run build
```

## How It Works

The `next.config.ts` is already configured to use the environment variable:

```typescript
basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
```

This means you can build for different deployment paths without changing code!

## Step 2: Reverse Proxy Configuration

### Nginx Configuration

Example nginx configuration for proxying to the Next.js application:

```nginx
location /dhlab-experiment-ui {
    # Proxy to Next.js dev server (for development)
    proxy_pass http://localhost:3000;
    # Or proxy to Next.js production server
    # proxy_pass http://localhost:3001;

    # Required headers
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Timeout settings
    proxy_read_timeout 86400;
    proxy_connect_timeout 86400;

    # WebSocket support (for Next.js hot reload in dev mode)
    proxy_cache_bypass $http_upgrade;

    # Remove basePath from incoming requests (Next.js expects requests without basePath)
    # Note: When basePath is set, Next.js automatically handles the prefix
    rewrite ^/dhlab-experiment-ui/(.*) /$1 break;
    proxy_pass http://localhost:3000;
}

# Serve static files directly (optional, for better performance)
location /dhlab-experiment-ui/_next {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

### Apache Configuration

Example Apache configuration:

```apache
<Proxy *>
    Order allow,deny
    Allow from all
</Proxy>

ProxyRequests Off
ProxyPreserveHost On

# Proxy to Next.js server
ProxyPass /dhlab-experiment-ui http://localhost:3000
ProxyPassReverse /dhlab-experiment-ui http://localhost:3000

# Enable WebSocket support
ProxyPass /dhlab-experiment-ui/_next/next/ws ws://localhost:3000/_next/next/ws
```

## Step 3: Deploy and Test

### Development Mode (for testing)

1. Start the Next.js dev server:
   ```bash
   npm run dev
   ```

2. Test through the reverse proxy:
   ```bash
   curl https://nlp.lang.osaka-u.ac.jp/dhlab-experiment-ui/
   ```

3. Check browser console for any 404 errors on assets

### Production Mode

1. Build the application for your reverse proxy path:
   ```bash
   npm run build:proxy
   ```

2. Start the production server:
   ```bash
   npm start
   ```

3. The production server runs on port 3000 by default

4. Your reverse proxy should forward requests to port 3000

### Using PM2 (Recommended for Production)

Install PM2:
```bash
npm install -g pm2
```

Start the application with PM2:
```bash
pm2 start npm --name "tei-xml-editor" -- start
pm2 save
pm2 startup
```

## Step 4: Verify Deployment

Checklist:

- [ ] Homepage loads at `https://nlp.lang.osaka-u.ac.jp/dhlab-experiment-ui/`
- [ ] Static assets load without 404 errors (check browser DevTools Network tab)
- [ ] Navigation between pages works correctly
- [ ] File upload functionality works
- [ ] API routes (if any) respond correctly
- [ ] No console errors in browser DevTools

## Troubleshooting

### Issue: Assets returning 404

**Symptoms:** CSS, JS, or images fail to load

**Solution:**
1. Verify `NEXT_PUBLIC_BASE_PATH` environment variable is set when building
2. Check that the reverse proxy is forwarding requests correctly
3. Ensure the application was rebuilt with the correct basePath: `npm run build:proxy`

### Issue: Routes not working

**Symptoms:** Clicking links or navigation causes 404 errors

**Solution:**
1. Verify `NEXT_PUBLIC_BASE_PATH` is set correctly (e.g., `/dhlab-experiment-ui`)
2. Check nginx rewrite rules are not stripping the path incorrectly
3. Ensure the app was built with: `npm run build:proxy`

### Issue: API routes returning 404

**Symptoms:** API endpoints fail to respond

**Solution:**
1. API routes should be accessed via: `https://nlp.lang.osaka-u.ac.jp/dhlab-experiment-ui/api/...`
2. Check that Next.js API routes are properly prefixed with `basePath`
3. Verify reverse proxy is forwarding API requests

### Issue: WebSocket/Hot Module Replacement fails

**Symptoms:** Live reload doesn't work in development

**Solution:**
1. Ensure nginx `proxy_set_header Upgrade $http_upgrade` is configured
2. Add `proxy_cache_bypass $http_upgrade;` to nginx config
3. Check WebSocket support is enabled in reverse proxy

## Alternative: Static Export

If you prefer a static deployment (no Node.js server needed), you can use static export:

1. Update `next.config.ts`:
   ```typescript
   const nextConfig: NextConfig = {
     basePath: '/dhlab-experiment-ui',
     output: 'export',  // Enable static export
     images: {
       unoptimized: true,  // Required for static export
     },
   };
   ```

2. Build and export:
   ```bash
   npm run build
   ```

3. The static files will be in the `out` directory

4. Configure nginx to serve the static files:
   ```nginx
   location /dhlab-experiment-ui {
       alias /path/to/out;
       try_files $uri $uri.html $uri/ =404;
   }
   ```

**Note:** Static export has limitations (no API routes, no server-side features, no revalidation).

## Environment Variables

If your application uses environment variables, ensure they are set in the production environment:

```bash
# Create .env.production
OPENAI_API_KEY=your-key-here
ANTHROPIC_API_KEY=your-key-here
```

## Performance Optimization

For production deployment:

1. **Enable gzip compression** in nginx:
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
   ```

2. **Set up caching** for static assets:
   ```nginx
   location /dhlab-experiment-ui/_next/static {
       expires 365d;
       add_header Cache-Control "public, immutable";
   }
   ```

3. **Monitor server resources** and adjust PM2 settings if needed:
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'tei-xml-editor',
       script: 'npm',
       args: 'start',
       instances: 2,  // Use 2 instances
       exec_mode: 'cluster',
       max_memory_restart: '1G',
     }]
   };
   ```

## Security Considerations

1. **Restrict access** to the Next.js dev server port (3000) - only allow localhost
2. **Use HTTPS** in production
3. **Set up CORS** headers if needed
4. **Implement rate limiting** in nginx if the application is public
5. **Keep dependencies updated**: `npm audit fix`

## Monitoring and Logging

- **PM2 Logs:** `pm2 logs tei-xml-editor`
- **Nginx Logs:** `/var/log/nginx/access.log` and `/var/log/nginx/error.log`
- **Application Logs:** Check console output or configure a logging service

## Support

For issues specific to reverse proxy deployment:
- Check Next.js documentation: https://nextjs.org/docs/app/api-reference/next-config-js/basePath
- Nginx proxy documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Project issues: [GitHub Issues]
