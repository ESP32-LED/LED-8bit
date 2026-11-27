/* ===== 発車標ライブラリ (board-config / board-led / シミュレータ共通) =====
 * 単位: 横16ドット=1桁 / 縦16ドット=1段
 * 画像は {w,h,d:Uint8ClampedArray(RGB)} 形式。黒(0,0,0)=消灯。
 */
(function (root) {
    "use strict";
    const BL = {};
    const T = 16;
    BL.UNIT = T;

    /* ---------- ビットマップ基本 ---------- */
    BL.createBitmap = (w, h) => ({ w, h, d: new Uint8ClampedArray(w * h * 3) });

    BL.blit = function (dst, src, x0, y0) {
        if (!src) return;
        for (let y = 0; y < src.h; y++) {
            const ty = y + y0;
            if (ty < 0 || ty >= dst.h) continue;
            for (let x = 0; x < src.w; x++) {
                const tx = x + x0;
                if (tx < 0 || tx >= dst.w) continue;
                const i = (y * src.w + x) * 3;
                if (src.d[i] | src.d[i + 1] | src.d[i + 2]) {
                    const o = (ty * dst.w + tx) * 3;
                    dst.d[o] = src.d[i]; dst.d[o + 1] = src.d[i + 1]; dst.d[o + 2] = src.d[i + 2];
                }
            }
        }
    };

    BL.hexToRgb = function (hex, fallback) {
        const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
        if (!m) return fallback || [255, 255, 255];
        const v = parseInt(m[1], 16);
        return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    };

    function bitsToBitmap(bits, w, h, rgb) {
        const bm = BL.createBitmap(w, h);
        for (let i = 0; i < w * h; i++) {
            if (bits[i]) { bm.d[i * 3] = rgb[0]; bm.d[i * 3 + 1] = rgb[1]; bm.d[i * 3 + 2] = rgb[2]; }
        }
        return bm;
    }

    /* ---------- 文字 ---------- */
    // fonts = { kanji: font_E233.json, ascii: ascii8x16.json }
    BL.glyphFor = function (ch, fonts) {
        const code = ch.codePointAt(0);
        if (code < 0x80) {
            const a = fonts.ascii && fonts.ascii.glyphs && fonts.ascii.glyphs[ch];
            if (a) return { w: 8, bits: a };
        }
        const k = fonts.kanji && fonts.kanji[ch];
        if (k && k.length === 256) return { w: 16, bits: k };
        if (code >= 0xff01 && code <= 0xff5e) { // 全角英数 → 半角グリフ
            const half = String.fromCharCode(code - 0xfee0);
            const a = fonts.ascii && fonts.ascii.glyphs && fonts.ascii.glyphs[half];
            if (a) return { w: 8, bits: a };
        }
        if (ch === "\u3000") return { w: 16, bits: new Array(256).fill(0), blank: true };
        return null;
    };

    function glyphColumns(g, tw) { // グリフを横tw列へ縮小(50%以上で点灯)
        const out = new Uint8Array(tw * T);
        for (let y = 0; y < T; y++) {
            for (let tx = 0; tx < tw; tx++) {
                const a = tx * g.w / tw, b = (tx + 1) * g.w / tw;
                let sum = 0, cnt = 0;
                for (let sx = Math.floor(a); sx < Math.ceil(b) && sx < g.w; sx++) {
                    const cover = Math.min(sx + 1, b) - Math.max(sx, a);
                    sum += g.bits[y * g.w + sx] * cover; cnt += cover;
                }
                out[y * tw + tx] = cnt > 0 && sum / cnt >= 0.5 ? 1 : 0;
            }
        }
        return out;
    }

    /* text を描く。widthDots 指定時は収まるよう横圧縮、null なら自然幅 */
    BL.textBitmap = function (text, widthDots, fonts, rgb, opts) {
        opts = opts || {};
        const glyphs = [];
        let natural = 0;
        for (const ch of String(text == null ? "" : text)) {
            const g = BL.glyphFor(ch, fonts) || { w: ch.codePointAt(0) < 0x80 ? 8 : 16, bits: new Array(256).fill(0), blank: true, missing: true };
            glyphs.push({ g, ch }); natural += g.w;
        }
        const outW = widthDots == null ? Math.max(1, natural) : widthDots;
        const bm = BL.createBitmap(outW, T);
        if (!glyphs.length) return bm;
        const scale = natural > outW ? outW / natural : 1;
        const drawW = Math.round(natural * scale);
        let startX = 0;
        if (opts.align === "center") startX = Math.floor((outW - drawW) / 2);
        else if (opts.align === "right") startX = outW - drawW;
        let cum = 0;
        for (const { g } of glyphs) {
            const x0 = Math.round(cum * scale), x1 = Math.round((cum + g.w) * scale);
            const tw = Math.max(1, x1 - x0);
            const cols = scale === 1 ? null : glyphColumns(g, tw);
            for (let y = 0; y < T; y++) {
                for (let tx = 0; tx < (scale === 1 ? g.w : tw); tx++) {
                    const on = scale === 1 ? g.bits[y * g.w + tx] : cols[y * tw + tx];
                    const px = startX + x0 + tx;
                    if (on && px >= 0 && px < outW) {
                        const o = (y * outW + px) * 3;
                        bm.d[o] = rgb[0]; bm.d[o + 1] = rgb[1]; bm.d[o + 2] = rgb[2];
                    }
                }
            }
            cum += g.w;
        }
        return bm;
    };

    // フォントに無い文字(表示されず空白になる)を返す
    BL.missingChars = function (text, fonts) {
        const out = [];
        for (const ch of String(text || "")) if (!BL.glyphFor(ch, fonts) && !out.includes(ch)) out.push(ch);
        return out;
    };

    /* ---------- 時刻用の数字(ストローク方式。幅11/14/15などに合わせて生成) ---------- */
    const STROKES = {
        "0": [[[.15, 0], [.85, 0], [1, .15], [1, .85], [.85, 1], [.15, 1], [0, .85], [0, .15], [.15, 0]]],
        "1": [[[.15, .22], [.55, 0], [.55, 1]]],
        "2": [[[0, .15], [.15, 0], [.85, 0], [1, .15], [1, .38], [0, 1], [1, 1]]],
        "3": [[[0, .1], [.15, 0], [.85, 0], [1, .15], [1, .38], [.85, .5], [.3, .5]],
              [[.85, .5], [1, .62], [1, .85], [.85, 1], [.15, 1], [0, .9]]],
        "4": [[[.75, 1], [.75, 0], [0, .7], [1, .7]]],
        "5": [[[1, 0], [0, 0], [0, .45], [.8, .45], [1, .6], [1, .85], [.85, 1], [.15, 1], [0, .9]]],
        "6": [[[.9, .05], [.7, 0], [.25, 0], [0, .2], [0, .85], [.15, 1], [.85, 1], [1, .85], [1, .6], [.85, .45], [.15, .45], [0, .6]]],
        "7": [[[0, 0], [1, 0], [.35, 1]]],
        "8": [[[.15, 0], [.85, 0], [1, .12], [1, .38], [.85, .5], [.15, .5], [0, .38], [0, .12], [.15, 0]],
              [[.15, .5], [.85, .5], [1, .62], [1, .88], [.85, 1], [.15, 1], [0, .88], [0, .62], [.15, .5]]],
        "9": [[[1, .4], [.85, .55], [.15, .55], [0, .4], [0, .15], [.15, 0], [.85, 0], [1, .15], [1, .8], [.75, 1], [.3, 1], [.1, .95]]]
    };

    BL.digitBits = function (ch, w, h) {
        const bits = new Uint8Array(w * h);
        const strokes = STROKES[ch];
        if (!strokes) return bits;
        const th = 2;
        const put = (x, y) => {
            for (let dy = 0; dy < th; dy++) for (let dx = 0; dx < th; dx++) {
                const px = x + dx, py = y + dy;
                if (px >= 0 && px < w && py >= 0 && py < h) bits[py * w + px] = 1;
            }
        };
        for (const line of strokes) {
            for (let i = 0; i + 1 < line.length; i++) {
                let x0 = Math.round(line[i][0] * (w - th)), y0 = Math.round(line[i][1] * (h - th));
                const x1 = Math.round(line[i + 1][0] * (w - th)), y1 = Math.round(line[i + 1][1] * (h - th));
                const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
                const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
                let err = dx + dy;
                for (;;) {
                    put(x0, y0);
                    if (x0 === x1 && y0 === y1) break;
                    const e2 = 2 * err;
                    if (e2 >= dy) { err += dy; x0 += sx; }
                    if (e2 <= dx) { err += dx; y0 += sy; }
                }
            }
        }
        return bits;
    };

    BL.colonBits = function (w, h) {
        const bits = new Uint8Array(w * h);
        const s = w >= 5 ? 3 : 2, x0 = Math.floor((w - s) / 2);
        for (const y0 of [4, 10]) for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) bits[(y0 + y) * w + x0 + x] = 1;
        return bits;
    };

    // style "3": 22+4+22 / style "4": 30+5+29
    BL.TIME_STYLES = {
        "2": { hh: [7, 7], colon: 4, mm: [7, 7] },
        "3": { hh: [11, 11], colon: 4, mm: [11, 11] },
        "4": { hh: [15, 15], colon: 5, mm: [15, 14] }
    };
    BL.timeWidth = style => style === "4" ? 64 : style === "2" ? 32 : 48;
    BL.timeDigits = style => style === "4" ? 4 : style === "2" ? 2 : 3;
    const normStyle = v => (String(v) === "4" ? "4" : String(v) === "2" ? "2" : "3");

    BL.timeBitmap = function (h, m, style, rgb, leadingZero) {
        const st = BL.TIME_STYLES[style === "4" ? "4" : "3"];
        const width = st.hh[0] + st.hh[1] + st.colon + st.mm[0] + st.mm[1];
        const bm = BL.createBitmap(width, T);
        const hs = String(Math.max(0, Math.min(99, h | 0))).padStart(2, "0");
        const ms = String(Math.max(0, Math.min(59, m | 0))).padStart(2, "0");
        const parts = [
            [hs[0] === "0" && !leadingZero ? " " : hs[0], st.hh[0]], [hs[1], st.hh[1]], [":", st.colon],
            [ms[0], st.mm[0]], [ms[1], st.mm[1]]
        ];
        let x = 0;
        for (const [ch, w] of parts) {
            if (ch !== " ") BL.blit(bm, bitsToBitmap(ch === ":" ? BL.colonBits(w, T) : BL.digitBits(ch, w, T), w, T, rgb), x, 0);
            x += w;
        }
        return bm;
    };

    // 2桁(32ドット): fonts/clock16.json の字形を、字の部分だけ切り出して 7+7+4+7+7 ドットへ横圧縮して並べる
    // 細い線(1ドット幅)が消えないよう、元の複数列のどれかが点灯なら点灯にして横圧縮する
    function squeezeOr(g, tw) {
        const out = new Uint8Array(tw * T);
        for (let y = 0; y < T; y++) for (let tx = 0; tx < tw; tx++) {
            const a = Math.floor(tx * g.w / tw), b = Math.max(a + 1, Math.ceil((tx + 1) * g.w / tw));
            for (let sx = a; sx < b && sx < g.w; sx++) if (g.bits[y * g.w + sx]) { out[y * tw + tx] = 1; break; }
        }
        return out;
    }
    const clockCache = new Map();
    function clockGlyph(font, ch) {
        const key = ch + "|" + (font && font.width);
        if (clockCache.has(key)) return clockCache.get(key);
        let out = null;
        const rows = font && font.glyphs && font.glyphs[ch];
        if (rows) {
            const W = font.width, H = font.height, bits = new Uint8Array(W * H);
            for (let y = 0; y < H; y++) { const v = parseInt(String(rows[y]).padStart(W / 4, "0"), 16); for (let x = 0; x < W; x++) bits[y * W + x] = Math.floor(v / Math.pow(2, W - 1 - x)) % 2; }
            let x0 = W, x1 = -1;
            for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (bits[y * W + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
            if (x1 >= x0) {
                const w = x1 - x0 + 1, g = { w, bits: new Uint8Array(w * T) };
                for (let y = 0; y < Math.min(H, T); y++) for (let x = 0; x < w; x++) g.bits[y * w + x] = bits[y * W + x0 + x];
                out = g;
            }
        }
        clockCache.set(key, out);
        return out;
    }
    BL.clockBitmap = function (h, m, rgb, fonts, leadingZero) {
        const st = BL.TIME_STYLES["2"], font = fonts && fonts.clock16;
        const hs = String(Math.max(0, Math.min(99, h | 0))).padStart(2, "0"), ms = String(Math.max(0, Math.min(59, m | 0))).padStart(2, "0");
        const parts = [[hs[0] === "0" && !leadingZero ? " " : hs[0], st.hh[0]], [hs[1], st.hh[1]], [":", st.colon], [ms[0], st.mm[0]], [ms[1], st.mm[1]]];
        const bm = BL.createBitmap(32, T);
        let x = 0;
        for (const [ch, w] of parts) {
            if (ch !== " ") {
                const g = clockGlyph(font, ch);
                if (g) {
                    const tw = ch === ":" ? Math.min(w, g.w) : w, cols = tw === g.w ? g.bits : squeezeOr(g, tw);
                    const ox = ch === ":" ? Math.floor((w - tw) / 2) : 0;
                    BL.blit(bm, bitsToBitmap(cols, tw, T, rgb), x + ox, 0);
                } else BL.blit(bm, bitsToBitmap(ch === ":" ? BL.colonBits(w, T) : BL.digitBits(ch, w, T), w, T, rgb), x, 0);
            }
            x += w;
        }
        return bm;
    };

    // 時刻: led.json の「時刻」(左2桁=時 / コロン / 右2桁=分 のPNG)があればそれを使い、無い部分は標準の数字で補う
    function genDigits(text, widths, rgb, blankFirst) {
        const bm = BL.createBitmap(widths.reduce((a, b) => a + b, 0), T);
        let x = 0;
        [...text].forEach((ch, i) => {
            if (!(blankFirst && i === 0)) BL.blit(bm, bitsToBitmap(BL.digitBits(ch, widths[i], T), widths[i], T, rgb), x, 0);
            x += widths[i];
        });
        return bm;
    }

    BL.timeBitmapFor = function (cfg, assets, h, m, rgb) {
        const style = normStyle(cfg.layout.timeStyle);
        if (style === "2") return BL.clockBitmap(h, m, rgb, assets && assets.fonts, cfg.layout.leadingZero);
        const st = BL.TIME_STYLES[style];
        const cat = assets && assets.led && assets.led.categories && assets.led.categories.find(c => c.id === "time");
        // timeStyle が付いた素材は同じ桁形式のときだけ使う(付いていない古い素材はどちらでも使う)
        const items = (cat && cat.items ? cat.items : []).filter(i => !i.timeStyle || String(i.timeStyle) === style);
        if (!items.length) return BL.timeBitmap(h, m, style, rgb, cfg.layout.leadingZero);
        const byRole = (role, name) => items.find(i => i.timeRole === role && i.view && i.view.normal && i.view.normal.ja && i.view.normal.ja.name === name);
        const hs = String(h).padStart(2, "0"), ms = String(m).padStart(2, "0"), noZero = !cfg.layout.leadingZero && h < 10;
        // ゼロ埋めしない設定のときは「9」のような名前の画像を優先し、無ければ「09」を使う
        const hi = (noZero && byRole("hour", String(h))) || byRole("hour", hs) || byRole("hour", String(h));
        const co = items.find(i => i.timeRole === "colon"), mi = byRole("minute", ms) || byRole("minute", String(m));
        const parts = [
            (hi && BL.itemBitmap(hi, "ja")) || genDigits(hs, st.hh, rgb, noZero),
            (co && BL.itemBitmap(co, "ja")) || bitsToBitmap(BL.colonBits(st.colon, T), st.colon, T, rgb),
            (mi && BL.itemBitmap(mi, "ja")) || genDigits(ms, st.mm, rgb, false)
        ];
        const out = BL.createBitmap(parts.reduce((a, p) => a + p.w, 0), T);
        let x = 0;
        for (const p of parts) { BL.blit(out, p, x, Math.floor((T - p.h) / 2)); x += p.w; }
        return out;
    };

    /* ---------- led.json 素材 ---------- */
    BL.findItem = function (led, category, key) {
        if (!led || !led.categories || key == null || key === "") return null;
        const cat = led.categories.find(c => c.id === category);
        if (!cat) return null;
        const items = cat.items || (cat.groups || []).flatMap(g => g.items);
        const k = String(key);
        return items.find(it => it.id === k || it.view?.normal?.ja?.name === k || it.view?.normal?.en?.name === k) || null;
    };

    // 指定言語の画像で、その言語側の名前が key と一致するものを探す
    // (日本語の画像は日本語名=ダイヤの「種別」「行先」など、英語の画像は英語名=「種別(英)」「行先(英)」と照合)
    BL.findItemLang = function (led, category, key, lang) {
        if (!led || !led.categories || key == null || key === "") return null;
        const cat = led.categories.find(c => c.id === category);
        if (!cat) return null;
        const items = cat.items || (cat.groups || []).flatMap(g => g.items);
        const k = String(key);
        return items.find(it => it.view?.normal?.[lang]?.name === k) || null;
    };

    BL.itemBitmap = function (item, lang) {
        if (!item) return null;
        item._bm = item._bm || {};
        if (item._bm[lang] !== undefined) return item._bm[lang];
        const v = item.view?.normal?.[lang];
        let bm = null;
        if (v && v.data && v.width > 0 && v.data.length >= v.width * v.height * 3) {
            bm = { w: v.width, h: v.height, d: Uint8ClampedArray.from(v.data) };
        }
        item._bm[lang] = bm;
        return bm;
    };

    function fitWidth(bm, widthDots, align) { // 素材を指定幅の枠へ(はみ出しは切る)
        const out = BL.createBitmap(widthDots, T);
        if (!bm) return out;
        let x0 = 0;
        if (align === "center") x0 = Math.floor((widthDots - bm.w) / 2);
        else if (align === "right") x0 = widthDots - bm.w;
        BL.blit(out, bm, x0, Math.floor((T - bm.h) / 2));
        return out;
    }

    /* ---------- 設定の既定値 ---------- */
    BL.defaultConfig = function () {
        return {
            format: "atos-board-config", version: 2, name: "発車標",
            layout: {
                cols: 12, rows: 2, timeStyle: "3", leadingZero: false,
                columns: [
                    { field: "type", digits: 2, align: "left" },
                    { field: "time", digits: 3, align: "left" },
                    { field: "dest", digits: 4, align: "left" },
                    { field: "cars", digits: 2, align: "left" },
                    { field: "platform", digits: 1, align: "center" }
                ]
            },
            colors: { type: "#ffffff", time: "#ffa500", dest: "#ffa500", cars: "#ffa500", platform: "#ffa500", info: "#ffa500", approach: "#ff3030", scroll: "#ffa500", ended: "#ffa500" },
            behavior: { advanceDelaySec: 6 },
            approach: { enabled: true, startSec: 15, blinkCount: 12, onMs: 900, offMs: 600, row: "last", blinkTrain: false, english: false, offShows: "blank", text: "まもなく　電車が参ります", textEn: "The train is approaching." },
            lang: { enabled: true, jaSec: 3, enSec: 3 },
            // 在線位置表示: 路線・電車の絵と「発車の何秒前に出すか」は led.json の「在線位置」で決める。
            // 電車が動く時刻(各電車の secBefore)になったら holdSec 秒だけ優先表示し、その後は通常表示に戻る
            position: { enabled: false, holdSec: 15, row: "last", digits: 0 },
            scroll: {
                lane: "last", speed: 50, gapDots: 48, color: "#ffa500",
                guide: { enabled: false, intervalSec: 120 },            // 案内スクロール(intervalSec=0なら流しっぱなし)
                nextStops: { enabled: false, dwellSec: 30, loop: true }   // 駅到着後(発車のdwellSec秒前〜)の次停車駅スクロール
            },
            messages: { guide: [], ended: "本日の運転は終わりました", endedEn: "No more trains today.", nextStopsFormat: "{type}　{dest}行き。次の停車駅は{next}です。停車駅は、{stops}です。" },
            timetable: []
        };
    };

    function merge(base, over) {
        if (Array.isArray(base) || typeof base !== "object" || base === null) return over === undefined ? base : over;
        const out = {};
        for (const k of Object.keys(base)) out[k] = merge(base[k], over ? over[k] : undefined);
        if (over) for (const k of Object.keys(over)) if (!(k in out)) out[k] = over[k];
        return out;
    }

    // 旧形式(scroll.enabled/sources・列pos・placement)を新形式へ
    BL.migrateConfig = function (cfg) {
        const c = JSON.parse(JSON.stringify(cfg || {}));
        const sc = c.scroll;
        if (sc && (sc.sources || "enabled" in sc) && !sc.guide && !sc.nextStops) {
            const src = sc.sources || [], on = sc.enabled !== false;
            sc.guide = { enabled: on && src.includes("guide"), intervalSec: 0 };
            sc.nextStops = { enabled: on && src.includes("nextStops"), dwellSec: 30, loop: true };
        }
        if (sc) { delete sc.sources; delete sc.enabled; }
        if (c.layout && c.layout.columns) c.layout.columns = c.layout.columns.filter(x => x && x.field !== "pos");
        if (c.position) { delete c.position.placement; delete c.position.secPerCell; }
        if (c.colors) delete c.colors.pos;
        return c;
    };

    BL.withDefaults = cfg => merge(BL.defaultConfig(), BL.migrateConfig(cfg));

    BL.normalizeConfig = function (cfg) {
        const c = BL.withDefaults(cfg);
        c.layout.cols = Math.max(4, Math.min(16, c.layout.cols | 0));
        c.layout.rows = Math.max(1, Math.min(4, c.layout.rows | 0));
        c.layout.timeStyle = normStyle(c.layout.timeStyle);
        c.position.digits = Math.max(0, Math.min(c.layout.cols, c.position.digits | 0)) || c.layout.cols;
        c.position.holdSec = Math.max(1, +c.position.holdSec || 15);
        c.layout.columns = (c.layout.columns || []).filter(col => col && col.field && col.enabled !== false && col.field !== "pos");
        for (const col of c.layout.columns) {
            if (col.field === "time") col.digits = BL.timeDigits(c.layout.timeStyle);
            col.digits = Math.max(1, col.digits | 0);
        }
        c.timetable = (c.timetable || []).map(r => {
            const o = Object.assign({}, r, { sec: BL.parseTime(r.time) });
            o.arrSec = r.arr ? BL.parseTime(r.arr) : null;
            return o;
        }).filter(r => r.sec != null).sort((a, b) => a.sec - b.sec);
        return c;
    };

    BL.usedCols = cfg => cfg.layout.columns.reduce((s, c) => s + c.digits, 0);
    BL.boardSize = cfg => ({ w: cfg.layout.cols * T, h: cfg.layout.rows * T });

    BL.parseTime = function (s) {
        const m = /^\s*(\d{1,2})\s*[:：]\s*(\d{2})\s*$/.exec(String(s || ""));
        if (!m) return null;
        const h = +m[1], mi = +m[2];
        if (h > 29 || mi > 59) return null;
        return h * 3600 + mi * 60;
    };

    /* ---------- 時刻・状態 ---------- */
    // 4時前は前日の続き(24時超)として扱う
    BL.serviceSeconds = function (date) {
        let h = date.getHours();
        const sec = (h < 4 ? h + 24 : h) * 3600 + date.getMinutes() * 60 + date.getSeconds() + date.getMilliseconds() / 1000;
        return sec;
    };

    // assets を渡すと在線位置の優先表示(mode="position")も判定する。優先順位: 接近 > 在線位置 > スクロール > 通常
    BL.computeState = function (cfg, nowSec, assets) {
        const delay = cfg.behavior.advanceDelaySec;
        const idx = cfg.timetable.findIndex(t => t.sec + delay > nowSec);
        const st = { nowSec, idx, trains: [], secToDep: null, mode: "normal", approachElapsedMs: 0, approachOn: false, posSprite: null };
        if (idx < 0) { st.mode = "ended"; return st; }
        st.trains = cfg.timetable.slice(idx, idx + Math.max(cfg.layout.rows + 1, 3));
        st.secToDep = st.trains[0].sec - nowSec;
        const ap = cfg.approach;
        if (ap.enabled) {
            const total = ap.blinkCount * (ap.onMs + ap.offMs);
            const el = (ap.startSec - st.secToDep) * 1000;
            if (el >= 0 && el < total) {
                st.mode = "approach"; st.approachElapsedMs = el;
                st.approachOn = (el % (ap.onMs + ap.offMs)) < ap.onMs;
                st.approachCycle = Math.floor(el / (ap.onMs + ap.offMs));
            }
        }
        if (st.mode === "normal" && assets) {
            const sp = BL.positionActive(cfg, assets, st);
            if (sp) { st.mode = "position"; st.posSprite = sp; }
        }
        return st;
    };

    /* ---------- 列の描画 ---------- */
    function colorOf(cfg, field, train) {
        const own = train && train.colors && train.colors[field];
        return BL.hexToRgb(own || cfg.colors[field], [255, 165, 0]);
    }

    function pickBitmap(assets, category, name, lang) {
        const it = BL.findItemLang(assets.led, category, name, lang);
        return it ? BL.itemBitmap(it, lang) : null;
    }

    // 画像の探し方: 日本語表示=日本語名がダイヤの値と同じ画像 / 英語表示=英語名がダイヤの(英)の値と同じ画像。
    // 無ければ文字から自動生成する
    const EN_SUFFIX = "（英）";
    BL.enKey = (jaText, enText) => enText || (jaText ? jaText + EN_SUFFIX : "");
    const isPlaceholderEn = t => !t || String(t).endsWith(EN_SUFFIX);
    function textField(cfg, assets, category, train, field, jaText, enText, lang, widthDots, align) {
        let bm = null;
        if (lang === "en") {
            bm = pickBitmap(assets, category, BL.enKey(jaText, enText), "en");
            if (!bm) { // 「日本語名の項目に英語画像が付いている」形(文字から作った素材)も使う
                bm = BL.itemBitmap(BL.findItem(assets.led, category, jaText), "en");
            }
            if (!bm && !isPlaceholderEn(enText)) // 「Tokyo」のように実際の英字が書かれていれば文字から作る
                return BL.textBitmap(enText, widthDots, assets.fonts, colorOf(cfg, field, train), { align });
            if (!bm) lang = "ja"; // 英語の素材が無ければ日本語の表示を使う
        }
        if (lang !== "en") {
            bm = pickBitmap(assets, category, jaText, "ja");
            if (!bm) bm = BL.itemBitmap(BL.findItem(assets.led, category, jaText), "ja");
        }
        if (bm) return fitWidth(bm, widthDots, align);
        return BL.textBitmap(jaText, widthDots, assets.fonts, colorOf(cfg, field, train), { align });
    }
    // 両数・番線: 言語の画像(英語は「名前（英）」)→無ければ日本語の画像
    function numberItem(assets, category, key, lang) {
        if (lang === "en") {
            const en = pickBitmap(assets, category, key + EN_SUFFIX, "en") || pickBitmap(assets, category, key, "en")
                || BL.itemBitmap(BL.findItem(assets.led, category, key), "en");
            if (en) return en;
        }
        return pickBitmap(assets, category, key, "ja") || BL.itemBitmap(BL.findItem(assets.led, category, key), "ja");
    }

    BL.renderColumn = function (cfg, assets, col, train, ctx) {
        const wd = col.digits * T, lang = ctx.lang, align = col.align || "left";
        if (!train) return BL.createBitmap(wd, T);
        switch (col.field) {
            case "type": return textField(cfg, assets, "type", train, "type", train.type, train.typeEn, lang, wd, align);
            case "dest": return textField(cfg, assets, "destination", train, "dest", train.dest, train.destEn, lang, wd, align);
            case "info": return textField(cfg, assets, "information", train, "info", lang === "en" && train.infoEn ? train.infoEn : (train.info || ""), train.infoEn, lang, wd, align);
            case "cars": {
                const key = String(train.cars || "");
                if (!key) return BL.createBitmap(wd, T);
                const bm = numberItem(assets, "cars", key, lang);
                if (bm) return fitWidth(bm, wd, align);
                return BL.textBitmap(key + (lang === "en" ? "cars" : "両"), wd, assets.fonts, colorOf(cfg, "cars", train), { align });
            }
            case "platform": {
                const key = String(train.platform || "");
                if (!key) return BL.createBitmap(wd, T);
                const bm = numberItem(assets, "platform", key, lang);
                if (bm) return fitWidth(bm, wd, align);
                const txt = col.digits <= 1 ? key : col.digits === 2 ? key + (lang === "en" ? "" : "番") : key + (lang === "en" ? "" : "番線");
                return BL.textBitmap(txt, wd, assets.fonts, colorOf(cfg, "platform", train), { align });
            }
            case "time": {
                const h = Math.floor(train.sec / 3600), m = Math.floor((train.sec % 3600) / 60);
                return fitWidth(BL.timeBitmapFor(cfg, assets, h, m, colorOf(cfg, "time", train)), wd, "left");
            }
        }
        return BL.createBitmap(wd, T);
    };

    BL.renderRow = function (cfg, assets, train, ctx) {
        const W = cfg.layout.cols * T, row = BL.createBitmap(W, T);
        let x = 0;
        for (const col of cfg.layout.columns) {
            BL.blit(row, BL.renderColumn(cfg, assets, col, train, ctx), x, 0);
            x += col.digits * T;
        }
        return row;
    };

    /* ---------- 段の割り当て ---------- */
    // スクロールは「最後の段(laneで指定)」を一時的に借りて流す。流していない間は通常の列車表示に戻る
    BL.laneRow = function (cfg) {
        const rows = cfg.layout.rows, v = cfg.scroll.lane;
        return (v === "last" || v < 0 || v == null) ? rows - 1 : Math.min(rows - 1, v | 0);
    };
    BL.scrollWanted = cfg => cfg.layout.rows >= 2 && !!(cfg.scroll.guide.enabled || cfg.scroll.nextStops.enabled);
    BL.trainRows = function (cfg, scrollOn) {
        const lane = BL.laneRow(cfg), out = [];
        for (let r = 0; r < cfg.layout.rows; r++) if (!(scrollOn && r === lane)) out.push(r);
        return out;
    };

    /* ---------- 在線位置(led.jsonの路線+橙の電車を組み合わせる) ---------- */
    BL.positionKit = function (led) {
        const cat = led && led.categories && led.categories.find(c => c.id === "position");
        if (!cat) return null;
        const items = cat.items || [];
        const base = items.find(i => i.id === "pos_base") || null;
        const sprites = items.filter(i => i !== base && typeof i.secBefore === "number");
        return base || sprites.length ? { base, sprites } : null;
    };

    // led.json に在線位置データが無ければ、既定のものを幅に合わせて自動生成(幅ごとに1回だけ)
    const autoKits = new Map();
    function kitFor(assets, wd) {
        const real = BL.positionKit(assets && assets.led);
        if (real) return real;
        if (!autoKits.has(wd)) {
            const items = BL.makePositionKit({ digits: Math.max(1, Math.round(wd / T)) });
            autoKits.set(wd, { base: items[0], sprites: items.slice(1) });
        }
        return autoKits.get(wd);
    }

    // 発車まで secToDep 秒のとき出す電車(secBefore が secToDep 以上で最小のもの)
    BL.pickPosition = function (kit, secToDep) {
        if (!kit || secToDep == null) return null;
        const cand = kit.sprites.filter(sp => sp.secBefore >= secToDep);
        return cand.length ? cand.reduce((a, b) => a.secBefore <= b.secBefore ? a : b) : null;
    };

    // 「電車が動いた」瞬間(各電車の secBefore に達した時)から holdSec 秒の間だけ、その時点の電車を返す
    BL.positionActive = function (cfg, assets, st) {
        if (!cfg.position.enabled || st.secToDep == null || st.secToDep <= 0) return null;
        const kit = kitFor(assets, cfg.position.digits * T);
        if (!kit.sprites.length) return null;
        for (const sp of kit.sprites) {
            const elapsed = sp.secBefore - st.secToDep;
            if (elapsed >= 0 && elapsed < cfg.position.holdSec) return BL.pickPosition(kit, st.secToDep) || sp;
        }
        return null;
    };

    BL.renderPositionBar = function (assets, wd, secToDep, sprite) {
        const bm = BL.createBitmap(wd, T), kit = kitFor(assets, wd);
        if (kit.base) {
            const b = BL.itemBitmap(kit.base, "ja");
            if (b) BL.blit(bm, b, kit.base.x | 0, kit.base.y | 0);
        }
        const sp = sprite || BL.pickPosition(kit, secToDep);
        if (sp) {
            const b = BL.itemBitmap(sp, "ja");
            if (b) BL.blit(bm, b, sp.x | 0, sp.y | 0);
        }
        return bm;
    };

    /* 在線位置の素材(路線+各位置の電車)を作る。戻り値は led.json の items 配列 */
    BL.makePositionKit = function (opts) {
        const o = Object.assign({ digits: 12, stations: 4, positions: 6, stepSec: 60,
            lineColor: "#00ff00", homeColor: "#ff0000", trainColor: "#ffa500" }, opts || {});
        const W = Math.max(2, o.digits | 0) * T, S = Math.max(2, o.stations | 0), P = Math.max(1, o.positions | 0);
        const line = BL.hexToRgb(o.lineColor), home = BL.hexToRgb(o.homeColor), trainRgb = BL.hexToRgb(o.trainColor);
        const base = BL.createBitmap(W, T);
        const put = (bm, x, y, rgb) => {
            if (x < 0 || y < 0 || x >= bm.w || y >= bm.h) return;
            const i = (y * bm.w + x) * 3; bm.d[i] = rgb[0]; bm.d[i + 1] = rgb[1]; bm.d[i + 2] = rgb[2];
        };
        const lineY = 12, boxW = 7, boxTop = 10, boxBottom = 14;
        for (let x = 0; x < W; x++) put(base, x, lineY, line);
        for (let k = 0; k < S; k++) {
            const x0 = Math.round(1 + k * ((W - boxW - 1) - 1) / (S - 1)), last = k === S - 1;
            for (let y = boxTop; y <= boxBottom; y++) for (let x = 0; x < boxW; x++) {
                const edge = x === 0 || x === boxW - 1 || y === boxTop || y === boxBottom;
                if (last) put(base, x0 + x, y, home);
                else if (edge) put(base, x0 + x, y, line);
                else put(base, x0 + x, y, [0, 0, 0]);
            }
            if (last) { // 自駅の赤い目印(下向き三角)
                const cx = x0 + 3;
                for (let d = 0; d < 3; d++) for (let x = cx - (2 - d); x <= cx + (2 - d); x++) put(base, x, 5 + d, home);
            }
        }
        const art = ["..#####..", "#########", "#.#.#.#.#", "#########", "#########", ".##...##."];
        const sw = 9, sh = art.length, spriteTop = 6;
        const spriteBitmap = () => {
            const bm = BL.createBitmap(sw, sh);
            art.forEach((row, y) => [...row].forEach((c, x) => { if (c === "#") put(bm, x, y, trainRgb); }));
            return bm;
        };
        const toView = (bm, name) => ({ name, width: bm.w, height: bm.h, data: Array.from(bm.d) });
        const items = [{ id: "pos_base", x: 0, y: 0, view: { normal: { ja: toView(base, "線路") } } }];
        const xmin = 0, xmax = (W - boxW - 1) - sw - 1;
        for (let i = 0; i < P; i++) {
            const sec = (P - i) * o.stepSec, x = P === 1 ? xmax : Math.round(xmin + i * (xmax - xmin) / (P - 1));
            const label = `${Math.round(sec / 6) / 10}分前`;
            items.push({ id: "pos_" + String(i + 1).padStart(2, "0"), secBefore: sec, x, y: spriteTop,
                view: { normal: { ja: toView(spriteBitmap(), label) } } });
        }
        return items;
    };

    function specialBitmap(cfg, assets, key, lang, text, textEn, colorKey, W) {
        let bm = null;
        if (lang === "en") bm = pickBitmap(assets, "special", key + EN_SUFFIX, "en") || BL.itemBitmap(BL.findItem(assets.led, "special", key), "en");
        if (!bm) bm = pickBitmap(assets, "special", key, "ja") || BL.itemBitmap(BL.findItem(assets.led, "special", key), "ja");
        if (bm) return fitWidth(bm, W, "center");
        return BL.textBitmap(lang === "en" && textEn ? textEn : text, W, assets.fonts, BL.hexToRgb(cfg.colors[colorKey], [255, 48, 48]), { align: "center" });
    }

    /* 1シーン分(静止画)を作る。ctx: {lang, state, approachShown(bool), scrollOn(bool)} */
    BL.buildScene = function (cfg, assets, ctx) {
        const { w, h } = BL.boardSize(cfg), bm = BL.createBitmap(w, h);
        const st = ctx.state, rows = BL.trainRows(cfg, !!ctx.scrollOn);
        if (st.mode === "ended") {
            BL.blit(bm, specialBitmap(cfg, assets, "ended", ctx.lang, cfg.messages.ended, cfg.messages.endedEn, "ended", w), 0, 0);
            return bm;
        }
        const pick = v => (v === "last" || v < 0 || v == null) ? rows.length - 1 : Math.min(rows.length - 1, v | 0);
        const apActive = st.mode === "approach" && ctx.approachShown;
        const apIdx = pick(cfg.approach.row);
        const posIdx = pick(cfg.position.row);
        const apBm = apActive ? specialBitmap(cfg, assets, "approach", ctx.lang, cfg.approach.text, cfg.approach.textEn, "approach", w) : null;
        const rctx = { lang: ctx.lang };
        rows.forEach((r, i) => {
            let rowBm;
            if (apActive && i === apIdx) rowBm = apBm;
            else if (st.mode === "position" && i === posIdx) rowBm = BL.renderPositionBar(assets, cfg.position.digits * T, st.secToDep, st.posSprite);
            else if (st.mode === "approach" && !ctx.approachShown && i === apIdx && cfg.approach.offShows !== "train") rowBm = BL.createBitmap(w, T); // 消灯中は黒
            else if (st.mode === "approach" && !ctx.approachShown && i === 0 && cfg.approach.blinkTrain) rowBm = BL.createBitmap(w, T);
            else rowBm = BL.renderRow(cfg, assets, st.trains[i], Object.assign({ rowIndex: i }, rctx));
            BL.blit(bm, rowBm, 0, r * T);
        });
        return bm;
    };

    /* 英語シーンを作る意味があるか(先頭2本のどれかに英語表記がある) */
    BL.hasEnglish = function (cfg, assets, st) {
        const has = (cat, ja, en) => !!(pickBitmap(assets, cat, BL.enKey(ja, en), "en") || BL.itemBitmap(BL.findItem(assets.led, cat, ja), "en") || (en && !isPlaceholderEn(en)));
        return st.trains.slice(0, cfg.layout.rows).some(t => has("type", t.type, t.typeEn) || has("destination", t.dest, t.destEn));
    };

    // 接近表示中に出す言語(英語切り替えONなら点灯ごとに日本語/英語を交互に)
    BL.approachLang = (cfg, st) => cfg.approach.english && st.mode === "approach" && (st.approachCycle || 0) % 2 === 1 ? "en" : "ja";

    // ツール用: ある発車前秒数のとき出る電車(プレビュー確認用)
    BL.positionSpriteAt = function (cfg, assets, secToDep) {
        return BL.pickPosition(kitFor(assets, cfg.position.digits * T), secToDep);
    };

    // E233フォント(256ビット/字)を base64 に詰めた形から復元(単体HTMLに埋め込む用)
    BL.unpackKanji = function (packed) {
        const out = {};
        for (const ch of Object.keys(packed)) {
            const bin = atob(packed[ch]), a = new Array(256);
            for (let i = 0; i < 256; i++) a[i] = (bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
            out[ch] = a;
        }
        return out;
    };

    /* ---------- スクロール(案内 / 駅到着後の次停車駅) ---------- */
    const scrollCache = new Map();
    // texts: 文字列、または {text, color} の配列(文字ごとに色を変えられる)
    function scrollBitmap(cfg, assets, texts) {
        const list = texts.map(t => typeof t === "string" ? { text: t, color: "" } : { text: t.text || "", color: t.color || "" });
        const key = list.map(t => t.text + "@" + t.color).join("\n") + "|" + cfg.scroll.color + "|" + cfg.scroll.gapDots;
        if (scrollCache.has(key)) return scrollCache.get(key);
        const gap = cfg.scroll.gapDots;
        const parts = list.map(t => BL.textBitmap(t.text, null, assets.fonts, BL.hexToRgb(t.color || cfg.scroll.color, [255, 165, 0])));
        const total = parts.reduce((sum, p) => sum + p.w + gap, 0);
        const bm = BL.createBitmap(Math.max(1, total), T);
        let x = 0;
        for (const p of parts) { BL.blit(bm, p, x, 0); x += p.w + gap; }
        if (scrollCache.size > 24) scrollCache.clear();
        scrollCache.set(key, bm);
        return bm;
    }

    BL.nextStopsText = function (cfg, t) {
        const stops = t.stops || [];
        return String(cfg.messages.nextStopsFormat || "")
            .replace(/\{type\}/g, t.type || "").replace(/\{dest\}/g, t.dest || "")
            .replace(/\{next\}/g, stops[0] || "").replace(/\{stops\}/g, stops.join("、"));
    };

    // いま流すスクロール。優先: 次停車駅(駅到着後) > 案内(頻度に従う)。無ければ null
    // 戻り値 {kind, bm, startSec, loop, key}  位置は BL.scrollX で求める
    BL.scrollPlan = function (cfg, assets, st, nowSec) {
        if (!st || st.mode !== "normal" || !st.trains.length || !BL.scrollWanted(cfg)) return null;
        const sc = cfg.scroll, W = cfg.layout.cols * T, speed = Math.max(1, +sc.speed || 50), t0 = st.trains[0];
        if (sc.nextStops.enabled && t0.stops && t0.stops.length) {
            const arr = t0.arrSec != null ? t0.arrSec : t0.sec - Math.max(0, +sc.nextStops.dwellSec || 0);
            if (nowSec >= arr && nowSec < t0.sec + cfg.behavior.advanceDelaySec) {
                const text = BL.nextStopsText(cfg, t0), bm = scrollBitmap(cfg, assets, [text]);
                if (sc.nextStops.loop || nowSec - arr < (bm.w + W) / speed) return { kind: "nextStops", bm, startSec: arr, loop: !!sc.nextStops.loop, key: "n|" + text };
            }
        }
        const guides = (cfg.messages.guide || []).map(g => typeof g === "string" ? { text: g, color: "" } : g).filter(g => g && g.text);
        if (sc.guide.enabled && guides.length) {
            const bm = scrollBitmap(cfg, assets, guides), pass = (bm.w + W) / speed, P = Math.max(0, +sc.guide.intervalSec || 0);
            const key = "g|" + guides.map(g => g.text + "@" + (g.color || "")).join("|");
            if (P <= 0 || P <= pass) return { kind: "guide", bm, startSec: 0, loop: true, key };
            const phase = nowSec % P;
            if (phase < pass) return { kind: "guide", bm, startSec: nowSec - phase, loop: false, key: key + "|" + Math.floor(nowSec / P) };
        }
        return null;
    };

    // 盤面左端を基準にした、スクロール文字列の左端x(ドット)
    BL.scrollX = function (plan, nowSec, W, speed) {
        const total = plan.bm.w + W;
        let d = (nowSec - plan.startSec) * speed;
        if (plan.loop) d = ((d % total) + total) % total;
        return Math.round(W - d);
    };

    /* ---------- led.json 用の素材づくり(led作成ツール/サンプル生成共通) ---------- */
    function toView(bm, name) { return { name, width: bm.w, height: bm.h, data: Array.from(bm.d) }; }

    // 文字列から素材アイテムを作る。digits=桁数。enName があれば英語ビューも作る
    BL.makeTextItem = function (fonts, id, name, enName, digits, rgbJa, rgbEn, align) {
        const w = digits * T, view = {};
        view.ja = toView(BL.textBitmap(name, w, fonts, rgbJa, { align: align || "left" }), name);
        if (enName) view.en = toView(BL.textBitmap(enName, w, fonts, rgbEn || rgbJa, { align: align || "left" }), enName);
        return { id, view: { normal: view } };
    };

    // 標準の数字で「時刻」素材一式(時00〜24・ゼロ埋め無し0〜9・コロン・分00〜59)を作る
    BL.makeDefaultTimeSet = function (style, rgb) {
        style = style === "4" ? "4" : "3";
        const st = BL.TIME_STYLES[style], items = [], pre = "time" + style + "_";
        const mk = (id, role, name, bm) => items.push({ id: pre + id, timeRole: role, timeStyle: style, view: { normal: { ja: toView(bm, name) } } });
        for (let h = 0; h <= 24; h++) mk("h_" + String(h).padStart(2, "0"), "hour", String(h).padStart(2, "0"), genDigits(String(h).padStart(2, "0"), st.hh, rgb, false));
        for (let h = 0; h < 10; h++) mk("h_" + h, "hour", String(h), genDigits("0" + h, st.hh, rgb, true));
        mk("colon", "colon", ":", bitsToBitmap(BL.colonBits(st.colon, T), st.colon, T, rgb));
        for (let m = 0; m < 60; m++) mk("m_" + String(m).padStart(2, "0"), "minute", String(m).padStart(2, "0"), genDigits(String(m).padStart(2, "0"), st.mm, rgb, false));
        return items;
    };

    // 言語別の素材を1枚作る。lang="en" のときは英語ビューだけを持つ項目になる(名前は「日本語名（英）」)
    BL.makeLangItem = function (fonts, id, lang, name, text, digits, rgb, align) {
        const bm = BL.textBitmap(text == null || text === "" ? name : text, digits * T, fonts, rgb, { align: align || "left" });
        return { id, view: { normal: { [lang]: toView(bm, name) } } };
    };

    BL.emptyLed = function () {
        return {
            format: "atos-board-led", version: 1,
            categories: [
                { id: "type", name: "種別", items: [] },
                { id: "destination", name: "行先", items: [] },
                { id: "cars", name: "両数", items: [] },
                { id: "platform", name: "番線", items: [] },
                { id: "information", name: "案内", items: [] },
                { id: "time", name: "時刻(timeRole: hour=左2桁 / colon=: / minute=右2桁)", items: [] },
                { id: "position", name: "在線位置(pos_base=線路 / secBefore=発車の何秒前から出すか)", items: [] },
                { id: "special", name: "特殊表示(approach=接近 / ended=終了)", items: [] }
            ]
        };
    };

    if (typeof module !== "undefined" && module.exports) module.exports = BL;
    else root.BoardLib = BL;
})(typeof window !== "undefined" ? window : globalThis);
