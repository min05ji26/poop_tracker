import { useEffect, useRef, useState } from 'react';
import type { CharacterMood } from '../character';
import './Character.css';

interface CharacterProps {
  mood: CharacterMood;
  headline: string;
  subtext: string;
}

const FACE_STYLE: Record<CharacterMood, { bodyColor: string; blushOpacity: number }> = {
  happy: { bodyColor: '#E0B583', blushOpacity: 0.7 },
  neutral: { bodyColor: '#D4A574', blushOpacity: 0.55 },
  sad: { bodyColor: '#C7B8A3', blushOpacity: 0.3 },
};

const EYE_MOVE_RANGE = 4;
const LOOK_RESET_DELAY_MS = 1200;
const BOUNCE_DURATION_MS = 550;
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
      <ellipse cx="90" cy="95" rx="85" ry="75" fill={bodyColor} />
      <ellipse cx="90" cy="30" rx="35" ry="30" fill={bodyColor} />

      {mood === 'sad' && (
        <>
          <path d="M 66 68 L 78 73" stroke="#3A2E22" strokeWidth="3" strokeLinecap="round" />
          <path d="M 114 68 L 102 73" stroke="#3A2E22" strokeWidth="3" strokeLinecap="round" />
        </>
      )}

      <g
        style={{
          transform: `translate(${lookOffset.x}px, ${lookOffset.y}px)`,
          transition: 'transform 0.3s ease-out',
        }}
      >
        <ellipse cx="75" cy="81" rx="5" ry="6" fill="#3A2E22" />
        <ellipse cx="105" cy="81" rx="5" ry="6" fill="#3A2E22" />
      </g>

      <ellipse opacity={blushOpacity} cx="52" cy="100" rx="8" ry="5" fill="#F2998C" />
      <ellipse opacity={blushOpacity} cx="128" cy="100" rx="8" ry="5" fill="#F2998C" />

      {mood === 'happy' && (
        <path d="M 79 101 Q 90 113 101 101" stroke="#3A2E22" strokeWidth="5" strokeLinecap="round" fill="none" />
      )}
      {mood === 'neutral' && <ellipse cx="90" cy="105" rx="11" ry="5" fill="#3A2E22" />}
      {mood === 'sad' && (
        <path d="M 79 109 Q 90 99 101 109" stroke="#3A2E22" strokeWidth="5" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}

export function Character({ mood, headline, subtext }: CharacterProps) {
  const faceWrapRef = useRef<HTMLDivElement>(null);
  const lookResetTimer = useRef<number>(undefined);
  const [lookOffset, setLookOffset] = useState<LookOffset>({ x: 0, y: 0 });
  const [isBouncing, setIsBouncing] = useState(false);

  // 불규칙한 간격으로 저절로 바운스
  useEffect(() => {
    let delayTimer: number;
    let durationTimer: number;

    function scheduleNextBounce() {
      const delay = BOUNCE_DELAY_MIN_MS + Math.random() * (BOUNCE_DELAY_MAX_MS - BOUNCE_DELAY_MIN_MS);
      delayTimer = window.setTimeout(() => {
        setIsBouncing(true);
        durationTimer = window.setTimeout(() => {
          setIsBouncing(false);
          scheduleNextBounce();
        }, BOUNCE_DURATION_MS);
      }, delay);
    }

    scheduleNextBounce();
    return () => {
      window.clearTimeout(delayTimer);
      window.clearTimeout(durationTimer);
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
      <div ref={faceWrapRef} className={`character-face-wrap${isBouncing ? ' character-bounce' : ''}`}>
        <CharacterFace mood={mood} lookOffset={lookOffset} />
      </div>
      <p className="character-headline">{headline}</p>
      <p className="character-subtext">{subtext}</p>
    </div>
  );
}
