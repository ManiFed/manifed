import { useEffect, useRef } from 'react';

export function PenguinAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 300;

    let animationFrame: number;
    let time = 0;
    
    // Animation states: 'sliding', 'splashing', 'walking'
    let state: 'sliding' | 'splashing' | 'walking' = 'sliding';
    let stateTime = 0;
    
    const SLIDE_DURATION = 2.5;
    const SPLASH_DURATION = 0.8;
    const WALK_DURATION = 2.5;
    
    const drawPenguin = (x: number, y: number, rot: number, scale: number = 1, isWalking: boolean = false, walkPhase: number = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(scale, scale);
      
      // Waddle effect when walking
      if (isWalking) {
        ctx.rotate(Math.sin(walkPhase * 10) * 0.1);
      }
      
      // Body (black)
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Belly (white)
      ctx.fillStyle = '#f0f0f0';
      ctx.beginPath();
      ctx.ellipse(0, 3, 10, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-5, -10, 4, 0, Math.PI * 2);
      ctx.arc(5, -10, 4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-5, -10, 2, 0, Math.PI * 2);
      ctx.arc(5, -10, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Beak
      ctx.fillStyle = '#ffa500';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(-4, -2);
      ctx.lineTo(4, -2);
      ctx.closePath();
      ctx.fill();
      
      // Feet with walking animation
      ctx.fillStyle = '#ffa500';
      if (isWalking) {
        const footOffset = Math.sin(walkPhase * 10) * 3;
        ctx.beginPath();
        ctx.ellipse(-6, 20 + footOffset, 5, 3, -0.3, 0, Math.PI * 2);
        ctx.ellipse(6, 20 - footOffset, 5, 3, 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(-6, 20, 5, 3, -0.3, 0, Math.PI * 2);
        ctx.ellipse(6, 20, 5, 3, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Wings/flippers
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.ellipse(-15, 0, 5, 12, -0.3, 0, Math.PI * 2);
      ctx.ellipse(15, 0, 5, 12, 0.3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    };
    
    const drawSled = (x: number, y: number, rot: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      
      // Sled base
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.roundRect(-20, 15, 40, 8, 3);
      ctx.fill();
      
      // Runners
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-22, 25);
      ctx.quadraticCurveTo(-25, 28, -18, 28);
      ctx.lineTo(18, 28);
      ctx.quadraticCurveTo(25, 28, 22, 25);
      ctx.stroke();
      
      ctx.restore();
    };
    
    const drawSnowHill = () => {
      // Snow gradient
      const gradient = ctx.createLinearGradient(0, 50, 0, 250);
      gradient.addColorStop(0, '#e8f4ff');
      gradient.addColorStop(1, '#b8d4e8');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, 80);
      ctx.quadraticCurveTo(100, 60, 200, 120);
      ctx.quadraticCurveTo(280, 160, 320, 200);
      ctx.lineTo(320, 300);
      ctx.lineTo(0, 300);
      ctx.closePath();
      ctx.fill();
      
      // Snow sparkles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      for (let i = 0; i < 20; i++) {
        const sx = 20 + Math.sin(time * 2 + i) * 10 + i * 15;
        const sy = 90 + Math.cos(time * 3 + i * 2) * 5 + (i % 5) * 20;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    
    const drawIcePool = () => {
      // Pool water
      const waterGradient = ctx.createRadialGradient(340, 220, 10, 340, 220, 80);
      waterGradient.addColorStop(0, '#4a9eff');
      waterGradient.addColorStop(0.5, '#2980b9');
      waterGradient.addColorStop(1, '#1a5276');
      
      ctx.fillStyle = waterGradient;
      ctx.beginPath();
      ctx.ellipse(340, 230, 60, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Ice edge
      ctx.strokeStyle = '#a8d8ea';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(340, 230, 62, 42, 0, 0, Math.PI * 2);
      ctx.stroke();
      
      // Water ripples
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const rippleSize = 20 + i * 15 + Math.sin(time * 3 + i) * 5;
        ctx.beginPath();
        ctx.ellipse(340, 230, rippleSize, rippleSize * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    };
    
    const drawSplash = (x: number, y: number, intensity: number) => {
      ctx.fillStyle = 'rgba(74, 158, 255, 0.7)';
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const distance = intensity * 30;
        const dropX = x + Math.cos(angle) * distance;
        const dropY = y + Math.sin(angle) * distance * 0.5 - intensity * 20;
        const size = 3 + Math.random() * 4;
        
        ctx.beginPath();
        ctx.arc(dropX, dropY, size, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    
    const draw = () => {
      // Clear with sky gradient
      const skyGradient = ctx.createLinearGradient(0, 0, 0, 300);
      skyGradient.addColorStop(0, '#87CEEB');
      skyGradient.addColorStop(0.5, '#B0E0E6');
      skyGradient.addColorStop(1, '#E0F0FF');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, 400, 300);
      
      // Draw scene elements
      drawSnowHill();
      drawIcePool();
      
      // Update animation state
      stateTime += 0.016;
      
      if (state === 'sliding') {
        const progress = stateTime / SLIDE_DURATION;
        
        // Curved path down the hill
        const penguinX = 50 + progress * 250;
        const penguinY = 80 + Math.pow(progress, 1.5) * 130;
        const rotation = 0.3 + progress * 0.2;
        
        drawSled(penguinX, penguinY + 10, rotation);
        drawPenguin(penguinX, penguinY - 5, rotation * 0.5);
        
        // Snow spray
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        for (let i = 0; i < 5; i++) {
          const sprayX = penguinX - 20 - Math.random() * 20;
          const sprayY = penguinY + 15 + Math.random() * 10;
          ctx.beginPath();
          ctx.arc(sprayX, sprayY, 2 + Math.random() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        
        if (progress >= 1) {
          state = 'splashing';
          stateTime = 0;
        }
      } else if (state === 'splashing') {
        const progress = stateTime / SPLASH_DURATION;
        
        if (progress < 0.5) {
          drawSplash(340, 220, progress * 2);
        }
        
        // Penguin sinking/bobbing
        if (progress > 0.3) {
          const bobProgress = (progress - 0.3) / 0.7;
          const bob = Math.sin(bobProgress * Math.PI * 3) * 5;
          drawPenguin(340, 220 + bob, 0, 0.8 + bobProgress * 0.2);
        }
        
        if (progress >= 1) {
          state = 'walking';
          stateTime = 0;
        }
      } else if (state === 'walking') {
        const progress = stateTime / WALK_DURATION;
        
        // Walk back up the hill
        const penguinX = 340 - progress * 290;
        const penguinY = 230 - Math.pow(progress, 0.8) * 150;
        
        // Draw penguin walking (facing left, so flip)
        ctx.save();
        ctx.translate(penguinX, penguinY);
        ctx.scale(-1, 1); // Flip horizontally
        ctx.translate(-penguinX, -penguinY);
        drawPenguin(penguinX, penguinY, 0, 1, true, stateTime);
        ctx.restore();
        
        // Footprints
        ctx.fillStyle = 'rgba(100, 100, 100, 0.2)';
        for (let i = 0; i < Math.floor(progress * 10); i++) {
          const fpX = 340 - i * 29;
          const fpY = 230 - Math.pow(i / 10, 0.8) * 150 + 20;
          ctx.beginPath();
          ctx.ellipse(fpX, fpY, 3, 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        
        if (progress >= 1) {
          state = 'sliding';
          stateTime = 0;
        }
      }
      
      time += 0.016;
      animationFrame = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full max-w-[400px] h-auto rounded-xl border border-border/50 shadow-lg"
      style={{ aspectRatio: '4/3' }}
    />
  );
}