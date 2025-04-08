import axios from 'axios';

interface CaptionResult {
  text: string;
  confidence: number;
}

interface ImageAnalysisResult {
  captionResult?: CaptionResult;
  metadata?: Record<string, any>;
}

class VisionService {
  private endpoint: string;
  private key: string;
  private imageUrlCache: Map<string, string>;
  private lastRequestTime: number = 0;
  private requestInterval: number = 3000; // 3 seconds between requests (20 per minute)
  
  constructor() {
    this.endpoint = process.env.VISION_ENDPOINT || '';
    this.key = process.env.VISION_KEY || '';
    this.imageUrlCache = new Map(); // Cache of image URLs -> alt texts
    
    if (!this.endpoint || !this.key) {
      console.error("Azure Vision credentials not found in environment variables");
    }
  }
  
  async analyzeImage(imageUrl: string): Promise<string> {
    // Check cache first
    if (this.imageUrlCache.has(imageUrl)) {
      return this.imageUrlCache.get(imageUrl) || "Image";
    }
    
    if (!imageUrl.startsWith('http')) {
      return "Image";
    }
    
    try {
      // Simple rate limiting
      await this.waitForRateLimit();
      
      console.log(`Analyzing image URL: ${imageUrl}`);
      
      // Create URL for direct API call
      const apiUrl = `${this.endpoint}/imageanalysis:analyze?features=Caption&api-version=2023-04-01-preview`;
      
      const response = await axios.post(apiUrl, 
        { url: imageUrl },
        {
          headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': this.key
          }
        }
      );
      
      this.lastRequestTime = Date.now();
      
      const result: ImageAnalysisResult = response.data;
      
      if (!result.captionResult) {
        console.error("No caption in result");
        return "Image";
      }
      
      // Format as a proper alt text (capitalized first letter, etc.)
      const caption = result.captionResult.text;
      const altText = caption.charAt(0).toUpperCase() + caption.slice(1);
      
      // Store in cache
      this.imageUrlCache.set(imageUrl, altText);
      
      return altText;
    } catch (error) {
      console.error('Error in image analysis:', error);
      return "Image";
    }
  }
  
  // Simple rate limiting function
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestInterval) {
      const waitTime = this.requestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  async fetchAndAnalyzeFromHTML(htmlContent: string, baseUrl: string, selector: string): Promise<string | null> {
    try {
      // Fetch the HTML page if we need to
      let html = htmlContent;
      
      if (!html) {
        const response = await axios.get(baseUrl);
        html = response.data;
      }
      
      // Extract the image URL from the HTML
      const imageUrl = this.extractImageFromHTML(html, selector, baseUrl);
      if (!imageUrl) return null;
      
      // Now analyze the actual image
      return await this.analyzeImage(imageUrl);
    } catch (error) {
      console.error('Error fetching and analyzing HTML:', error);
      return null;
    }
  }
  
  // Extract image URL from HTML
  private extractImageFromHTML(html: string, selector: string, baseUrl: string): string | null {
    try {
      // Basic implementation - in reality, you'd use a proper HTML parser
      const imgRegex = new RegExp(`<img[^>]*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*>`, 'i');
      const imgMatch = html.match(imgRegex);
      
      if (!imgMatch) return null;
      
      const srcMatch = imgMatch[0].match(/src=["']([^"']+)["']/i);
      if (!srcMatch || !srcMatch[1]) return null;
      
      let imageUrl = srcMatch[1];
      
      // Handle relative URLs
      if (imageUrl.startsWith('/')) {
        const domainMatch = baseUrl.match(/^(https?:\/\/[^\/]+)/i);
        if (domainMatch) {
          imageUrl = domainMatch[1] + imageUrl;
        } else {
          imageUrl = 'https://' + baseUrl.split('/')[0] + imageUrl;
        }
      } else if (!imageUrl.startsWith('http')) {
        // Simple URL join
        if (baseUrl.endsWith('/')) {
          imageUrl = baseUrl + imageUrl;
        } else {
          imageUrl = baseUrl + '/' + imageUrl;
        }
      }
      
      return imageUrl;
    } catch (error) {
      console.error('Error extracting image from HTML:', error);
      return null;
    }
  }
}

// Export a singleton instance
export const visionService = new VisionService(); 