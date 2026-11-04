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
    <div className="glass-panel p-3.5 sm:p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden transition-all hover:border-slate-700">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">{title}</p>
          <h3 className="text-lg sm:text-2xl font-black text-white mt-1 truncate">{value}</h3>
          {subtitle && <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">{subtitle}</p>}
        </div>
        <div
          className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br border flex items-center justify-center shrink-0 ${colorMap[color]}`}
        >
          <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-800/80 flex items-center text-[10px] sm:text-xs font-medium text-emerald-400 truncate">
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};
