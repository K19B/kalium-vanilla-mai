import axios from "axios";
import https from "https";
import os from "os";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { JSDOM } from 'jsdom';
import yaml from 'yaml';
import { musicScore, maiScore, musicDifficulty } from './class'
import { logger, logLevel } from '../../lib/class';
import * as color from '../../lib/color';
import { rendering } from '../../lib/class';

// Disable maimaidx.jp Cert Check
const agent = new https.Agent({
    rejectUnauthorized: false
});

axios.interceptors.request.use(request => {
    const method = (request.method || 'get').toUpperCase();
    let requestPath = '/';
    try {
        requestPath = new URL(request.url || '/', request.baseURL || dxNetJpUrl).pathname;
    } catch {
        requestPath = request.url || '/';
    }
    const methodColor = method === 'GET' ? color.bBlue : method === 'POST' ? color.bYellow : color.bGreen;
    const methodLabel = rendering(color.fBlack, methodColor, ` ${method} `);
    const requestLabel = rendering(color.fYellow, color.bBlack, ' REQT ');
    logger.debug(`${requestLabel}${methodLabel} ${requestPath}`, logLevel.debug, 'KMAI');
    return request;
});

// Endpoints
const
    dxNetJpUrl = 'https://maimaidx.jp',
    dxNetJpUrlLogin = 'https://maimaidx.jp/maimai-mobile/',
    dxNetJpAime = 'https://maimaidx.jp/maimai-mobile/aimeList/';

// Global headers
const
    // Endpoint Headers
    headerOriginJp = dxNetJpUrl,
    headerRefererJp = dxNetJpUrlLogin,
    headerAimeJp = dxNetJpAime,
    // Browser Headers
    headerAcceptPost = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    headerAcceptLanguage = 'zh-CN,zh-TW;q=0.9,zh;q=0.8',
    headerCacheControl = 'max-age=0',
    headerConnection = 'keep-alive',
    headerContentTypeForm = 'application/x-www-form-urlencoded',
    headerDNT = '1',
    headerUpgradeInsecureRequests = '1',
    // Chromium "Sec-Fetch" & "sec-ch-ua" Headers
    headerSFDest = 'document',
    headerSFMode = 'navigate',
    headerSFSite = 'same-origin',
    headerSFSiteNone = 'none',
    headerSFUser = '?1',
    headerSCU = '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    headerSCUMobile = '?0',
    headerSCUPlatform = '"Windows"',
    // UA
    headerUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'



function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function buildToken() { // Cookie '_t'
    let date = new Date();
    let machineId = createHash('md5')
        .update(os.hostname() + os.totalmem() + os.homedir() + date.getUTCFullYear() + 'Kalium')
        .digest('hex');
    return machineId;
}

export type maiProgress = (percent: number, detail: string, scoreCount?: number) => void | Promise<void>;

