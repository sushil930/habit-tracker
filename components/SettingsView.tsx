import React, { useRef, useState } from 'react';
import { AlertTriangle, Database, Trash2, Download, Upload, FileJson, Archive, RefreshCw, Layers } from 'lucide-react';
import { Button } from './ui/Button';
import { Habit } from '../types';
import { HabitIcon } from './HabitIcon';
import { exportBackup, importBackup, isAutoBackupEnabled, setAutoBackupEnabled } from '../services/nativeFileService';
import { parseBackupJson } from '../services/backupService';

interface SettingsViewProps {
  onClearData: () => void;
  onImportData: (data: any) => void;
  habits: Habit[];
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onClearData, onImportData, habits, onRestore, onDelete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const archivedHabits = habits.filter(h => h.archived);
  const [autoBackupEnabled, setAutoBackupEnabledState] = useState<boolean>(() => isAutoBackupEnabled());

  const handleExport = async () => {
    try {
      const savedPath = await exportBackup(habits);
      if (savedPath) {
        alert(`Backup successfully saved to:\n${savedPath}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export backup.');
    }
  };

  const handleImportClick = async () => {
    // If running in Tauri, use native dialog; otherwise fall back to browser file input.
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        const imported = await importBackup();
        if (imported) onImportData(imported);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to import backup.');
      }
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const habitsFromBackup = parseBackupJson(event.target?.result as string);
        onImportData(habitsFromBackup);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to parse the backup file. Please ensure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
    
    // Reset the input so the same file can be selected again if needed
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your application preferences and data.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
               <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Data Management</h3>
               <p className="text-slate-500 dark:text-slate-400 text-sm">Control your local data storage.</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-8">
           {/* Backup & Restore */}
           <div className="space-y-4">
              <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <FileJson className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                Backup & Restore
              </h4>
              <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={autoBackupEnabled}
                  onChange={(e) => {
                    setAutoBackupEnabledState(e.target.checked);
                    setAutoBackupEnabled(e.target.checked);
                  }}
                />
                Enable auto-backup (desktop only)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-200 text-sm">Export Data</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Download a copy of your habits and history as a JSON file.</p>
                  </div>
                  <Button variant="secondary" onClick={handleExport} className="w-full justify-center">
                    <Download className="w-4 h-4 mr-2" />
                    Export Backup
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-200 text-sm">Import Data</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Restore your habits from a backup file. This will replace current data.</p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden" 
                  />
                  <Button variant="secondary" onClick={handleImportClick} className="w-full justify-center">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Backup
                  </Button>
                </div>
              </div>
           </div>

           <div className="border-t border-slate-100 dark:border-slate-800" />
           
           {/* Archived Habits */}
           <div className="space-y-4">
             <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <Archive className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                Archived Habits
             </h4>
             {archivedHabits.length > 0 ? (
               <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50/30 dark:bg-slate-800/30">
                 {archivedHabits.map((habit, index) => (
                   <div 
                    key={habit.id} 
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      index !== archivedHabits.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''
                    }`}
                   >
                     <div className="flex items-center gap-3">
                       <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: habit.color + '20', color: habit.color }}
                        >
                          <HabitIcon iconName={habit.icon} className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{habit.name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{habit.category} • Archived</p>
                        </div>
                     </div>
                     <div className="flex gap-2 justify-end">
                       <Button size="sm" variant="secondary" onClick={() => onRestore(habit.id)} title="Restore to dashboard">
                         <RefreshCw className="w-4 h-4 mr-1.5" />
                         Restore
                       </Button>
                       <Button size="sm" variant="ghost" onClick={() => onDelete(habit.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                         <Trash2 className="w-4 h-4" />
                       </Button>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="p-8 text-center bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                 <Layers className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                 <p className="text-sm text-slate-500 dark:text-slate-400">No archived habits found.</p>
               </div>
             )}
           </div>

           <div className="border-t border-slate-100 dark:border-slate-800" />

           {/* Danger Zone */}
           <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
             <div className="flex gap-4">
               <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg shrink-0 h-fit">
                 <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
               </div>
               <div>
                 <h4 className="font-semibold text-red-900 dark:text-red-400">Danger Zone</h4>
                 <p className="text-sm text-red-700 dark:text-red-300/80 mt-1 max-w-lg leading-relaxed">
                   Permanently remove all habits, tracking history, and settings from this device. 
                   This action cannot be undone.
                 </p>
               </div>
             </div>
             <Button variant="danger" onClick={onClearData} className="shrink-0 w-full md:w-auto">
               <Trash2 className="w-4 h-4 mr-2" />
               Clear All Data
             </Button>
           </div>
        </div>
      </div>
      
      <div className="text-center pt-8">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          HabitFlow v1.0.0 • Local Storage Persistence
        </p>
      </div>
    </div>
  );
};