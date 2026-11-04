import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'amber' | 'emerald' | 'blue' | 'purple' | 'rose';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'amber',
  trend,
}) => {
  const colorMap = {
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/20',
    rose: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20',
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden transition-all hover:border-slate-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br border flex items-center justify-center shrink-0 ${colorMap[color]}`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center text-xs font-medium text-emerald-400">
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};
