import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface PremiereCountdownProps {
  targetDate: string; // ISO Date String
  movieName: string;
}

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex items-center justify-center w-14 h-16 sm:w-20 sm:h-24 bg-gray-900 rounded-lg border border-gray-700 shadow-[0_0_15px_rgba(244,63,94,0.3)] text-3xl sm:text-5xl font-bold font-mono relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #111827 0%, #1f2937 100%)",
          color: "#f43f5e",
          textShadow: "0 0 10px rgba(244,63,94,0.6)"
        }}
      >
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gray-800/50" />
        {value.toString().padStart(2, "0")}
      </div>
      <span className="text-gray-400 text-xs sm:text-sm font-semibold tracking-widest mt-3">{label}</span>
    </div>
  );
}

export const PremiereCountdown: React.FC<PremiereCountdownProps> = ({ targetDate, movieName }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="w-full py-12 px-4 flex flex-col items-center justify-center relative overflow-hidden" style={{ background: "#0a0a0a" }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.1)_0,transparent_50%)]" />
      
      <div className="anim-fade-up flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 bg-gray-800/50 border border-gray-700 backdrop-blur-md">
        <Clock size={14} className="text-rose-500 animate-pulse" />
        <span className="text-xs font-bold text-gray-300 tracking-widest">
          Midnight Premiere
        </span>
      </div>

      <h2 className="anim-fade-up delay-100 text-2xl sm:text-4xl font-extrabold text-white mb-8 text-center" style={{ textShadow: "0 0 20px rgba(255,255,255,0.1)" }}>
        Đếm ngược ra mắt siêu phẩm
        <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-red-600 mt-2 inline-block">
          {movieName}
        </span>
      </h2>

      <div className="anim-fade-up delay-200 flex gap-4 sm:gap-6 relative z-10">
        <TimeBox value={timeLeft.days} label="Ngày" />
        <div className="text-rose-500 text-4xl sm:text-5xl font-bold self-start mt-2 sm:mt-4 animate-pulse">:</div>
        <TimeBox value={timeLeft.hours} label="Giờ" />
        <div className="text-rose-500 text-4xl sm:text-5xl font-bold self-start mt-2 sm:mt-4 animate-pulse">:</div>
        <TimeBox value={timeLeft.minutes} label="Phút" />
        <div className="text-rose-500 text-4xl sm:text-5xl font-bold self-start mt-2 sm:mt-4 animate-pulse">:</div>
        <TimeBox value={timeLeft.seconds} label="Giây" />
      </div>
    </div>
  );
};
