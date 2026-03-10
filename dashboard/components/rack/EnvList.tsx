import React from 'react';
import { TempHum, NoiseLevel } from '../../types/schema';
import { Thermometer, Wind, Volume2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface EnvListProps {
  tempHum?: TempHum[];
  noise?: NoiseLevel[];
}

export const EnvList: React.FC<EnvListProps> = ({ tempHum, noise }) => {
  const tempHumData = tempHum || [];
  const noiseData = noise || [];

  return (
    <div className="grid grid-cols-2 gap-2 h-full">
      {/* Left Column: Temperature & Humidity */}
      <div className="flex flex-col gap-1.5 overflow-y-auto">
        <div className="flex items-center gap-1.5">
          <Thermometer className="w-3.5 h-3.5 text-sky-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-tight">
            Environmental
          </h3>
        </div>

        <div className="space-y-3">
          {tempHumData.map((data, i) => (
            <div
              key={i}
              className={cn(
                'p-2.5 rounded-lg border hardware-card',
                data.temp > 35
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-100'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-100'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Zone #{data.sensorIndex}
                </span>
                {data.temp > 35 && (
                  <span className="text-[10px] font-bold uppercase text-amber-400 animate-pulse">
                    Warning: High
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="text-xl font-bold tracking-tighter">
                    {data.temp.toFixed(1)}
                    <span className="text-xs font-normal text-slate-500 ml-0.5">°C</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 text-slate-400">
                    <Wind className="w-3 h-3" />
                    <span className="text-lg font-bold tracking-tighter">
                      {Math.round(data.hum)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-1.5 w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-1000',
                    data.temp > 35 ? 'bg-amber-500' : 'bg-sky-500'
                  )}
                  style={{ width: `${Math.min(100, (data.temp / 60) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Noise Level */}
      <div className="flex flex-col gap-1.5 overflow-y-auto">
        <div className="flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-sky-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-tight">
            Acoustic Logic
          </h3>
        </div>

        <div className="space-y-1.5">
          {noiseData.map((n, i) => (
            <div key={i} className="p-2 rounded-md hardware-card">
              <div className="text-[9px] font-bold uppercase text-slate-500 mb-0.5">
                Noise Level #{n.sensorIndex}
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-xl font-bold tracking-tighter text-sky-100">
                  {Math.round(n.noise)}
                </span>
                <span className="text-xs text-slate-500 pb-0.5">dB</span>
              </div>
              <div className="flex gap-1 mt-1.5">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex-1 h-1.5 rounded-sm transition-all duration-300',
                      idx / 12 < n.noise / 100 ? 'bg-sky-500' : 'bg-slate-700'
                    )}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
