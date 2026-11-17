import { File } from '@apps-in-toss/web-framework';
import type { MonthlyReport } from './stats';
import { comparisonLines, formatInterval, formatPercent, topLabel } from './statsFormat';
import { BODY_PATH, FACE_STYLE, HIGHLIGHT_PATH } from './mascotShape';

// 월간 요약 이미지: 친구에게 보여줄 수 있는 숫자만 담는다 (메모·냄새·닉네임은 넣지 않음)

export interface SummaryImageContent {
  title: string;
  subtitle: string;
  highlights: { label: string; value: string }[];
  facts: { label: string; value: string }[];
  comparison: string[];
  footer: string;
  fileName: string;
}

export function getSummaryImageContent(report: MonthlyReport, now: Date = new Date()): SummaryImageContent {
  const { current, previous, vsLastMonth } = report;
  const monthLabel = `${current.year}년 ${current.month + 1}월`;
  const isCurrentMonth = current.year === now.getFullYear() && current.month === now.getMonth();

  const facts: SummaryImageContent['facts'] = [];
  const shape = topLabel(current.shapes);
  if (shape) facts.push({ label: '가장 많았던 모양', value: `${shape.label} ${formatPercent(shape.ratio)}` });
  const slot = topLabel(current.timeSlots);
  if (slot) facts.push({ label: '자주 기록한 시간대', value: slot.label });
  facts.push({ label: '기록한 날', value: `${current.recordDays}일 / ${current.coveredDays}일` });

  return {
    title: monthLabel,
    subtitle: isCurrentMonth ? `${now.getDate()}일까지의 풉 기록` : '한 달 풉 기록',
    highlights: [
      { label: '총 횟수', value: `${current.totalCount}회` },
      { label: '주 평균', value: `${current.weeklyAverage.toFixed(1)}회` },
      {
        label: '평균 간격',
        value: current.meanIntervalHours === null ? '-' : formatInterval(current.meanIntervalHours),
      },
    ],
    facts,
    comparison: previous.totalCount === 0 ? [] : comparisonLines(previous, vsLastMonth),
    footer: '풉트래커 · 진단이 아닌 참고·재미용 기록',
    fileName: `pooptracker-${current.year}-${String(current.month + 1).padStart(2, '0')}.png`,
  };
}

// ───────────── Canvas 그리기 ─────────────

const WIDTH = 1080;
const HEIGHT = 1350;
const PAD = 80;

// 색·폰트는 index.css 토큰에서 읽는다 (Canvas는 CSS 변수를 직접 못 씀)
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawMascot(ctx: CanvasRenderingContext2D, centerX: number, top: number, size: number) {
  const { bodyColor, highlightColor, blushOpacity } = FACE_STYLE.happy;
  const accent = token('--color-accent');
  const eye = '#2E1C12';

  ctx.save();
  // SVG viewBox(20 24 160 160)와 같은 좌표계로 맞춘다
  const scale = size / 160;
  ctx.translate(centerX - size / 2, top);
  ctx.scale(scale, scale);
  ctx.translate(-20, -24);

  ctx.fillStyle = bodyColor;
  ctx.fill(new Path2D(BODY_PATH));
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = highlightColor;
  ctx.fill(new Path2D(HIGHLIGHT_PATH));

  ctx.globalAlpha = 1;
  for (const [x, y, r, color] of [
    [80, 112, 5.5, eye],
    [82, 110, 2, '#FFFFFF'],
    [120, 112, 5.5, eye],
    [122, 110, 2, '#FFFFFF'],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  ctx.globalAlpha = blushOpacity;
  ctx.fillStyle = accent;
  for (const x of [68, 132]) {
    ctx.beginPath();
    ctx.ellipse(x, 124, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.strokeStyle = eye;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke(new Path2D('M 94 120 Q 100 127 106 120'));
  ctx.restore();
}

export function drawSummaryImage(content: SummaryImageContent): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context를 만들 수 없어요');

  const font = token('--sans') || 'sans-serif';
  const text = token('--color-text');
  const textSub = token('--color-text-sub');
  const muted = token('--color-surface-muted');
  const primary = token('--color-primary');

  ctx.fillStyle = token('--color-bg');
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textBaseline = 'alphabetic';

  // 제목
  ctx.textAlign = 'center';
  ctx.fillStyle = text;
  ctx.font = `800 68px ${font}`;
  ctx.fillText(content.title, WIDTH / 2, 160);
  ctx.fillStyle = textSub;
  ctx.font = `500 36px ${font}`;
  ctx.fillText(content.subtitle, WIDTH / 2, 220);

  drawMascot(ctx, WIDTH / 2, 260, 230);

  // 큰 숫자 3개
  const gap = 24;
  const cardW = (WIDTH - PAD * 2 - gap * 2) / 3;
  const cardY = 530;
  content.highlights.forEach((h, i) => {
    const x = PAD + i * (cardW + gap);
    ctx.fillStyle = muted;
    roundRect(ctx, x, cardY, cardW, 190, 40);
    ctx.fill();
    ctx.fillStyle = textSub;
    ctx.font = `500 30px ${font}`;
    ctx.fillText(h.label, x + cardW / 2, cardY + 70);
    ctx.fillStyle = text;
    ctx.font = `800 54px ${font}`;
    ctx.fillText(h.value, x + cardW / 2, cardY + 145);
  });

  // 세부 항목 + 지난달 비교
  const rowH = 64;
  const listY = cardY + 190 + 40;
  const rows = content.facts.length + (content.comparison.length > 0 ? content.comparison.length + 1 : 0);
  ctx.fillStyle = muted;
  roundRect(ctx, PAD, listY, WIDTH - PAD * 2, rows * rowH + 56, 40);
  ctx.fill();

  let y = listY + 28 + rowH / 2 + 12;
  for (const f of content.facts) {
    ctx.textAlign = 'left';
    ctx.fillStyle = textSub;
    ctx.font = `500 34px ${font}`;
    ctx.fillText(f.label, PAD + 48, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = text;
    ctx.font = `700 36px ${font}`;
    ctx.fillText(f.value, WIDTH - PAD - 48, y);
    y += rowH;
  }
  if (content.comparison.length > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = primary;
    ctx.font = `700 34px ${font}`;
    ctx.fillText('지난달과 비교', PAD + 48, y);
    y += rowH;
    ctx.fillStyle = text;
    ctx.font = `500 34px ${font}`;
    for (const line of content.comparison) {
      ctx.fillText(`· ${line}`, PAD + 48, y);
      y += rowH;
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = token('--color-text-disabled');
  ctx.font = `500 28px ${font}`;
  ctx.fillText(content.footer, WIDTH / 2, HEIGHT - 60);

  return canvas;
}

// ───────────── 기기에 저장 ─────────────

export type SaveResult = 'saved' | 'unsupported' | 'failed';

function isSaveSupported(): boolean {
  try {
    return File.saveBase64.isSupported();
  } catch {
    return false; // 토스 웹뷰 밖(로컬 개발 등)
  }
}

export async function saveSummaryImage(content: SummaryImageContent): Promise<SaveResult> {
  if (!isSaveSupported()) return 'unsupported';
  try {
    const dataUrl = drawSummaryImage(content).toDataURL('image/png');
    await File.saveBase64({ data: dataUrl.split(',')[1], fileName: content.fileName, mimeType: 'image/png' });
    return 'saved';
  } catch {
    return 'failed';
  }
}
