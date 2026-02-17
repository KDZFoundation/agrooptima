import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, Database, Loader2 } from 'lucide-react';
import { chatWithAdvisor } from '../services/geminiService';
import { FarmData } from '../types';

interface AIChatProps {
  farmData: FarmData;
}

// Powitanie statyczne - NIE trafia do historii API Gemini
const GREETING = `Dzień dobry! Jestem Twoim asystentem AgroOptima. W czym mogę Ci dzisiaj pomóc?`;

const AIChat: React.FC<AIChatProps> = ({ farmData }) => {
  // Historia zawiera TYLKO wiadomości user/model — bez powitania
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');

    // Dodaj wiadomość użytkownika do historii
    const updatedMessages = [...messages, { role: 'user' as const, text: userMsg }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // Przekaż historię BEZ ostatniej wiadomości (API dostaje ją osobno jako `message`)
      const historyForApi = updatedMessages
        .slice(0, -1)
        .map(m => ({ role: m.role as any, text: m.text }));

      const result = await chatWithAdvisor(historyForApi, userMsg, farmData);
      setMessages(prev => [...prev, { role: 'model', text: result.answer }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Przepraszam, wystąpił błąd podczas generowania odpowiedzi." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100"><Sparkles size={20} /></div>
              <div>
                  <h2 className="font-black text-slate-800 text-base">Asystent Doradcy</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">AgroOptima AI v3.2</p>
              </div>
           </div>
           {farmData.profile.producerId && (
              <div className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-wider">
                  <Database size={12} className="text-emerald-500" />
                  ID: {farmData.profile.producerId}
              </div>
           )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/20">

          {/* === POWITANIE STATYCZNE — nie trafia do API === */}
          <div className="flex justify-start">
            <div className="flex max-w-[90%] sm:max-w-[80%] gap-4 flex-row">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm bg-emerald-600 text-white">
                <Bot size={20} />
              </div>
              <div className="p-5 rounded-3xl text-sm leading-relaxed shadow-sm bg-white text-slate-800 border border-slate-100 rounded-tl-none">
                <div className="prose prose-slate max-w-none whitespace-pre-wrap">
                  {GREETING}
                </div>
              </div>
            </div>
          </div>

          {/* === HISTORIA ROZMOWY === */}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[90%] sm:max-w-[80%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-emerald-600 text-white'}`}>
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className={`p-5 rounded-3xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                }`}>
                  <div className="prose prose-slate max-w-none whitespace-pre-wrap">
                      {msg.text}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start items-center gap-4">
               <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center animate-pulse">
                  <Sparkles size={20} className="text-emerald-600" />
               </div>
               <div className="bg-white border border-slate-100 p-5 rounded-3xl rounded-tl-none shadow-sm flex items-center gap-3">
                  <Loader2 size={16} className="animate-spin text-emerald-500" />
                  <span className="text-xs text-slate-400 font-black uppercase tracking-widest">Myślę...</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-white border-t border-slate-100">
          <div className="relative flex items-center max-w-3xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Zadaj pytanie asystentowi..."
              className="w-full pl-6 pr-16 py-4.5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white transition-all font-medium text-slate-800 shadow-inner"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="absolute right-2.5 p-3.5 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg active:scale-95"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-[9px] text-center text-slate-400 mt-4 font-black uppercase tracking-[0.2em]">
              Sztuczna inteligencja wspomaga proces doradczy • Wersja Standard
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
