import { useEffect, useRef, useState } from 'react';
import type { CharacterMood } from '../character';
import './Character.css';

interface CharacterProps {
  mood: CharacterMood;
  headline: string;
  subtext: string;
}

const FACE_STYLE: Record<CharacterMood, { bodyColor: string; highlightColor: string; blushOpacity: number }> = {
  happy: { bodyColor: '#8B5E3C', highlightColor: '#AA7D58', blushOpacity: 0.85 },
  neutral: { bodyColor: '#8B5E3C', highlightColor: '#AA7D58', blushOpacity: 0.6 },
  sad: { bodyColor: '#A08674', highlightColor: '#B9A393', blushOpacity: 0.3 },
};

/* Stitch 마스코트: 끝이 살짝 말린 말랑한 몸통 */
const BODY_PATH =
  'M 52 160 C 32 158 34 132 50 122 C 44 110 52 90 70 82 C 66 68 80 50 98 36 C 102 33 105 35 103 42 ' +
  'C 100 52 112 58 120 66 C 134 77 148 90 144 106 C 158 114 166 134 158 148 C 152 162 134 166 100 166 ' +
  'C 66 166 58 162 52 160 Z';
const HIGHLIGHT_PATH = 'M 72 70 C 76 58 88 48 98 42 C 96 48 90 56 84 66 C 80 72 75 72 72 70 Z';

const EYE_MOVE_RANGE = 4;
const LOOK_RESET_DELAY_MS = 1200;
const BOUNCE_DURATION_MS = 420;
const BOUNCE_DELAY_MIN_MS = 1500;
const BOUNCE_DELAY_MAX_MS = 4500;

interface LookOffset {
  x: number;
  y: number;
}

export function CharacterFace({
  mood,
  lookOffset = { x: 0, y: 0 },
  size = 180,
}: {
  mood: CharacterMood;
  lookOffset?: LookOffset;
  size?: number;
}) {
  const { bodyColor, highlightColor, blushOpacity } = FACE_STYLE[mood];

  return (
    <svg width={size} height={size} viewBox="20 24 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="176" rx="58" ry="7" fill="#E8E2DD" opacity="0.8" />
      <path d={BODY_PATH} fill={bodyColor} />
      <path d={HIGHLIGHT_PATH} fill={highlightColor} opacity="0.6" />

      {mood === 'sad' && (
        <>
          <path d="M 72 98 L 84 103" stroke="#2E1C12" strokeWidth="3" strokeLinecap="round" />
          <path d="M 128 98 L 116 103" stroke="#2E1C12" strokeWidth="3" strokeLinecap="round" />
        </>
      )}

      <g
        style={{
          transform: `translate(${lookOffset.x}px, ${lookOffset.y}px)`,
          transition: 'transform 0.3s ease-out',
        }}
      >
        <circle cx="80" cy="112" r="5.5" fill="#2E1C12" />
        <circle cx="82" cy="110" r="2" fill="#FFFFFF" />
        <circle cx="120" cy="112" r="5.5" fill="#2E1C12" />
        <circle cx="122" cy="110" r="2" fill="#FFFFFF" />
      </g>

      <ellipse opacity={blushOpacity} cx="68" cy="124" rx="9" ry="6" fill="#F2998C" />
      <ellipse opacity={blushOpacity} cx="132" cy="124" rx="9" ry="6" fill="#F2998C" />

      {mood === 'happy' && (
        <>
          <path d="M 94 120 Q 100 127 106 120" stroke="#2E1C12" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M 148 72 L 152 68 L 156 72 L 152 76 Z" fill="#F2998C" opacity="0.8" />
          <circle cx="50" cy="80" r="2.5" fill="#F2998C" opacity="0.7" />
        </>
      )}
      {mood === 'neutral' && <path d="M 95 122 L 105 122" stroke="#2E1C12" strokeWidth="3" strokeLinecap="round" />}
      {mood === 'sad' && (
        <path d="M 94 125 Q 100 119 106 125" stroke="#2E1C12" strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}

export function Character({ mood, headline, subtext }: CharacterProps) {
  const faceWrapRef = useRef<HTMLDivElement>(null);
  const lookResetTimer = useRef<number>(undefined);
  const bounceTimer = useRef<number>(undefined);
  const [lookOffset, setLookOffset] = useState<LookOffset>({ x: 0, y: 0 });
  const [isBouncing, setIsBouncing] = useState(false);

  function triggerBounce() {
    window.clearTimeout(bounceTimer.current);
    setIsBouncing(false);
    requestAnimationFrame(() => {
      setIsBouncing(true);
      bounceTimer.current = window.setTimeout(() => setIsBouncing(false), BOUNCE_DURATION_MS);
    });
  }

  // 불규칙한 간격으로 저절로 바운스
  useEffect(() => {
    let delayTimer: number;

    function scheduleNextBounce() {
      const delay = BOUNCE_DELAY_MIN_MS + Math.random() * (BOUNCE_DELAY_MAX_MS - BOUNCE_DELAY_MIN_MS);
      delayTimer = window.setTimeout(() => {
        triggerBounce();
        scheduleNextBounce();
      }, delay);
    }

    scheduleNextBounce();
    return () => {
      window.clearTimeout(delayTimer);
      window.clearTimeout(bounceTimer.current);
    };
  }, []);

  // 화면 어디를 터치하든 그쪽을 쳐다봄
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const face = faceWrapRef.current;
      if (!face) return;

      const rect = face.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      const distance = Math.hypot(dx, dy) || 1;

      setLookOffset({
        x: (dx / distance) * EYE_MOVE_RANGE,
        y: (dy / distance) * EYE_MOVE_RANGE,
      });

      window.clearTimeout(lookResetTimer.current);
      lookResetTimer.current = window.setTimeout(() => {
        setLookOffset({ x: 0, y: 0 });
      }, LOOK_RESET_DELAY_MS);
    }

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.clearTimeout(lookResetTimer.current);
    };
  }, []);

  return (
    <div className="character-card">
      <div
        ref={faceWrapRef}
        className={`character-face-wrap${isBouncing ? ' character-bounce' : ''}`}
        onPointerDown={triggerBounce}
      >
        <div className="character-glow" aria-hidden="true" />
        <CharacterFace mood={mood} lookOffset={lookOffset} size={200} />
      </div>
      <p className="character-headline">{headline}</p>
      <p className="character-subtext">{subtext}</p>
    </div>
  );
}
