import { useEffect, useRef } from "react";

type Snowflake = {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  wobble: number;
  wobbleSpeed: number;
  rotation: number;
  spin: number;
  alpha: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function HeroSnowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frameId = 0;
    let lastTime = performance.now();
    let flakes: Snowflake[] = [];

    const createFlake = (randomY = false): Snowflake => {
      const depth = Math.random();
      return {
        x: Math.random() * width,
        y: randomY ? Math.random() * height : -12,
        size: 4 + depth * 7,
        speed: 16 + depth * 34,
        drift: -7 + Math.random() * 14,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.7 + Math.random() * 1.1,
        rotation: Math.random() * Math.PI * 2,
        spin: (-0.45 + Math.random() * 0.9) * (0.7 + depth),
        alpha: 0.34 + depth * 0.48,
      };
    };

    const drawSnowflake = (flake: Snowflake, alpha: number) => {
      const branchLength = flake.size;
      const twigLength = branchLength * 0.36;
      const twigOffset = branchLength * 0.58;

      ctx.save();
      ctx.translate(flake.x, flake.y);
      ctx.rotate(flake.rotation);
      ctx.lineWidth = clamp(branchLength / 7, 0.7, 1.45);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.shadowColor = "rgba(15,23,42,0.2)";
      ctx.shadowBlur = 4;

      for (let arm = 0; arm < 6; arm += 1) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(branchLength, 0);
        ctx.moveTo(twigOffset, 0);
        ctx.lineTo(twigOffset - twigLength, twigLength * 0.45);
        ctx.moveTo(twigOffset, 0);
        ctx.lineTo(twigOffset - twigLength, -twigLength * 0.45);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
      ctx.arc(0, 0, clamp(branchLength / 7, 0.8, 1.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const maxFlakes = window.innerWidth < 768 ? 28 : 48;
      const targetCount = Math.round(clamp(width / 30, 22, maxFlakes));
      flakes = Array.from({ length: targetCount }, (_, index) => flakes[index] || createFlake(true));
    };

    const draw = (time: number) => {
      const deltaSeconds = Math.min((time - lastTime) / 1000, 0.04);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      flakes.forEach((flake, index) => {
        flake.wobble += flake.wobbleSpeed * deltaSeconds;
        flake.rotation += flake.spin * deltaSeconds;
        flake.x += (flake.drift + Math.sin(flake.wobble) * 10) * deltaSeconds;
        flake.y += flake.speed * deltaSeconds;

        if (flake.y > height + 16 || flake.x < -24 || flake.x > width + 24) {
          flakes[index] = createFlake(false);
          return;
        }

        const leftTextFade = flake.x < width * 0.36 ? 0.48 : 1;
        const bottomFade = 1 - clamp((flake.y - height * 0.72) / (height * 0.26), 0, 0.62);
        const alpha = flake.alpha * leftTextFade * bottomFade;

        drawSnowflake(flake, alpha);
      });

      frameId = requestAnimationFrame(draw);
    };

    resize();
    frameId = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[2] h-full w-full"
      style={{
        opacity: 0.82,
      }}
    />
  );
}
