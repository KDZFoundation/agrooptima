
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, Database, FileText, Info, ExternalLink } from 'lucide-react';
import { chatWithAdvisor } from '../services/geminiService';
import { FarmData, KnowledgeChunk } from '../types';

interface AIChatProps {
  farmData: FarmData;
}

const AIChat: React.FC<AIChatProps> = ({ farmData }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string, citations?: KnowledgeChunk[]}[]>([
    { role: 'model', text: `Dzień dobry! Jestem gotowy do analizy Twoich dokumentów źródłowych. O co chcesz zapytać?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<KnowledgeChunk | null>(null);
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
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const result = await chatWithAdvisor(messages.map(m => ({role: m.role as any, text: m.text})), userMsg, farmData);
      setMessages(prev => [...prev, { role: 'model', text: result.answer, citations: result.citations }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Przepraszam, wystąpił błąd silnika RAG." }]);
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

  const renderTextWithCitations = (text: string, citations: KnowledgeChunk[] = []) => {
    return text.split(/(\[\d+\])/g).map((part, i) => {
        const match = part.match(/\[(\d+)\]/);
        if (match) {
            const index = parseInt(match[1]) - 1;
            const citation = citations[index];
            if (citation) {
                return (
                    <button
                        key={i}
                        onClick={() => setSelectedCitation(citation)}
                        className="mx-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded hover:bg-emerald-200 transition-colors border border-emerald-200 align-top"
                    >
                        {match[0]}
                    </button>
                );
            }
        }
        return part;
    });
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6">
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-600 text-white rounded-lg"><Sparkles size={16} /></div>
              <div>
                  <h2 className="font-bold text-slate-800 text-sm">Asystent Semantyczny (RAG)</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Grounding Engine 2.1</p>
              </div>
           </div>
           {farmData.profile.producerId && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                  <Database size={10} className="text-emerald-500" />
                  ID: {farmData.profile.producerId}
              </div>
           )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-emerald-600 text-white'}`}>
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm relative group ${
                  msg.role === 'user' 
                    ? 'bg-white text-slate-800 border border-slate-100 rounded-tr-none' 
                    : 'bg-white text-slate-800 border border-emerald-100 rounded-tl-none ring-1 ring-emerald-50'
                }`}>
                  <div className="prose prose-slate max-w-none">
                      {renderTextWithCitations(msg.text, msg.citations)}
                  </div>
                  
                  {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-full mb-1">Źródła odpowiedzi:</span>
                          {msg.citations.map((c, i) => (
                              <button 
                                key={c.id} 
                                onClick={() => setSelectedCitation(c)}
                                className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors"
                              >
                                  <FileText size={10} />
                                  [{i+1}] {c.documentName}
                              </button>
                          ))}
                      </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start items-center gap-3">
               <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center animate-pulse">
                  <Sparkles size={18} className="text-emerald-600" />
               </div>
               <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                  <span className="text-xs text-slate-400 font-bold ml-2">Przeszukiwanie dokumentów...</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-200">
          <div className="relative flex items-center max-w-4xl mx-auto">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Zapytaj np. 'Ile hektarów kukurydzy zadeklarowałem we wniosku?'"
              className="w-full pl-5 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white transition-all font-medium text-slate-800 shadow-inner"
            />
            <button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="absolute right-2 p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-all shadow-md active:scale-95"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-[9px] text-center text-slate-400 mt-3 font-bold uppercase tracking-[0.2em]">
              Weryfikacja oparta o dokumenty źródłowe • AgroOptima Grounding
          </p>
        </div>
      </div>

      {/* INSPEKTOR PRZYPISÓW (EVIDENCE VIEWER) */}
      <div className={`w-80 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden transition-all ${selectedCitation ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 pointer-events-none'}`}>
          {selectedCitation ? (
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <Info size={16} className="text-emerald-400" />
                          <h3 className="text-xs font-black uppercase tracking-widest">Weryfikacja Dowodu</h3>
                      </div>
                      <button onClick={() => setSelectedCitation(null)} className="p-1 hover:bg-white/10 rounded"><X size={18} /></button>
                  </div>
                  <div className="p-5 border-b border-slate-100">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><FileText size={20} /></div>
                          <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase">Dokument</p>
                              <p className="text-sm font-bold text-slate-800 truncate max-w-[180px]">{selectedCitation.documentName}</p>
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <p className="text-[8px] font-black text-slate-400 uppercase">Sekcja</p>
                              <p className="text-[10px] font-bold text-slate-700">{selectedCitation.metadata.section}</p>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <p className="text-[8px] font-black text-slate-400 uppercase">Tokens</p>
                              <p className="text-[10px] font-bold text-slate-700">{selectedCitation.tokens}</p>
                          </div>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 bg-amber-50/30">
                      <p className="text-[10px] font-black text-amber-800/50 uppercase tracking-widest mb-3">Oryginalny fragment tekstu:</p>
                      <div className="text-xs text-slate-700 leading-relaxed font-medium italic border-l-4 border-emerald-500 pl-4 py-1">
                          "...{selectedCitation.content}..."
                      </div>
                      <div className="mt-8 p-4 bg-white rounded-xl border border-slate-200 text-center">
                          <p className="text-[10px] text-slate-400 font-bold mb-3 italic">Uwierzytelniono semantycznie przez Gemini 3 Flash</p>
                          <button className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                              <ExternalLink size={12} /> Otwórz Dokument
                          </button>
                      </div>
                  </div>
              </div>
          ) : (
              <div className="h-full flex items-center justify-center text-slate-300 p-8 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest">Kliknij przypis [n], aby zobaczyć dowód źródłowy</p>
              </div>
          )}
      </div>
    </div>
  );
};

const X = ({size, className}: any) => <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

export default AIChat;
