import sharp from 'sharp';
import { join } from 'node:path';

export interface SocialCardInput {
  readonly outputDir: string;
  readonly recordingDurationMs: number;
  readonly observations: number;
  readonly distinctFrames: number;
  readonly moments: number;
}

export type SocialCardFormat = 'wide' | 'og' | 'portrait';

interface CardDimensions {
  readonly filename: string;
  readonly width: number;
  readonly height: number;
}

const FORMATS: Record<SocialCardFormat, CardDimensions> = {
  wide: { filename: 'story-card.png', width: 1600, height: 900 },
  og: { filename: 'story-card-og.png', width: 1200, height: 630 },
  portrait: { filename: 'story-card-portrait.png', width: 1080, height: 1350 },
};

export async function createSocialCard(input: SocialCardInput): Promise<string> {
  return createCard(input, 'wide');
}

export async function createSocialCards(input: SocialCardInput): Promise<string[]> {
  return Promise.all(
    (Object.keys(FORMATS) as SocialCardFormat[]).map((format) => createCard(input, format)),
  );
}

async function createCard(input: SocialCardInput, format: SocialCardFormat): Promise<string> {
  const dimensions = FORMATS[format];
  const outputPath = join(input.outputDir, dimensions.filename);
  await sharp(Buffer.from(renderSocialCardSvg(input, format)))
    .resize(dimensions.width, dimensions.height, { fit: 'cover' })
    .png()
    .toFile(outputPath);
  return outputPath;
}

export function renderSocialCardSvg(
  input: SocialCardInput,
  format: SocialCardFormat = 'wide',
): string {
  return format === 'portrait' ? portraitSvg(input) : landscapeSvg(input);
}

function landscapeSvg(input: SocialCardInput): string {
  const compression = compressionRatio(input);
  const stages = [
    ['OBSERVED', input.observations.toLocaleString()],
    ['DISTINCT', input.distinctFrames.toLocaleString()],
    ['STORY', input.moments.toLocaleString()],
  ];
  const cards = stages
    .map(
      ([label, value], index) => `<g transform="translate(${96 + index * 456} 590)">
<rect width="408" height="182" rx="12" fill="#16161a" stroke="#302f38"/>
<text x="30" y="48" fill="#B7FF5A" font-family="monospace" font-size="20" letter-spacing="3">${label}</text>
<text x="30" y="132" fill="#F4F4F5" font-family="Arial, sans-serif" font-size="76" font-weight="700">${value}</text></g>`,
    )
    .join('');
  return `<svg width="1600" height="900" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
<rect width="100%" height="100%" fill="#09090B"/>
<circle cx="1440" cy="-70" r="430" fill="#8B5CF6" opacity=".17"/>
<path d="M96 118h104l82 146h-104z" fill="#8B5CF6"/><path d="M232 184h104l82 146H314z" fill="#B7FF5A"/>
<text x="96" y="96" fill="#B7FF5A" font-family="monospace" font-size="22" letter-spacing="5">PROGRESSCUT / STORY LAB</text>
<text x="96" y="356" fill="#F4F4F5" font-family="Arial, sans-serif" font-size="104" font-weight="700" letter-spacing="-5">${escapeXml(duration(input.recordingDurationMs))}</text>
<text x="96" y="444" fill="#A1A1AA" font-family="Arial, sans-serif" font-size="38">of work, compressed into a shareable story.</text>
<text x="96" y="525" fill="#B7FF5A" font-family="monospace" font-size="24" letter-spacing="2">${compression}% VISUAL COMPRESSION</text>
${cards}</svg>`;
}

function portraitSvg(input: SocialCardInput): string {
  const compression = compressionRatio(input);
  const stages = [
    ['OBSERVED', input.observations.toLocaleString()],
    ['DISTINCT', input.distinctFrames.toLocaleString()],
    ['STORY', input.moments.toLocaleString()],
  ];
  const cards = stages
    .map(
      ([label, value], index) => `<g transform="translate(72 ${750 + index * 154})">
<rect width="936" height="130" rx="12" fill="#16161a" stroke="#302f38"/>
<text x="28" y="46" fill="#B7FF5A" font-family="monospace" font-size="18" letter-spacing="3">${label}</text>
<text x="28" y="102" fill="#F4F4F5" font-family="Arial, sans-serif" font-size="58" font-weight="700">${value}</text></g>`,
    )
    .join('');
  return `<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
<rect width="100%" height="100%" fill="#09090B"/><circle cx="1030" cy="-40" r="380" fill="#8B5CF6" opacity=".17"/>
<path d="M72 126h86l68 120h-86z" fill="#8B5CF6"/><path d="M186 180h86l68 120h-86z" fill="#B7FF5A"/>
<text x="72" y="96" fill="#B7FF5A" font-family="monospace" font-size="19" letter-spacing="4">PROGRESSCUT / STORY LAB</text>
<text x="72" y="500" fill="#F4F4F5" font-family="Arial, sans-serif" font-size="120" font-weight="700" letter-spacing="-6">${escapeXml(duration(input.recordingDurationMs))}</text>
<text x="72" y="588" fill="#A1A1AA" font-family="Arial, sans-serif" font-size="34">of work, compressed into a story.</text>
<text x="72" y="682" fill="#B7FF5A" font-family="monospace" font-size="22" letter-spacing="2">${compression}% VISUAL COMPRESSION</text>
${cards}</svg>`;
}

function compressionRatio(input: SocialCardInput): string {
  return input.observations ? ((1 - input.moments / input.observations) * 100).toFixed(1) : '0.0';
}

function duration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes > 59
    ? `${Math.floor(minutes / 60)}H ${minutes % 60}M`
    : `${minutes}M ${seconds % 60}S`;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character] ?? character;
  });
}
