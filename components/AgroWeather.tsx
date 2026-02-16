import React, { useState, useEffect } from 'react';
import { CloudRain, Wind, Sun, Thermometer, Sparkles, Loader2, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { analyzeAgroWeather } from '../services/geminiService';
import { Field } from '../types';

interface AgroWeatherProps {
    fields: Field[];
}

const AgroWeather: React.FC<AgroWeatherProps> = ({ fields }) => {
    const [loading, setLoading] = useState(true);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [location, setLocation] = useState('Twoja lokalizacja');
    
    // Symulacja danych pogodowych (w rzeczywistej aplikacji pobierane z API np. OpenWeather)
    const mockWeather = {
        temp: 18,
        wind: 8,
        rain: 0,
        humidity: 65,
        forecast: "Słonecznie z przelotnymi zachmurzeniami"
    };

    useEffect(() => {
        const fetchAnalysis = async () => {
            setLoading(true);
            try {
                // Pobieranie unikalnych upraw dla lepszej analizy
                // Fixed: Explicitly typed uniqueCrops as string[] to resolve the 'unknown[]' inference issue
                const uniqueCrops: string[] = Array.from(new Set(fields.map(f => f.crop)));
                
                // Próba pobrania realnej lokalizacji jeśli uprawnienia nadane
                if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(async (pos) => {
                        const lat = pos.coords.latitude.toFixed(2);
                        const lon = pos.coords.longitude.toFixed(2);
                        setLocation(`Działki w okolicy ${lat}, ${lon}`);
                    });
                }

                const result = await analyzeAgroWeather(mockWeather, location, uniqueCrops);
                setAnalysis(result);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, [fields, location]);

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Sun className="text-amber-500" size={20} />
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Warunki Agrotechniczne</h3>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <MapPin size={12} /> {location}
                </div>
            </div>

            <div className="p-5 flex gap-6 overflow-x-auto">
                <WeatherStat icon={<Thermometer size={18}/>} label="Temp." value={`${mockWeather.temp}°C`} color="text-orange-600" />
                <WeatherStat icon={<Wind size={18}/>} label="Wiatr" value={`${mockWeather.wind} km/h`} color="text-blue-600" />
                <WeatherStat icon={<CloudRain size={18}/>} label="Opady" value={`${mockWeather.rain} mm`} color="text-indigo-600" />
                <WeatherStat icon={<Sun size={18}/>} label="Wilgotność" value={`${mockWeather.humidity}%`} color="text-teal-600" />
            </div>

            <div className="p-5 pt-0">
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-100/50 rounded-bl-full flex items-center justify-center -mr-2 -mt-2">
                        <Sparkles size={24} className="text-emerald-500 animate-pulse" />
                    </div>
                    
                    <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <Sparkles size={14} /> Asystent Polowy Gemini
                    </h4>

                    {loading ? (
                        <div className="flex items-center gap-3 py-2">
                            <Loader2 size={18} className="animate-spin text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-700 italic">Analizuję okna agrotechniczne...</span>
                        </div>
                    ) : (
                        <div className="text-xs text-emerald-900 leading-relaxed font-medium space-y-2 whitespace-pre-line">
                            {analysis}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const WeatherStat = ({ icon, label, value, color }: any) => (
    <div className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[70px]">
        <div className={`p-2 bg-slate-100 rounded-xl ${color}`}>{icon}</div>
        <span className="text-[9px] font-black text-slate-400 uppercase">{label}</span>
        <span className="text-sm font-black text-slate-800">{value}</span>
    </div>
);

export default AgroWeather;