import { ReactNode } from "react";

interface NeonCardProps {
  children: ReactNode;
  className?: string;
}

export function NeonCard({ children, className = "" }: NeonCardProps) {
  return (
    <div className={`relative group ${className}`}>
      {/* Glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
      
      {/* Card content */}
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-6">
        {children}
      </div>
    </div>
  );
}
