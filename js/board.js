/* ===== 発車標モード (ATOS風) =====
 * config.json(レイアウト・ダイヤ・動作) と led.json(種別・行先などの素材) を読み込み、
 * LEDプレビュー表示と ESP32 への転送計画を作る。描画ロジックは boardlib.js。
 */
let isDepartureBoard = false;

const BoardApp = (function () {
    const BL = window.BoardLib;
    const PITCH = 8.5, DOT = 6.5, R = DOT / 2;

    const S = {
        cfg: null, led: null, fonts: { kanji: null, ascii: null },
        anchorVirtual: Date.now(), anchorReal: Date.now(), speed: 1,
        raf: null, lastKey: "", lastSig: "", bg: null, bgW: 0, bgH: 0, transferTimer: null
    };
    const $ = id => document.getElementById(id);

    /* ---------- 読み込み ---------- */
    async function loadFonts() {
        if (S.fonts.kanji && S.fonts.ascii) return;
        const [k, a] = await Promise.all([fetch("fonts/font_E233.json"), fetch("fonts/ascii8x16.json")]);
        if (!k.ok || !a.ok) throw new Error("フォントを読み込めませんでした");
        S.fonts.kanji = await k.json();
        S.fonts.ascii = await a.json();
    }

    function setStatus(text) { const el = $("boardLoadStatus"); if (el) el.textContent = text; }

    function applyConfig(json) {
        S.cfg = BL.normalizeConfig(json);
        const size = BL.boardSize(S.cfg);
        const cv = $("boardLedPreview");
        cv.width = Math.ceil((size.w - 1) * PITCH + DOT);
        cv.height = Math.ceil((size.h - 1) * PITCH + DOT);
        S.bg = null; S.lastKey = ""; S.lastSig = "";
        resize();
        setStatus(`config: ${S.cfg.name || "(無題)"} / ${S.cfg.layout.cols}桁×${S.cfg.layout.rows}段 / ダイヤ${S.cfg.timetable.length}本`
            + (S.led ? " / led.json 読込済" : " / led.json なし(文字から自動生成)"));
        requestTransfer(true);
    }

    async function readFile(input) {
        const f = input.files && input.files[0];
        if (!f) return null;
        try { return JSON.parse(await f.text()); } finally { input.value = ""; }
    }

    async function loadSample() {
        try {
            await loadFonts();
            const [c, l] = await Promise.all([fetch("board/sample-config.json"), fetch("board/sample-led.json")]);
            if (!c.ok) throw new Error("board/sample-config.json がありません");
            S.led = l.ok ? await l.json() : null;
            applyConfig(await c.json());
        } catch (e) { setStatus("サンプル読込失敗: " + e.message); }
    }

    /* ---------- 時計 ---------- */
    const virtualMs = () => S.anchorVirtual + (Date.now() - S.anchorReal) * S.speed;
    const nowSec = () => BL.serviceSeconds(new Date(virtualMs()));
    function setVirtual(ms) { S.anchorVirtual = ms; S.anchorReal = Date.now(); }

    function jumpBeforeNext(sec) {
        if (!S.cfg) return;
        const st = BL.computeState(S.cfg, nowSec(), assets());
        // 終電後などで次の列車が無いときは、ダイヤの先頭列車に合わせる
        const first = st.idx >= 0 ? st.trains[0] : S.cfg.timetable[0];
        if (!first) return;
        const target = first.sec - sec;
        const d = new Date(); d.setHours(0, 0, 0, 0);
        setVirtual(d.getTime() + (target % 86400) * 1000);
        S.lastSig = "";
    }

    /* ---------- シーン ---------- */
    const assets = () => ({ led: S.led, fonts: S.fonts });

    function langAt(st, ms) {
        const L = S.cfg.lang;
        if (!L.enabled || st.mode !== "normal" || !BL.hasEnglish(S.cfg, assets(), st)) return "ja";
        const cycle = (L.jaSec + L.enSec) * 1000, t = ms % cycle;
        return t < L.jaSec * 1000 ? "ja" : "en";
    }

    // 表示内容が変わったか(=ESP32へ再転送が必要か)を判定する識別子
    function signature(st, sp) {
        const rows = S.cfg.layout.rows;
        const ids = st.trains.slice(0, rows).map(t => `${t.sec}${t.type}${t.dest}${t.platform}${t.cars}`).join(",");
        const pos = st.mode === "position" && st.posSprite ? st.posSprite.id : "";
        return `${st.mode}#${ids}#${pos}#${sp ? sp.key : ""}`;
    }

    /* 転送用: 静止シーン群 + スクロール */
    function buildTransferPlan() {
        if (!S.cfg) throw new Error("config.json が読み込まれていません");
        const cfg = S.cfg, A = assets(), nowS = nowSec(), st = BL.computeState(cfg, nowS, A);
        const sp = BL.scrollPlan(cfg, A, st, nowS);
        const size = BL.boardSize(cfg);
        const plan = { width: size.w, height: size.h, scenes: [], intervals: [], scroll: null, laneRow: -1 };
        const mk = (lang, approachShown) => BL.buildScene(cfg, A, { lang, state: st, approachShown, scrollOn: !!sp });
        if (st.mode === "approach") {
            plan.scenes = [mk("ja", true), mk("ja", false)];
            plan.intervals = [cfg.approach.onMs, cfg.approach.offMs];
        } else if (st.mode === "position") {
            plan.scenes = [mk("ja", false)]; plan.intervals = [0xffff]; // 優先表示中は日本語のみ
        } else if (st.mode === "ended") {
            plan.scenes = [mk("ja", false)]; plan.intervals = [0xffff];
            if (cfg.lang.enabled) { plan.scenes.push(mk("en", false)); plan.intervals = [cfg.lang.jaSec * 1000, cfg.lang.enSec * 1000]; }
        } else {
            plan.scenes = [mk("ja", false)];
            plan.intervals = [0xffff];
            if (cfg.lang.enabled && BL.hasEnglish(cfg, A, st)) {
                plan.scenes.push(mk("en", false));
                plan.intervals = [cfg.lang.jaSec * 1000, cfg.lang.enSec * 1000];
            }
            if (sp) { plan.scroll = sp.bm; plan.laneRow = BL.laneRow(cfg); plan.scrollSpeed = cfg.scroll.speed; }
        }
        return plan;
    }

    /* ---------- 描画 ---------- */
    function ensureBackground() {
        const cv = $("boardLedPreview");
        if (S.bg && S.bgW === cv.width && S.bgH === cv.height) return;
        const bg = document.createElement("canvas"); bg.width = cv.width; bg.height = cv.height;
        const c = bg.getContext("2d");
        c.fillStyle = "#000"; c.fillRect(0, 0, bg.width, bg.height);
        c.fillStyle = "#1b1b1b";
        const size = BL.boardSize(S.cfg);
        for (let y = 0; y < size.h; y++) for (let x = 0; x < size.w; x++) {
            c.beginPath(); c.arc(x * PITCH + R, y * PITCH + R, R, 0, Math.PI * 2); c.fill();
        }
        S.bg = bg; S.bgW = bg.width; S.bgH = bg.height;
    }

    function drawDots(ctx, bm, yDots, clipLeft, clipRight, dxDots) {
        for (let y = 0; y < bm.h; y++) for (let x = 0; x < bm.w; x++) {
            const i = (y * bm.w + x) * 3, r = bm.d[i], g = bm.d[i + 1], b = bm.d[i + 2];
            if (!(r | g | b)) continue;
            const px = x + dxDots;
            if (px < clipLeft || px >= clipRight) continue;
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.beginPath(); ctx.arc(px * PITCH + R, (y + yDots) * PITCH + R, R, 0, Math.PI * 2); ctx.fill();
        }
    }

    function frame() {
        S.raf = requestAnimationFrame(frame);
        if (!S.cfg || !S.fonts.kanji) return;
        const cfg = S.cfg, A = assets(), ms = virtualMs(), nowS = BL.serviceSeconds(new Date(ms));
        const st = BL.computeState(cfg, nowS, A), sp = BL.scrollPlan(cfg, A, st, nowS);

        const sig = signature(st, sp);
        if (sig !== S.lastSig) { S.lastSig = sig; requestTransfer(false); }

        const W = BL.boardSize(cfg).w, sx = sp ? BL.scrollX(sp, nowS, W, Math.max(1, +cfg.scroll.speed || 50)) : 0;
        const lang = langAt(st, ms);
        const key = `${sig}|${lang}|${st.approachOn}|${sx}`;
        if (key === S.lastKey) { updateStatusText(st, sp); return; }
        S.lastKey = key;

        ensureBackground();
        const cv = $("boardLedPreview"), ctx = cv.getContext("2d");
        ctx.drawImage(S.bg, 0, 0);
        const scene = BL.buildScene(cfg, A, { lang, state: st, approachShown: st.approachOn, scrollOn: !!sp });
        drawDots(ctx, scene, 0, 0, scene.w, 0);
        if (sp) drawDots(ctx, sp.bm, BL.laneRow(cfg) * BL.UNIT, 0, scene.w, sx);
        updateStatusText(st, sp);
    }

    function updateStatusText(st, sp) {
        const el = $("boardStatusText");
        if (!el) return;
        const d = new Date(virtualMs()), pad = n => String(n).padStart(2, "0");
        const clock = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        const mode = { normal: "通常表示", approach: "接近表示中", position: "在線位置(優先表示)", ended: "終了(終電後)" }[st.mode]
            + (sp ? (sp.kind === "nextStops" ? " + 次停車駅スクロール" : " + 案内スクロール") : "");
        const next = st.trains[0] ? `次: ${st.trains[0].time} ${st.trains[0].type || ""} ${st.trains[0].dest || ""}行 (あと${Math.round(st.secToDep)}秒)` : "";
        el.textContent = `仮想時刻 ${clock} ×${S.speed} / ${mode} / ${next}`;
    }

    function resize() {
        const cv = $("boardLedPreview");
        const main = cv && cv.closest("#departureBoard main");
        if (!cv || !main || main.clientWidth <= 0 || !cv.width) return;
        const maxW = Math.max(1, main.clientWidth - 90);
        const scale = Math.min(1, maxW / cv.width);
        cv.style.width = Math.floor(cv.width * scale) + "px";
        cv.style.height = Math.floor(cv.height * scale) + "px";
    }

    /* ---------- 転送要求(デバウンス) ---------- */
    function requestTransfer(force) {
        if (!isDepartureBoard) return;
        if (!force && !$("boardAutoTransfer")?.checked) return;
        clearTimeout(S.transferTimer);
        S.transferTimer = setTimeout(() => {
            if (typeof transferBoardToESP32 === "function") transferBoardToESP32();
        }, force ? 50 : 150);
    }

    /* ---------- 画面の出入り ---------- */
    function ensureUI() {
        const side = $("departureBoardSidebar");
        if (side && !side.querySelector(".esp32Setting")) {
            const div = document.createElement("div");
            div.className = "esp32Setting";
            div.style.cssText = "margin: 12px 0; padding: 12px; background: #eef6ff; border: 1px solid #007bff; border-radius: 8px;";
            div.innerHTML = `<h2 style="margin-top:0;font-size:14px;color:#007bff;">Bluetooth設定</h2>
                <button type="button" class="btConnectBtn" onclick="connectBluetooth()" style="width:100%;padding:10px;font-size:14px;font-weight:bold;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;">Bluetooth接続</button>
                <p class="transferStatus" style="margin:8px 0 0;font-size:12px;font-weight:bold;color:#333;"></p>`;
            side.insertBefore(div, $("departureBoardBackButton"));
        }
    }

    async function start() {
        const vs = $("vehicleSelector"), db = $("departureBoard");
        if (!vs || !db || db.dataset.transitioning === "true") return;
        db.dataset.transitioning = "true";
        isDepartureBoard = true;
        try {
            await showScreenSmoothly(db, vs);
            setVehicleSelectButton();
            ensureUI();
            try { await loadFonts(); } catch (e) { setStatus(e.message); }
            if (!S.cfg) setStatus("config.json を読み込むか、サンプルを読み込んでください");
            else requestTransfer(true);
            requestAnimationFrame(resize);
            if (!S.raf) S.raf = requestAnimationFrame(frame);
        } finally { delete db.dataset.transitioning; }
    }

    async function back() {
        const vs = $("vehicleSelector"), db = $("departureBoard");
        if (!vs || !db || db.dataset.returning === "true") return;
        db.dataset.returning = "true";
        try {
            const p = showScreenSmoothly(vs, db);
            isDepartureBoard = false;
            cancelAnimationFrame(S.raf); S.raf = null;
            await p;
        } finally { delete db.dataset.returning; }
    }

    function bind() {
        $("departureBoardBtn")?.addEventListener("click", start);
        $("boardConfigFile")?.addEventListener("change", async e => {
            try { await loadFonts(); applyConfig(await readFile(e.target)); } catch (err) { setStatus("config.json を読めません: " + err.message); }
        });
        $("boardLedFile")?.addEventListener("change", async e => {
            try { S.led = await readFile(e.target); S.lastKey = ""; S.lastSig = ""; setStatus("led.json を読み込みました"); requestTransfer(true); }
            catch (err) { setStatus("led.json を読めません: " + err.message); }
        });
        $("boardLoadSampleBtn")?.addEventListener("click", loadSample);
        $("boardClockSetBtn")?.addEventListener("click", () => {
            const v = $("boardClockInput").value; if (!v) return;
            const [h, m, s] = v.split(":").map(Number);
            const d = new Date(); d.setHours(h, m, s || 0, 0); setVirtual(d.getTime()); S.lastSig = "";
        });
        $("boardClockRealBtn")?.addEventListener("click", () => { S.speed = 1; $("boardSpeed").value = "1"; setVirtual(Date.now()); S.lastSig = ""; });
        $("boardClockJumpBtn")?.addEventListener("click", () => jumpBeforeNext(20));
        $("boardClockJump3Btn")?.addEventListener("click", () => jumpBeforeNext(180));
        $("boardSpeed")?.addEventListener("change", e => { setVirtual(virtualMs()); S.speed = Number(e.target.value) || 1; });
        $("boardTransferBtn")?.addEventListener("click", () => requestTransfer(true));
        window.addEventListener("resize", resize);
        if ("ResizeObserver" in window) {
            const main = document.querySelector("#departureBoard main");
            if (main) new ResizeObserver(resize).observe(main);
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();

    return { buildTransferPlan, requestTransfer, back, getConfig: () => S.cfg };
})();

function returnFromDepartureBoard() { return BoardApp.back(); }
function buildBoardTransferPlan() { return BoardApp.buildTransferPlan(); }
function requestBoardTransfer(force) { return BoardApp.requestTransfer(force); }
