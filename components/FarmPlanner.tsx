
import React, { useState } from 'react';
import { Calendar, CheckCircle, Circle, Plus, AlertCircle, Clock, Tractor, Leaf, FileCheck, Filter, X } from 'lucide-react';
import { FarmTask, Field, TaskPriority, TaskType } from '../types';

interface FarmPlannerProps {
  tasks: FarmTask[];
  fields: Field[];
  setTasks: React.Dispatch<React.SetStateAction<FarmTask[]>>;
  isAdvisor: boolean;
}

const FarmPlanner: React.FC<FarmPlannerProps> = ({ tasks, fields, setTasks, isAdvisor }) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New Task Form State
  const [newTask, setNewTask] = useState<Partial<FarmTask>>({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      priority: 'MEDIUM',
      type: 'AGRO',
      fieldId: ''
  });

  const handleToggleStatus = (id: string) => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'DONE' ? 'PENDING' : 'DONE' } : t));
  };

  const handleAddTask = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTask.title || !newTask.date) return;

      const field = fields.find(f => f.id === newTask.fieldId);
      const taskToAdd: FarmTask = {
          id: Math.random().toString(36).substr(2, 9),
          title: newTask.title,
          description: newTask.description,
          date: newTask.date,
          priority: newTask.priority as TaskPriority,
          type: newTask.type as TaskType,
          status: 'PENDING',
          fieldId: newTask.fieldId,
          fieldName: field ? field.name : undefined
      };

      setTasks(prev => [...prev, taskToAdd]);
      setShowAddModal(false);
      setNewTask({ title: '', description: '', date: new Date().toISOString().split('T')[0], priority: 'MEDIUM', type: 'AGRO', fieldId: '' });
  };

  const filteredTasks = tasks.filter(t => {
      if (activeFilter === 'PENDING') return t.status === 'PENDING';
      if (activeFilter === 'DONE') return t.status === 'DONE';
      return true;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getPriorityColor = (p: TaskPriority) => {
      switch(p) {
          case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
          case 'MEDIUM': return 'text-amber-600 bg-amber-50 border-amber-200';
          case 'LOW': return 'text-blue-600 bg-blue-50 border-blue-200';
      }
  };

  const getTypeIcon = (t: TaskType) => {
      switch(t) {
          case 'AGRO': return <Tractor size={16} />;
          case 'DEADLINE': return <AlertCircle size={16} />;
          case 'CONTROL': return <FileCheck size={16} />;
          default: return <Leaf size={16} />;
      }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <Calendar className="text-emerald-600" />
             Terminarz Agrotechniczny
          </h2>
          <p className="text-slate-500 mt-1">
              {isAdvisor ? 'Planuj zabiegi i zadania dla swoich klientów.' : 'Twój plan prac i ważne terminy.'}
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button 
                onClick={() => setShowAddModal(true)}
                className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium shadow-sm transition-colors"
            >
                <Plus size={20} />
                Nowe Zadanie
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
          <button onClick={() => setActiveFilter('ALL')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${activeFilter === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Wszystkie</button>
          <button onClick={() => setActiveFilter('PENDING')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${activeFilter === 'PENDING' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Do zrobienia</button>
          <button onClick={() => setActiveFilter('DONE')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${activeFilter === 'DONE' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Zakończone</button>
      </div>

      {/* Task List */}
      <div className="space-y-3">
          {filteredTasks.map(task => (
              <div key={task.id} className={`bg-white p-4 rounded-xl border transition-all ${task.status === 'DONE' ? 'border-slate-100 opacity-60' : 'border-slate-200 hover:border-emerald-300 hover:shadow-md'}`}>
                  <div className="flex items-start gap-4">
                      <button 
                        onClick={() => handleToggleStatus(task.id)}
                        className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'DONE' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-500 text-transparent'}`}
                      >
                          <CheckCircle size={14} fill="currentColor" />
                      </button>
                      
                      <div className="flex-1">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1">
                              <h3 className={`font-bold text-lg ${task.status === 'DONE' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{task.title}</h3>
                              <div className="flex items-center gap-2">
                                  {task.fieldName && (
                                      <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded flex items-center gap-1">
                                          <Leaf size={10} /> {task.fieldName}
                                      </span>
                                  )}
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase ${getPriorityColor(task.priority)}`}>
                                      {task.priority === 'HIGH' ? 'Pilne' : task.priority === 'MEDIUM' ? 'Ważne' : 'Info'}
                                  </span>
                              </div>
                          </div>
                          
                          <p className="text-slate-500 text-sm mb-3">{task.description || 'Brak dodatkowego opisu.'}</p>
                          
                          <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                              <span className="flex items-center gap-1">
                                  <Clock size={14} /> Termin: <span className={`text-slate-600 ${new Date(task.date) < new Date() && task.status !== 'DONE' ? 'text-red-500 font-bold' : ''}`}>{task.date}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                  {getTypeIcon(task.type)} {task.type === 'AGRO' ? 'Zabieg' : task.type === 'DEADLINE' ? 'Termin urzędowy' : 'Kontrola'}
                              </span>
                          </div>
                      </div>
                  </div>
              </div>
          ))}
          {filteredTasks.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                  <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Filter size={24} className="opacity-50" />
                  </div>
                  <p>Brak zadań spełniających kryteria.</p>
              </div>
          )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center p-5 border-b border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800">Dodaj Nowe Zadanie</h3>
                      <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>
                  <form onSubmit={handleAddTask} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Tytuł</label>
                          <input type="text" required className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                                 value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} placeholder="np. Siew kukurydzy" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                              <input type="date" required className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                                     value={newTask.date} onChange={e => setNewTask({...newTask, date: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Priorytet</label>
                              <select className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                      value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})}>
                                  <option value="LOW">Niski (Info)</option>
                                  <option value="MEDIUM">Średni (Ważne)</option>
                                  <option value="HIGH">Wysoki (Pilne)</option>
                              </select>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Przypisz do pola (opcjonalne)</label>
                          <select className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                  value={newTask.fieldId} onChange={e => setNewTask({...newTask, fieldId: e.target.value})}>
                              <option value="">-- Ogólne --</option>
                              {fields.map(f => (
                                  <option key={f.id} value={f.id}>{f.name} ({f.area} ha)</option>
                              ))}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Opis</label>
                          <textarea className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24 resize-none" 
                                    value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} placeholder="Dodatkowe uwagi..."></textarea>
                      </div>
                      <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700">Zapisz Zadanie</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default FarmPlanner;
