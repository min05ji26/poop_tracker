import { useEffect, useRef, useState } from 'react';
import type { CharacterMood } from '../character';
import './Character.css';

interface CharacterProps {
  mood: CharacterMood;
  headline: string;
  subtext: string;
}

const FACE_STYLE: Record<CharacterMood, { bodyColor: string; blushOpacity: number }> = {
  happy: { bodyColor: '#9A6A45', blushOpacity: 0.7 },
  neutral: { bodyColor: '#8B5E3C', blushOpacity: 0.55 },
  sad: { bodyColor: '#A89383', blushOpacity: 0.3 },
};

/* 위쪽이 살짝 뾰족한 물방울 몸통 (똥이라고 대놓고 말하지 않는 모양) */
const BODY_PATH =
  'M 90 10 C 104 48, 166 68, 166 114 C 166 152, 132 174, 90 174 C 48 174, 14 152, 14 114 C 14 68, 76 48, 90 10 Z';

const EYE_MOVE_RANGE = 4;
const LOOK_RESET_DELAY_MS = 1200;
const BOUNCE_DURATION_MS = 420;
const BOUNCE_DELAY_MIN_MS = 1500;
const BOUNCE_DELAY_MAX_MS = 4500;

interface LookOffset {
  x: number;
  y: number;
}

function CharacterFace({ mood, lookOffset }: { mood: CharacterMood; lookOffset: LookOffset }) {
  const { bodyColor, blushOpacity } = FACE_STYLE[mood];

  return (
    <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d={BODY_PATH} fill={bodyColor} />

      {mood === 'sad' && (
        <>
          <path d="M 64 94 L 78 100" stroke="#2B2420" strokeWidth="3" strokeLinecap="round" />
          <path d="M 116 94 L 102 100" stroke="#2B2420" strokeWidth="3" strokeLinecap="round" />
        </>
      )}

      <g
        style={{
          transform: `translate(${lookOffset.x}px, ${lookOffset.y}px)`,
          transition: 'transform 0.3s ease-out',
        }}
      >
        <ellipse cx="74" cy="110" rx="5" ry="6" fill="#2B2420" />
        <ellipse cx="106" cy="110" rx="5" ry="6" fill="#2B2420" />
      </g>

      <ellipse opacity={blushOpacity} cx="48" cy="128" rx="9" ry="5.5" fill="#F2998C" />
      <ellipse opacity={blushOpacity} cx="132" cy="128" rx="9" ry="5.5" fill="#F2998C" />

      {mood === 'happy' && (
        <path d="M 79 130 Q 90 142 101 130" stroke="#2B2420" strokeWidth="5" strokeLinecap="round" fill="none" />
      )}
      {mood === 'neutral' && <ellipse cx="90" cy="133" rx="11" ry="5" fill="#2B2420" />}
      {mood === 'sad' && (
        <path d="M 79 138 Q 90 128 101 138" stroke="#2B2420" strokeWidth="5" strokeLinecap="round" fill="none" />
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
        <CharacterFace mood={mood} lookOffset={lookOffset} />
      </div>
      <p className="character-headline">{headline}</p>
      <p className="character-subtext">{subtext}</p>
    </div>
  );
}
