/**
 * OpenFDA Service - Clinical Data & Drug Interactions
 * Handles communication with the FDA API with caching and retry logic.
 */

export interface FdaDrugLabel {
  brand_name?: string[];
  generic_name?: string[];
  drug_interactions?: string[];
  warnings?: string[];
  contraindications?: string[];
  indications_and_usage?: string[];
  dosage_and_administration?: string[];
  active_ingredient?: string[];
  effective_time?: string;
}

interface FdaResponse {
  results: FdaDrugLabel[];
  error?: {
    code: string;
    message: string;
  };
}

class OpenFdaService {
  private cache = new Map<string, { data: FdaDrugLabel | null; timestamp: number }>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly API_KEY = import.meta.env.VITE_OPENFDA_API_KEY;
  private readonly BASE_URL = 'https://api.fda.gov/drug/label.json';

  /**
   * Fetches the drug label and clinical data for a given generic name.
   */
  public async fetchDrugLabel(genericName: string): Promise<FdaDrugLabel | null> {
    const cacheKey = genericName.toLowerCase().trim();
    const cached = this.cache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      return cached.data;
    }

    const data = await this.fetchWithRetry(cacheKey);
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Fetches interactions for multiple ingredients (useful for combination drugs).
   */
  public async fetchInteractionsForIngredients(genericNames: string[]): Promise<Map<string, FdaDrugLabel | null>> {
    const results = new Map<string, FdaDrugLabel | null>();
    
    await Promise.all(
      genericNames.map(async (name) => {
        const data = await this.fetchDrugLabel(name);
        results.set(name, data);
      })
    );

    return results;
  }

  private async fetchWithRetry(genericName: string, retries = 2): Promise<FdaDrugLabel | null> {
    const url = `${this.BASE_URL}?search=openfda.generic_name:"${encodeURIComponent(genericName)}"&limit=1${this.API_KEY ? `&api_key=${this.API_KEY}` : ''}`;

    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch(url);
        
        if (response.status === 404) {
          return null; // Not found in FDA
        }

        if (!response.ok) {
          throw new Error(`FDA API error: ${response.status}`);
        }

        const data: FdaResponse = await response.json();
        return data.results?.[0] || null;
      } catch (err) {
        if (i === retries) {
          console.error(`Failed to fetch FDA data for ${genericName} after ${retries} retries:`, err);
          return null;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 500));
      }
    }
    return null;
  }
}

export const openFdaService = new OpenFdaService();
