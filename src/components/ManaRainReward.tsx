import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ACTIVITY_STORAGE_KEY = 'manifed_active_time_ms';
const REWARD_COOLDOWN_KEY = 'manifed_last_reward_time';
const ONE_HOUR_MS = 60 * 60 * 1000;
const REWARD_AMOUNT = 5;

interface ManaParticle {
  id: number;
  x: number;
  delay: number;
  duration: number;
}

export function ManaRainReward() {
  const [showRain, setShowRain] = useState(false);
  const [particles, setParticles] = useState<ManaParticle[]>([]);

  const triggerReward = useCallback(async () => {
    // Generate particles for rain effect
    const newParticles: ManaParticle[] = [];
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
      });
    }
    setParticles(newParticles);
    setShowRain(true);

    // Try to add mana to user balance
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('modify_user_balance', {
          p_user_id: user.id,
          p_amount: REWARD_AMOUNT,
          p_operation: 'add'
        });

        // Record transaction
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'reward',
          amount: REWARD_AMOUNT,
          description: 'Activity reward - 1 hour active on ManiFed'
        });
      }
    } catch (err) {
      console.error('Failed to credit activity reward:', err);
    }

    // Show toast after a brief delay for effect
    setTimeout(() => {
      toast.success(`🎉 Activity Reward! +M$${REWARD_AMOUNT}`, {
        description: 'Thanks for spending an hour on ManiFed!'
      });
    }, 1000);

    // Hide rain after animation
    setTimeout(() => {
      setShowRain(false);
      setParticles([]);
    }, 5000);

    // Reset activity timer and set cooldown
    localStorage.setItem(ACTIVITY_STORAGE_KEY, '0');
    localStorage.setItem(REWARD_COOLDOWN_KEY, Date.now().toString());
  }, []);

  useEffect(() => {
    // Check if user is active
    let activeTime = parseInt(localStorage.getItem(ACTIVITY_STORAGE_KEY) || '0');
    const lastReward = parseInt(localStorage.getItem(REWARD_COOLDOWN_KEY) || '0');
    
    // Don't start tracking if rewarded within last hour
    if (Date.now() - lastReward < ONE_HOUR_MS) {
      return;
    }

    let lastActiveTimestamp = Date.now();
    let isActive = true;

    // Track user activity
    const handleActivity = () => {
      isActive = true;
      lastActiveTimestamp = Date.now();
    };

    // Update active time every second
    const intervalId = setInterval(() => {
      // Only count time if user was active recently (within last 30 seconds)
      if (isActive && Date.now() - lastActiveTimestamp < 30000) {
        activeTime += 1000;
        localStorage.setItem(ACTIVITY_STORAGE_KEY, activeTime.toString());

        // Check if we've reached 1 hour
        if (activeTime >= ONE_HOUR_MS) {
          triggerReward();
        }
      }
    }, 1000);

    // Listen for activity events
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [triggerReward]);

  if (!showRain) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-mana-fall"
          style={{
            left: `${particle.x}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/50">
            M
          </div>
        </div>
      ))}
    </div>
  );
}
