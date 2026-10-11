/**
 * frontend/src/lib/weatherTypes.ts
 *
 * TypeScript interface definitions for weather forecasting, geocoding,
 * official alerts, and power plant operations impacts.
 */

export interface GeocodeResult {
  id: number;
  name: string;
  region: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface GeocodeResponse {
  query: string;
  results: GeocodeResult[];
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  apparentTemperature: number;
  relativeHumidity: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
  cloudCover: number;
  shortwaveRadiation: number;
  windSpeed10m: number;
  windGusts10m: number;
  windSpeed80m: number;
}

export interface DailyForecast {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationSum: number;
  weatherCode: number;
  windGustsMax: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherAlert {
  id: string;
  event: string;
  severity: string;
  urgency: string;
  certainty: string;
  headline: string;
  description: string;
  instruction: string;
  effective: string;
  expires: string;
}

export interface WeatherForecastResponse {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    elevation: number;
  };
  fetchedAt: string;
  current: HourlyForecast;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  alerts: WeatherAlert[];
  alertsAvailable: boolean;
  credits: {
    forecast: string;
    forecastUrl: string;
    alerts: string;
    disclaimer: string;
  };
}

export type PlantType =
  | 'natural_gas'
  | 'nuclear'
  | 'solar'
  | 'wind'
  | 'battery_storage';

export type ImpactLevel = 'Normal' | 'Watch' | 'Warning';

export interface PlantImpactReason {
  text: string;
  source: string;
}

export interface ComponentPlantStatus {
  impactLevel: ImpactLevel;
  status: string;
  output: string;
}

export interface SinglePlantCurrentImpact {
  impactLevel: ImpactLevel;
  estimatedOutputPct?: number | null;
  estimatedOutputIndex?: number | null;
  outputLabel: string;
  nuclearNotice?: string;
  guidanceLabel?: string;
  reasons: PlantImpactReason[];
  recommendedActions: string[];
}

export interface MixCurrentImpact {
  impactLevel: ImpactLevel;
  summary: string;
  balancingExplanation: string;
  components: Record<string, ComponentPlantStatus>;
  recommendedActions: string[];
}

export interface TimelineDataPoint {
  time: string;
  temperature: number;
  impactLevel: ImpactLevel;
  estimatedOutputPct?: number | null;
  estimatedOutputIndex?: number | null;
}

export interface PlantImpactResponse {
  plantType: PlantType;
  location: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  fetchedAt: string;
  current: SinglePlantCurrentImpact | MixCurrentImpact;
  timeline: TimelineDataPoint[];
  alerts: WeatherAlert[];
  configUsed: {
    thresholds: Record<string, any>;
    note: string;
  };
}

export type TempUnit = 'C' | 'F';
export type PrecipUnit = 'mm' | 'in';
export type WindUnit = 'ms' | 'mph';

export interface WeatherUnits {
  temp: TempUnit;
  precip: PrecipUnit;
  wind: WindUnit;
}