export async function refreshIdJp(segaId: string, passwd: string, onProgress?: maiProgress) {
    let token = buildToken();
    let aimeId = '0';
    await onProgress?.(5, 'Getting refreshId...');
    // Step 1-1: Login DX Net
    let loginNet = await axios({
        method: 'post',
        url: 'https://maimaidx.jp/maimai-mobile/submit/',
        data: {
            segaId: segaId,
            password: passwd,
            token: token
        },
        headers: {
            'Accept': headerAcceptPost,
            'Accept-Language': headerAcceptLanguage,
            'Cache-Control': headerCacheControl,
            'Connection': headerConnection,
            'Content-Type': headerContentTypeForm,
            'Cookie': '_t=' + token,
            'DNT': headerDNT,
            'Origin': headerOriginJp,
            'Referer': headerRefererJp,
            'Sec-Fetch-Dest': headerSFDest,
            'Sec-Fetch-Mode': headerSFMode,
            'Sec-Fetch-Site': headerSFSite,
            'Sec-Fetch-User': headerSFUser,
            'Upgrade-Insecure-Requests': headerUpgradeInsecureRequests,
            'sec-ch-ua': headerSCU,
            'sec-ch-ua-mobile': headerSCUMobile,
            'sec-ch-ua-platform': headerSCUPlatform,
            'User-Agent': headerUA
        },
        httpsAgent: agent,
        maxRedirects: 0,
        validateStatus: function (status) {
            return status == 302;
        }
    }).then(response => {
        // response.data is for debug only, do NOT remove, will be dropped in 1-2
        return response.data + 'Response Headers:' + response.headers;
    }).catch(error => {
        console.error('Error:', error);
    }) as string;
    // Step 1-2: Update userId After Login
    let IdAfterLogin = loginNet.match(/userId=([^;]+)/)![1];
    await onProgress?.(12, 'Selected AIME ' + aimeId + '.');
    // Step 2-1: Sleep
    await sleep(100);
    // Step 2-2: Select AIME
    let selectAime = await axios({
        method: 'get',
        url: 'https://maimaidx.jp/maimai-mobile/aimeList/submit/?idx=' + aimeId,
        headers: {
            'Accept': headerAcceptPost,
            'Accept-Language': headerAcceptLanguage,
            'Connection': headerConnection,
            'Cookie': '_t=' + token + '; userId=' + IdAfterLogin,
            'DNT': headerDNT,
            'Referer': headerAimeJp,
            'Sec-Fetch-Dest': headerSFDest,
            'Sec-Fetch-Mode': headerSFMode,
            'Sec-Fetch-Site': headerSFSiteNone,
            'Sec-Fetch-User': headerSFUser,
            'Upgrade-Insecure-Requests': headerUpgradeInsecureRequests,
            'sec-ch-ua': headerSCU,
            'sec-ch-ua-mobile': headerSCUMobile,
            'sec-ch-ua-platform': headerSCUPlatform,
            'User-Agent': headerUA
        },
        httpsAgent: agent,
        maxRedirects: 0,
        validateStatus: function (status) {
            return status == 302;
        }
    }).then(response => {
        return 'Response Headers:' + response.headers + 'Code:' + response.status;
    }).catch(error => {
        console.error('Error:', error);
    }) as string;
    // Step 2-3: Finish GetId
    let IdFin = selectAime.match(/userId=(\d+)/)![1];
    await onProgress?.(18, 'Login success.');
    return IdFin;
}

export async function maiRankJp(sid: string, segaId: string, passwd: string): Promise<maiScore[]> {
    // ReM only now
    let userId = await refreshIdJp(segaId, passwd);
    let rankPage = await axios({
        method: 'get',
        url: 'https://maimaidx.jp/maimai-mobile/ranking/musicRankingDetail/?idx=' + sid + '&scoreType=2&rankingType=99&diff=4',
        headers: {
            'Accept': headerAcceptPost,
            'Accept-Language': headerAcceptLanguage,
            'Connection': headerConnection,
            'Cookie': '_t=' + buildToken() + '; userId=' + userId,
            'DNT': headerDNT,
            'Referer': headerAimeJp,
            'Sec-Fetch-Dest': headerSFDest,
            'Sec-Fetch-Mode': headerSFMode,
            'Sec-Fetch-Site': headerSFSiteNone,
            'Sec-Fetch-User': headerSFUser,
            'Upgrade-Insecure-Requests': headerUpgradeInsecureRequests,
            'sec-ch-ua': headerSCU,
            'sec-ch-ua-mobile': headerSCUMobile,
            'sec-ch-ua-platform': headerSCUPlatform,
            'User-Agent': headerUA
        },
        httpsAgent: agent
    }).then(response => {
        return response.data;
    }).catch(error => {
        console.error('Error:', error);
    }) as string;
    //let rank1n = rankPage.split('\n')[225].trim();
    //let rank1d = rankPage.split('\n')[227].match(/.*f_r t_c">([^<]*)<\/div>.*/)![1];
    //let rank1l = rankPage.split('\n')[228].match(/.*<div class="p_15 p_r_10 p_b_0 f_r t_r f_16 f_b">([^<]*)<\/div>.*/)![1];
    //let rank2n = rankPage.split('\n')[238].trim();
    //let rank2d = rankPage.split('\n')[240].match(/.*f_r t_c">([^<]*)<\/div>.*/)![1];
    //let rank2l = rankPage.split('\n')[241].match(/.*<div class="p_15 p_r_10 p_b_0 f_r t_r f_16 f_b">([^<]*)<\/div>.*/)![1];
    //let rank3n = rankPage.split('\n')[251].trim();
    //let rank3d = rankPage.split('\n')[253].match(/.*f_r t_c">([^<]*)<\/div>.*/)![1];
    //let rank3l = rankPage.split('\n')[254].match(/.*<div class="p_15 p_r_10 p_b_0 f_r t_r f_16 f_b">([^<]*)<\/div>.*/)![1];
    //let result =
    //    '[1] ' + rank1n + '\n' +
    //    rank1d + '\n' +
    //    rank1l + '\n' +
    //    '[2] ' + rank2n + '\n' +
    //    rank2d + '\n' +
    //    rank2l + '\n' +
    //    '[3] ' + rank3n + '\n' +
    //    rank3d + '\n' +
    //    rank3l + '\n';
    return dxNetParser(rankPage);
}

