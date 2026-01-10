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

// Updated to Hex codes matching Tailwind 500 shade
const COLORS = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Sky', value: '#0ea5e9' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Slate', value: '#64748b' },
  { label: 'Orange', value: '#f97316' },
];

const PREDEFINED_CATEGORIES = [
  { name: 'Health', color: '#10b981' },
  { name: 'Work', color: '#64748b' },
  { name: 'Mindfulness', color: '#8b5cf6' },
  { name: 'Growth', color: '#6366f1' },
  { name: 'Social', color: '#f43f5e' },
  { name: 'Finance', color: '#f59e0b' },
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
      
      // If it's not a predefined category, add it to our custom list
      if (!predefinedNames.has(catName.toLowerCase())) {
        // We use the color of the last occurrence of this category
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/60 backdrop-blur-sm p-4 transition-colors">
      <div id="habit-form-modal" className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
          <h3 className="font-semibold text-slate-900 dark:text-white">{initialData ? 'Edit Habit' : 'Create New Habit'}</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Habit Name</label>
            <div className="flex gap-3">
               {/* Icon Preview */}
               <div 
                 className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm transition-colors"
                 style={{ backgroundColor: selectedColor + '20', color: selectedColor }}
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
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Icon Section */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Icon</label>
              <div className="grid grid-cols-7 gap-2 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800 max-h-52 overflow-y-auto custom-scrollbar">
              {AVAILABLE_ICONS.map((item) => {
                const isSelected = selectedIcon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedIcon(item.name)}
                    className={`
                      w-9 h-9 rounded-lg flex items-center justify-center transition-all
                      ${isSelected 
                        ? 'bg-white dark:bg-slate-800 shadow-md ring-1 ring-slate-200 dark:ring-slate-700 scale-105 z-10' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
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
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Color</label>
              <div className="flex gap-3 flex-wrap p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800 h-full content-start">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${
                      selectedColor === color.value 
                        ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-500 scale-110 shadow-sm' 
                        : 'hover:scale-110 opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color.value }}
                    aria-label={color.label}
                    title={color.label}
                  >
                    {selectedColor === color.value && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </button>
                ))}
                
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                {/* Native Color Picker */}
                <label 
                  className={`w-8 h-8 rounded-full cursor-pointer transition-all flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 ${
                     !COLORS.find(c => c.value === selectedColor)
                      ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-500 scale-110 shadow-sm' 
                      : 'hover:scale-110 opacity-90 hover:opacity-100'
                  }`}
                  title="Custom Color"
                >
                  <input 
                    type="color" 
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                  {!COLORS.find(c => c.value === selectedColor) && <Check className="w-4 h-4 text-white drop-shadow-md" strokeWidth={3} />}
                  {COLORS.find(c => c.value === selectedColor) && <Palette className="w-4 h-4 text-white" strokeWidth={2.5} />}
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
            <div className="relative">
              <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Health or create new..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-950"
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
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                      categoryName.toLowerCase() === cat.name.toLowerCase()
                        ? `bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-700 ring-2 ring-offset-1 ring-slate-200 dark:ring-slate-700`
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </button>
                ))}
              </div>

              {customCategories.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100/80 dark:border-slate-800/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">My Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {customCategories.map(cat => (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => handleCategorySelect(cat.name, cat.color)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                          categoryName.toLowerCase() === cat.name.toLowerCase()
                            ? `bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-700 ring-2 ring-offset-1 ring-slate-200 dark:ring-slate-700`
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </button>
                    ))}
                  </div>
          {/* Frequency Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Goal & Frequency</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <select
                  value={frequencyType}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    setFrequencyType(newType);
                    // Reset goal defaults
                    if (newType === 'daily') setFrequencyGoal(1);
                    if (newType === 'weekly') setFrequencyGoal(3);
                    if (newType === 'monthly') setFrequencyGoal(10);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white bg-white dark:bg-slate-950"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
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
                  className="w-20 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white bg-white dark:bg-slate-950 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900"
                />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {frequencyType === 'daily' ? 'time / day' : frequencyType === 'weekly' ? 'days / week' : 'days / month'}
                </span>
              </div>
            </div>
          </div>

          {/* Reminder Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reminder Time (optional)</label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white bg-white dark:bg-slate-950"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">Desktop only. You’ll get a system notification if it’s not done yet.</p>
          </div>

                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
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