import React, { useState, useEffect, useCallback } from 'react';
import { Home, Map as MapIcon, BarChart2, MessageSquare, Menu, Bell, Bot, Satellite, X, Globe, MapPin } from 'lucide-react';
import { AQIData, WeatherData, Coordinates, Language, AppNotification, AQILevel } from './types';
import { fetchAQIData, fetchWeatherData, getUserLocation } from './services/dataService';
import { analyzeAirQuality } from './services/geminiService';
import { Gauge, MiniCard } from './components/Gauge';
import { HistoryChart } from './components/Charts';
import { AssistantTab } from './components/AssistantTab';
import { MapComponent } from './components/MapComponent';

// --- TRANSLATIONS ---
const t = (key: string, lang: Language) => {
    const dict: Record<string, { en: string; ru: string }> = {
        'home': { en: 'Home', ru: 'Главная' },
        'map': { en: 'Map', ru: 'Карта' },
        'stats': { en: 'Stats', ru: 'Стат.' },
        'ai_assist': { en: 'AI Assist', ru: 'AI Ассист' },
        'locating': { en: 'Locating...', ru: 'Поиск...' },
        'health_insight': { en: 'Health Insight', ru: 'Совет от AI' },
        'nasa_badge': { en: 'POWERED BY NASA / COPERNICUS MODELS', ru: 'ДАННЫЕ NASA / МОДЕЛИ COPERNICUS' },
        'notifications': { en: 'Notifications', ru: 'Уведомления' },
        'settings': { en: 'Settings', ru: 'Настройки' },
        'language': { en: 'Language', ru: 'Язык' },
        'select_city': { en: 'Select City', ru: 'Выбрать город' },
        'current_location': { en: 'Current Location', ru: 'Текущее место' },
        'humidity': { en: 'Humidity', ru: 'Влажность' },
        'analytics': { en: 'Analytics', ru: 'Аналитика' },
        'monthly_avg': { en: 'Weekly Trend', ru: 'Недельный тренд' },
        'no_notifications': { en: 'No new notifications', ru: 'Нет новых уведомлений' },
    };
    return dict[key]?.[lang] || key;
};

// --- AQI Translations ---
const getLocalizedAQILevel = (level: AQILevel, lang: Language): string => {
    if (lang === 'en') return level;
    
    switch (level) {
        case AQILevel.Good: return 'Хороший';
        case AQILevel.Moderate: return 'Умеренный';
        case AQILevel.UnhealthySensitive: return 'Вредный для уязвимых';
        case AQILevel.Unhealthy: return 'Вредный';
        case AQILevel.VeryUnhealthy: return 'Очень вредный';
        case AQILevel.Hazardous: return 'Опасный';
        default: return level;
    }
}

