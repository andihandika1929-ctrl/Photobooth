'use client';

import { useEffect, useState } from 'react';
import { Heart, Sparkles, Flame, ThumbsUp, Camera, Smile } from 'lucide-react';
import type { ReactionItem } from '@/lib/realtime/roomTypes';

export const REACTION_CONFIGS = [
  { id: 'heart', label: 'Heart', icon: Heart, color: 'text-rose-500 fill-rose-500', bg: 'bg-rose-500/20' },
  { id: 'sparkles', label: 'Sparkles', icon: Sparkles, color: 'text-amber-400 fill-amber-400', bg: 'bg-amber-400/20' },
  { id: 'flame', label: 'Fire', icon: Flame, color: 'text-orange-500 fill-orange-500', bg: 'bg-orange-500/20' },
  { id: 'thumbsup', label: 'Thumbs Up', icon: ThumbsUp, color: 'text-blue-400 fill-blue-400', bg: 'bg-blue-400/20' },
  { id: 'camera', label: 'Photo', icon: Camera, color: 'text-emerald-400', bg: 'bg-emerald-400/20' },
  { id: 'smile', label: 'Smile', icon: Smile, color: 'text-yellow-400', bg: 'bg-yellow-400/20' },
] as const;

interface FloatingReactionsProps {
  reactions: ReactionItem[];
  onSendReaction: (reactionKey: string) => void;
}

export default function FloatingReactions({
  reactions,
  onSendReaction,
}: FloatingReactionsProps) {
  const [activeReactions, setActiveReactions] = useState<ReactionItem[]>([]);

  useEffect(() => {
    if (reactions.length === 0) return;
    const latest = reactions[reactions.length - 1];

    setActiveReactions((prev) => [...prev, latest]);

    // Cleanup after animation finishes (2.5s)
    const timer = setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== latest.id));
    }, 2500);

    return () => clearTimeout(timer);
  }, [reactions]);

  const renderReactionIcon = (keyOrEmoji: string) => {
    const found = REACTION_CONFIGS.find((c) => c.id === keyOrEmoji || c.label.toLowerCase() === keyOrEmoji.toLowerCase());
    if (found) {
      const Icon = found.icon;
      return <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${found.color}`} />;
    }
    // Fallback if heart or other standard key
    return <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-rose-500 fill-rose-500" />;
  };

  return (
    <>
      {/* Floating Bubbles */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
        {activeReactions.map((item) => (
          <div
            key={item.id}
            className="animate-float-up absolute bottom-20 flex flex-col items-center gap-1 drop-shadow-xl"
            style={{
              left: `${item.x}%`,
            }}
          >
            <div className="p-2.5 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-white/60 animate-bounce-subtle">
              {renderReactionIcon(item.emoji)}
            </div>
            {item.senderName && (
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold text-white shadow-sm ${
                  item.color === 'pink' ? 'bg-pink-500' : 'bg-blue-500'
                }`}
              >
                {item.senderName}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Quick Reaction Bar */}
      <div className="fixed bottom-6 right-6 z-30 flex items-center gap-1.5 rounded-full border border-white/20 bg-neutral-900/80 p-1.5 backdrop-blur-md shadow-2xl">
        {REACTION_CONFIGS.map((reaction) => {
          const Icon = reaction.icon;
          return (
            <button
              key={reaction.id}
              type="button"
              onClick={() => onSendReaction(reaction.id)}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15 transition-transform hover:scale-125 active:scale-95 text-white"
              title={`Send ${reaction.label}`}
            >
              <Icon className={`w-4 h-4 ${reaction.color}`} />
            </button>
          );
        })}
      </div>

      {/* Floating Animation CSS */}
      <style jsx global>{`
        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.7);
          }
          15% {
            opacity: 1;
            transform: translateY(0px) scale(1.1);
          }
          80% {
            opacity: 1;
            transform: translateY(-140px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-200px) scale(0.9);
          }
        }
        .animate-float-up {
          animation: floatUp 2.4s ease-out forwards;
        }
      `}</style>
    </>
  );
}
