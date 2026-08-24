const GREETING_MESSAGES = [
  '오늘도 시원한 하루 되세요!',
  '응차 응차!',
  '막힘없이 술술 풀리는 하루 되세요',
  '뻥 뚫리는 상쾌한 하루 보내요',
  '오늘 컨디션은 어때요?',
];

export function getRandomGreetingMessage(): string {
  return GREETING_MESSAGES[Math.floor(Math.random() * GREETING_MESSAGES.length)];
}