// --- PREDEFINED CITIES ---
const CITIES: Coordinates[] = [
    { name: 'Tashkent', lat: 41.2995, lon: 69.2401 },
    { name: 'Samarkand', lat: 39.6270, lon: 66.9750 },
    { name: 'Bukhara', lat: 39.7681, lon: 64.4556 },
    { name: 'Andijan', lat: 40.7829, lon: 72.3442 },
    { name: 'Nukus', lat: 42.4619, lon: 59.6166 },
    { name: 'London', lat: 51.5074, lon: -0.1278 },
    { name: 'New York', lat: 40.7128, lon: -74.0060 },
    { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
];

// Memoized Tab Button to prevent re-renders of navigation
const TabButton = React.memo(({ id, icon, label, active, onClick }: { id: string; icon: React.ReactElement; label: string; active: boolean; onClick: (id: string) => void }) => (
    <button 
      onClick={() => onClick(id)}
      className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${active ? 'text-blue-600' : 'text-slate-400'}`}
    >
      {React.cloneElement(icon, { size: 24, strokeWidth: active ? 2.5 : 2 } as any)}
      <span className="text-[10px] font-medium mt-1">{label}</span>
    </button>
));

// Main App Component
const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'map' | 'analytics' | 'ai'>('home');
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [aqiData, setAqiData] = useState<AQIData | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  
  // Settings & UI State
  const [language, setLanguage] = useState<Language>('ru');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Use useCallback to stabilize function references
  const loadData = useCallback(async (location: Coordinates, lang: Language) => {
    setLoading(true);
    try {
        const [aqi, weather] = await Promise.all([
            fetchAQIData(location), 
            fetchWeatherData(location, lang)
        ]);
        
        setAqiData(aqi);
        setWeatherData(weather);
        
        // Generate Notifications
        const newNotifs: AppNotification[] = [];
        if (aqi.aqi > 100) {
            newNotifs.push({
                id: Date.now() + '1',
                title: lang === 'en' ? 'High Pollution' : 'Высокое загрязнение',
                message: lang === 'en' ? 'Wear a mask outdoors.' : 'Наденьте маску на улице.',
                type: 'warning',
                time: lang === 'en' ? 'Now' : 'Сейчас'
            });
        }
        const rainKeywords = ['rain', 'дождь', 'thunderstorm', 'гроза'];
        if (rainKeywords.some(kw => weather.condition.toLowerCase().includes(kw))) {
             newNotifs.push({
                id: Date.now() + '2',
                title: lang === 'en' ? 'Rain Forecast' : 'Прогноз дождя',
                message: lang === 'en' ? 'Take an umbrella.' : 'Возьмите зонт.',
                type: 'info',
                time: lang === 'en' ? 'Now' : 'Сейчас'
            });
        }
        newNotifs.push({
            id: Date.now() + '3',
            title: lang === 'en' ? 'System Update' : 'Обновление системы',
            message: lang === 'en' ? 'NASA data sync complete.' : 'Синхронизация с NASA завершена.',
            type: 'success',
            time: lang === 'en' ? '1m ago' : '1 мин назад'
        });
        setNotifications(newNotifs);

        if(process.env.API_KEY) {
           analyzeAirQuality(aqi, weather, lang).then(setAiAnalysis);
        } else {
           setAiAnalysis(lang === 'en' ? "Add API Key for AI." : "Добавьте API ключ для AI.");
        }
    } catch (error) {
        console.error(error);
    }
    setLoading(false);
  }, []);

  // Initial Load & Language Change
  useEffect(() => {
    const init = async () => {
        let targetCoords = coords;
        if (!targetCoords) {
            targetCoords = await getUserLocation();
            setCoords(targetCoords);
        }
        loadData(targetCoords, language);
    };
    init();
  }, [language, loadData]); 

  const handleCitySelect = useCallback((city: Coordinates) => {
      setCoords(city);
      loadData(city, language);
      setIsSettingsOpen(false);
  }, [language, loadData]);

  const handleMapLocationSelect = useCallback((newCoords: Coordinates) => {
      setCoords(newCoords);
      loadData(newCoords, language);
  }, [language, loadData]);

  const handleTabChange = useCallback((id: string) => {
      setActiveTab(id as any);
  }, []);

  if (loading && !aqiData) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-slate-500 text-sm animate-pulse">{t('locating', language)}</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden max-w-md mx-auto relative shadow-2xl">
      
      {/* Top Header */}
      <header className="px-6 pt-12 pb-4 bg-white/80 backdrop-blur-sm sticky top-0 z-20 flex justify-between items-center">
        <div>
           <div className="flex items-center gap-1 text-slate-500 text-sm max-w-[150px] truncate">
             <MapPin size={14} />
             <span>{aqiData?.location || coords?.name || 'Unknown'}</span>
           </div>
           <h1 className="text-2xl font-bold text-slate-800 tracking-tight">CleanSky</h1>
        </div>
        <div className="flex gap-4">
             <div className="relative cursor-pointer" onClick={() => setIsNotifOpen(true)}>
                <Bell className="text-slate-600" size={24} />
                {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
             </div>
             <div className="cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
                <Menu className="text-slate-600" size={24} />
             </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative">
        
        {activeTab === 'home' && aqiData && weatherData && (
          <div className="px-6 space-y-6 pb-24 animate-fade-in">
            <div className="flex justify-center">
                <div className="bg-slate-900 text-white text-[10px] px-3 py-1 rounded-full flex items-center gap-2 shadow-sm">
                    <Satellite size={12} />
                    <span className="font-medium tracking-wide">{t('nasa_badge', language)}</span>
                </div>
            </div>

            <Gauge value={aqiData.aqi} level={getLocalizedAQILevel(aqiData.level, language) as any} />

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 items-start">
               <div className="bg-blue-100 p-2 rounded-full text-blue-600 mt-1">
                 <MessageSquare size={16} />
               </div>
               <div>
                 <h4 className="font-bold text-blue-900 text-sm mb-1">{t('health_insight', language)}</h4>
                 <p className="text-blue-800 text-sm leading-relaxed">{aiAnalysis || (language === 'ru' ? "Анализ данных..." : "Analyzing data...")}</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <MiniCard label="PM2.5" value={aqiData.pollutants.pm25.value} unit={aqiData.pollutants.pm25.unit} colorClass="bg-red-50" />
               <MiniCard label="PM10" value={aqiData.pollutants.pm10.value} unit={aqiData.pollutants.pm10.unit} colorClass="bg-orange-50" />
               <MiniCard label="NO2" value={aqiData.pollutants.no2.value} unit={aqiData.pollutants.no2.unit} colorClass="bg-green-50" />
               <MiniCard label="SO2" value={aqiData.pollutants.so2.value} unit={aqiData.pollutants.so2.unit} colorClass="bg-teal-50" />
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-500">
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"></path></svg>
                       </div>
                       <div>
                           <h2 className="text-3xl font-bold text-slate-800">{weatherData.temp}°</h2>
                           <p className="text-slate-500">{weatherData.condition}</p>
                       </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{t('humidity', language)}</p>
                        <p className="text-slate-600 font-medium">{weatherData.humidity}%</p>
                    </div>
                </div>
                <div className="flex justify-between pt-4 border-t border-slate-100">
                    {weatherData.forecast.map((day, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                            <span className="text-xs text-slate-400 mb-1">{day.day}</span>
                            <div className="w-6 h-6 rounded-full bg-slate-100 mb-1"></div>
                            <span className="text-sm font-semibold text-slate-700">{day.tempMax}°</span>
                            <span className="text-xs text-slate-400">{day.tempMin}°</span>
                        </div>
                    ))}
                </div>
            </div>
             <HistoryChart data={aqiData.history} />
          </div>
        )}

        {/* Map Tab */}
        {activeTab === 'map' && coords && (
            <div className="h-full w-full relative">
                <MapComponent center={coords} onLocationSelect={handleMapLocationSelect} />
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg text-xs font-medium z-[400] pointer-events-none">
                    NASA GIBS Satellite Layer
                </div>
            </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && aqiData && (
             <div className="px-6 py-6 space-y-6">
                 <h2 className="text-2xl font-bold text-slate-800">{t('analytics', language)}</h2>
                 <HistoryChart data={aqiData.history} />
             </div>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'ai' && (
            <AssistantTab aqiData={aqiData} weatherData={weatherData} language={language} />
        )}

      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-slate-100 flex justify-around items-center px-2 pb-safe sticky bottom-0 z-30 h-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         <TabButton id="home" active={activeTab === 'home'} icon={<Home />} label={t('home', language)} onClick={handleTabChange} />
         <TabButton id="map" active={activeTab === 'map'} icon={<MapIcon />} label={t('map', language)} onClick={handleTabChange} />
         <TabButton id="analytics" active={activeTab === 'analytics'} icon={<BarChart2 />} label={t('stats', language)} onClick={handleTabChange} />
         <TabButton id="ai" active={activeTab === 'ai'} icon={<Bot />} label={t('ai_assist', language)} onClick={handleTabChange} />
      </nav>
      
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
            <div className="w-3/4 bg-white h-full shadow-2xl relative animate-slide-in-right flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">{t('settings', language)}</h2>
                    <button onClick={() => setIsSettingsOpen(false)}><X className="text-slate-400" /></button>
                </div>
                <div className="p-6 space-y-8 flex-1 overflow-y-auto">
                    <div>
                        <div className="flex items-center gap-2 mb-3 text-blue-600">
                            <Globe size={18} />
                            <h3 className="font-semibold text-sm uppercase">{t('language', language)}</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setLanguage('en')}
                                className={`py-2 rounded-xl text-sm font-medium border ${language === 'en' ? 'bg-blue-600 text-white border-blue-600' : 'text-slate-600 border-slate-200'}`}
                            >
                                English
                            </button>
                            <button 
                                onClick={() => setLanguage('ru')}
                                className={`py-2 rounded-xl text-sm font-medium border ${language === 'ru' ? 'bg-blue-600 text-white border-blue-600' : 'text-slate-600 border-slate-200'}`}
                            >
                                Русский
                            </button>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-3 text-blue-600">
                            <MapPin size={18} />
                            <h3 className="font-semibold text-sm uppercase">{t('select_city', language)}</h3>
                        </div>
                        <div className="space-y-2">
                             <button 
                                onClick={async () => {
                                    const loc = await getUserLocation();
                                    handleCitySelect(loc);
                                }}
                                className="w-full text-left px-4 py-3 rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold flex items-center gap-2"
                             >
                                <MapPin size={16} />
                                {t('current_location', language)}
                             </button>
                             {CITIES.map(city => (
                                 <button 
                                    key={city.name}
                                    onClick={() => handleCitySelect(city)}
                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 text-sm border border-slate-100 transition-colors"
                                 >
                                    {city.name}
                                 </button>
                             ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Notifications Modal */}
      {isNotifOpen && (
          <div className="absolute inset-0 z-50 flex items-start justify-center pt-20 px-6 pointer-events-none">
              <div className="absolute inset-0 bg-black/20" onClick={() => setIsNotifOpen(false)} style={{pointerEvents: 'auto'}}></div>
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden relative pointer-events-auto animate-fade-in">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-800">{t('notifications', language)}</h3>
                      <button onClick={() => setIsNotifOpen(false)}><X size={18} className="text-slate-400" /></button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-sm">
                              {t('no_notifications', language)}
                          </div>
                      ) : (
                          notifications.map(n => (
                              <div key={n.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                  <div className="flex justify-between items-start mb-1">
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                          n.type === 'warning' ? 'bg-red-100 text-red-600' : 
                                          n.type === 'info' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                                      }`}>
                                          {n.type.toUpperCase()}
                                      </span>
                                      <span className="text-xs text-slate-400">{n.time}</span>
                                  </div>
                                  <h4 className="font-semibold text-slate-800 text-sm mb-1">{n.title}</h4>
                                  <p className="text-xs text-slate-500 leading-relaxed">{n.message}</p>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;