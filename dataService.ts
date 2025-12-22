import { AQIData, AQILevel, WeatherData, Coordinates, Language } from '../types';

// --- CACHING LAYER ---
const cache = {
    aqi: new Map<string, { data: AQIData; timestamp: number }>(),
    weather: new Map<string, { data: WeatherData; timestamp: number }>()
};
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Helper to determine AQI Level
const getAQILevel = (aqi: number): AQILevel => {
  if (aqi <= 50) return AQILevel.Good;
  if (aqi <= 100) return AQILevel.Moderate;
  if (aqi <= 150) return AQILevel.UnhealthySensitive;
  if (aqi <= 200) return AQILevel.Unhealthy;
  if (aqi <= 300) return AQILevel.VeryUnhealthy;
  return AQILevel.Hazardous;
};

const getMainPollutant = (pollutants: any): string => {
  const max = Math.max(pollutants.pm2_5, pollutants.pm10, pollutants.nitrogen_dioxide || 0);
  if (max === pollutants.pm2_5) return 'PM2.5';
  if (max === pollutants.pm10) return 'PM10';
  return 'NO2';
};

const getWeatherCondition = (code: number, lang: Language): string => {
  const isRu = lang === 'ru';
  if (code === 0) return isRu ? 'Ясно' : 'Clear Sky';
  if (code >= 1 && code <= 3) return isRu ? 'Перем. облачность' : 'Partly Cloudy';
  if (code >= 45 && code <= 48) return isRu ? 'Туман' : 'Foggy';
  if (code >= 51 && code <= 67) return isRu ? 'Дождь' : 'Rain';
  if (code >= 71 && code <= 77) return isRu ? 'Снег' : 'Snow';
  if (code >= 95) return isRu ? 'Гроза' : 'Thunderstorm';
  return isRu ? 'Облачно' : 'Cloudy';
};

// Default coordinates (Tashkent)
const DEFAULT_LAT = 41.2995;
const DEFAULT_LON = 69.2401;

export const getUserLocation = async (): Promise<Coordinates> => {
    try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: false });
        });
        return { lat: pos.coords.latitude, lon: pos.coords.longitude, name: "Current Location" };
    } catch (e) {
        console.warn("Geolocation failed, using default.");
        return { lat: DEFAULT_LAT, lon: DEFAULT_LON, name: "Tashkent (Default)" };
    }
}

export const fetchAQIData = async (coords: Coordinates): Promise<AQIData> => {
  const { lat, lon } = coords;
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;

  if (cache.aqi.has(key)) {
      const cached = cache.aqi.get(key)!;
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
          return cached.data;
      }
  }
  
  // Using Open-Meteo Air Quality API
  const response = await fetch(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=us_aqi&timezone=auto&past_days=1&forecast_days=1`
  );
  const data = await response.json();
  const current = data.current;

  // Map 24h history
  const history = data.hourly.time.slice(0, 24).map((time: string, index: number) => ({
      time: time.split('T')[1].substring(0, 5), // HH:MM
      value: data.hourly.us_aqi[index] || 0
  })).filter((_, i) => i % 3 === 0);

  // If name is not provided or generic, try to format coords
  const locationName = coords.name && coords.name !== "Current Location" 
    ? coords.name 
    : `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;

  const result: AQIData = {
    aqi: current.us_aqi,
    level: getAQILevel(current.us_aqi),
    mainPollutant: getMainPollutant(current),
    location: locationName,
    pollutants: {
      pm25: { name: 'PM2.5', value: current.pm2_5, unit: 'µg/m³', level: current.pm2_5 > 35 ? 'bad' : 'good' },
      pm10: { name: 'PM10', value: current.pm10, unit: 'µg/m³', level: current.pm10 > 150 ? 'bad' : 'moderate' },
      no2: { name: 'NO2', value: current.nitrogen_dioxide, unit: 'µg/m³', level: 'good' },
      so2: { name: 'SO2', value: current.sulphur_dioxide, unit: 'µg/m³', level: 'good' },
      co: { name: 'CO', value: current.carbon_monoxide, unit: 'µg/m³', level: 'moderate' },
      o3: { name: 'O3', value: current.ozone, unit: 'µg/m³', level: 'good' }
    },
    history: history
  };

  cache.aqi.set(key, { data: result, timestamp: Date.now() });
  return result;
};

export const fetchWeatherData = async (coords: Coordinates, lang: Language = 'en'): Promise<WeatherData> => {
  const { lat, lon } = coords;
  const key = `${lat.toFixed(4)},${lon.toFixed(4)},${lang}`;

  if (cache.weather.has(key)) {
      const cached = cache.weather.get(key)!;
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
          return cached.data;
      }
  }

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
  );
  const data = await response.json();
  const current = data.current;
  const daily = data.daily;

  const forecast = daily.time.slice(0, 4).map((t: string, i: number) => {
    const date = new Date(t);
    // Localize Day Name
    const dayName = lang === 'ru' 
        ? date.toLocaleDateString('ru-RU', { weekday: 'short' })
        : date.toLocaleDateString('en-US', { weekday: 'short' });

    return {
        day: dayName,
        tempMax: Math.round(daily.temperature_2m_max[i]),
        tempMin: Math.round(daily.temperature_2m_min[i]),
        icon: 'sun'
    };
  });

  const result = {
    temp: Math.round(current.temperature_2m),
    condition: getWeatherCondition(current.weather_code, lang),
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    forecast: forecast
  };

  cache.weather.set(key, { data: result, timestamp: Date.now() });
  return result;
};