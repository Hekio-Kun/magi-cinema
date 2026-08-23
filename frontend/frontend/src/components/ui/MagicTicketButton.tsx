import React from "react";
import { Ticket } from "lucide-react";

interface MagicTicketButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

export const MagicTicketButton: React.FC<MagicTicketButtonProps> = ({ children, className, ...props }) => {
  return (
    <button
      {...props}
      className={`relative overflow-hidden group px-6 py-2.5 flex items-center justify-center gap-2 text-white font-semibold transition-all duration-300 ${className || ""}`}
      style={{
        background: "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)",
        clipPath: "polygon(10% 0, 100% 0, 100% 30%, 95% 50%, 100% 70%, 100% 100%, 0 100%, 0% 70%, 5% 50%, 0% 30%, 0 0)",
        boxShadow: "0 8px 20px -6px rgba(244,63,94,0.6)",
      }}
    >
      <Ticket size={18} className="group-hover:rotate-12 transition-transform duration-300" />
      {children || "Mua vé"}
      
      {/* Shimmer Effect Container */}
      <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div 
          className="absolute top-0 bottom-0 w-[40px] opacity-40 bg-white"
          style={{
            transform: "skewX(-20deg)",
            left: "-100%",
            animation: props.disabled ? "none" : "shimmer 1.5s infinite"
          }}
        />
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>
    </button>
  );
};
