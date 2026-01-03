import React from 'react';
import {
  Activity, BookOpen, Briefcase, Coffee, Code, Dumbbell, Droplets,
  Gamepad2, Heart, Leaf, Moon, Music, Sun, Utensils, Zap, Smile,
  Brain, DollarSign, BedDouble, Home, Star, Smartphone, Tv, Sparkles,
  PenTool, Monitor, ShoppingCart, CheckCircle2
} from 'lucide-react';

export const AVAILABLE_ICONS = [
  { name: 'activity', icon: Activity },
  { name: 'book', icon: BookOpen },
  { name: 'briefcase', icon: Briefcase },
  { name: 'coffee', icon: Coffee },
  { name: 'code', icon: Code },
  { name: 'dumbbell', icon: Dumbbell },
  { name: 'water', icon: Droplets },
  { name: 'game', icon: Gamepad2 },
  { name: 'heart', icon: Heart },
  { name: 'leaf', icon: Leaf },
  { name: 'moon', icon: Moon },
  { name: 'music', icon: Music },
  { name: 'sun', icon: Sun },
  { name: 'food', icon: Utensils },
  { name: 'zap', icon: Zap },
  { name: 'smile', icon: Smile },
  { name: 'brain', icon: Brain },
  { name: 'money', icon: DollarSign },
  { name: 'sleep', icon: BedDouble },
  { name: 'home', icon: Home },
  { name: 'star', icon: Star },
  { name: 'phone', icon: Smartphone },
  { name: 'tv', icon: Tv },
  { name: 'sparkles', icon: Sparkles },
  { name: 'pen', icon: PenTool },
  { name: 'monitor', icon: Monitor },
  { name: 'cart', icon: ShoppingCart },
];

interface HabitIconProps {
  iconName?: string;
  className?: string;
}

export const HabitIcon: React.FC<HabitIconProps> = ({ iconName, className }) => {
  const iconDef = AVAILABLE_ICONS.find(i => i.name === iconName);
  const Icon = iconDef ? iconDef.icon : CheckCircle2; // Default icon if none matched

  return <Icon className={className} />;
};