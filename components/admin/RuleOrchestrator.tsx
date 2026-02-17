import React, { useState, useEffect, useCallback } from 'react';
import { Share2, Plus, Play, AlertOctagon, ArrowRight, X, Check, GitMerge, FileText } from 'lucide-react';

interface RuleNode {
    id: string;
    type: 'CONDITION' | 'CONSEQUENCE' | 'START';
    label: string;
    x: number;
    y: number;
    data?: any;
}

interface RuleEdge {
    id: string;
    source: string;
    target: string;
}

const RuleOrchestrator: React.FC = () => {
    const [nodes, setNodes] = useState<RuleNode[]>([
        { id: 'start', type: 'START', label: 'Start Kampanii', x: 50, y: 300 }
    ]);
    const [edges, setEdges] = useState<RuleEdge[]>([]);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [validationStatus, setValidationStatus] = useState<'VALID' | 'INVALID' | 'IDLE'>('IDLE');
    const [validationMsg, setValidationMsg] = useState('');

    // Load graph from local storage
    useEffect(() => {
        const stored = localStorage.getItem('ao_rule_graph');
        if (stored) {
            const data = JSON.parse(stored);
            setNodes(data.nodes || []);
            setEdges(data.edges || []);
        }
    }, []);

    const saveGraph = (newNodes: RuleNode[], newEdges: RuleEdge[]) => {
        setNodes(newNodes);
        setEdges(newEdges);
        localStorage.setItem('ao_rule_graph', JSON.stringify({ nodes: newNodes, edges: newEdges }));
    };

    const addNode = (type: 'CONDITION' | 'CONSEQUENCE') => {
        const id = `node_${Math.random().toString(36).substr(2, 9)}`;
        const newNode: RuleNode = {
            id,
            type,
            label: type === 'CONDITION' ? 'Nowy Warunek' : 'Nowy Skutek',
            x: 200 + Math.random() * 100,
            y: 200 + Math.random() * 100
        };
        saveGraph([...nodes, newNode], edges);
        setSelectedNode(id);
    };

    const deleteNode = (id: string) => {
        if (id === 'start') return;
        saveGraph(
            nodes.filter(n => n.id !== id),
            edges.filter(e => e.source !== id && e.target !== id)
        );
        setSelectedNode(null);
    };

    // Simple DAG Cycle Detection
    const validateGraph = () => {
        setValidationStatus('IDLE');
        setValidationMsg('');

        // 1. Cycle Detection (DFS)
        const adj = new Map<string, string[]>();
        edges.forEach(e => {
            if (!adj.has(e.source)) adj.set(e.source, []);
            adj.get(e.source)?.push(e.target);
        });

        const visited = new Set<string>();
        const recStack = new Set<string>();
        let hasCycle = false;

        const isCyclic = (curr: string): boolean => {
            visited.add(curr);
            recStack.add(curr);

            const children = adj.get(curr) || [];
            for (const child of children) {
                if (!visited.has(child)) {
                    if (isCyclic(child)) return true;
                } else if (recStack.has(child)) {
                    return true;
                }
            }
            recStack.delete(curr);
            return false;
        };

        for (const node of nodes) {
            if (!visited.has(node.id)) {
                if (isCyclic(node.id)) {
                    hasCycle = true;
                    break;
                }
            }
        }

        if (hasCycle) {
            setValidationStatus('INVALID');
            setValidationMsg('Wykryto pętlę logiczną (CYKL)! Graf musi być acykliczny (DAG).');
        } else {
            setValidationStatus('VALID');
            setValidationMsg('Graf jest poprawny (DAG). Brak cykli.');
        }
    };

    // Update node position (drag logic simplified)
    const handleDrag = (id: string, dx: number, dy: number) => {
        setNodes(nodes.map(n => n.id === id ? { ...n, x: n.x + dx, y: n.y + dy } : n));
    };

    // Selection Logic for creating edges (Click source -> Click target)
    const [connectModeSource, setConnectModeSource] = useState<string | null>(null);

    const handleNodeClick = (id: string) => {
        if (connectModeSource) {
            if (connectModeSource !== id) {
                // Create Edge
                const newEdge: RuleEdge = {
                    id: `edge_${Math.random().toString(36).substr(2, 9)}`,
                    source: connectModeSource,
                    target: id
                };
                saveGraph(nodes, [...edges, newEdge]);
                setConnectModeSource(null);
            }
        } else {
            setSelectedNode(id);
        }
    };

    return (
        <div className="h-[800px] flex flex-col bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
            {/* TOOLBAR */}
            <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <Share2 className="text-purple-600" /> Orkiestrator Reguł
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={() => addNode('CONDITION')} className="px-3 py-1.5 bg-slate-100 font-bold text-xs rounded-lg hover:bg-slate-200 flex items-center gap-1"><ArrowRight size={14} /> Warunek</button>
                        <button onClick={() => addNode('CONSEQUENCE')} className="px-3 py-1.5 bg-slate-100 font-bold text-xs rounded-lg hover:bg-slate-200 flex items-center gap-1"><Check size={14} /> Skutek</button>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {validationStatus !== 'IDLE' && (
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center gap-2 ${validationStatus === 'VALID' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {validationStatus === 'VALID' ? <Check size={14} /> : <AlertOctagon size={14} />}
                            {validationMsg}
                        </div>
                    )}
                    <button onClick={validateGraph} className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-black"><Play size={16} /> Audyt Grafu</button>
                </div>
            </div>

            {/* CANVAS AREA */}
            <div className="flex-1 relative bg-slate-50 overflow-hidden">
                {/* GRID BACKGROUND */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                ></div>

                {/* EDGES (SVG LAYER) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                        </marker>
                    </defs>
                    {edges.map(edge => {
                        const s = nodes.find(n => n.id === edge.source);
                        const t = nodes.find(n => n.id === edge.target);
                        if (!s || !t) return null;
                        return (
                            <line
                                key={edge.id}
                                x1={s.x + 80} y1={s.y + 40}
                                x2={t.x + 80} y2={t.y + 40}
                                stroke="#94a3b8"
                                strokeWidth="2"
                                markerEnd="url(#arrowhead)"
                            />
                        );
                    })}
                </svg>

                {/* NODES */}
                {nodes.map(node => (
                    <div
                        key={node.id}
                        className={`absolute w-40 p-3 rounded-xl shadow-sm border-2 transition-all cursor-move select-none group
                            ${node.type === 'START' ? 'bg-slate-800 border-slate-900 text-white' :
                                node.type === 'CONDITION' ? 'bg-white border-ember-200 hover:border-amber-400' :
                                    'bg-white border-emerald-200 hover:border-emerald-400'}
                            ${selectedNode === node.id ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
                        `}
                        style={{ left: node.x, top: node.y }}
                        onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id); }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const handleMove = (mv: MouseEvent) => {
                                handleDrag(node.id, mv.clientX - startX, mv.clientY - startY); // Simple delta, works but slightly jerky without ref tracking
                            };
                            const handleUp = () => {
                                window.removeEventListener('mousemove', handleMove);
                                window.removeEventListener('mouseup', handleUp);
                            };
                            window.addEventListener('mousemove', handleMove);
                            window.addEventListener('mouseup', handleUp);
                        }}
                    >
                        <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-wider opacity-70">
                                {node.type === 'START' ? 'Start' : (node.type === 'CONDITION' ? 'Warunek' : 'Skutek')}
                            </span>
                            {node.id !== 'start' && (
                                <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"><X size={12} /></button>
                            )}
                        </div>
                        <div className={`mt-1 font-bold text-sm truncate ${node.type === 'START' ? 'text-white' : 'text-slate-800'}`}>
                            {node.label}
                        </div>

                        {/* Connection Handle Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setConnectModeSource(node.id); }}
                            className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center shadow-sm border transition-all z-20
                                ${connectModeSource === node.id ? 'bg-blue-600 text-white animate-pulse' : 'bg-white text-slate-400 hover:text-blue-600 hover:border-blue-300'}
                            `}
                            title="Połącz węzeł"
                        >
                            <GitMerge size={12} />
                        </button>
                    </div>
                ))}
            </div>

            {/* PROPERTIES PANEL */}
            {selectedNode && (
                <div className="h-64 bg-white border-t border-slate-200 p-6 flex gap-6 z-20">
                    <div className="w-1/3 border-r border-slate-100 pr-6">
                        <h3 className="font-bold text-slate-800 mb-4">Właściwości Węzła</h3>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nazwa / Opis</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-lg font-bold text-slate-700 mb-4"
                            value={nodes.find(n => n.id === selectedNode)?.label || ''}
                            onChange={(e) => saveGraph(nodes.map(n => n.id === selectedNode ? { ...n, label: e.target.value } : n), edges)}
                        />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-800 mb-4">Kontekst Semantyczny</h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center text-slate-400 h-32">
                            <FileText size={24} className="mb-2 opacity-20" />
                            <p className="text-xs">Brak powiązanych dokumentów legislacyjnych.</p>
                            <button className="mt-2 text-[10px] font-bold text-blue-600 hover:underline">Podepnij z Bazy Wiedzy</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RuleOrchestrator;
