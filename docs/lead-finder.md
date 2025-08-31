# Lead Finder Documentation

## Overview

The Lead Finder is a new feature that allows users to discover businesses and find contact emails for lead generation. It integrates with Google Places API for business discovery and ZeroBounce API for email finding.

## Features

- **Business Search**: Search for businesses by category and location
- **Email Discovery**: Find contact emails for discovered businesses
- **Export Functionality**: Export leads to CSV or JSON format
- **Accessibility Reports**: Generate accessibility reports for lead websites
- **Search History**: Track previous searches

## Architecture

### Frontend Components
```
/app/src/containers/LeadFinder/
├── LeadFinder.tsx              # Main container
├── types.ts                    # TypeScript types
├── components/
│   ├── SearchBar.tsx          # Search interface
│   ├── LeadTable.tsx          # Results display
│   └── ExportButton.tsx       # Export functionality
```

### Backend Services
```
/api/services/leadFinder/
├── leadFinder.service.ts       # Main service
├── googlePlaces.service.ts     # Google Places integration
└── zerobounce.service.ts       # ZeroBounce integration
```

### GraphQL
```
/api/graphql/
├── schemas/leadFinder.schema.ts    # GraphQL schema
└── resolvers/leadFinder.resolver.ts # GraphQL resolvers
```

## API Integrations

### Google Places API

**Purpose**: Business discovery and information retrieval

**Required Scopes**:
- Places API (Text Search)
- Places API (Place Details)

**Usage**:
- Text search for businesses by category + location
- Retrieve detailed business information
- Get business contact details

**Rate Limits**: 
- Free tier: 150,000 requests/month
- Consider implementing caching

### ZeroBounce API

**Purpose**: Email discovery and verification

**Features**:
- Find emails by person name + domain
- Find generic business emails
- Email verification and confidence scoring

**Endpoints Used**:
- `/v2/email-finder` - Find specific person emails
- `/v2/validate` - Validate email addresses
- `/v2/getcredits` - Check remaining credits

**Rate Limits**: Based on your subscription plan

## Database Schema

### Leads Table
```sql
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  organization_id INTEGER REFERENCES organizations(id),
  google_place_id VARCHAR(255) UNIQUE,
  business_name VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  address TEXT,
  phone VARCHAR(50),
  category VARCHAR(255),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  emails JSONB DEFAULT '[]'::jsonb,
  source VARCHAR(50) DEFAULT 'google_places',
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Search History Table
```sql
CREATE TABLE lead_searches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  organization_id INTEGER REFERENCES organizations(id),
  search_category VARCHAR(255),
  search_location VARCHAR(255),
  search_radius INTEGER DEFAULT 5000,
  search_query TEXT,
  results_count INTEGER DEFAULT 0,
  results_data JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Environment Variables

Add these to your `.env` file:

```bash
# Lead Finder API Keys
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
ZEROBOUNCE_API_KEY=your_zerobounce_api_key_here

# Lead Finder Configuration
LEAD_FINDER_DEFAULT_RADIUS=5000
LEAD_FINDER_MAX_RESULTS=50
LEAD_FINDER_RATE_LIMIT_DELAY=1000
```

## Setup Instructions

### 1. Get API Keys

**Google Places API**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Places API
3. Create credentials (API key)
4. Restrict API key to Places API only

**ZeroBounce API**:
1. Sign up at [ZeroBounce](https://www.zerobounce.net/)
2. Get your API key from the dashboard
3. Note: Free tier includes limited credits

### 2. Database Migration

Run the database migration:
```bash
# Apply the migration
psql -d your_database -f api/migrations/create_leads_tables.sql
```

### 3. GraphQL Integration

Add the new schema and resolvers to your GraphQL server:

```typescript
// In your main GraphQL setup file
import { leadFinderTypeDefs } from './graphql/schemas/leadFinder.schema';
import { leadFinderResolvers } from './graphql/resolvers/leadFinder.resolver';

// Merge with existing typeDefs and resolvers
const typeDefs = [
  // ... existing typeDefs
  leadFinderTypeDefs
];

const resolvers = {
  // ... existing resolvers
  ...leadFinderResolvers
};
```

## Usage

### Searching for Leads

1. Navigate to `/lead-finder`
2. Enter business category (e.g., "restaurants")
3. Enter location (e.g., "San Francisco, CA")
4. Select search radius
5. Click "Search Businesses"

### Finding Emails

1. From search results, click "Get Email" button
2. System will attempt to find emails using ZeroBounce
3. Found emails display with confidence scores
4. Support for both personal and generic emails

### Generating Reports

1. Click "Generate Report" button for any lead
2. System will create accessibility report for the business website
3. Report opens in new tab using existing scanner

### Exporting Data

1. Select leads using checkboxes
2. Click "Export CSV" or "Export JSON"
3. File downloads with lead data and emails

## Cost Considerations

### Google Places API
- Free tier: 150,000 requests/month
- After free tier: $17 per 1,000 requests
- Each search uses 1 request + 1 per business for details

### ZeroBounce API
- Pricing starts at $15 for 2,000 credits
- Email finder: 1 credit per email found
- Email validation: 1 credit per validation

## Future Enhancements

### Credit System Integration
- Track API usage per user
- Implement credit-based billing ($0.25 per email)
- 25 free credits on signup
- $10 minimum reload

### Additional Features
- CRM integration (Salesforce, HubSpot)
- Email campaign builder
- Lead scoring algorithms
- Bulk operations optimization
- Advanced filtering options

## Error Handling

### Common Errors

**Google Places API**:
- `OVER_QUERY_LIMIT`: API quota exceeded
- `REQUEST_DENIED`: Invalid API key
- `ZERO_RESULTS`: No businesses found

**ZeroBounce API**:
- `Invalid API Key`: Check environment variable
- `Insufficient Credits`: Need to purchase more credits
- `Rate Limit Exceeded`: Implement delays between requests

### Monitoring

Monitor the following metrics:
- API usage and costs
- Success rate of email discovery
- User engagement with lead finder
- Conversion from leads to customers

## Security

- Store API keys securely in environment variables
- Implement rate limiting to prevent abuse
- Log API usage for billing and monitoring
- Validate all user inputs
- Implement proper authentication for all endpoints

## Testing

### Unit Tests
- Test API service methods
- Test GraphQL resolvers
- Test React components

### Integration Tests
- Test complete search flow
- Test email discovery flow
- Test export functionality

### API Testing
- Test with real API keys in staging
- Verify rate limiting works
- Test error handling scenarios

## Support

For issues with:
- **Google Places API**: Check [Google Places Documentation](https://developers.google.com/maps/documentation/places/web-service)
- **ZeroBounce API**: Check [ZeroBounce Documentation](https://www.zerobounce.net/docs/)
- **Feature Bugs**: Create issue in project repository