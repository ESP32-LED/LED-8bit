let vehicles = [];
let selectedVehicle = null;
let config = null;

async function loadVehicles() {
    try {
        const response = await fetch("vehicles/vehicles.json");
        vehicles = await response.json();
    } catch (e) {
        console.error("車両一覧の読み込み失敗:", e);
    }
}

function createVehicleButtons() {
    const container = document.getElementById("vehicleSelect");
    if (!container) return;

    container.innerHTML = "";

    if (!Array.isArray(vehicles)) return;

    vehicles.forEach(vehicle => {
        const btn = document.createElement("button");
        const iconContainer = document.createElement("div");
        iconContainer.className = "vehicleIcons";

        if (Array.isArray(vehicle.icons)) {
            vehicle.icons.forEach(icon => {
                const img = document.createElement("img");
                img.src = icon;
                img.className = "vehicleIcon";
                iconContainer.appendChild(img);
            });
        }

        const span = document.createElement("span");
        span.textContent = vehicle.name || vehicle.id || "車両";

        btn.append(iconContainer, span);

        btn.addEventListener("click", async () => {
            await selectVehicle(vehicle);
        });
        container.appendChild(btn);
    });
}

// 単一車両設定ファイルの読み込み関数
async function loadConfig() {
    if (!selectedVehicle || !selectedVehicle.config) return;
    const response = await fetch(selectedVehicle.config);
    config = await response.json();
}

// 車両選択時のメイン処理
async function selectVehicle(vehicle) {
    try {
        document.body.classList.add("simulatorMode");

        selectedVehicle = vehicle;
        const vehicleSelector = document.getElementById("vehicleSelector");
        const simulator = document.getElementById("simulator");
        
        if (vehicleSelector) vehicleSelector.hidden = true;
        if (simulator) simulator.hidden = false;

        await loadConfig();

        if (config && config.hasScroll) {
            await loadFont();
        }

        await startVehicle();
        
        if (typeof setExplanation === "function") setExplanation();

        if (config && config.setSwitchingTime) {
            const jaInput = document.querySelector("#jaTime input");
            const enInput = document.querySelector("#enTime input");
            const infoInput = document.querySelector("#infoTime input");
            const carInput = document.querySelector("#carNumberTime input");

            if (jaInput && config.jaTime !== undefined) jaInput.value = config.jaTime;
            if (enInput && config.enTime !== undefined) enInput.value = config.enTime;
            if (infoInput && config.infoTime !== undefined) infoInput.value = config.infoTime;
            if (carInput && config.carNumberTime !== undefined) carInput.value = config.carNumberTime;
        }

        if (config && config.hasReferenceSite) {
            if (typeof setReferenceSite === "function") setReferenceSite();
        } else {
            const refEl = document.getElementById("referenceSite");
            if (refEl) refEl.hidden = true;
        }

        // 車両読み込み完了後にBLE自動転送を実行
        if (typeof triggerAutoTransfer === "function") {
            triggerAutoTransfer();
        }

    } catch (error) {
        console.error("車両選択エラー:", error);
        alert("車両データの読み込みに失敗しました: " + (error?.message || error));
    }
}

async function initVehicles() {
    await loadVehicles();
    createVehicleButtons();
}

// 他ファイルからの参照用にグローバル展開
window.loadConfig = loadConfig;
window.selectVehicle = selectVehicle;
window.initVehicles = initVehicles;

window.vehiclesReady = initVehicles();
