// ============================================================
// JavaScript Main Controller
// ============================================================
async function startVehicle() {
    clearInterval(scrollTimer);
    scrollTimer = null;

window.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    setupVehicleSelectMethod();
    setupEventListeners();
}
    clickStartScrollBtn = false;
    scrollId = null;

function setupVehicleSelectMethod() {
    const methodSelect = document.getElementById("vehicleSelectMethod");
    if (!methodSelect) return;
    showLoading();
    
    try { 
        await loadLed();

    methodSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        const vehicleSelectDiv = document.getElementById("vehicleSelect");
        const mapDiv = document.getElementById("map");
        if (!config) return;

        if (val === "list") {
            if (vehicleSelectDiv) vehicleSelectDiv.hidden = false;
            if (mapDiv) mapDiv.hidden = true;
        } else if (val === "grid") {
            if (vehicleSelectDiv) vehicleSelectDiv.hidden = true;
            if (mapDiv) mapDiv.hidden = false;
            if (typeof initMap === "function") {
                initMap();
        ledsize = config.ledSize;
        ledgap = config.ledGap;
        pitch = ledsize + ledgap;
        pitchY = ledsize * 0.9 + ledgap;
        radius = ledsize / 2;
        
        if (typeof sizeLed !== "undefined" && sizeLed) {
            sizeLed.width = config.ledWidth * pitch;
            if (config.ledShape === "circle") {
                sizeLed.height = config.ledHeight * pitch;
            }
            if (config.ledShape === "rectangle") {
                sizeLed.height = config.ledHeight * pitchY;
            }
            if (typeof cacheCanvas !== "undefined" && cacheCanvas) {
                cacheCanvas.width = sizeLed.width;
                cacheCanvas.height = sizeLed.height;
}
}
    });
    
        resizeLed();
        setupVehicleUI();
        startRenderLoop();
    } finally {
        hideLoading();
    }
}

