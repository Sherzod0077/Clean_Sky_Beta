import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, MapPin, AlertTriangle } from 'lucide-react';
import { AQIData, WeatherData, ChatMessage, Language } from '../types';
import { chatWithAssistant, processCrowdsourceReport } from '../services/geminiService';

interface Props {
  aqiData: AQIData | null;
  weatherData: WeatherData | null;
  language: Language;
}

export const AssistantTab: React.FC<Props> = ({ aqiData, weatherData, language }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Crowdsource state
  const [reportText, setReportText] = useState('');
  const [reportStatus, setReportStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  // Reset/Translate initial message when language changes
  useEffect(() => {
      const initialText = language === 'ru' 
        ? 'Привет! Я CleanSky AI. Я могу проанализировать воздух или принять ваш отчет. Чем помочь?'
        : 'Hi! I\'m CleanSky AI. I can analyze air quality data or take your local reports. How can I help?';
      
      // Only reset if empty or first load, otherwise we might lose chat context. 
      // For this demo, we'll append a new greeting if lang changes.
      setMessages(prev => {
          if (prev.length === 0) {
              return [{ id: 'init', role: 'model', text: initialText }];
          }
          return prev; 
      });
  }, [language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Build context
    let context = "User location: Unknown.";
    if (aqiData && weatherData) {
        context = `Current AQI: ${aqiData.aqi} (${aqiData.level}). Weather: ${weatherData.temp}C, ${weatherData.condition}.`;
    }

    const responseText = await chatWithAssistant(userMsg.text, context, language);
    
    setIsTyping(false);
    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: responseText }]);
  };

  const handleReportSubmit = async () => {
      if(!reportText) return;
      setReportStatus('sending');
      const analysis = await processCrowdsourceReport(reportText, aqiData?.location || "Unknown", language);
      setReportStatus('success');
      
      const reply = language === 'ru'
        ? `Спасибо за отчет! Анализ показывает: ${analysis}. Это поможет улучшить наши модели.`
        : `Thanks for the report! My analysis suggests: ${analysis}. This helps improve our local models.`;

      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          text: reply
      }]);
      setReportText('');
      setTimeout(() => setReportStatus('idle'), 3000);
  }

  const t = {
      reportTitle: language === 'ru' ? 'СООБЩИТЬ О ПРОБЛЕМЕ' : 'CROWDSOURCE REPORT',
      reportDesc: language === 'ru' ? 'Что вы видите или чувствуете? (дым, запах гари)' : 'Help improve data accuracy. What do you see or smell?',
      placeholder: language === 'ru' ? 'Напр: Запах гари...' : 'e.g. Smell burning wood...',
      send: language === 'ru' ? 'Отправить' : 'Report',
      sent: language === 'ru' ? 'Готово' : 'Sent',
      ask: language === 'ru' ? 'Спросить AI...' : 'Ask AI for advice...'
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
            {/* Crowdsource Card */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-indigo-600">
                    <AlertTriangle size={18} />
                    <h3 className="font-semibold text-sm uppercase tracking-wide">{t.reportTitle}</h3>
                </div>
                <p className="text-xs text-slate-500 mb-3">{t.reportDesc}</p>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={reportText}
                        onChange={(e) => setReportText(e.target.value)}
                        placeholder={t.placeholder}
                        className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button 
                        onClick={handleReportSubmit}
                        disabled={reportStatus === 'sending' || !reportText}
                        className={`px-4 py-2 rounded-xl text-white font-medium text-sm transition-colors ${reportStatus === 'success' ? 'bg-green-500' : 'bg-indigo-600 active:bg-indigo-700'}`}
                    >
                        {reportStatus === 'sending' ? '...' : reportStatus === 'success' ? t.sent : t.send}
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                        msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white text-slate-700 shadow-sm rounded-bl-none'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            {isTyping && (
                <div className="flex justify-start">
                    <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="absolute bottom-20 left-0 w-full p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
            <div className="flex gap-2 items-center bg-white p-2 rounded-full shadow-lg border border-slate-100">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={t.ask}
                    className="flex-1 bg-transparent border-none px-4 py-2 focus:outline-none text-slate-700 placeholder-slate-400"
                />
                <button 
                    onClick={handleSend}
                    className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-transform active:scale-95"
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    </div>
  );
};