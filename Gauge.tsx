import React from 'react';
import { AQILevel } from '../types';

interface GaugeProps {
  value: number;
  level: AQILevel;
}

const getColor = (value: number) => {
  if (value <= 50) return 'bg-green-500';
  if (value <= 100) return 'bg-yellow-400';
  if (value <= 150) return 'bg-orange-500';
  if (value <= 200) return 'bg-red-500';
  if (value <= 300) return 'bg-purple-600';
  return 'bg-rose-900';
};

const getGradient = (value: number) => {
    if (value <= 50) return 'from-green-400 to-green-600';
    if (value <= 100) return 'from-yellow-300 to-yellow-500';
    if (value <= 150) return 'from-orange-400 to-orange-600';
    if (value <= 200) return 'from-red-400 to-red-600';
    if (value <= 300) return 'from-purple-500 to-purple-700';
    return 'from-rose-800 to-rose-950';
}

export const Gauge: React.FC<GaugeProps> = ({ value, level }) => {
  const gradient = getGradient(value);

  return (
    <div className={`w-full aspect-video rounded-3xl p-6 text-white shadow-lg bg-gradient-to-br ${gradient} flex flex-col items-center justify-center relative overflow-hidden`}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-black opacity-10 rounded-full -ml-10 -mb-10"></div>
      
      <div className="z-10 text-center">
        <h3 className="text-lg font-medium opacity-90 mb-1">Air Quality Index</h3>
        <h1 className="text-7xl font-bold tracking-tighter mb-2">{value}</h1>
        <div className="inline-block px-4 py-1 bg-white/20 backdrop-blur-md rounded-full">
            <span className="text-lg font-semibold">{level}</span>
        </div>
      </div>
    </div>
  );
};

export const MiniCard: React.FC<{ label: string; value: number; unit: string; colorClass?: string }> = ({ label, value, unit, colorClass = "bg-white" }) => (
    <div className={`${colorClass} rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center aspect-square`}>
        <span className="text-slate-500 text-sm font-medium">{label}</span>
        <span className="text-2xl font-bold text-slate-800 my-1">{value}</span>
        <span className="text-xs text-slate-400">{unit}</span>
    </div>
);