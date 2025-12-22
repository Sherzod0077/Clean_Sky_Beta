export enum AQILevel {
  Good = 'Good',
  Moderate = 'Moderate',
  UnhealthySensitive = 'Unhealthy for Sensitive Groups',
  Unhealthy = 'Unhealthy',
  VeryUnhealthy = 'Very Unhealthy',
  Hazardous = 'Hazardous'
}

export interface Pollutant {
  name: string;
  value: number;
  unit: string;
  level: 'good' | 'moderate' | 'bad';
}

export interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  forecast: Array<{ day: string; tempMax: number; tempMin: number; icon: string }>;
}

export interface AQIData {
  aqi: number;
  level: AQILevel;
  mainPollutant: string;
  location: string;
  pollutants: {
    pm25: Pollutant;
    pm10: Pollutant;
    no2: Pollutant;
    so2: Pollutant;
    co: Pollutant;
    o3: Pollutant;
  };
  history: Array<{ time: string; value: number }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface Coordinates {
    lat: number;
    lon: number;
    name?: string;
}

export type Language = 'en' | 'ru';

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: 'warning' | 'info' | 'success';
    time: string;
}