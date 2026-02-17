import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GitBranch, ChevronRight, ChevronDown, Database, Map, Sprout, ShieldCheck, Wallet, Info, Search, FileText, Share2, AlertTriangle, Loader2, Sparkles, Link2, Layout, GitMerge, ArrowRight } from 'lucide-react';
import { FarmData, HierarchyNode, HierarchyGraph, FarmerDocument, SubsidyRate } from '../types';
import { extractHierarchy } from '../services/hierarchyEngine';
import { api } from '../services/api';

interface HierarchyExplorerProps {
    farmData: FarmData;
    selectedYear: number;
}

const HierarchyExplorer: React.FC<HierarchyExplorerProps> = ({ farmData, selectedYear }) => {
    const [extraData, setExtraData] = useState<{ docs: FarmerDocument[], rates: SubsidyRate[] }>({ docs: [], rates: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [graph, setGraph] = useState<HierarchyGraph | null>(null);
    const [viewMode, setViewMode] = useState<'TREE' | 'PROCESS'>('PROCESS');

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
        if (graph) {
            setExpandedIds(new Set([graph.rootId]));
            setSelectedNodeId(graph.rootId);
        }
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
            case 'FARM': return <Database size={16} className="text-slate-600" />;
            case 'COMMUNE': return <Map size={16} className="text-blue-600" />;
            case 'PARCEL_REF': return <GitBranch size={16} className="text-amber-600" />;
            case 'AGRI_PARCEL': return <Sprout size={16} className="text-emerald-600" />;
            case 'ECO_SCHEME': return <ShieldCheck size={16} className="text-purple-600" />;
            case 'FINANCIAL_RESULT': return <FileText size={16} className="text-red-500" />;
            default: return <Info size={16} />;
        }
    };

    // Columns structure for Process View
    const processColumns = useMemo(() => {
        if (!graph) return { context: [], assets: [], actions: [], effects: [], source: [] };

        const context = graph.nodes.filter(n => n.type === 'FARM' || n.type === 'COMMUNE');
        const source = graph.nodes.filter(n => n.type === 'FINANCIAL_RESULT');
        const assets = graph.nodes.filter(n => n.type === 'PARCEL_REF');
        const actions = graph.nodes.filter(n => n.type === 'AGRI_PARCEL');
        const effects = graph.nodes.filter(n => n.type === 'ECO_SCHEME');

        return { context, source, assets, actions, effects };
    }, [graph]);

    const RenderNodeTree: React.FC<{ nodeId: string; depth?: number }> = ({ nodeId, depth = 0 }) => {
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
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border ${isSelected
                            ? 'bg-emerald-50 border-emerald-200 shadow-sm ring-1 ring-emerald-200'
                            : 'hover:bg-slate-50 border-transparent'
                        }`}
                    style={{ marginLeft: `${depth * 20}px` }}
                >
                    <div className="text-slate-400">
                        {hasChildren ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <div className="w-[14px]" />}
                    </div>
                    <NodeIcon type={node.type} />
                    <span className={`text-sm font-semibold truncate ${isSelected ? 'text-emerald-800' : 'text-slate-700'}`}>
                        {node.label}
                    </span>
                    {node.value && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ml-auto ${node.status === 'ERROR' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                            {node.value}
                        </span>
                    )}
                </div>

                {isExpanded && hasChildren && (
                    <div className="mt-1 relative">
                        <div className="absolute left-[10px] top-0 bottom-0 w-px bg-slate-200" style={{ transform: `translateX(${depth * 20}px)` }}></div>
                        {node.children?.map(childId => (
                            <RenderNodeTree key={childId} nodeId={childId} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const ProcessNodeCard = ({ node }: { node: HierarchyNode }) => {
        const isSelected = selectedNodeId === node.id;
        const isRelated = false; // TODO: Implement path highlighting logic

        return (
            <div
                onClick={() => setSelectedNodeId(node.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${isSelected
                        ? 'bg-emerald-50 border-emerald-400 shadow-md ring-2 ring-emerald-100'
                        : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                    }`}
            >
                <div className="flex justify-between items-start mb-1">
                    <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-white transition-colors">
                        <NodeIcon type={node.type} />
                    </div>
                    <div className={`text-[10px] font-black px-1.5 py-0.5 rounded ${node.status === 'VALID' ? 'bg-green-100 text-green-700' :
                            node.status === 'ERROR' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                        {node.status === 'VALID' ? 'OK' : node.status}
                    </div>
                </div>
                <div className="font-bold text-xs text-slate-800 mb-1 leading-tight">{node.label}</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">{node.value}</div>

                {isSelected && (
                    <div className="absolute -right-1 top-1/2 w-2 h-2 bg-emerald-400 rotate-45 transform -translate-y-1/2"></div>
                )}
            </div>
        );
    };

    if (isLoading || !graph) return <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-4"><Loader2 className="animate-spin text-emerald-600" size={32} /><p className="font-bold">Generowanie modelu wektorowego kampanii...</p></div>;

    const selectedNode = selectedNodeId ? getNodeById(selectedNodeId) : null;

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <Share2 size={20} className="text-emerald-600" />
                            Formalny Graf Zależności (DAG)
                        </h2>
                        <p className="text-slate-500 text-xs">Wizualizacja algorytmicznego procesu decyzyjnego i ekstrakcji hierarchii.</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="bg-white p-1 rounded-lg border border-slate-200 flex">
                            <button
                                onClick={() => setViewMode('TREE')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'TREE' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <Layout size={14} /> Drzewo
                            </button>
                            <button
                                onClick={() => setViewMode('PROCESS')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'PROCESS' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <GitMerge size={14} /> Proces (DAG)
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* VISUALIZATION AREA */}
                    <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[650px]">
                        {viewMode === 'TREE' ? (
                            <div className="p-4 overflow-y-auto custom-scrollbar h-full">
                                <RenderNodeTree nodeId={graph.rootId} />
                            </div>
                        ) : (
                            <div className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-50/50 relative">
                                <div className="absolute inset-0 flex min-w-[800px] h-full p-4 gap-4">
                                    {/* Column 1: Source & Context */}
                                    <div className="w-1/4 flex flex-col gap-4 min-w-[200px]">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">
                                            <Database size={12} /> Kontekst & Źródła
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                            {processColumns.context.map(n => <ProcessNodeCard key={n.id} node={n} />)}
                                            {processColumns.source.map(n => <ProcessNodeCard key={n.id} node={n} />)}
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="w-px bg-slate-200 my-4 flex items-center justify-center">
                                        <ArrowRight size={12} className="text-slate-300" />
                                    </div>

                                    {/* Column 2: Assets (Parcels) */}
                                    <div className="w-1/4 flex flex-col gap-4 min-w-[200px]">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">
                                            <Map size={12} /> Aktywa (Działki)
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                            {processColumns.assets.map(n => <ProcessNodeCard key={n.id} node={n} />)}
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="w-px bg-slate-200 my-4 flex items-center justify-center">
                                        <ArrowRight size={12} className="text-slate-300" />
                                    </div>

                                    {/* Column 3: Actions (Crops) */}
                                    <div className="w-1/4 flex flex-col gap-4 min-w-[200px]">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">
                                            <Sprout size={12} /> Działania (Uprawy)
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                            {processColumns.actions.map(n => <ProcessNodeCard key={n.id} node={n} />)}
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="w-px bg-slate-200 my-4 flex items-center justify-center">
                                        <ArrowRight size={12} className="text-slate-300" />
                                    </div>

                                    {/* Column 4: Effects (Schemes) */}
                                    <div className="w-1/4 flex flex-col gap-4 min-w-[200px]">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">
                                            <Wallet size={12} /> Skutki (Płatności)
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                            {processColumns.effects.map(n => <ProcessNodeCard key={n.id} node={n} />)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* EVIDENCE & DETAILS ORACLE */}
                    <div className="lg:col-span-2 space-y-6">
                        {selectedNode ? (
                            <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-lg h-[650px] flex flex-col relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform duration-700"></div>

                                <div className="flex items-center gap-3 mb-6 relative z-10 border-b border-slate-100 pb-4">
                                    <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl shadow-inner">
                                        <NodeIcon type={selectedNode.type} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest opacity-60">Wyjaśnialność Decyzji</h3>
                                        <p className="text-lg font-black text-emerald-800 leading-tight">{selectedNode.label}</p>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-6 relative z-10 pr-2">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weryfikacja Logiczna</span>
                                        <div className={`flex items-center gap-2 text-xs font-black uppercase px-3 py-2 rounded-lg border ${selectedNode.status === 'VALID' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' :
                                                selectedNode.status === 'ERROR' ? 'text-red-700 bg-red-50 border-red-100' : 'text-amber-700 bg-amber-50 border-amber-100'
                                            }`}>
                                            {selectedNode.status === 'VALID' ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
                                            {selectedNode.status === 'VALID' ? 'Zgodność Potwierdzona' : (selectedNode.status === 'ERROR' ? 'Konflikt Krytyczny' : 'Wymaga Weryfikacji')}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ścieżka Decyzyjna</span>
                                        <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl font-medium border border-slate-100 shadow-inner">
                                            {selectedNode.evidence.details}
                                        </div>
                                    </div>

                                    {/* SEMANTIC MATCHES */}
                                    {selectedNode.evidence.semanticMatches && selectedNode.evidence.semanticMatches.length > 0 && (
                                        <div className="flex flex-col gap-3 pt-2">
                                            <div className="flex items-center gap-2">
                                                <Sparkles size={14} className="text-emerald-500" />
                                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Kontekst Semantyczny (Gemini)</span>
                                            </div>
                                            <div className="space-y-3">
                                                {selectedNode.evidence.semanticMatches.map(match => (
                                                    <div key={match.id} className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs italic text-slate-700 relative overflow-hidden group/match hover:bg-indigo-50 transition-colors">
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400"></div>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1">
                                                                <FileText size={10} /> {match.documentName}
                                                            </span>
                                                        </div>
                                                        <p className="line-clamp-3 group-hover/match:line-clamp-none transition-all">"...{match.content}..."</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-300 font-mono">
                                    <span>UID: {selectedNode.id}</span>
                                    <span className="flex items-center gap-1"><Database size={8} /> WPR-DAG-V3 Engine</span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 h-[650px] flex flex-col items-center justify-center p-8 text-center text-slate-400">
                                <Share2 size={48} className="mb-3 opacity-20 animate-pulse" />
                                <p className="text-sm font-bold uppercase tracking-widest">Wybierz węzeł procesu</p>
                                <p className="text-xs mt-2 max-w-[200px]">System wyświetli dedukcję algorytmiczną i powiązania semantyczne.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HierarchyExplorer;