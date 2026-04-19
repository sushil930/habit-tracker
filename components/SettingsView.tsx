import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Database, Trash2, Download, Upload, FileJson, Archive, RefreshCw, Layers } from 'lucide-react';
import { Button } from './ui/Button';
import { Habit } from '../types';
import { HabitIcon } from './HabitIcon';
import { exportBackup, importBackup, isAutoBackupEnabled, setAutoBackupEnabled } from '../services/nativeFileService';
import { parseBackupJson } from '../services/backupService';
import { isAutostartEnabled, setAutostartEnabled } from '../services/startupService';

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
  const [runOnStartupEnabled, setRunOnStartupEnabledState] = useState<boolean>(false);

  useEffect(() => {
    void (async () => {
      setRunOnStartupEnabledState(await isAutostartEnabled());
    })();
  }, []);

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
        <h2 className="text-2xl font-bold uppercase tracking-stencil text-spectral">Settings</h2>
        <p className="text-xs text-spectral/30 uppercase tracking-nav mt-2">Manage your application preferences and data.</p>
      </div>

      <div className="ghost-panel overflow-hidden">
        <div className="p-6 border-b border-[rgba(240,240,250,0.06)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[rgba(240,240,250,0.06)] rounded">
              <Database className="w-5 h-5 text-spectral/40" />
            </div>
            <div>
               <h3 className="text-xs font-bold uppercase tracking-nav text-spectral">Data Management</h3>
               <p className="text-[10px] text-spectral/30 uppercase tracking-micro mt-0.5">Control your local data storage.</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-8">
           {/* Backup & Restore */}
           <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-nav text-spectral/40 flex items-center gap-2">
                <FileJson className="w-4 h-4" />
                Backup & Restore
              </h4>
              <label className="flex items-center gap-3 text-xs text-spectral/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBackupEnabled}
                  onChange={(e) => {
                    setAutoBackupEnabledState(e.target.checked);
                    setAutoBackupEnabled(e.target.checked);
                  }}
                  className="accent-spectral"
                />
                <span className="uppercase tracking-micro">Enable auto-backup (desktop only)</span>
              </label>
              <label className="flex items-center gap-3 text-xs text-spectral/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={runOnStartupEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setRunOnStartupEnabledState(enabled);
                    void setAutostartEnabled(enabled);
                  }}
                  className="accent-spectral"
                />
                <span className="uppercase tracking-micro">Run on system startup (desktop only)</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="ghost-panel p-4 flex flex-col justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-micro text-spectral">Export Data</p>
                    <p className="text-[10px] text-spectral/30 uppercase tracking-micro mt-1">Download a copy of your habits and history as a JSON file.</p>
                  </div>
                  <Button variant="secondary" onClick={handleExport} className="w-full justify-center">
                    <Download className="w-4 h-4 mr-2" />
                    Export Backup
                  </Button>
                </div>

                <div className="ghost-panel p-4 flex flex-col justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-micro text-spectral">Import Data</p>
                    <p className="text-[10px] text-spectral/30 uppercase tracking-micro mt-1">Restore your habits from a backup file. This will replace current data.</p>
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

           <div className="border-t border-[rgba(240,240,250,0.06)]" />
           
           {/* Archived Habits */}
           <div className="space-y-4">
             <h4 className="text-[10px] font-bold uppercase tracking-nav text-spectral/40 flex items-center gap-2">
                <Archive className="w-4 h-4" />
                Archived Habits
             </h4>
             {archivedHabits.length > 0 ? (
               <div className="ghost-panel overflow-hidden">
                 {archivedHabits.map((habit, index) => (
                   <div 
                    key={habit.id} 
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      index !== archivedHabits.length - 1 ? 'border-b border-[rgba(240,240,250,0.06)]' : ''
                    }`}
                   >
                     <div className="flex items-center gap-3">
                       <div 
                          className="w-10 h-10 rounded flex items-center justify-center shrink-0 bg-[rgba(240,240,250,0.04)] border border-[rgba(240,240,250,0.08)]"
                          style={{ color: habit.color }}
                        >
                          <HabitIcon iconName={habit.icon} className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-micro text-spectral">{habit.name}</p>
                          <p className="text-[10px] text-spectral/20 uppercase tracking-micro">{habit.category} • Archived</p>
                        </div>
                     </div>
                     <div className="flex gap-2 justify-end">
                       <Button size="sm" variant="secondary" onClick={() => onRestore(habit.id)} title="Restore to dashboard">
                         <RefreshCw className="w-3 h-3 mr-1.5" />
                         Restore
                       </Button>
                       <Button size="sm" variant="ghost" onClick={() => onDelete(habit.id)}>
                         <Trash2 className="w-3 h-3" />
                       </Button>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="ghost-panel p-8 text-center border-dashed opacity-60">
                 <Layers className="w-6 h-6 text-spectral/15 mx-auto mb-2" />
                 <p className="text-[10px] text-spectral/30 uppercase tracking-micro">No archived habits found.</p>
               </div>
             )}
           </div>

           <div className="border-t border-[rgba(240,240,250,0.06)]" />

           {/* Danger Zone */}
           <div className="ghost-panel p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
             <div className="flex gap-4">
               <div className="p-2 bg-[rgba(240,240,250,0.06)] rounded shrink-0 h-fit">
                 <AlertTriangle className="w-5 h-5 text-spectral/40" />
               </div>
               <div>
                 <h4 className="text-xs font-bold uppercase tracking-nav text-spectral">Danger Zone</h4>
                 <p className="text-[10px] text-spectral/30 uppercase tracking-micro mt-1 max-w-lg leading-relaxed">
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
      
      <div className="text-center pt-4">
        <p className="text-[10px] text-spectral/15 uppercase tracking-nav">
          HabitFlow v1.0.0 • Local Storage Persistence
        </p>
      </div>
    </div>
  );
};