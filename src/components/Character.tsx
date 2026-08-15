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

function CharacterFace({ mood }: { mood: CharacterMood }) {
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

      <ellipse cx="75" cy="81" rx="5" ry="6" fill="#3A2E22" />
      <ellipse cx="105" cy="81" rx="5" ry="6" fill="#3A2E22" />

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
  return (
    <div className="character-card">
      <CharacterFace mood={mood} />
      <p className="character-headline">{headline}</p>
      <p className="character-subtext">{subtext}</p>
    </div>
  );
}
