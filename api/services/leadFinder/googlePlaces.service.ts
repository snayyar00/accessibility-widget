import axios from 'axios';
import logger from '../../utils/logger';

export interface GooglePlaceSearchParams {
  category: string;
  location: string;
  radius?: number;
}

export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
  price_level?: number;
  opening_hours?: {
    open_now?: boolean;
    periods?: any[];
    weekday_text?: string[];
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
    html_attributions: string[];
  }>;
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
  editorial_summary?: string;
  google_maps_uri?: string;
  plus_code?: {
    compound_code?: string;
    global_code?: string;
  };
  vicinity?: string;
}

export interface PlaceSearchResult {
  places: GooglePlace[];
  next_page_token?: string;
  status: string;
}

class GooglePlacesService {
  private apiKey: string;
  private baseUrl = 'https://places.googleapis.com/v1/places';

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('Google Places API key not found in environment variables');
    }
  }

  /**
   * Search for businesses using Google Places (New) Text Search
   */
  async searchBusinesses(params: GooglePlaceSearchParams): Promise<PlaceSearchResult> {
    if (!this.apiKey) {
      throw new Error('Google Places API key not configured');
    }

    try {
      const query = `${params.category} in ${params.location}`;
      const maxResults = 20;

      logger.info(`Searching Google Places (New) for: ${query}`);

      const searchUrl = `${this.baseUrl}:searchText`;
      
      const requestBody: any = {
        textQuery: query,
        maxResultCount: maxResults
      };

      // Only add location bias if we have a specific location (not global search)
      if (params.location && !params.location.toLowerCase().includes('global') && !params.location.toLowerCase().includes('worldwide')) {
        // For now, skip location bias as it requires geocoding
        // TODO: Add geocoding service to convert location to coordinates
      }

      const response = await axios.post(searchUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.nationalPhoneNumber,places.types,places.businessStatus,places.rating,places.userRatingCount'
        }
      });

      if (!response.data || !response.data.places) {
        return {
          places: [],
          status: 'ZERO_RESULTS'
        };
      }

      // Convert new API format to our format with enhanced data
      const places = response.data.places.map((place: any) => ({
        place_id: place.id,
        name: place.displayName?.text || 'Unknown',
        formatted_address: place.formattedAddress || '',
        formatted_phone_number: place.nationalPhoneNumber || undefined,
        international_phone_number: place.internationalPhoneNumber || undefined,
        website: place.websiteUri || undefined,
        types: place.types || [],
        geometry: {
          location: {
            lat: place.location?.latitude || 0,
            lng: place.location?.longitude || 0
          }
        },
        rating: place.rating || undefined,
        user_ratings_total: place.userRatingCount || undefined,
        business_status: place.businessStatus || 'OPERATIONAL'
      }));

      return {
        places: places.filter((place: any) => place.business_status !== 'CLOSED_PERMANENTLY'),
        status: 'OK'
      };

    } catch (error) {
      logger.error('Google Places search error:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific place (New API)
   */
  async getPlaceDetails(placeId: string): Promise<Partial<GooglePlace>> {
    if (!this.apiKey) {
      throw new Error('Google Places API key not configured');
    }

    try {
      const detailsUrl = `${this.baseUrl}/${placeId}`;

      const response = await axios.get(detailsUrl, {
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,websiteUri,nationalPhoneNumber,types,businessStatus,rating,userRatingCount'
        }
      });

      const place = response.data;
      
      // Convert new API format to legacy format for compatibility
      return {
        place_id: place.id,
        name: place.displayName?.text || 'Unknown',
        formatted_address: place.formattedAddress || '',
        formatted_phone_number: place.nationalPhoneNumber || undefined,
        website: place.websiteUri || undefined,
        types: place.types || [],
        geometry: {
          location: {
            lat: place.location?.latitude || 0,
            lng: place.location?.longitude || 0
          }
        },
        rating: place.rating || undefined,
        user_ratings_total: place.userRatingCount || undefined,
        business_status: place.businessStatus || 'OPERATIONAL'
      };

    } catch (error) {
      logger.error(`Failed to get place details for ${placeId}:`, error);
      throw error;
    }
  }

  /**
   * Search businesses near a specific location
   */
  async searchNearbyBusinesses(
    lat: number, 
    lng: number, 
    category: string, 
    radius: number = 5000
  ): Promise<PlaceSearchResult> {
    if (!this.apiKey) {
      throw new Error('Google Places API key not configured');
    }

    try {
      const nearbyUrl = `${this.baseUrl}/nearbysearch/json`;
      const params = {
        location: `${lat},${lng}`,
        radius: radius.toString(),
        keyword: category,
        key: this.apiKey,
        type: 'establishment'
      };

      const response = await axios.get(nearbyUrl, { params });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places nearby search error: ${response.data.status}`);
      }

      // Get detailed information for each place
      const places = await Promise.all(
        (response.data.results || []).map(async (place: any) => {
          try {
            const details = await this.getPlaceDetails(place.place_id);
            return {
              ...place,
              ...details
            };
          } catch (error) {
            logger.warn(`Failed to get details for place ${place.place_id}:`, error);
            return place;
          }
        })
      );

      return {
        places: places.filter(place => place.business_status !== 'CLOSED_PERMANENTLY'),
        next_page_token: response.data.next_page_token,
        status: response.data.status
      };

    } catch (error) {
      logger.error('Google Places nearby search error:', error);
      throw error;
    }
  }

  /**
   * Extract domain from Google Places website URL
   */
  extractDomain(website?: string): string | null {
    if (!website) return null;
    
    try {
      const url = new URL(website);
      return url.hostname.replace('www.', '');
    } catch {
      return null;
    }
  }

  /**
   * Convert Google Place to our Lead format
   */
  convertToLead(place: GooglePlace): any {
    return {
      googlePlaceId: place.place_id,
      businessName: place.name,
      website: place.website,
      address: place.formatted_address,
      phone: place.formatted_phone_number,
      category: place.types?.[0]?.replace(/_/g, ' '),
      locationLat: place.geometry?.location?.lat,
      locationLng: place.geometry?.location?.lng,
      source: 'google_places'
    };
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get remaining quota (if available in response headers)
   */
  async checkQuota(): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Google Places API key not configured');
    }

    try {
      // Make a minimal request to check quota using new API
      const searchUrl = `${this.baseUrl}:searchText`;
      
      const response = await axios.post(searchUrl, {
        textQuery: 'test',
        maxResultCount: 1
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id'
        }
      });

      return {
        status: 'OK',
        headers: response.headers
      };
    } catch (error) {
      logger.error('Quota check error:', error);
      throw error;
    }
  }
}

export default new GooglePlacesService();