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
        if (S.fonts.kanji && S.fonts.ascii && S.fonts.clock16) return;
        const [k, a, c] = await Promise.all([fetch("fonts/font_E233.json"), fetch("fonts/ascii8x16.json"), fetch("fonts/clock16.json")]);
        if (!k.ok || !a.ok || !c.ok) throw new Error("フォントを読み込めませんでした");
        S.fonts.kanji = await k.json();
        S.fonts.ascii = await a.json();
        S.fonts.clock16 = await c.json();
    }

    function setStatus(text) { const el = $("boardLoadStatus"); if (el) el.textContent = text; }

    function applyConfig(json) {
        S.cfg = BL.normalizeConfig(json);
        BL.clearTimeCache && BL.clearTimeCache();
        const size = BL.boardSize(S.cfg);
        const cv = $("boardLedPreview");
        cv.width = Math.ceil((size.w - 1) * PITCH + DOT);
        cv.height = Math.ceil((size.h - 1) * PITCH + DOT);
        S.bg = null; S.lastKey = ""; S.lastSig = "";
        resize();
        setStatus(`${S.cfg.name || "(無題)"}: ${S.cfg.layout.cols}桁×${S.cfg.layout.rows}段 / ダイヤ${S.cfg.timetable.length}本` + (S.led ? "" : " / 素材なし(文字から自動生成)"));
        requestTransfer(true);
    }

    // board/board.json の一覧(方向幕の一覧と同じカード表示)から駅を選ぶ
    async function ensureBoardList() {
        if (S.boards) return;
        try {
            const res = await fetch("board/board.json", { cache: "no-cache" });
            if (!res.ok) throw new Error("board/board.json がありません");
            S.boards = (await res.json()).boards || [];
        } catch (e) { S.boards = []; console.error("駅の一覧を読み込めませんでした:", e); }
        buildBoardCards();
    }

    // icon / icons は board/<dir>/ からの相対パス(「/」を含むときは board/ からの相対)で指定する
    function boardIconUrls(b) {
        const list = Array.isArray(b.icons) ? b.icons : b.icon ? [b.icon] : [];
        return list.map(f => /^(https?:|data:|\/)/.test(f) ? f : "board/" + (f.includes("/") || !b.dir ? "" : b.dir.replace(/\/?$/, "/")) + f);
    }

    function buildBoardCards() {
        const box = $("boardSelectList");
        if (!box) return;
        box.innerHTML = "";
        for (const b of S.boards || []) {
            const btn = document.createElement("button");
            btn.dataset.search = `${b.name || ""} ${b.id || ""} ${b.description || ""}`.toLowerCase();
            const icons = document.createElement("div"); icons.className = "vehicleIcons";
            for (const url of boardIconUrls(b)) { const img = document.createElement("img"); img.src = url; img.className = "vehicleIcon"; img.alt = ""; icons.appendChild(img); }
            const span = document.createElement("span"); span.textContent = b.name || b.id || "駅";
            const small = document.createElement("small"); small.className = "vehicleDescription"; small.textContent = b.description || "";
            const text = document.createElement("div"); text.className = "vehicleText"; text.append(span, small);
            btn.append(icons, text);
            btn.addEventListener("click", () => openBoard(b.id));
            box.appendChild(btn);
        }
        if (!(S.boards || []).length) box.textContent = "駅の一覧がありません（board/board.json を確認してください）";
    }

    // 方向幕の一覧 ⇔ 発車標(駅)の一覧 を切り替える
    function setListMode(on) {
        $("vehicleSelector")?.classList.toggle("boardListMode", on);
        if ($("boardSelectList")) $("boardSelectList").hidden = !on;
        if ($("departureBoardBtn")) $("departureBoardBtn").hidden = on;
        if ($("vehicleModeBtn")) $("vehicleModeBtn").hidden = !on;
        const input = $("vehicleSearchInput");
        if (input) { input.value = ""; input.placeholder = on ? "🔍駅名で検索" : "🔍車両名で検索"; }
        filterBoardCards("");
    }
    async function showBoardList() { await ensureBoardList(); setListMode(true); }
    function showVehicleList() { setListMode(false); }

    function filterBoardCards(q) {
        q = (q || "").trim().toLowerCase();
        document.querySelectorAll("#boardSelectList button").forEach(b => { b.hidden = !!q && !(b.dataset.search || "").includes(q); });
    }

    async function selectBoard(id) {
        const b = (S.boards || []).find(x => x.id === id);
        if (!b) return;
        try {
            await loadFonts();
            const base = "board/" + (b.dir ? b.dir.replace(/\/?$/, "/") : "");
            const [c, l] = await Promise.all([fetch(base + (b.config || "config.json"), { cache: "no-cache" }), fetch(base + (b.led || "led.json"), { cache: "no-cache" })]);
            if (!c.ok) throw new Error(`${base}${b.config || "config.json"} が読み込めません`);
            S.led = l.ok ? await l.json() : null;
            applyConfig(await c.json());
        } catch (e) { setStatus("読み込み失敗: " + e.message); }
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

    // いまの表示(言語と、種別/路線名のどちらを出すか)。通常表示以外は日本語の種別
    function phaseAt(st, ms) {
        if (st.mode === "approach") return { lang: BL.approachLang(S.cfg, st), show: "type" };
        if (st.mode !== "normal") return { lang: "ja", show: "type" };
        return BL.schedulePick(BL.displaySchedule(S.cfg, assets(), st), ms);
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
        const mk = (lang, approachShown, typeShow) => BL.buildScene(cfg, A, { lang, typeShow: typeShow || "type", state: st, approachShown, scrollOn: !!sp });
        if (st.mode === "approach") {
            plan.scenes = [mk("ja", true), mk("ja", false)];
            plan.intervals = [cfg.approach.onMs, cfg.approach.offMs];
            if (cfg.approach.english) { // 日本語→英語を交互に点滅
                plan.scenes.push(mk("en", true), mk("en", false));
                plan.intervals.push(cfg.approach.onMs, cfg.approach.offMs);
            }
        } else if (st.mode === "position") {
            plan.scenes = [mk("ja", false)]; plan.intervals = [0xffff]; // 優先表示中は日本語のみ
        } else if (st.mode === "ended") {
            plan.scenes = [mk("ja", false)]; plan.intervals = [0xffff];
            if (cfg.lang.enabled) { plan.scenes.push(mk("en", false)); plan.intervals = [cfg.lang.jaSec * 1000, cfg.lang.enSec * 1000]; }
        } else {
            // 通常表示: 日本語種別 → 日本語路線名 → 英語種別 → 英語路線名 のように、順に切り替える
            const sch = BL.displaySchedule(cfg, A, st);
            plan.scenes = sch.map(p => mk(p.lang, false, p.show));
            plan.intervals = sch.length > 1 ? sch.map(p => Math.round(p.ms)) : [0xffff];
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
        const ph = phaseAt(st, ms), lang = ph.lang;
        const key = `${sig}|${lang}|${ph.show}|${st.approachOn}|${sx}`;
        if (key === S.lastKey) { updateStatusText(st, sp); return; }
        S.lastKey = key;

        ensureBackground();
        const cv = $("boardLedPreview"), ctx = cv.getContext("2d");
        ctx.drawImage(S.bg, 0, 0);
        const scene = BL.buildScene(cfg, A, { lang, typeShow: ph.show, state: st, approachShown: st.approachOn, scrollOn: !!sp });
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

    async function openBoard(id) {
        const vs = $("vehicleSelector"), db = $("departureBoard");
        if (!vs || !db || db.dataset.transitioning === "true") return;
        db.dataset.transitioning = "true";
        isDepartureBoard = true;
        try {
            await showScreenSmoothly(db, vs);
            setVehicleSelectButton();
            ensureUI();
            setStatus("読み込み中...");
            try { await loadFonts(); } catch (e) { setStatus(e.message); }
            await selectBoard(id);
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
        $("departureBoardBtn")?.addEventListener("click", showBoardList);
        $("vehicleModeBtn")?.addEventListener("click", showVehicleList);
        $("vehicleSearchInput")?.addEventListener("input", e => { if ($("vehicleSelector")?.classList.contains("boardListMode")) filterBoardCards(e.target.value); });
        // 時刻の操作(確認用)は ?boardDebug を付けて開いたときだけ表示する
        if (/[?&]boardDebug\b/.test(location.search)) $("boardDebug")?.removeAttribute("hidden");
        $("boardClockSetBtn")?.addEventListener("click", () => {
            const v = $("boardClockInput").value; if (!v) return;
            const [h, m, sec] = v.split(":").map(Number);
            const d = new Date(); d.setHours(h, m, sec || 0, 0); setVirtual(d.getTime()); S.lastSig = "";
        });
        $("boardClockRealBtn")?.addEventListener("click", () => { S.speed = 1; $("boardSpeed").value = "1"; setVirtual(Date.now()); S.lastSig = ""; });
        $("boardClockJumpBtn")?.addEventListener("click", () => jumpBeforeNext(20));
        $("boardClockJumpPosBtn")?.addEventListener("click", () => jumpBeforeNext(185));
        $("boardSpeed")?.addEventListener("change", e => { setVirtual(virtualMs()); S.speed = Number(e.target.value) || 1; });
        $("boardTransferBtn")?.addEventListener("click", () => requestTransfer(true));
        window.addEventListener("resize", resize);
        if ("ResizeObserver" in window) {
            const main = document.querySelector("#departureBoard main");
            if (main) new ResizeObserver(resize).observe(main);
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();

    return { buildTransferPlan, requestTransfer, back, getConfig: () => S.cfg, showBoardList, showVehicleList };
})();

function returnFromDepartureBoard() { return BoardApp.back(); }
function buildBoardTransferPlan() { return BoardApp.buildTransferPlan(); }
function requestBoardTransfer(force) { return BoardApp.requestTransfer(force); }
