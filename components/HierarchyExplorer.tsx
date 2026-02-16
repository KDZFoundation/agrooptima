import React, { useState, useMemo, useEffect } from 'react';
import { GitBranch, ChevronRight, ChevronDown, Database, Map, Sprout, ShieldCheck, Wallet, Info, Search, FileText, Share2, AlertTriangle, Loader2, Sparkles, Link2 } from 'lucide-react';
import { FarmData, HierarchyNode, HierarchyGraph, FarmerDocument, SubsidyRate } from '../types';
import { extractHierarchy } from '../services/hierarchyEngine';
import { api } from '../services/api';

interface HierarchyExplorerProps {
    farmData: FarmData;
    selectedYear: number;
}

const HierarchyExplorer: React.FC<HierarchyExplorerProps> = ({ farmData, selectedYear }) => {
    const [extraData, setExtraData] = useState<{docs: FarmerDocument[], rates: SubsidyRate[]}>({docs: [], rates: []});
    const [isLoading, setIsLoading] = useState(true);
    const [graph, setGraph] = useState<HierarchyGraph | null>(null);

    useEffect(() => {
        const buildGraph = async () => {
            setIsLoading(true);
            try {
                const clients = await api.getClients();
                const client = clients.find(c => c.producerId === farmData.profile.producerId);
                const rates = await api.getRates();
                
                const docs = client?.documents || [];
                const resRates = rates.length > 0 ? rates : [];

                const g = await extractHierarchy(farmData, selectedYear, docs, resRates);
                setGraph(g);
                setExtraData({ docs, rates: resRates });
            } catch (e) {
                console.error("Audit graph build failed", e);
            } finally {
                setIsLoading(false);
            }
        };
        buildGraph();
    }, [farmData, selectedYear]);

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    useEffect(() => {
        if (graph) setExpandedIds(new Set([graph.rootId]));
    }, [graph]);

    const toggleExpand = (id: string) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedIds(next);
    };

    const getNodeById = (id: string) => graph?.nodes.find(n => n.id === id);

    const NodeIcon = ({ type }: { type: HierarchyNode['type'] }) => {
        switch (type) {
            case 'FARM': return <Database size={16} className="text-emerald-600" />;
            case 'COMMUNE': return <Map size={16} className="text-blue-600" />;
            case 'PARCEL_REF': return <GitBranch size={16} className="text-amber-600" />;
            case 'AGRI_PARCEL': return <Sprout size={16} className="text-green-600" />;
            case 'ECO_SCHEME': return <ShieldCheck size={16} className="text-purple-600" />;
            case 'FINANCIAL_RESULT': return <FileText size={16} className="text-red-500" />;
            default: return <Info size={16} />;
        }
    };

    // Fixed: Added React.FC type to RenderNode to properly handle 'key' prop in recursive mapping
    const RenderNode: React.FC<{ nodeId: string; depth?: number }> = ({ nodeId, depth = 0 }) => {
        const node = getNodeById(nodeId);
        if (!node) return null;

        const isExpanded = expandedIds.has(node.id);
        const hasChildren = node.children && node.children.length > 0;
        const isSelected = selectedNodeId === node.id;

        return (
            <div className="select-none">
                <div 
                    onClick={() => {
                        setSelectedNodeId(node.id);
                        if (hasChildren) toggleExpand(node.id);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border ${
                        isSelected 
                        ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                        : 'hover:bg-slate-50 border-transparent'
                    }`}
                    style={{ marginLeft: `${depth * 20}px` }}
                >
                    <div className="text-slate-400">
                        {hasChildren ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <div className="w-[14px]" />}
                    </div>
                    <NodeIcon type={node.type} />
                    <span className={`text-sm font-semibold ${isSelected ? 'text-emerald-800' : 'text-slate-700'}`}>
                        {node.label}
                    </span>
                    {node.value && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ml-auto ${
                            node.status === 'ERROR' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                            {node.value}
                        </span>
                    )}
                </div>
                
                {isExpanded && hasChildren && (
                    <div className="mt-1">
                        {node.children?.map(childId => (
                            <RenderNode key={childId} nodeId={childId} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (isLoading || !graph) return <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-4"><Loader2 className="animate-spin text-emerald-600" size={32} /><p className="font-bold">Generowanie modelu wektorowego kampanii...</p></div>;

    const selectedNode = selectedNodeId ? getNodeById(selectedNodeId) : null;

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                             <Share2 size={20} className="text-emerald-600"/>
                             Analiza Strukturalna DAG + Embeddings
                        </h2>
                        <p className="text-slate-500 text-xs">Wizualizacja powiązań między działkami a dowodami semantycznymi w dokumentach.</p>
                    </div>
                    <div className="flex gap-2">
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200 flex items-center gap-1">
                            <Sparkles size={10} /> Vector Linker active
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* HIERARCHY TREE */}
                    <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 h-[600px] overflow-y-auto shadow-sm custom-scrollbar">
                        <RenderNode nodeId={graph.rootId} />
                    </div>

                    {/* EVIDENCE LAYER */}
                    <div className="lg:col-span-2 space-y-6">
                        {selectedNode ? (
                            <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-lg animate-in fade-in slide-in-from-right-4 duration-300 relative overflow-hidden flex flex-col h-[600px]">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 opacity-50"></div>
                                
                                <div className="flex items-center gap-3 mb-6 relative z-10">
                                    <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                                        <NodeIcon type={selectedNode.type} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest opacity-60">Audyt Ścieżki</h3>
                                        <p className="text-base font-black text-emerald-800">{selectedNode.label}</p>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-6 relative z-10 pr-2">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wiarygodność Logiczna</span>
                                        <div className={`flex items-center gap-2 text-xs font-black uppercase ${
                                            selectedNode.status === 'VALID' ? 'text-emerald-600' : 
                                            selectedNode.status === 'ERROR' ? 'text-red-600' : 'text-amber-600'
                                        }`}>
                                            {selectedNode.status === 'VALID' ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                                            {selectedNode.status === 'VALID' ? 'Zgodność Potwierdzona' : (selectedNode.status === 'ERROR' ? 'Konflikt Krytyczny' : 'Wymaga Weryfikacji')}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Szczegóły Powiązania</span>
                                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl font-medium border border-slate-100">
                                            {selectedNode.evidence.details}
                                        </p>
                                    </div>

                                    {/* SEMANTIC MATCHES - DOWODY Z DOKUMENTÓW DZIĘKI EMBEDDINGOM */}
                                    {selectedNode.evidence.semanticMatches && selectedNode.evidence.semanticMatches.length > 0 && (
                                        <div className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-500">
                                            <div className="flex items-center gap-2">
                                                <Sparkles size={14} className="text-emerald-500" />
                                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Semantyczne Dowody Źródłowe</span>
                                            </div>
                                            <div className="space-y-3">
                                                {selectedNode.evidence.semanticMatches.map(match => (
                                                    <div key={match.id} className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs italic text-slate-700 relative overflow-hidden group">
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1">
                                                                <FileText size={10} /> {match.documentName}
                                                            </span>
                                                        </div>
                                                        "...{match.content.substring(0, 150)}..."
                                                        <button className="mt-2 text-[9px] font-black text-emerald-700 hover:text-emerald-900 uppercase flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Link2 size={10} /> Pokaż w dokumencie
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-300 font-mono">
                                    <span>UID: {selectedNode.id}</span>
                                    <span className="flex items-center gap-1"><Database size={8}/> WPR-DAG-V3</span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 h-[600px]">
                                <Share2 size={48} className="mb-3 opacity-20 animate-pulse" />
                                <p className="text-sm font-bold uppercase tracking-widest">Wybierz węzeł grafu</p>
                                <p className="text-xs mt-2 max-w-[200px]">System wyświetli powiązane semantycznie fragmenty dokumentów dzięki embeddingom Gemini.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HierarchyExplorer;