import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down" | "warning";
  icon: LucideIcon;
  color: "cyan" | "green" | "purple" | "amber";
}

export function StatCard({ title, value, change, trend, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    cyan: "from-cyan-500 to-blue-500",
    green: "from-green-500 to-emerald-500",
    purple: "from-purple-500 to-pink-500",
    amber: "from-amber-500 to-orange-500"
  };

  const textColors = {
    cyan: "text-cyan-400",
    green: "text-green-400",
    purple: "text-purple-400",
    amber: "text-amber-400"
  };

  const bgColors = {
    cyan: "bg-cyan-500/20",
    green: "bg-green-500/20",
    purple: "bg-purple-500/20",
    amber: "bg-amber-500/20"
  };

  return (
    <div className="relative group">
      {/* Glow effect */}
      <div className={`absolute -inset-0.5 bg-gradient-to-r ${colorClasses[color]} rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity`}></div>
      
      {/* Card content */}
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg p-6 hover:border-cyan-500/30 transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-lg ${bgColors[color]} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${textColors[color]}`} />
          </div>
          <span className={`px-2 py-1 rounded-full text-xs ${
            trend === "up" 
              ? "bg-green-500/20 text-green-400" 
              : trend === "down"
              ? "bg-red-500/20 text-red-400"
              : "bg-amber-500/20 text-amber-400"
          }`}>
            {change}
          </span>
        </div>
        
        <div>
          <p className="text-slate-400 text-sm mb-1">{title}</p>
          <p className={`text-2xl ${textColors[color]}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
