import type { b50Entry } from './main';
import { jacketCacheDir, jacketCacheFileName, dxStarCacheDir, dxStarCacheFileName } from './main';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import opentype from 'opentype.js';

const 
    CARD_W = 330,
    CARD_H = 176,
    CARD_GAP = 6,
    HEADER_H = 72,
    PADDING = 8,
    COLS = 5,
    OLD_ROWS = 7,
    NEW_ROWS = 3;

const fontDir = path.resolve(process.cwd(), 'plugin/kalium-vanilla-mai/assets/fonts');
const rankImageDir = path.resolve(process.cwd(), 'plugin/kalium-vanilla-mai/assets/rank/bud');
const countImageDir = path.resolve(process.cwd(), 'plugin/kalium-vanilla-mai/assets/count');
function loadFont(fileName: string): opentype.Font {
    const bytes = fs.readFileSync(path.join(fontDir, fileName));
    return opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

const regularFont = loadFont('GoogleSansDisplay-LR.ttf');
const boldFont = loadFont('GoogleSansDisplay-BR.ttf');

// Achievement rank colors
function achievementColor(ach: number): string {
    if (ach >= 101.0000) return '#FF69B4';
    if (ach >= 100.5000) return '#FFD700';
    if (ach >= 100.0000) return '#C0C0C0';
    if (ach >= 99.5000)  return '#FF6347';
    if (ach >= 97.0000)  return '#FFA500';
    if (ach >= 94.0000)  return '#9370DB';
    return '#808080';
}

function diffColor(idx: number): string {
    return ['#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#E91E63'][idx] || '#888';
}
function diffLabel(idx: number): string {
    return ['BSC', 'ADV', 'EXP', 'MST', 'ReM'][idx] || '?';
}

function countIconNames(entry: b50Entry): string[] {
    const icons: string[] = [];
    const syncIcons = ['', 'music_icon_sync.png', 'music_icon_fs.png', 'music_icon_fsp.png', 'music_icon_fdx.png', 'music_icon_fdxp.png'];
    const comboIcons = ['', 'music_icon_fc.png', 'music_icon_fcp.png', 'music_icon_ap.png', 'music_icon_app.png'];
    if (syncIcons[entry.syncType]) icons.push(syncIcons[entry.syncType]);
    if (comboIcons[entry.comboType]) icons.push(comboIcons[entry.comboType]);
    return icons;
}

function rankImageName(achievement: number): string {
    if (achievement >= 100.5) return 'sssplus.png';
    if (achievement >= 100) return 'sss.png';
    if (achievement >= 99.5) return 'ssplus.png';
    if (achievement >= 99) return 'ss.png';
    if (achievement >= 98) return 'splus.png';
    if (achievement >= 97) return 's.png';
    if (achievement >= 94) return 'aaa.png';
    if (achievement >= 90) return 'aa.png';
    if (achievement >= 80) return 'a.png';
    if (achievement >= 75) return 'bbb.png';
    if (achievement >= 70) return 'bb.png';
    if (achievement >= 60) return 'b.png';
    if (achievement >= 50) return 'c.png';
    return 'd.png';
}

function escXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function svgText(text: string, x: number, y: number, size: number, fill: string, weight = '400', anchor?: 'end' | 'middle'): string {
    const selectedFont = weight === '700' ? boldFont : regularFont;
    if ([...text].some(character => selectedFont.charToGlyph(character).index === 0)) {
        const anchorAttribute = anchor ? ` text-anchor="${anchor}"` : '';
        return `<text x="${x}" y="${y}" font-family="sans-serif" font-weight="${weight}" font-size="${size}" fill="${fill}"${anchorAttribute}>${escXml(text)}</text>`;
    }
    const width = selectedFont.getAdvanceWidth(text, size);
    const originX = anchor === 'end' ? x - width : anchor === 'middle' ? x - width / 2 : x;
    const pathData = selectedFont.getPath(text, originX, y, size).toPathData(2);
    return `<path d="${pathData}" fill="${fill}"/>`;
}

function svgCard(entry: b50Entry, x: number, y: number): string {
    const dc = diffColor(entry.difficultyIdx);
    const dl = diffLabel(entry.difficultyIdx);
    const ac = achievementColor(entry.achievement);
    const achStr = entry.achievement.toFixed(4) + '%';
    let name = escXml(entry.songName);
    if (name.length > 18) name = name.substring(0, 16) + '..';

    return `<g transform="translate(${x},${y})">
        <rect width="${CARD_W}" height="${CARD_H}" fill="rgba(12,12,30,0.2)" rx="2"/>
        <rect width="5" height="${CARD_H}" fill="${dc}" rx="2"/>
        ${svgText(`#${entry.rank}`, 18, 30, 24, '#fff', '700')}
        ${svgText(`${dl} ${entry.level}`, CARD_W - 18, 30, 21, dc, '700', 'end')}
        ${svgText(entry.songName.length > 18 ? entry.songName.substring(0, 16) + '..' : entry.songName, 18, 66, 26, '#e0e0e0')}
        ${svgText(achStr, 18, 112, 37, ac, '700')}
        ${svgText(String(entry.rating), 284, 144, 24, '#ffffff', '700', 'middle')}
    </g>`;
}

export async function generateB50Image(
    playerName: string,
    rating: string,
    entries: b50Entry[]
): Promise<Buffer> {
    const totalW = COLS * CARD_W + (COLS - 1) * CARD_GAP + PADDING * 2;
    const totalH = HEADER_H + (OLD_ROWS + NEW_ROWS) * (CARD_H + CARD_GAP) + PADDING * 2;

    const oldEntries = entries.filter(e => !e.isNewVersion).slice(0, OLD_ROWS * COLS);
    const newEntries = entries.filter(e => e.isNewVersion).slice(0, NEW_ROWS * COLS);
    const baseY = HEADER_H + CARD_GAP;
    const newSectionY = baseY + OLD_ROWS * (CARD_H + CARD_GAP);

    const cardPositions = (entry: b50Entry, index: number) => {
        const isNew = entry.isNewVersion;
        const visualIndex = entry.rank - 1;
        const row = Math.floor(visualIndex / COLS);
        const col = visualIndex % COLS;
        return {
            left: PADDING + col * (CARD_W + CARD_GAP),
            top: isNew ? newSectionY + 6 + row * (CARD_H + CARD_GAP) : baseY + row * (CARD_H + CARD_GAP),
        };
    };

    // Layer 1: background + header
    let baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}">
        <rect width="${totalW}" height="${totalH}" fill="#151b41"/>
        <rect width="${totalW}" height="${HEADER_H}" fill="#1a2f4a"/>
        ${svgText(playerName, PADDING + 8, 36, 28, '#fff', '700')}
        ${svgText('DX Rating: ' + rating, PADDING + 8, 60, 22, '#FFD700', '700')}
        <line x1="${PADDING}" y1="${HEADER_H}" x2="${totalW - PADDING}" y2="${HEADER_H}" stroke="#12395c" stroke-width="1"/>
        <line x1="0" y1="${newSectionY - 2}" x2="${totalW}" y2="${newSectionY - 2}" stroke="#12395c" stroke-width="1"/>
    </svg>`;

    // Layer 2: score cards (semi-transparent so jackets show through)
    let cardsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}">`;
    let idx = 0;
    for (let row = 0; row < OLD_ROWS && idx < oldEntries.length; row++) {
        for (let col = 0; col < COLS && idx < oldEntries.length; col++, idx++) {
            const pos = cardPositions(oldEntries[idx], idx);
            cardsSvg += svgCard(oldEntries[idx], pos.left, pos.top);
        }
    }
    idx = 0;
    for (let row = 0; row < NEW_ROWS && idx < newEntries.length; row++) {
        for (let col = 0; col < COLS && idx < newEntries.length; col++, idx++) {
            const pos = cardPositions(newEntries[idx], idx);
            cardsSvg += svgCard(newEntries[idx], pos.left, pos.top);
        }
    }
    cardsSvg += '</svg>';

    // Layer 3: blurred jacket backgrounds (below cards)
    const jacketOverlayPromises = entries.slice(0, OLD_ROWS * COLS + NEW_ROWS * COLS).map(async (entry) => {
        const pos = cardPositions(entry, 0);
        const cachePath = path.join(jacketCacheDir(), jacketCacheFileName(entry));
        if (!fs.existsSync(cachePath)) return undefined;
        const processed = await sharp(cachePath)
            .resize(CARD_W, CARD_H, { fit: 'cover', position: 'centre' })
            .blur(30)
            .modulate({ brightness: 0.62, saturation: 0.9 })
            .png()
            .toBuffer();
        return { input: processed, left: pos.left, top: pos.top };
    });
    const jacketOverlays = (await Promise.all(jacketOverlayPromises)).filter((layer): layer is NonNullable<typeof layer> => layer !== undefined);

    const rankOverlays = await Promise.all(entries.slice(0, OLD_ROWS * COLS + NEW_ROWS * COLS).map(async (entry) => {
        const pos = cardPositions(entry, 0);
        const top = pos.top + 78;
        const left = pos.left + 245;
        return {
            input: await sharp(path.join(rankImageDir, rankImageName(entry.achievement)))
                .resize({ width: 78, height: 35, fit: 'contain' })
                .png()
                .toBuffer(),
            left,
            top,
        };
    }));

    const countOverlayPromises = entries.slice(0, OLD_ROWS * COLS + NEW_ROWS * COLS).flatMap((entry) => {
        const pos = cardPositions(entry, 0);
        const top = pos.top + CARD_H - 49;
        const left = pos.left + 18;
        return countIconNames(entry).map(async (iconName, index) => ({
            input: await sharp(path.join(countImageDir, iconName))
                .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .resize({ width: 36, height: 41, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .png()
                .toBuffer(),
            left: left + index * 41,
            top,
        }));
    });
    const countOverlays = await Promise.all(countOverlayPromises);

    const dxStarOverlays = await Promise.all(entries
        .slice(0, OLD_ROWS * COLS + NEW_ROWS * COLS)
        .filter(entry => entry.dxScore > 0)
        .map(async entry => {
            const pos = cardPositions(entry, 0);
            const iconCount = countIconNames(entry).length;
            const cachePath = path.join(dxStarCacheDir(), dxStarCacheFileName(entry.dxScore));
            if (!fs.existsSync(cachePath)) return undefined;
            return {
                input: await sharp(cachePath)
                    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .resize({ width: 36, height: 41, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .png()
                    .toBuffer(),
                left: pos.left + 18 + iconCount * 41,
                top: pos.top + CARD_H - 49,
            };
        }));
    const validDxStarOverlays = dxStarOverlays.filter((layer): layer is NonNullable<typeof layer> => layer !== undefined);

    return sharp(Buffer.from(baseSvg, 'utf8'))
        .composite([...jacketOverlays, { input: Buffer.from(cardsSvg, 'utf8') }, ...rankOverlays, ...countOverlays, ...validDxStarOverlays])
        .png()
        .toBuffer();
}

// Placeholder image
export async function generatePlaceholder(): Promise<Buffer> {
    const w = 600, h = 300;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <rect width="${w}" height="${h}" fill="#1a1a2e"/>
        ${svgText('Querying user B50...', w / 2, h / 2 - 12, 24, '#e0e0e0', '700', 'middle')}
    </svg>`;
    return sharp(Buffer.from(svg, 'utf8')).png().toBuffer();
}
