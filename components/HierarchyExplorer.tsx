
import React, { useState, useEffect } from 'react';
import { GitBranch, ChevronRight, ChevronDown, Database, Map, Sprout, ShieldCheck, Info, FileText, Share2, AlertTriangle, Loader2 } from 'lucide-react';
import { FarmData, HierarchyNode, HierarchyGraph, FarmerDocument, SubsidyRate } from '../types';
import { extractHierarchy } from '../services/hierarchyEngine';
import { api } from '../services/api';

interface HierarchyExplorerProps {
    farmData: FarmData;
    selectedYear: number;
}

const HierarchyExplorer: React.FC<HierarchyExplorerProps> = ({ farmData, selectedYear }) => {
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
                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border-2 ${
                        isSelected 
                        ? 'bg-emerald-50 border-emerald-500 shadow-lg' 
                        : 'bg-white border-slate-50 hover:border-emerald-200'
                    }`}
                    style={{ marginLeft: `${depth * 24}px` }}
                >
                    <div className="text-slate-300">
                        {hasChildren ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <div className="w-[14px]" />}
                    </div>
                    <NodeIcon type={node.type} />
                    <span className={`text-sm font-black ${isSelected ? 'text-emerald-900' : 'text-slate-700'}`}>
                        {node.label}
                    </span>
                    {node.value && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ml-auto ${
                            node.status === 'ERROR' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                            {node.value}
                        </span>
                    )}
                </div>
                
                {isExpanded && hasChildren && (
                    <div className="mt-2 space-y-2">
                        {node.children?.map(childId => (
                            <RenderNode key={childId} nodeId={childId} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (isLoading || !graph) return <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-4"><Loader2 className="animate-spin text-emerald-600" size={32} /><p className="font-bold">Generowanie modelu kampanii...</p></div>;

    const selectedNode = selectedNodeId ? getNodeById(selectedNodeId) : null;

    return (
        <div className="space-y-6">
            <div className="bg-slate-100/50 p-8 rounded-[2.5rem] border border-slate-200">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                             <Share2 size={24} className="text-emerald-600"/>
                             Audyt Strukturalny DAG
                        </h2>
                        <p className="text-slate-500 text-sm font-medium">Wizualizacja zależności kampanii dopłat bezpośrednich.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                    <div className="lg:col-span-3 space-y-2 h-[650px] overflow-y-auto pr-4 custom-scrollbar">
                        <RenderNode nodeId={graph.rootId} />
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        {selectedNode ? (
                            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300 relative overflow-hidden flex flex-col h-[650px]">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                                
                                <div className="flex items-center gap-4 mb-8 relative z-10">
                                    <div className="p-4 bg-emerald-100 text-emerald-700 rounded-2xl shadow-lg shadow-emerald-50">
                                        <NodeIcon type={selectedNode.type} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] mb-1">Audyt Węzła</h3>
                                        <p className="text-lg font-black text-slate-800">{selectedNode.label}</p>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-8 relative z-10 pr-2">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Logiczny</span>
                                        <div className={`flex items-center gap-2 text-xs font-black uppercase ${
                                            selectedNode.status === 'VALID' ? 'text-emerald-600' : 
                                            selectedNode.status === 'ERROR' ? 'text-red-600' : 'text-amber-600'
                                        }`}>
                                            {selectedNode.status === 'VALID' ? <Database size={16} /> : <AlertTriangle size={16} />}
                                            {selectedNode.status === 'VALID' ? 'Zgodność Potwierdzona' : (selectedNode.status === 'ERROR' ? 'Konflikt Krytyczny' : 'Wymaga Weryfikacji')}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Szczegóły Powiązania</span>
                                        <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-5 rounded-2xl font-medium border border-slate-100 shadow-inner">
                                            {selectedNode.evidence.details}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metadane Systemowe</span>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Źródło</p>
                                                <p className="text-xs font-black text-slate-700">{selectedNode.evidence.source}</p>
                                            </div>
                                            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Czas</p>
                                                <p className="text-xs font-black text-slate-700">{new Date(selectedNode.evidence.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 mt-6 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-300 font-mono">
                                    <span>REF: {selectedNode.id.split('_')[0]}</span>
                                    <span className="flex items-center gap-1 font-black">STANDARD DAG V3.2</span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-12 text-center text-slate-400 h-[650px]">
                                <Share2 size={64} className="mb-6 opacity-10 animate-pulse" />
                                <p className="text-base font-black uppercase tracking-[0.2em]">Wybierz węzeł</p>
                                <p className="text-xs mt-3 max-w-[200px] font-medium leading-relaxed">System wyświetli logiczne powiązania i dowody źródłowe dla wybranego elementu kampanii.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HierarchyExplorer;
