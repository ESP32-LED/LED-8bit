// ============================================================
// JavaScript Main Controller
// ============================================================

window.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    setupVehicleSelectMethod();
    setupEventListeners();
}

function setupVehicleSelectMethod() {
    const methodSelect = document.getElementById("vehicleSelectMethod");
    if (!methodSelect) return;

    methodSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        const vehicleSelectDiv = document.getElementById("vehicleSelect");
        const mapDiv = document.getElementById("map");

        if (val === "list") {
            if (vehicleSelectDiv) vehicleSelectDiv.hidden = false;
            if (mapDiv) mapDiv.hidden = true;
        } else if (val === "grid") {
            if (vehicleSelectDiv) vehicleSelectDiv.hidden = true;
            if (mapDiv) mapDiv.hidden = false;
            if (typeof initMap === "function") {
                initMap();
            }
        }
    });
}

function setupEventListeners() {
    // 車両選択に戻るボタンのイベント設定（安全ガード付き）
    const returnBtn = document.getElementById("vehicleSelectButton");
    if (returnBtn) {
        returnBtn.addEventListener("click", () => {
            returnToVehicleSelect();
        });
    }

    // スクロールチェックボックス
    const scrollCheck = document.getElementById("scrollCheck");
    if (scrollCheck) {
        scrollCheck.addEventListener("change", (e) => {
            const scrollText = document.getElementById("scrollText");
            const startScrollBtn = document.getElementById("startScrollBtn");
            if (scrollText) scrollText.hidden = !e.target.checked;
            if (startScrollBtn) startScrollBtn.hidden = !e.target.checked;
        });
    }
}

// ============================================================
// 車両選択に戻る処理（クラッシュ防止版）
// ============================================================
function returnToVehicleSelect() {
    const simulatorDiv = document.getElementById("simulator");
    const vehicleSelectorDiv = document.getElementById("vehicleSelector");

    if (simulatorDiv) simulatorDiv.hidden = true;
    if (vehicleSelectorDiv) vehicleSelectorDiv.hidden = false;

    // グローバル状態の初期化
    if (typeof config !== "undefined") {
        window.config = null;
    }
    if (typeof typeId !== "undefined") window.typeId = null;
    if (typeof destinationId !== "undefined") window.destinationId = null;

    // ステータス表示の安全更新
    const statusEl = document.getElementById("status");
    if (statusEl) {
        statusEl.textContent = "車両を選択してください";
    }

    // 転送ステータスの安全更新
    if (typeof updateTransferStatus === "function") {
        updateTransferStatus("車両を選択してください");
    }
}

// ============================================================
// シミュレーター初期化（813行目付近のnullクラッシュ保護済み）
// ============================================================
function initSimulator(vehicleData) {
    if (!vehicleData) return;
    window.config = vehicleData;

    const vehicleSelectorDiv = document.getElementById("vehicleSelector");
    const simulatorDiv = document.getElementById("simulator");

    if (vehicleSelectorDiv) vehicleSelectorDiv.hidden = true;
    if (simulatorDiv) simulatorDiv.hidden = false;

    // 各要素の安全なセット（nullガード付き）
    safeSetTextContent("selectedVehicleName", vehicleData.name || "名称未設定");
    safeSetTextContent("explanationLabel", vehicleData.explanation || "");

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
        }
    }

    // スイッチング時間設定エリアの初期化
    setupTimeSettings(vehicleData);

    // 種別・行先等ボタンのレンダリング
    if (typeof renderButtons === "function") {
        renderButtons();
    }

    // キャンバス初期描画
    if (typeof render === "function") {
        render();
    }

    // 自動転送トリガー
    if (typeof triggerAutoTransfer === "function") {
        triggerAutoTransfer();
    }
}

// 安全な textContent セットヘルパー関数
function safeSetTextContent(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = text;
    }
}

// 時間設定パネルの初期化
function setupTimeSettings(vehicleData) {
    const setTimeDiv = document.getElementById("setTime");
    if (!setTimeDiv) return;

    const jaTime = document.getElementById("jaTime");
    const enTime = document.getElementById("enTime");
    const infoTime = document.getElementById("infoTime");
    const carNumberTime = document.getElementById("carNumberTime");

    if (vehicleData.setSwitchingTime) {
        setTimeDiv.hidden = false;
        if (jaTime) jaTime.hidden = false;
        if (enTime) enTime.hidden = false;
        if (infoTime) infoTime.hidden = false;
        if (carNumberTime) carNumberTime.hidden = false;
    } else {
        setTimeDiv.hidden = true;
    }
}

// ============================================================
// イベントハンドラ（ボタン加減算など）
// ============================================================
document.addEventListener("click", (e) => {
    const target = e.target;
    if (!target) return;

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

            if (typeof triggerAutoTransfer === "function") {
                triggerAutoTransfer();
            }
        }
    }
});
