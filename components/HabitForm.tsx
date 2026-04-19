import React, { useState, useEffect, useMemo } from 'react';
import { X, Tag, Check, Palette, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';
import { Habit, HabitFrequency } from '../types';
import { AVAILABLE_ICONS, HabitIcon } from './HabitIcon';

interface HabitFormProps {
  onSave: (name: string, category: string, color: string, icon: string, frequency: HabitFrequency, reminderTime?: string) => void;
  onCancel: () => void;
  existingHabits: Habit[];
  initialData?: Habit;
}

// Spectral monochrome palette for SpaceX aesthetic
const COLORS = [
  { label: 'Spectral', value: '#f0f0fa' },
  { label: 'Silver', value: '#a0a0b0' },
  { label: 'Mist', value: '#707088' },
  { label: 'Steel', value: '#505068' },
  { label: 'Graphite', value: '#383850' },
  { label: 'Void', value: '#252538' },
  { label: 'Ash', value: '#64748b' },
  { label: 'Smoke', value: '#8888a0' },
];

const PREDEFINED_CATEGORIES = [
  { name: 'Health', color: '#a0a0b0' },
  { name: 'Work', color: '#64748b' },
  { name: 'Mindfulness', color: '#8888a0' },
  { name: 'Growth', color: '#f0f0fa' },
  { name: 'Social', color: '#707088' },
  { name: 'Finance', color: '#505068' },
];

export const HabitForm: React.FC<HabitFormProps> = ({ onSave, onCancel, existingHabits, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [categoryName, setCategoryName] = useState(initialData?.category || '');
  const [selectedColor, setSelectedColor] = useState(initialData?.color || PREDEFINED_CATEGORIES[0].color);
  const [selectedIcon, setSelectedIcon] = useState(initialData?.icon || 'sparkles');
  const [frequencyType, setFrequencyType] = useState<'daily' | 'weekly' | 'monthly'>(initialData?.frequency?.type || 'daily');
  const [frequencyGoal, setFrequencyGoal] = useState(initialData?.frequency?.goal || 1);
  const [reminderTime, setReminderTime] = useState(initialData?.reminderTime || '');

  // Derive custom categories from existing habits
  const customCategories = useMemo(() => {
    const predefinedNames = new Set(PREDEFINED_CATEGORIES.map(c => c.name.toLowerCase()));
    const customMap = new Map<string, string>(); // name -> color

    existingHabits.forEach(h => {
      const catName = h.category?.trim();
      if (!catName) return;
      
      if (!predefinedNames.has(catName.toLowerCase())) {
        customMap.set(catName, h.color);
      }
    });

    return Array.from(customMap.entries())
      .map(([name, color]) => ({ name, color }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [existingHabits]);

  // Auto-select color if category name matches predefined or known custom category
  useEffect(() => {
    const lowerName = categoryName.trim().toLowerCase();
    if (!lowerName) return;

    const predefinedMatch = PREDEFINED_CATEGORIES.find(c => c.name.toLowerCase() === lowerName);
    if (predefinedMatch) {
      setSelectedColor(predefinedMatch.color);
      return;
    }
    
    const customMatch = customCategories.find(c => c.name.toLowerCase() === lowerName);
    if (customMatch) {
        setSelectedColor(customMatch.color);
    }
  }, [categoryName, customCategories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(
      name,
      categoryName.trim() || 'General',
      selectedColor,
      selectedIcon,
      { type: frequencyType, goal: frequencyGoal },
      reminderTime.trim() ? reminderTime.trim() : undefined
    );
  };

  const handleCategorySelect = (catName: string, catColor: string) => {
    setCategoryName(catName);
    setSelectedColor(catColor);
  };

  const inputClass = "w-full px-3 py-2 bg-transparent border-b border-[rgba(240,240,250,0.15)] focus:border-[rgba(240,240,250,0.40)] focus:outline-none transition-all text-spectral placeholder:text-spectral/20 text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div id="habit-form-modal" className="ghost-panel-elevated w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-[rgba(240,240,250,0.08)] flex justify-between items-center shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-nav text-spectral">{initialData ? 'Edit Habit' : 'Create New Habit'}</h3>
          <button onClick={onCancel} className="text-spectral/30 hover:text-spectral transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-nav text-spectral/40">Habit Name</label>
            <div className="flex gap-3">
               {/* Icon Preview */}
               <div 
                 className="w-11 h-11 rounded flex items-center justify-center shrink-0 border border-[rgba(240,240,250,0.10)] bg-[rgba(240,240,250,0.04)]"
                 style={{ color: selectedColor }}
               >
                 <HabitIcon iconName={selectedIcon} className="w-6 h-6" />
               </div>
              <input
                id="habit-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Read for 30 mins"
                autoFocus
                className={`flex-1 ${inputClass}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Icon Section */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-nav text-spectral/40">Icon</label>
              <div className="grid grid-cols-7 gap-2 p-3 bg-[rgba(240,240,250,0.02)] rounded border border-[rgba(240,240,250,0.06)] max-h-52 overflow-y-auto custom-scrollbar">
              {AVAILABLE_ICONS.map((item) => {
                const isSelected = selectedIcon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedIcon(item.name)}
                    className={`
                      w-9 h-9 rounded flex items-center justify-center transition-all
                      ${isSelected 
                        ? 'bg-[rgba(240,240,250,0.12)] border border-[rgba(240,240,250,0.25)] scale-105 z-10' 
                        : 'text-spectral/30 hover:text-spectral/60 hover:bg-[rgba(240,240,250,0.04)]'
                      }
                    `}
                    style={isSelected ? { color: selectedColor } : {}}
                    title={item.name}
                  >
                    <item.icon className="w-5 h-5" strokeWidth={isSelected ? 2.5 : 2} />
                  </button>
                );
              })}
            </div>
          </div>

            {/* Color Section */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-nav text-spectral/40">Color</label>
              <div className="flex gap-3 flex-wrap p-3 bg-[rgba(240,240,250,0.02)] rounded border border-[rgba(240,240,250,0.06)] h-full content-start">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${
                      selectedColor === color.value 
                        ? 'ring-1 ring-offset-2 ring-offset-black ring-spectral/40 scale-110' 
                        : 'hover:scale-110 opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color.value }}
                    aria-label={color.label}
                    title={color.label}
                  >
                    {selectedColor === color.value && <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
                  </button>
                ))}
                
                <div className="w-px h-8 bg-[rgba(240,240,250,0.10)] mx-1"></div>

                {/* Native Color Picker */}
                <label 
                  className={`w-8 h-8 rounded-full cursor-pointer transition-all flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-spectral/30 via-spectral/20 to-spectral/10 ${
                     !COLORS.find(c => c.value === selectedColor)
                      ? 'ring-1 ring-offset-2 ring-offset-black ring-spectral/40 scale-110' 
                      : 'hover:scale-110 opacity-70 hover:opacity-100'
                  }`}
                  title="Custom Color"
                >
                  <input 
                    type="color" 
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                  {!COLORS.find(c => c.value === selectedColor) && <Check className="w-3.5 h-3.5 text-spectral" strokeWidth={3} />}
                  {COLORS.find(c => c.value === selectedColor) && <Palette className="w-3.5 h-3.5 text-spectral/60" strokeWidth={2.5} />}
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-nav text-spectral/40">Category</label>
            <div className="relative">
              <Tag className="absolute left-3 top-2.5 w-4 h-4 text-spectral/20" />
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Health or create new..."
                className={`pl-9 pr-3 ${inputClass}`}
              />
            </div>
            
            {/* Category Pills */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_CATEGORIES.map(cat => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => handleCategorySelect(cat.name, cat.color)}
                    className={`text-[10px] uppercase tracking-micro px-3 py-1.5 rounded-ghost border transition-all flex items-center gap-1.5 font-bold ${
                      categoryName.toLowerCase() === cat.name.toLowerCase()
                        ? 'bg-[rgba(240,240,250,0.12)] text-spectral border-[rgba(240,240,250,0.30)]'
                        : 'bg-transparent border-[rgba(240,240,250,0.08)] text-spectral/30 hover:text-spectral/60 hover:border-[rgba(240,240,250,0.15)]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </button>
                ))}
              </div>

              {customCategories.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[rgba(240,240,250,0.06)]">
                  <p className="text-[10px] font-bold text-spectral/20 uppercase tracking-nav pl-1">My Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {customCategories.map(cat => (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => handleCategorySelect(cat.name, cat.color)}
                        className={`text-[10px] uppercase tracking-micro px-3 py-1.5 rounded-ghost border transition-all flex items-center gap-1.5 font-bold ${
                          categoryName.toLowerCase() === cat.name.toLowerCase()
                            ? 'bg-[rgba(240,240,250,0.12)] text-spectral border-[rgba(240,240,250,0.30)]'
                            : 'bg-transparent border-[rgba(240,240,250,0.08)] text-spectral/30 hover:text-spectral/60 hover:border-[rgba(240,240,250,0.15)]'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </button>
                    ))}
                  </div>
          {/* Frequency Section */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-nav text-spectral/40">Goal & Frequency</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <select
                  value={frequencyType}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    setFrequencyType(newType);
                    if (newType === 'daily') setFrequencyGoal(1);
                    if (newType === 'weekly') setFrequencyGoal(3);
                    if (newType === 'monthly') setFrequencyGoal(10);
                  }}
                  className="w-full px-3 py-2 bg-transparent border-b border-[rgba(240,240,250,0.15)] focus:border-[rgba(240,240,250,0.40)] focus:outline-none transition-all text-spectral text-sm uppercase tracking-micro [color-scheme:dark]"
                >
                  <option value="daily" className="bg-black">Daily</option>
                  <option value="weekly" className="bg-black">Weekly</option>
                  <option value="monthly" className="bg-black">Monthly</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={frequencyType === 'weekly' ? 7 : frequencyType === 'monthly' ? 31 : 1}
                  value={frequencyGoal}
                  onChange={(e) => setFrequencyGoal(parseInt(e.target.value) || 1)}
                  disabled={frequencyType === 'daily'}
                  className="w-20 px-3 py-2 bg-transparent border-b border-[rgba(240,240,250,0.15)] focus:border-[rgba(240,240,250,0.40)] focus:outline-none transition-all text-spectral text-sm disabled:opacity-20 [color-scheme:dark]"
                />
                <span className="text-[10px] text-spectral/30 uppercase tracking-micro">
                  {frequencyType === 'daily' ? 'time / day' : frequencyType === 'weekly' ? 'days / week' : 'days / month'}
                </span>
              </div>
            </div>
          </div>

          {/* Reminder Section */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-nav text-spectral/40">Reminder Time (optional)</label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className={inputClass + " [color-scheme:dark]"}
            />
            <p className="text-[10px] text-spectral/20 uppercase tracking-micro">Desktop only. System notification if not done yet.</p>
          </div>

                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[rgba(240,240,250,0.08)] shrink-0">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button id="habit-submit-btn" type="submit" disabled={!name.trim()}>
              {initialData ? 'Save Changes' : 'Create Habit'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};