function setupEventListeners() {
    // 車両選択に戻るボタンのイベント設定（安全ガード付き）
    const returnBtn = document.getElementById("vehicleSelectButton");
    if (returnBtn) {
        returnBtn.addEventListener("click", () => {
            returnToVehicleSelect();
        });
    }
function resizeLed() {
    if (!config) return;
    const main = document.querySelector("main");
    if (!main || typeof sizeLed === "undefined" || !sizeLed) return;

    // スクロールチェックボックス
    const scrollCheck = document.getElementById("scrollCheck");
    if (scrollCheck) {
        scrollCheck.addEventListener("change", (e) => {
            const scrollText = document.getElementById("scrollText");
            const startScrollBtn = document.getElementById("startScrollBtn");
            if (scrollText) scrollText.hidden = !e.target.checked;
            if (startScrollBtn) startScrollBtn.hidden = !e.target.checked;
        });
    const maxWidth = main.clientWidth - 40;
    const canvasWidth = sizeLed.width;
    const scale = Math.min(1, maxWidth / canvasWidth);

    if (sizeLed.style) {
        sizeLed.style.width = sizeLed.width * scale + "px";
        sizeLed.style.height = sizeLed.height * scale + "px";
}
}

// ============================================================
// 車両選択に戻る処理（クラッシュ防止版）
// ============================================================
function returnToVehicleSelect() {
    const simulatorDiv = document.getElementById("simulator");
    const vehicleSelectorDiv = document.getElementById("vehicleSelector");
async function loadConfig() {
    if (!selectedVehicle || !selectedVehicle.config) return;
    const response = await fetch(selectedVehicle.config);
    config = await response.json();
}

async function loadLed() {
    if (!selectedVehicle) return;

    let response = await fetch(selectedVehicle.config);
    config = await response.json();

    if (simulatorDiv) simulatorDiv.hidden = true;
    if (vehicleSelectorDiv) vehicleSelectorDiv.hidden = false;
    response = await fetch(selectedVehicle.led);
    jsonData = await response.json();

    // グローバル状態の初期化
    if (typeof config !== "undefined") {
        window.config = null;
    if (selectedVehicle.site) {
        response = await fetch(selectedVehicle.site);
        siteData = await response.json();
}
    if (typeof typeId !== "undefined") window.typeId = null;
    if (typeof destinationId !== "undefined") window.destinationId = null;

    // ステータス表示の安全更新
    const statusEl = document.getElementById("status");
    if (statusEl) {
        statusEl.textContent = "車両を選択してください";
    if (!jsonData?.categories) {
        console.error("JSONが壊れてる");
        return;
}
}

async function loadFont() {
    if (!selectedVehicle || !selectedVehicle.font) return;
    const response = await fetch(selectedVehicle.font);
    fontData = await response.json();
}

function setupVehicleUI() {
    if (!config) return;

    const safeSetGroupHidden = (id, condition) => {
        const el = document.getElementById(id);
        if (el) el.hidden = !condition;
    };

    safeSetGroupHidden("typeGroup", config.hasType);
    if (config.hasType && typeof createTypeButtons === "function") createTypeButtons();

    safeSetGroupHidden("destinationGroup", config.hasDestination);
    if (config.hasDestination && typeof createDestinationButtons === "function") createDestinationButtons();

    safeSetGroupHidden("informationGroup", config.hasInformation);
    if (config.hasInformation && typeof createInformationButtons === "function") createInformationButtons();

    // 転送ステータスの安全更新
    if (typeof updateTransferStatus === "function") {
        updateTransferStatus("車両を選択してください");
    safeSetGroupHidden("information2Group", config.hasInformation2);
    if (config.hasInformation2 && typeof createInformation2Buttons === "function") createInformation2Buttons();

    safeSetGroupHidden("lineGroup", config.hasLine);
    if (config.hasLine && typeof createLineButtons === "function") createLineButtons();

    safeSetGroupHidden("nextModeGroup", config.hasNext);
    if (config.hasNext && typeof createNextModeButtons === "function") createNextModeButtons();

    safeSetGroupHidden("carNumberGroup", config.hasCarNumber);
    if (config.hasCarNumber && typeof createCarNumberButtons === "function") createCarNumberButtons();

    safeSetGroupHidden("scroll", config.hasScroll);

    const scrollText = document.getElementById("scrollText");
    if (scrollText && config.scrollLabel !== undefined) {
        scrollText.value = config.scrollLabel;
}

    if (typeof setVehicleSelectButton === "function") setVehicleSelectButton();
    if (typeof resizeButtonText === "function") resizeButtonText();
}

// ============================================================
// シミュレーター初期化（813行目付近のnullクラッシュ保護済み）
// ============================================================
function initSimulator(vehicleData) {
    if (!vehicleData) return;
    window.config = vehicleData;
let renderTimer = null;

    const vehicleSelectorDiv = document.getElementById("vehicleSelector");
    const simulatorDiv = document.getElementById("simulator");
function nextScene() {
    if (typeof buildSceneList === "function") buildSceneList();
    if (typeof buildTypeSceneList === "function") buildTypeSceneList();

    if (vehicleSelectorDiv) vehicleSelectorDiv.hidden = true;
    if (simulatorDiv) simulatorDiv.hidden = false;
    if (sceneList.length > 0) scene = frame % sceneList.length;
    if (typeSceneList.length > 0) typeScene = frame % typeSceneList.length;

    // 各要素の安全なセット（nullガード付き）
    safeSetTextContent("selectedVehicleName", vehicleData.name || "名称未設定");
    safeSetTextContent("explanationLabel", vehicleData.explanation || "");
    if (typeof applyScene === "function") applyScene();
    if (typeof applyTypeScene === "function") applyTypeScene();
    if (typeof render === "function") render();

    // 参考サイトリンクのレンダリング
    const refGroup = document.getElementById("referenceSite");
    const refLinkGroup = document.getElementById("referenceSiteLink");
    if (refGroup && refLinkGroup) {
        if (vehicleData.referenceSite && vehicleData.referenceSite.length > 0) {
            refGroup.hidden = false;
            refLinkGroup.innerHTML = "";
            vehicleData.referenceSite.forEach(site => {
                const a = document.createElement("a");
                a.href = site.url;
                a.textContent = site.name;
                a.target = "_blank";
                a.style.display = "block";
                refLinkGroup.appendChild(a);
            });
        } else {
            refGroup.hidden = true;
    frame++;
    renderTimer = setTimeout(nextScene, getSceneInterval());
}

function getSceneInterval() {
    if (!config || sceneList.length === 0) return 1000;
    let sceneInterval = config.sceneInterval || 3000;

    const jaTimeEl = document.querySelector("#jaTime input");
    const enTimeEl = document.querySelector("#enTime input");
    const infoTimeEl = document.querySelector("#infoTime input");
    const carNumberTimeEl = document.querySelector("#carNumberTime input");

    const jaTime = jaTimeEl ? Number(jaTimeEl.value) : 3;
    const enTime = enTimeEl ? Number(enTimeEl.value) : 2;
    const infoTime = infoTimeEl ? Number(infoTimeEl.value) : 2;
    const carNumberTime = carNumberTimeEl ? Number(carNumberTimeEl.value) : 2;

    if (config.setSwitchingTime) {
        const currentScene = sceneList[scene];
        if (currentScene) {
            if (currentScene.information === "carNumber" || currentScene.information === "carNumber_destination") {
                sceneInterval = carNumberTime * 1000;
            } else if (currentScene.information === "information") {
                sceneInterval = infoTime * 1000;
            } else if (currentScene.information === "destination") {
                if (currentScene.lang === "ja") sceneInterval = jaTime * 1000;
                if (currentScene.lang === "en") sceneInterval = enTime * 1000;
            }
}
    } else {
        sceneInterval = config.sceneInterval || 3000;
}
    return sceneInterval;
}

    // スイッチング時間設定エリアの初期化
    setupTimeSettings(vehicleData);
function startRenderLoop() {
    if (renderTimer !== null) {
        clearTimeout(renderTimer);
    }
    nextScene();
}

    // 種別・行先等ボタンのレンダリング
    if (typeof renderButtons === "function") {
        renderButtons();
function buildSceneList() {
    sceneList = [];
    if (!config) return;
    const type = typeof getItem === "function" ? getItem("type", typeId) : null;
    
    if (!config.type_destination_changed) {
        if (typeof information2Id !== "undefined" && information2Id != null) {
            if (config.information2Position === "next" && config.information2Ahead) {
                sceneList.push({ lang: "ja", information: "information2_next", next: false });
            }
        }
        
        if (typeof informationId !== "undefined" && informationId != null) {
            if (config.informationPosition === "next" && config.informationAhead) {
                sceneList.push({ lang: "ja", information: "information_next", next: false });
            }
        }

        if (typeof nextId !== "undefined" && nextId != null) {
            sceneList.push({ lang: "ja", information: "destination", next: true });
        } else {
            if (!config.informationAhead) {
                if (typeof destinationId !== "undefined" && destinationId != null) {
                    if (config.destinationPosition === "normal") {
                        sceneList.push({ lang: "ja", information: "destination", next: false });
                    }
                    if (config.destinationPosition === "next") {
                        sceneList.push({ lang: "ja", information: "destination_next", next: false });
                    }
                } else {
                    sceneList.push({ lang: "ja", information: "destination", next: false });
                }
            } else {
                if (typeof informationId !== "undefined" && informationId === null) {
                    sceneList.push({ lang: "ja", information: "destination", next: false });
                }
            }
        }

        if (typeof informationId !== "undefined" && informationId != null && config.informationAhead) {
            if (typeof hasEnglishInformation === "function" && hasEnglishInformation()) {
                sceneList.push({ lang: "en", information: "information_next", next: false });
            }
        }

        if (config.languageSwitching) {
            if (typeof hasEnglishType === "function" && hasEnglishType()) {
                if (typeof nextId !== "undefined" && nextId != null) {
                    sceneList.push({ lang: "en", information: "destination", next: true });
                } else {
                    if (!config.destinationLanguageSwitching) {
                        if (typeof informationId !== "undefined" && informationId === null) {
                            sceneList.push({ lang: "en", information: "destination", next: false });
                        } else {
                            sceneList.push({ lang: "en", information: "information", next: false });
                        }
                    } else {
                        sceneList.push({ lang: "en", information: "destination", next: false });
                    }
                }
            }
            if (typeof typeId !== "undefined" && typeId === null) {
                if (typeof nextId !== "undefined" && nextId != null) {
                    sceneList.push({ lang: "en", information: "destination", next: true });
                } else {
                    if (typeof destinationId !== "undefined" && destinationId != null) {
                        if (config.destinationPosition === "normal") {
                            sceneList.push({ lang: "en", information: "destination", next: false });
                        }
                        if (config.destinationPosition === "next") {
                            sceneList.push({ lang: "en", information: "destination_next", next: false });
                        }
                    } else {
                        sceneList.push({ lang: "en", information: "destination", next: false });
                    }
                }
            } else {
                if (typeof hasEnglishType === "function" && !hasEnglishType()) {
                    if (typeof nextId !== "undefined" && nextId != null) {
                        sceneList.push({ lang: "en", information: "destination", next: true });
                    }
                }
            }
        } else {
            if ((typeof nextId !== "undefined" && nextId != null) || (typeof scrollId !== "undefined" && scrollId != null)) {
                sceneList.push({ lang: "en", information: "destination", next: true });
            }
        }

        if (config.destinationLanguageSwitching) {
            if (!config.languageSwitching) {
                if (typeof hasEnglishDestination === "function" && hasEnglishDestination()) {
                    if (typeof nextId !== "undefined" && nextId === null) {
                        sceneList.push({ lang: "en", information: "destination", next: false });
                    }
                }
            } else {
                if (typeof hasEnglishType === "function" && !hasEnglishType()) {
                    if (typeof nextId !== "undefined" && nextId === null) {
                        if (config.hasScroll) {
                            if (typeof scrollId !== "undefined" && scrollId === null) {
                                sceneList.push({ lang: "en", information: "destination", next: false });
                            }
                        } else {
                            if (typeof hasEnglishDestination === "function" && hasEnglishDestination()) {
                                sceneList.push({ lang: "en", information: "destination", next: false });
                            }
                        }
                    }
                }
            }
        }

        if (typeof hasInformationDestination === "function" && hasInformationDestination()) {
            sceneList.push({ lang: "info", information: "destination", next: (typeof nextId !== "undefined" && nextId != null) });
        }

        if (typeof informationId !== "undefined" && informationId != null) {
            if (config.informationPosition === "normal") {
                if (typeof scrollId !== "undefined" && scrollId === null) {
                    if (typeof nextId !== "undefined" && nextId != null) {
                        if (!config.information_ja_en) {
                            sceneList.push({ lang: "ja", information: "information", next: !config.informationNormalOnNext });
                            if (config.informationLanguageSwitching) {
                                sceneList.push({ lang: "en", information: "information", next: !config.informationNormalOnNext });
                            }
                        } else {
                            sceneList.push({ lang: "ja_en", information: "information", next: config.informationNormalOnNext });
                        }
                    } else {
                        if (!config.information_ja_en) {
                            sceneList.push({ lang: "ja", information: "information", next: false });
                            if (config.informationLanguageSwitching && typeof hasEnglishInformation === "function" && hasEnglishInformation()) {
                                sceneList.push({ lang: "en", information: "information", next: false });
                            }
                        } else {
                            sceneList.push({ lang: "ja_en", information: "information", next: false });
                        }
                    }
                } else {
                    const info = typeof getItem === "function" ? getItem("information", informationId) : null;
                    const hasInformationSmall1 = info && (!!info.view?.small1 || !!info.view?.full_small1);
                    if (!hasInformationSmall1) {
                        sceneList.push({ lang: "ja", information: "information", next: false });
                    } else {
                        sceneList.push({ lang: "ja", information: "information_small1", next: false });
                        sceneList.push({ lang: "ja", information: "information_small2", next: false });
                    }
                }
            }
            if (config.informationPosition === "next" && !config.informationAhead) {
                sceneList.push({ lang: "ja", information: "information_next", next: false });
                if (config.informationLanguageSwitching && typeof hasEnglishInformation === "function" && hasEnglishInformation()) {
                    sceneList.push({ lang: "en", information: "information_next", next: false });
                }
            }
        }

        if (typeof information2Id !== "undefined" && information2Id != null && !config.information2Ahead) {
            sceneList.push({ lang: "ja", information: "information2", next: (typeof nextId !== "undefined" && nextId != null) });
        }

        if (typeof lineId !== "undefined" && lineId != null) {
            sceneList.push({ lang: "ja", information: "line", next: (typeof nextId !== "undefined" && nextId != null) });
        }

        if (typeof carNumberId !== "undefined" && carNumberId != null) {
            if (config.hasCarNumberFull) {
                sceneList.push({ lang: "ja", information: "carNumber", next: (typeof nextId !== "undefined" && nextId != null) });
                if (typeof hasEnglishCarNumber === "function" && hasEnglishCarNumber()) {
                    sceneList.push({ lang: "en", information: "carNumber", next: (typeof nextId !== "undefined" && nextId != null) });
                }
            }
            if (typeof isTypeFullScreen === "function" && !isTypeFullScreen(type)) {
                if (config.hasCarNumberNormal) {
                    sceneList.push({ lang: "ja", information: "carNumber_destination", next: (typeof nextId !== "undefined" && nextId != null) });
                    if (typeof hasEnglishCarNumber === "function" && hasEnglishCarNumber()) {
                        sceneList.push({ lang: "en", information: "carNumber_destination", next: (typeof nextId !== "undefined" && nextId != null) });
                    }
                }
            }
        }

        if (config.next_normal && typeof nextId !== "undefined" && nextId != null) {
            sceneList.push({ lang: "ja", information: "destination", next: false });
            sceneList.push({ lang: "en", information: "destination", next: false });
        }
    } else {
        if (typeof typeId !== "undefined" && typeId === null && typeof destinationId !== "undefined" && destinationId === null) {
            sceneList.push({ lang: "ja", information: "type", next: false });
        }
        if (typeof typeId !== "undefined" && typeId != null) {
            sceneList.push({ lang: "ja", information: "type", next: false });
        }
        if (typeof destinationId !== "undefined" && destinationId != null) {
            sceneList.push({ lang: "ja", information: "destination", next: false });
        }
}
}

    // キャンバス初期描画
    if (typeof render === "function") {
        render();
function applyScene() {
    if (sceneList.length === 0) return;
    const s = sceneList[scene % sceneList.length];
    if (s) {
        lang = s.lang;
        informationMode = s.information;
        showNext = s.next;
}
}

let typeTimer = null;

    // 自動転送トリガー
    if (typeof triggerAutoTransfer === "function") {
        triggerAutoTransfer();
function buildTypeSceneList() {
    typeSceneList = [{ typeInfo: null }];
    if (typeof hasTypeInformation === "function" && hasTypeInformation()) {
        typeSceneList.push({ typeInfo: "information" });
}
}

// 安全な textContent セットヘルパー関数
function safeSetTextContent(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = text;
function applyTypeScene() {
    if (typeSceneList.length === 0) return;
    const ts = typeSceneList[typeScene % typeSceneList.length];
    if (ts) {
        typeMode = ts.typeInfo;
}
}

// 時間設定パネルの初期化
function setupTimeSettings(vehicleData) {
    const setTimeDiv = document.getElementById("setTime");
    if (!setTimeDiv) return;
function initSimulator() {
    if (renderTimer !== null) {
        clearInterval(renderTimer);
        renderTimer = null;
    }

    const jaTime = document.getElementById("jaTime");
    const enTime = document.getElementById("enTime");
    const infoTime = document.getElementById("infoTime");
    const carNumberTime = document.getElementById("carNumberTime");
    if (typeTimer !== null) {
        clearInterval(typeTimer);
        typeTimer = null;
    }

    if (vehicleData.setSwitchingTime) {
        setTimeDiv.hidden = false;
        if (jaTime) jaTime.hidden = false;
        if (enTime) enTime.hidden = false;
        if (infoTime) infoTime.hidden = false;
        if (carNumberTime) carNumberTime.hidden = false;
    } else {
        setTimeDiv.hidden = true;
    if (config) {
        if (typeof clearMatrix === "function") clearMatrix();
        if (typeof drawMatrix === "function" && typeof createEmptyMatrix === "function") {
            drawMatrix(createEmptyMatrix());
        }
    }

    if (transferController) {
        transferController.abort();
        transferController = null;
}

    const safeSetText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    const safeSetHTML = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    };

    safeSetText("transferStatus", "");
    safeSetHTML("typeButtons", "");
    safeSetHTML("destinationButtons", "");
    safeSetHTML("informationButtons", "");
    safeSetHTML("information2Buttons", "");
    safeSetHTML("lineButtons", "");
    safeSetHTML("nextModeButtons", "");
    safeSetHTML("carNumberButtons", "");

    safeSetText("type", "種別:なし");
    safeSetText("destination", "行先:なし");
    safeSetText("information", "案内:なし");
    safeSetText("information2", "案内2:なし");
    safeSetText("line", "路線名:なし");
    safeSetText("nextMode", "次駅:なし");
    safeSetText("carNumber", "号車:なし");

    typeId = null;
    destinationId = null;
    informationId = null;
    information2Id = null;
    lineId = null;
    carNumberId = null;
    nextId = null;
    sceneList = [];
    lang = "ja";
    scene = 0;
    selectedVehicle = null;
    displayMode = "normal";
    informationMode = "destination";
    langIndex = 0;
    languageSwitching = null;
}

// ============================================================
// イベントハンドラ（ボタン加減算など）
// ============================================================
document.addEventListener("click", (e) => {
    const target = e.target;
    if (!target) return;
window.addEventListener("resize", () => {
    requestResizeRender();
});

    if (target.classList.contains("plus") || target.classList.contains("minus")) {
        const input = target.parentElement?.querySelector("input[type='number']");
        if (input) {
            let val = parseFloat(input.value) || 0;
            const step = parseFloat(input.step) || 0.1;
            if (target.classList.contains("plus")) {
                val += step;
            } else {
                val = Math.max(parseFloat(input.min) || 0.1, val - step);
            }
            input.value = val.toFixed(1);
let resizeRequest = null;

            if (typeof triggerAutoTransfer === "function") {
                triggerAutoTransfer();
function requestResizeRender() {
    if (resizeRequest) return;

    resizeRequest = requestAnimationFrame(() => {
        resizeLed();
        const now = performance.now();
        if (now - lastRender > 16) {
            if (typeof ctx !== "undefined" && ctx && typeof sizeLed !== "undefined" && sizeLed && typeof cacheCanvas !== "undefined") {
                ctx.clearRect(0, 0, sizeLed.width, sizeLed.height);
                ctx.drawImage(cacheCanvas, 0, 0);
}
            lastRender = now;
        }
        resizeRequest = null;
    });
}

const sidebar = document.getElementById("sidebar");
const resizer = document.getElementById("resizer");

let dragging = false;
let startX;
let startWidth;

if (resizer && sidebar) {
    resizer.addEventListener("mousedown", (e) => {
        dragging = true;
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
    });
}

let lastRender = 0;

document.addEventListener("mousemove", (e) => {
    if (!dragging || !sidebar) return;

    const dx = e.clientX - startX;
    let width = startWidth + dx;
    width = Math.max(260, Math.min(width, 1700));

    sidebar.style.width = width + "px";

    resizeLed();
    if (typeof resizeButtonText === "function") resizeButtonText();
    
    const now = performance.now();
    if (now - lastRender > 16) {
        if (typeof ctx !== "undefined" && ctx && typeof sizeLed !== "undefined" && sizeLed && typeof cacheCanvas !== "undefined") {
            ctx.clearRect(0, 0, sizeLed.width, sizeLed.height);
            ctx.drawImage(cacheCanvas, 0, 0);
}
        lastRender = now;
    }
});

document.addEventListener("mouseup", () => {
    dragging = false;
});

document.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("touchstart", () => {
        btn.classList.add("tap");
    });
    btn.addEventListener("touchend", () => {
        btn.classList.remove("tap");
    });
});

document.querySelectorAll(".numberInput").forEach(container => {
    const input = container.querySelector("input");
    const minus = container.querySelector(".minus");
    const plus = container.querySelector(".plus");

    if (!input || !minus || !plus) return;

    let startTimer = null;
    let repeatTimer = null;

    function startChanging(change) {
        change();
        startTimer = setTimeout(() => {
            repeatTimer = setInterval(() => {
                change();
            }, 60);
        }, 500);
    }

    function stopChanging() {
        clearTimeout(startTimer);
        clearInterval(repeatTimer);
        startTimer = null;
        repeatTimer = null;
}

    plus.addEventListener("pointerdown", () => {
        startChanging(() => input.stepUp());
    });

    minus.addEventListener("pointerdown", () => {
        startChanging(() => input.stepDown());
    });

    document.addEventListener("pointerup", stopChanging);
    document.addEventListener("pointercancel", stopChanging);
});

// タイトルクリック（ホーム画面へ戻る）
const tittle = document.getElementById("tittle");
if (tittle) {
    tittle.addEventListener("click", () => {
        document.body.classList.remove("simulatorMode");
        initSimulator();
        clearReferenceSite();
        clearExplanation();

        const safeSetHidden = (id, hidden) => {
            const el = document.getElementById(id);
            if (el) el.hidden = hidden;
        };

        safeSetHidden("scrollText", true);
        safeSetHidden("startScrollBtn", true);
        safeSetHidden("referenceSite", true);
        safeSetHidden("explanation", true);
        safeSetHidden("jaTime", true);
        safeSetHidden("enTime", true);
        safeSetHidden("infoTime", true);
        safeSetHidden("carNumberTime", true);
        safeSetHidden("simulator", true);
        safeSetHidden("vehicleSelector", false);

        const scrollCheck = document.getElementById("scrollCheck");
        if (scrollCheck) scrollCheck.checked = false;

        scrollId = null;
        scrollTimer = null;
        clickStartScrollBtn = false;
        if (typeof typeDestinationScrollAnimationId !== "undefined") typeDestinationScrollAnimationId = null;
        if (typeof typeScroll !== "undefined") typeScroll = false;
        if (typeof destinationScroll !== "undefined") destinationScroll = false;

        if (typeof stopTypeScroll === "function") {
            stopTypeScroll("ja");
            stopTypeScroll("en");
        }
        if (typeof stopDestinationScroll === "function") {
            stopDestinationScroll("ja");
            stopDestinationScroll("en");
        }
        if (typeof stopScroll === "function") {
            stopScroll();
        }

        if (typeof updateTransferStatus === "function") {
            updateTransferStatus("車両を選択してください");
        }
    });

    tittle.addEventListener("pointerup", () => {
        tittle.style.backgroundColor = "white";
    });
}

function setExplanation() {
    const expEl = document.getElementById("explanation");
    if (expEl) expEl.hidden = false;
    const explanationLabel = document.getElementById("explanationLabel");
    if (explanationLabel && config) {
        explanationLabel.innerHTML = "";
        const label = document.createElement("label");
        label.textContent = config.explanation || "";
        explanationLabel.appendChild(label);
    }
}

function clearExplanation() {
    const explanationLabel = document.getElementById("explanationLabel");
    if (explanationLabel) explanationLabel.innerHTML = "";
}

function setReferenceSite() {
    const refEl = document.getElementById("referenceSite");
    if (refEl) refEl.hidden = false;
    const referenceSiteLink = document.getElementById("referenceSiteLink");

    if (referenceSiteLink && typeof siteData !== "undefined" && Array.isArray(siteData)) {
        referenceSiteLink.innerHTML = "";
        siteData.forEach(element => {
            const a = document.createElement("a");
            a.href = element.link || "#";
            a.textContent = element.name || "";
            a.target = "_blank";
            referenceSiteLink.appendChild(a);
        });
    }
}

function clearReferenceSite() {
    const referenceSiteLink = document.getElementById("referenceSiteLink");
    if (referenceSiteLink) referenceSiteLink.innerHTML = "";
}

function showLoading() {
    const loading = document.getElementById("loading");
    if (loading) loading.hidden = false;
}

function hideLoading() {
    const loading = document.getElementById("loading");
    if (loading) loading.hidden = true;
}

const scrollCheck = document.getElementById("scrollCheck");
const scrollText = document.getElementById("scrollText");
const startScrollBtn = document.getElementById("startScrollBtn");

if (scrollCheck) {
    scrollCheck.addEventListener("change", () => {
        if (scrollCheck.checked) {
            if (scrollText) scrollText.hidden = false;
            if (startScrollBtn) startScrollBtn.hidden = false;
        } else {
            if (scrollText) scrollText.hidden = true;
            if (startScrollBtn) startScrollBtn.hidden = true;
            scrollId = null;
            if (scrollTimer) clearInterval(scrollTimer);
        }
    });
}
