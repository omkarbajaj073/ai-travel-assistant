# Travel Agent - Pages Frontend

This directory contains the static frontend for the Travel Agent application, deployed on Cloudflare Pages.

## Structure

- `index.html` - Main chat interface
- `preferences.html` - User preferences page
- `itinerary.html` - Itinerary view
- `calendar.html` - Calendar view
- `assets/css/styles.css` - Shared styles
- `js/` - JavaScript modules
  - `config.js` - API configuration
  - `api.js` - API client functions
  - `chat.js` - Chat functionality
  - `preferences.js` - Preferences management
  - `itinerary.js` - Itinerary rendering
  - `calendar.js` - Calendar rendering
  - `geolocation.js` - Location helpers

## Deployment

1. Connect this repository to Cloudflare Pages
2. Set the build directory to `pages/` (or deploy from root with `pages/` as output)
3. Configure environment variables if needed (none required currently)
4. Set the Worker URL in `js/config.js` (or update API_BASE for production)

## API Configuration

The frontend communicates with the Worker backend. Update `js/config.js` with your Worker URL:

- Local dev: `http://localhost:8787`
- Production: Your Worker URL (e.g., `https://your-worker.your-subdomain.workers.dev`)