// Html Parser
function getElements(htmlContent: string, selector: string): string[] | undefined {
    if (!htmlContent)
        return undefined;

    let dom = new JSDOM(htmlContent);
    let doc = dom.window.document;
    const elements = doc.querySelectorAll(selector);
    return Array.from(elements).map(x => stringHandle(x.textContent ?? ""));
}
function stringHandle(s: string): string {
    return s.replace(/[\uff01-\uff5e]/g,
        c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
        .replace(/\s/g, '');
}

    function parseHomeRating(html: string): string {
        const document = new JSDOM(html).window.document;
        const ratingNodes = Array.from(document.querySelectorAll('[class*="rating"], [id*="rating"]'));
        const ratingPattern = /(?:^|\D)(\d{3,5})(?:\D|$)/;

        for (const node of ratingNodes) {
            const candidates = [
                node.textContent ?? '',
                node.parentElement?.textContent ?? '',
                node.getAttribute('data-rating') ?? '',
                node.getAttribute('data-value') ?? '',
            ];
            for (const candidate of candidates) {
                const match = candidate.replace(/,/g, '').match(ratingPattern);
                if (match) return match[1];
            }
        }

        // Fallback for page variants that do not expose a rating-specific element.
        for (const pattern of [/rating[^\d]{0,80}(\d{3,5})/i, /(\d{3,5})[^\d]{0,80}rating/i]) {
            const match = html.replace(/\s+/g, ' ').match(pattern);
            if (match) return match[1];
        }
        return '?';
    }

function dxNetParser(html: string): maiScore[] {
    let rankers: string[] = getElements(html, ".f_l.p_t_10.p_l_10.f_15") ?? [];
    let scores: number[] = (getElements(html, ".p_15.p_r_10.p_b_0.f_r.t_r.f_16.f_b") ?? []).map(x => parseFloat(x));
    let date: Date[] = (getElements(html, ".ranking_music_date.f_r.t_c") ?? []).map(x => new Date(x));
    let tCount: number[] = (getElements(html, ".ranking_theory_count.t_r") ?? []).map(x => parseInt(x));

    let result: maiScore[] = [];
    let i: number = 0;
    for (i = i; i < rankers.length; i++) {
        result.push(new maiScore(rankers[i],
            scores[i],
            i,
            tCount[i],
            date[i]));
    }
    return result;
}
// Get All Music Score
function getMusicScore(htmlData: string, diff: musicDifficulty): musicScore[]
{
    let names = getElements(htmlData, ".music_name_block.t_l.f_13.break") ?? [];
    let levels = getElements(htmlData,".music_lv_block.f_r.t_c.f_14") ?? [];
    let scores = (getElements(htmlData,".music_score_block.w_112.t_r.f_l.f_12") ?? []).map(x => parseFloat(x));
    let dxScores = (getElements(htmlData,".music_score_block.w_190.t_r.f_l.f_12") ?? []).map(x => parseInt(x));

    let result: musicScore[] = [];
    let i = 0;

    for( i = i;i < names.length;i++) {
        result.push(new musicScore(
            names[i],
            levels[i],
            scores[i],
            dxScores[i],
            diff
        ))
    }

    return result;

}

// Get Account Name From DX Net Home Page
export async function maiInfoJp(segaId: string, passwd: string): Promise<string> {
    let userId = await refreshIdJp(segaId, passwd);
    let homePage = await axios({
        method: 'get',
        url: 'https://maimaidx.jp/maimai-mobile/home/',
        headers: {
            'Accept': headerAcceptPost,
            'Accept-Language': headerAcceptLanguage,
            'Connection': headerConnection,
            'Cookie': '_t=' + buildToken() + '; userId=' + userId,
            'DNT': headerDNT,
            'Referer': headerAimeJp,
            'Sec-Fetch-Dest': headerSFDest,
            'Sec-Fetch-Mode': headerSFMode,
            'Sec-Fetch-Site': headerSFSiteNone,
            'Sec-Fetch-User': headerSFUser,
            'Upgrade-Insecure-Requests': headerUpgradeInsecureRequests,
            'sec-ch-ua': headerSCU,
            'sec-ch-ua-mobile': headerSCUMobile,
            'sec-ch-ua-platform': headerSCUPlatform,
            'User-Agent': headerUA
        },
        httpsAgent: agent
    }).then(response => {
        return response.data;
    }).catch(error => {
        console.error('Error:', error);
    }) as string;

    let nameMatch = homePage.match(/<div class="name_block f_l f_16">(.*?)<\/div>/);
    if (!nameMatch) {
        throw new Error('Cannot find name block in home page');
    }
    return nameMatch[1].trim();
}

// Get Player DX Rating from home page
export async function getPlayerRatingJp(segaId: string, passwd: string): Promise<string> {
    let userId = await refreshIdJp(segaId, passwd);
    let homePage = await axios({
        method: 'get',
        url: 'https://maimaidx.jp/maimai-mobile/home/',
        headers: {
            'Accept': headerAcceptPost,
            'Accept-Language': headerAcceptLanguage,
            'Connection': headerConnection,
            'Cookie': '_t=' + buildToken() + '; userId=' + userId,
            'DNT': headerDNT,
            'Referer': headerAimeJp,
            'Sec-Fetch-Dest': headerSFDest,
            'Sec-Fetch-Mode': headerSFMode,
            'Sec-Fetch-Site': headerSFSiteNone,
            'Sec-Fetch-User': headerSFUser,
            'Upgrade-Insecure-Requests': headerUpgradeInsecureRequests,
            'sec-ch-ua': headerSCU,
            'sec-ch-ua-mobile': headerSCUMobile,
            'sec-ch-ua-platform': headerSCUPlatform,
            'User-Agent': headerUA
        },
        httpsAgent: agent
    }).then(response => response.data)
      .catch(error => { console.error('Error:', error); }) as string;

    // Try to find DX Rating on the home page
    let ratingMatch = homePage.match(/<div class="rating_block[^"]*">[^<]*<span[^>]*>(\d+)<\/span>/i);
    if (!ratingMatch) {
        // Try alternate patterns
        ratingMatch = homePage.match(/rating_number[^>]*>(\d+)</i);
    }
        return parseHomeRating(homePage);
}

export interface playerHome {
    userId: string;
    name: string;
    rating: string;
}

// Login once and return userId + account name + current DX rating.
export async function getPlayerHomeJp(segaId: string, passwd: string, onProgress?: maiProgress): Promise<playerHome> {
    let userId = await refreshIdJp(segaId, passwd, onProgress);
    let homePage = await axios({
        method: 'get',
        url: 'https://maimaidx.jp/maimai-mobile/home/',
        headers: {
            'Accept': headerAcceptPost,
            'Accept-Language': headerAcceptLanguage,
            'Connection': headerConnection,
            'Cookie': '_t=' + buildToken() + '; userId=' + userId,
            'DNT': headerDNT,
            'Referer': headerAimeJp,
            'Sec-Fetch-Dest': headerSFDest,
            'Sec-Fetch-Mode': headerSFMode,
            'Sec-Fetch-Site': headerSFSiteNone,
            'Sec-Fetch-User': headerSFUser,
            'Upgrade-Insecure-Requests': headerUpgradeInsecureRequests,
            'sec-ch-ua': headerSCU,
            'sec-ch-ua-mobile': headerSCUMobile,
            'sec-ch-ua-platform': headerSCUPlatform,
            'User-Agent': headerUA
        },
        httpsAgent: agent
    }).then(response => response.data)
      .catch(error => { console.error('Error:', error); }) as string;

    let nameMatch = homePage.match(/<div class="name_block f_l f_16">(.*?)<\/div>/);
    return {
        userId,
        name: nameMatch ? nameMatch[1].trim() : 'Unknown',
        rating: parseHomeRating(homePage),
    };
}

// B50 score entry
export interface b50Entry {
    rank: number;
    songName: string;
    songId: number;
    songIdx: string;
    difficulty: musicDifficulty;
    difficultyIdx: number;  // 0=BSC 1=ADV 2=EXP 3=MST 4=ReM
    level: string;
    chartConstant: number;
    achievement: number;     // e.g. 101.0000
    rating: number;
    isDxChart: boolean;
    dxScore: number;
    comboType: number;      // 0=none 1=FC 2=FC+ 3=AP 4=AP+
    syncType: number;       // 0=none 1=SYNC 2=FS 3=FS+ 4=FDX 5=FDX+
    isNewVersion: boolean;
}

interface aliasSong {
    id: number;
    name: string;
    releaseVer?: string;
    levels: Array<{ level: number }>;
}

interface chartMetadata {
    id: number;
    constants: number[];
    releaseVer: string;
}

let chartConstantIndex: Map<string, chartMetadata[]> | undefined;

function normalizedSongName(name: string): string {
    return stringHandle(name).toLocaleLowerCase();
}

function loadChartConstantIndex(): Map<string, chartMetadata[]> {
    if (chartConstantIndex) return chartConstantIndex;

    chartConstantIndex = new Map();
    try {
        const aliasPath = path.resolve(process.cwd(), 'plugin/kalium-vanilla-mai/assets/alias.yaml');
        const songs = yaml.parse(fs.readFileSync(aliasPath, 'utf8')) as aliasSong[];
        for (const song of songs) {
            const key = normalizedSongName(song.name);
            const entries = chartConstantIndex.get(key) ?? [];
            entries.push({
                id: Number(song.id) || 0,
                constants: song.levels.map(chart => Number(chart.level) || 0),
                releaseVer: song.releaseVer || '',
            });
            chartConstantIndex.set(key, entries);
        }
    } catch (error) {
        console.warn('Cannot load maimai chart constants:', error);
    }
    return chartConstantIndex;
}

function displayedLevelToConstant(level: string): number {
    const parsed = parseFloat(level);
    if (!Number.isFinite(parsed)) return 0;
    // DX Net may expose a display level such as "14+" rather than its exact constant.
    return level.includes('+') ? parsed + 0.6 : parsed;
}

function chartForType(songName: string, isDx: boolean | undefined): chartMetadata | undefined {
    const charts = loadChartConstantIndex().get(normalizedSongName(songName)) ?? [];
    if (isDx !== undefined) {
        return charts.find(chart => chart.id >= 10000 === isDx);
    }
    return charts.length === 1 ? charts[0] : undefined;
}

function resolveChartConstant(songName: string, difficultyIdx: number, level: string, isDx?: boolean): number {
    const chart = chartForType(songName, isDx);
    return chart?.constants[difficultyIdx] || displayedLevelToConstant(level);
}

function isDxChart(songName: string): boolean | undefined {
    const chart = chartForType(songName, undefined);
    return chart ? chart.id >= 10000 : undefined;
}

function resolveSongId(songName: string, isDx?: boolean): number {
    return chartForType(songName, isDx)?.id ?? 0;
}

function releaseVersionNumber(releaseVer: string): number {
    const normalized = releaseVer.toLowerCase().replace(/[\s_-]+/g, '');
    const aliases: Array<[string, number]> = [
        ['circleplus', 1.65], ['circle', 1.6],
        ['prismplus', 1.55], ['prism+', 1.55], ['prism', 1.5],
        ['buddiesplus', 1.45], ['buddies', 1.4], ['budplus', 1.45], ['bud', 1.4],
        ['festivalplus', 1.35], ['festival', 1.3], ['festiplus', 1.35], ['festi', 1.3],
        ['splashplus', 1.25], ['splash', 1.2], ['finale', 1.1],
    ];
    for (const [alias, value] of aliases) if (normalized.includes(alias)) return value;
    const match = normalized.match(/(?:ver)?(\d+)(?:\.(\d+))?/);
    return match ? Number(`${match[1]}.${match[2] || '0'}`) : 0;
}

function achievementCoefficient(achievement: number): number {
    if (achievement < 50) return 7.0;
    if (achievement < 60) return 8.0;
    if (achievement < 70) return 9.6;
    if (achievement < 75) return 11.2;
    if (achievement < 80) return 12.0;
    if (achievement < 90) return 13.6;
    if (achievement < 94) return 15.2;
    if (achievement < 97) return 16.8;
    if (achievement < 98) return 20.0;
    if (achievement < 99) return 20.3;
    if (achievement < 99.5) return 20.8;
    if (achievement < 100) return 21.1;
    if (achievement < 100.5) return 21.6;
    return 22.4;
}

export function calculateSingleRating(chartConstant: number, achievement: number): number {
    const cappedAchievement = Math.min(Math.max(achievement, 0), 100.5);
    return Math.floor(chartConstant * cappedAchievement / 100 * achievementCoefficient(cappedAchievement));
}

export interface difficultyScore {
    name: string;
    level: string;
    achievement: number;
    songIdx: string;
    isDxChart: boolean;
    dxScore: number;
    comboType: number;
    syncType: number;
}

function parseIconType(html: string, values: Record<string, number>): number {
    for (const [key, value] of Object.entries(values)) {
        if (html.includes(key)) return value;
    }
    return 0;
}

function parseDifficultyScoreCards(html: string): difficultyScore[] {
    const document = new JSDOM(html).window.document;
    const comboMap: Record<string, number> = {
        'icon_fc': 1, 'icon_fcp': 2, 'icon_ap': 3, 'icon_app': 4,
        'fcplus': 2, 'applus': 4,
    };
    const syncMap: Record<string, number> = {
        'icon_sync': 1, 'icon_fs': 2, 'icon_fsp': 3, 'icon_fdx': 4, 'icon_fdxp': 5,
        'fsplus': 3, 'fdxplus': 5,
    };

    const result: difficultyScore[] = [];
    const cards = Array.from(document.querySelectorAll('form')).filter(card =>
        card.querySelector('.music_name_block') && card.querySelector('.music_score_block')
    );

    for (const card of cards) {
        const text = (selector: string) => stringHandle(card.querySelector(selector)?.textContent ?? '');
        const name = text('.music_name_block');
        const level = text('.music_lv_block');
        const achievement = parseFloat(text('.music_score_block.w_112'));
        const dxScore = parseInt(text('.music_score_block.w_190'));
        const songIdx = card.querySelector('input[name="idx"]')?.getAttribute('value') ?? '';

        if (!name || !Number.isFinite(achievement)) continue;
        result.push({
            name,
            level: level || '?',
            achievement,
            songIdx,
            // In alias.yaml, a five-digit song ID identifies a DX chart.
            // The page icon is only a fallback for songs absent from the local database.
            isDxChart: isDxChart(name) ?? /(?:music_)?dx(?:_icon|\.png|\.webp)|music_kind[^"']*dx/i.test(card.innerHTML),
            dxScore: Number.isFinite(dxScore) ? dxScore : 0,
            comboType: parseIconType(card.innerHTML, comboMap),
            syncType: parseIconType(card.innerHTML, syncMap),
        });
    }

    return result;
}

// Fetch all scores from one difficulty page
export async function fetchDifficultyScores(
    userId: string, diff: number
): Promise<difficultyScore[]> {
    const result: difficultyScore[] = [];

    let pageHtml = await axios({
        method: 'get',
        url: `https://maimaidx.jp/maimai-mobile/record/musicGenre/search/?genre=99&diff=${diff}`,
        headers: {
            'Accept': headerAcceptPost,
            'Accept-Language': headerAcceptLanguage,
            'Connection': headerConnection,
            'Cookie': '_t=' + buildToken() + '; userId=' + userId,
            'DNT': headerDNT,
            'Referer': headerAimeJp,
            'Sec-Fetch-Dest': headerSFDest,
            'Sec-Fetch-Mode': headerSFMode,
            'Sec-Fetch-Site': headerSFSiteNone,
            'Sec-Fetch-User': headerSFUser,
            'Upgrade-Insecure-Requests': headerUpgradeInsecureRequests,
            'sec-ch-ua': headerSCU,
            'sec-ch-ua-mobile': headerSCUMobile,
            'sec-ch-ua-platform': headerSCUPlatform,
            'User-Agent': headerUA
        },
        httpsAgent: agent
    }).then(response => response.data)
      .catch(error => { console.error('Error:', error); }) as string;

    if (!pageHtml) return result;

    return parseDifficultyScoreCards(pageHtml);
}

export async function fetchB50ScoreTablesJp(
    segaId: string,
    passwd: string,
    onProgress?: maiProgress
): Promise<difficultyScore[][]> {
    let userId = await refreshIdJp(segaId, passwd, onProgress);
    return fetchB50ScoreTablesForUserJp(userId, onProgress);
}

export async function fetchB50ScoreTablesForUserJp(
    userId: string,
    onProgress?: maiProgress
): Promise<difficultyScore[][]> {
    const scoreTables: difficultyScore[][] = [];

    // Fetch all 5 difficulties (0=BSC, 1=ADV, 2=EXP, 3=MST, 4=ReM)
    for (let diff = 0; diff <= 4; diff++) {
        let diffEnum: musicDifficulty;
        switch (diff) {
            case 0: diffEnum = musicDifficulty.BASIC; break;
            case 1: diffEnum = musicDifficulty.ADVANCED; break;
            case 2: diffEnum = musicDifficulty.EXPERT; break;
            case 3: diffEnum = musicDifficulty.MASTER; break;
            case 4: diffEnum = musicDifficulty.ReMASTER; break;
            default: diffEnum = musicDifficulty.BASIC;
        }

        const scores = await fetchDifficultyScores(userId, diff);
        scoreTables.push(scores);
        const scoreCount = scoreTables.reduce((count, table) => count + table.filter(score => score.achievement > 0).length, 0);
        const percent = 18 + Math.round((diff + 1) / 5 * 72);
        await onProgress?.(percent, `Fetching diff ${diff + 1}/5`, scoreCount);

        // Small delay between requests
        await sleep(200);
    }

    return scoreTables;
}

export function buildBest50Entries(scoreTables: difficultyScore[][]): b50Entry[] {
    const allScores: Array<{
        name: string;
        level: string;
        difficulty: musicDifficulty;
        difficultyIdx: number;
        achievement: number;
        songIdx: string;
        chartConstant: number;
        rating: number;
        isDxChart: boolean;
        releaseVersion: number;
        dxScore: number;
        comboType: number;
        syncType: number;
    }> = [];

    for (let diff = 0; diff <= 4; diff++) {
        let diffEnum: musicDifficulty;
        switch (diff) {
            case 0: diffEnum = musicDifficulty.BASIC; break;
            case 1: diffEnum = musicDifficulty.ADVANCED; break;
            case 2: diffEnum = musicDifficulty.EXPERT; break;
            case 3: diffEnum = musicDifficulty.MASTER; break;
            case 4: diffEnum = musicDifficulty.ReMASTER; break;
            default: diffEnum = musicDifficulty.BASIC;
        }

        for (const s of scoreTables[diff] ?? []) {
            if (s.achievement > 0) {
                const chartConstant = resolveChartConstant(s.name, diff, s.level, s.isDxChart);
                const chart = chartForType(s.name, s.isDxChart);
                allScores.push({
                    name: s.name,
                    level: s.level,
                    difficulty: diffEnum,
                    difficultyIdx: diff,
                    achievement: s.achievement,
                    songIdx: s.songIdx,
                    chartConstant,
                    rating: calculateSingleRating(chartConstant, s.achievement),
                    isDxChart: s.isDxChart,
                    releaseVersion: releaseVersionNumber(chart?.releaseVer ?? ''),
                    dxScore: s.dxScore,
                    comboType: s.comboType,
                    syncType: s.syncType,
                });
            }
        }
    }

    const versions = [...new Set(allScores.map(score => score.releaseVersion).filter(version => version > 0))]
        .sort((a, b) => b - a);
    const recentVersions = new Set(versions.slice(0, 2));
    const sortByRating = (a: typeof allScores[number], b: typeof allScores[number]) =>
        b.rating - a.rating || b.achievement - a.achievement;
    const newScores = allScores.filter(score => recentVersions.has(score.releaseVersion)).sort(sortByRating).slice(0, 15);
    const oldScores = allScores.filter(score => !recentVersions.has(score.releaseVersion)).sort(sortByRating).slice(0, 35);
    const selectedScores = [...oldScores.map(score => ({ score, isNewVersion: false })), ...newScores.map(score => ({ score, isNewVersion: true }))];

    // Old and new sections each use their own visible ranking.
    const result: b50Entry[] = selectedScores.map(({ score: s, isNewVersion }, i) => ({
        rank: isNewVersion
            ? newScores.indexOf(s) + 1
            : oldScores.indexOf(s) + 1,
        songName: s.name,
        songId: resolveSongId(s.name, s.isDxChart),
        songIdx: s.songIdx,
        difficulty: s.difficulty,
        difficultyIdx: s.difficultyIdx,
        level: s.level,
        chartConstant: s.chartConstant,
        achievement: s.achievement,
        rating: s.rating,
        isDxChart: s.isDxChart,
        dxScore: s.dxScore,
        comboType: s.comboType,
        syncType: s.syncType,
        isNewVersion,
    }));

    return result;
}

// Get Best 50 scores from DX Net JP without using a persistent cache.
export async function getBest50Jp(
    segaId: string,
    passwd: string,
    onProgress?: maiProgress
): Promise<b50Entry[]> {
    const scoreTables = await fetchB50ScoreTablesJp(segaId, passwd, onProgress);
    const result = buildBest50Entries(scoreTables);
    await onProgress?.(100, 'B50 Calculated.', result.length);
    return result;
}

// ---- Jacket (song art) download & local cache ----

export function jacketCacheDir(): string {
    return path.resolve(process.cwd(), 'plugin/kalium-vanilla-mai/assets/songs');
}

export function jacketCacheFileName(entry: b50Entry): string {
    if (entry.songId > 0) return `${entry.songId}.png`;
    const source = entry.songIdx || entry.songName;
    const hash = createHash('sha1').update(source).digest('hex').slice(0, 16);
    return `s_${hash}.png`;
}

export function dxStarCacheDir(): string {
    return path.resolve(process.cwd(), 'plugin/kalium-vanilla-mai/assets/dxstar');
}

export function dxStarCacheFileName(dxScore: number): string {
    return `${dxScore}.png`;
}

export async function warmDxStarCache(
    entries: b50Entry[],
    onProgress?: maiProgress
): Promise<void> {
    fs.mkdirSync(dxStarCacheDir(), { recursive: true });
    const scores = [...new Set(entries.map(entry => entry.dxScore).filter(score => score > 0))];
    const missing = scores.filter(score => !fs.existsSync(path.join(dxStarCacheDir(), dxStarCacheFileName(score))));
    if (missing.length === 0) return;

    let done = 0;
    await Promise.all(missing.map(async score => {
        const image = await axios({
            method: 'get',
            url: `https://maimaidx.jp/maimai-mobile/img/music_icon_dxstar_${score}.png`,
            httpsAgent: agent,
            timeout: 15000,
            responseType: 'arraybuffer'
        }).then(response => Buffer.from(response.data)).catch(() => undefined);
        if (image && image.length > 100) {
            fs.writeFileSync(path.join(dxStarCacheDir(), dxStarCacheFileName(score)), image);
        }
        done++;
        await onProgress?.(Math.round(99 + done / missing.length), `Caching dxstar icon ${done}/${missing.length}`);
    }));
}

// Download missing jackets (one musicDetail request per song) and cache to assets/songs.
// Reuses an already logged-in userId; no extra login is performed.
export async function warmJacketCache(
    userId: string,
    entries: b50Entry[],
    onProgress?: maiProgress
): Promise<void> {
    fs.mkdirSync(jacketCacheDir(), { recursive: true });
    const missing = entries
        .filter(entry => entry.songIdx && !fs.existsSync(path.join(jacketCacheDir(), jacketCacheFileName(entry))))
        .map(entry => ({ entry, cachePath: path.join(jacketCacheDir(), jacketCacheFileName(entry)) }));
    if (missing.length === 0) return;

    let done = 0;
    const total = missing.length;
    const worker = async (startIndex: number) => {
        for (let index = startIndex; index < missing.length; index += 4) {
            const { entry, cachePath } = missing[index];
            try {
                const detail = await axios({
                    method: 'get',
                    url: 'https://maimaidx.jp/maimai-mobile/record/musicDetail/?idx=' + encodeURIComponent(entry.songIdx),
                    headers: {
                        'Accept': headerAcceptPost,
                        'Accept-Language': headerAcceptLanguage,
                        'Connection': headerConnection,
                        'Cookie': '_t=' + buildToken() + '; userId=' + userId,
                        'DNT': headerDNT,
                        'Referer': headerAimeJp,
                        'Sec-Fetch-Dest': headerSFDest,
                        'Sec-Fetch-Mode': headerSFMode,
                        'Sec-Fetch-Site': headerSFSiteNone,
                        'Sec-Fetch-User': headerSFUser,
                        'Upgrade-Insecure-Requests': headerUpgradeInsecureRequests,
                        'sec-ch-ua': headerSCU,
                        'sec-ch-ua-mobile': headerSCUMobile,
                        'sec-ch-ua-platform': headerSCUPlatform,
                        'User-Agent': headerUA
                    },
                    httpsAgent: agent,
                    timeout: 15000
                }).then(response => response.data as string)
                  .catch(() => '');

                // Jacket URL lives on the detail page, e.g. /maimai-mobile/img/Music/<hash>.png
                const jacketMatch = detail.match(/(?:https:\/\/maimaidx\.jp)?\/maimai-mobile\/img\/Music\/[0-9a-f]+\.png/i);
                if (jacketMatch) {
                    const jacketUrl = jacketMatch[0].startsWith('http') ? jacketMatch[0] : 'https://maimaidx.jp' + jacketMatch[0];
                    const image = await axios({
                        method: 'get',
                        url: jacketUrl,
                        httpsAgent: agent,
                        timeout: 15000,
                        responseType: 'arraybuffer'
                    }).then(response => Buffer.from(response.data))
                      .catch(() => undefined);
                    if (image && image.length > 100) {
                        fs.writeFileSync(cachePath, image);
                    }
                }
            } catch { /* keep going even if a single song fails */ }

            done++;
            await onProgress?.(Math.round(90 + 10 * done / total), `Caching jacket icon ${done}/${total}`, undefined);
        }
    };

    await Promise.all([0, 1, 2, 3].map(worker));
}
