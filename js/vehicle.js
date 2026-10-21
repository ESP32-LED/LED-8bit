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

let prefectureData = [];
let companyData = [];

async function loadJsonData(url, key) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`JSON取得失敗: HTTP ${response.status} (${url})`);
    }

    const data = await response.json();

    if (!Array.isArray(data[key])) {
        throw new Error(`${url}: ${key} が配列ではありません`);
    }

    return data[key];
}

async function loadPrefectureData() {
    prefectureData = await loadJsonData(
        "data/prefectures.json",
        "prefectures"
    );
}

async function loadCompanyData() {
    companyData = await loadJsonData(
        "data/companies.json",
        "companies"
    );
}

const vehicleSearchArea = document.getElementById("vehicleSearchArea");
const vehicleCompanySearchArea = document.getElementById("vehicleCompanySearchArea");
const vehiclePrefectureSearchArea = document.getElementById("vehiclePrefectureSearchArea");

// 車両選択方法を変更
vehicleSelectMethod.addEventListener("change", async () => {
    if (vehicleSelectMethod.value === "grid") {
        vehicleSelect.hidden = true;
        mapElement.hidden = false;
        prefectureList.hidden = true;
        companyList.hidden = true;
        vehicleSearchArea.hidden = true;
        vehicleCompanySearchArea.hidden = true;
        vehiclePrefectureSearchArea.hidden = true;

        await window.vehiclesReady;
        await loadRailwayLines();

        createMap();

        setTimeout(() => {
            railwayMap.invalidateSize();
        }, 100);

    } else if (vehicleSelectMethod.value === "list") {
        mapElement.hidden = true;
        vehicleSelect.hidden = false;
        prefectureList.hidden = true;
        companyList.hidden = true;
        vehicleSearchArea.hidden = false;
        vehicleCompanySearchArea.hidden = true;
        vehiclePrefectureSearchArea.hidden = true;
    } else if (vehicleSelectMethod.value === "prefecture") {
        mapElement.hidden = true;
        vehicleSelect.hidden = true;
        prefectureList.hidden = false;
        companyList.hidden = true;
        vehicleSearchArea.hidden = true;
        vehicleCompanySearchArea.hidden = true;
        vehiclePrefectureSearchArea.hidden = false;

        await loadPrefectureData();

        prefectureList.replaceChildren();
        
        prefectureData.forEach(items => {
            const prefectureHeader = document.createElement("div");
            prefectureHeader.className = "prefectureGroupHeader";
            prefectureHeader.textContent = "▸ " + items.name;
        
            const prefectureGroupContainer = document.createElement("div");
            prefectureGroupContainer.className = "prefectureGroupButtons";
            prefectureGroupContainer.hidden = true;
        
            prefectureHeader.addEventListener("click", () => {
                prefectureGroupContainer.hidden = !prefectureGroupContainer.hidden;
                prefectureHeader.textContent =
                    (prefectureGroupContainer.hidden ? "▸ " : "▾ ") + items.name;
            });
        
            prefectureList.append(prefectureHeader, prefectureGroupContainer);
        
            (items.vehicles || []).forEach(vehicleName => {
                const vehicle = vehicles.find(
                    vehicle => vehicle.name === vehicleName
                );
        
                if (!vehicle) return;
        
                const button = document.createElement("button");
                const iconContainer = document.createElement("div");
                iconContainer.className = "vehicleIcons";
        
                (vehicle.icons || []).forEach(icon => {
                    const img = document.createElement("img");
                    img.src = icon;
                    img.className = "vehicleIcon";
                    img.alt = "";
                    iconContainer.appendChild(img);
                });
        
                const span = document.createElement("span");
                span.textContent = vehicle.name || vehicle.id || "車両";
        
                button.append(iconContainer, span);
        
                button.addEventListener("click", async () => {
                    await selectVehicle(vehicle);
                });
        
                prefectureGroupContainer.appendChild(button);
            });
        });
    } else {
        mapElement.hidden = true;
        vehicleSelect.hidden = true;
        prefectureList.hidden = true;
        companyList.hidden = false;
        vehicleSearchArea.hidden = true;
        vehicleCompanySearchArea.hidden = false;
        vehiclePrefectureSearchArea.hidden = true;
        await loadCompanyData();

        companyList.replaceChildren();
      
        companyData.forEach(items => {
            const companyHeader = document.createElement("div");
            companyHeader.className = "companyGroupHeader";
            companyHeader.textContent = "▸ " + items.name;
        
            const companyGroupContainer = document.createElement("div");
            companyGroupContainer.className = "companyGroupButtons";
            companyGroupContainer.hidden = true;
        
            companyHeader.addEventListener("click", () => {
                companyGroupContainer.hidden = !companyGroupContainer.hidden;
                companyHeader.textContent =
                    (companyGroupContainer.hidden ? "▸ " : "▾ ") + items.name;
            });
        
            companyList.append(companyHeader, companyGroupContainer);
        
            (items.vehicles || []).forEach(vehicleName => {
                const vehicle = vehicles.find(
                    vehicle => vehicle.name === vehicleName
                );
        
                if (!vehicle) return;
        
                const button = document.createElement("button");
                const iconContainer = document.createElement("div");
                iconContainer.className = "vehicleIcons";
        
                (vehicle.icons || []).forEach(icon => {
                    const img = document.createElement("img");
                    img.src = icon;
                    img.className = "vehicleIcon";
                    img.alt = "";
                    iconContainer.appendChild(img);
                });
        
                const span = document.createElement("span");
                span.textContent = vehicle.name || vehicle.id || "車両";
        
                button.append(iconContainer, span);
        
                button.addEventListener("click", async () => {
                    await selectVehicle(vehicle);
                });
        
                companyGroupContainer.appendChild(button);
            });
        });
    }
});


const vehiclePrefectureSearchInput =
    document.getElementById("vehiclePrefectureSearchInput");

const vehiclePrefectureSearchResults =
    document.getElementById("vehiclePrefectureSearchResults");

if (vehiclePrefectureSearchInput && vehiclePrefectureSearchResults) {
    vehiclePrefectureSearchInput.addEventListener("input", async () => {
        const query = vehiclePrefectureSearchInput.value.trim().toLowerCase();
        vehiclePrefectureSearchResults.replaceChildren();

        if (!query) return;

        try {
            // 車両一覧の読み込み完了を待つ
            await window.vehiclesReady;

            // 都道府県データを読み込む
            if (prefectureData.length === 0) {
                await loadPrefectureData();
            }

            // 車両名・車両IDで検索
            const matchedVehicles = vehicles.filter(vehicle =>
                (vehicle.name || "").toLowerCase().includes(query) ||
                (vehicle.id || "").toLowerCase().includes(query)
            );

            if (matchedVehicles.length > 0) {
                const heading = document.createElement("h3");
                heading.textContent = "車両";
                vehiclePrefectureSearchResults.appendChild(heading);

                matchedVehicles.forEach(vehicle => {
                    const button = document.createElement("button");
                    button.type = "button";

                    const iconContainer = document.createElement("div");
                    iconContainer.className = "vehicleIcons";

                    (vehicle.icons || []).forEach(icon => {
                        const img = document.createElement("img");
                        img.src = icon;
                        img.className = "vehicleIcon";
                        img.alt = "";
                        iconContainer.appendChild(img);
                    });

                    const span = document.createElement("span");
                    span.textContent = vehicle.name || vehicle.id || "車両";

                    button.append(iconContainer, span);

                    button.addEventListener("click", async () => {
                        await selectVehicle(vehicle);
                    });

                    vehiclePrefectureSearchResults.appendChild(button);
                });
            }

            // 都道府県名で検索
            const matchedPrefectures = prefectureData.filter(prefecture =>
                (prefecture.name || "").toLowerCase().includes(query)
            );

            matchedPrefectures.forEach(prefecture => {
                const heading = document.createElement("h3");
                heading.textContent = prefecture.name;
                vehiclePrefectureSearchResults.appendChild(heading);

                (prefecture.vehicles || []).forEach(vehicleName => {
                    const vehicle = vehicles.find(
                        item => item.name === vehicleName
                    );

                    if (!vehicle) return;

                    const button = document.createElement("button");
                    button.type = "button";

                    const iconContainer = document.createElement("div");
                    iconContainer.className = "vehicleIcons";

                    (vehicle.icons || []).forEach(icon => {
                        const img = document.createElement("img");
                        img.src = icon;
                        img.className = "vehicleIcon";
                        img.alt = "";
                        iconContainer.appendChild(img);
                    });

                    const span = document.createElement("span");
                    span.textContent = vehicle.name || vehicle.id || "車両";

                    button.append(iconContainer, span);

                    button.addEventListener("click", async () => {
                        await selectVehicle(vehicle);
                    });

                    vehiclePrefectureSearchResults.appendChild(button);
                });
            });

            if (
                matchedVehicles.length === 0 &&
                matchedPrefectures.length === 0
            ) {
                const message = document.createElement("p");
                message.textContent = "該当する車両・都道府県がありません。";
                vehiclePrefectureSearchResults.appendChild(message);
            }
        } catch (error) {
            console.error("検索処理エラー:", error);

            const message = document.createElement("p");
            message.textContent = "検索データの読み込みに失敗しました。";
            vehiclePrefectureSearchResults.appendChild(message);
        }
    });
}

// 車両名・車両IDで検索
const vehicleSearchInput =
    document.getElementById("vehicleSearchInput");

const vehicleSearchResults =
    document.getElementById("vehicleSearchResults");

if (vehicleSearchInput && vehicleSearchResults) {
    vehicleSearchInput.addEventListener("input", async () => {
        const query = vehicleSearchInput.value.trim().toLowerCase();
        vehicleSearchResults.replaceChildren();

        if (!query) return;

        try {
            await window.vehiclesReady;

            const matchedVehicles = vehicles.filter(vehicle =>
                (vehicle.name || "").toLowerCase().includes(query) ||
                (vehicle.id || "").toLowerCase().includes(query)
            );

            if (matchedVehicles.length === 0) {
                const message = document.createElement("p");
                message.textContent = "該当する車両がありません。";
                vehicleSearchResults.appendChild(message);
                return;
            }

            matchedVehicles.forEach(vehicle => {
                const button = document.createElement("button");
                button.type = "button";

                const iconContainer = document.createElement("div");
                iconContainer.className = "vehicleIcons";

                (vehicle.icons || []).forEach(icon => {
                    const img = document.createElement("img");
                    img.src = icon;
                    img.className = "vehicleIcon";
                    img.alt = "";
                    iconContainer.appendChild(img);
                });

                const span = document.createElement("span");
                span.textContent = vehicle.name || vehicle.id || "車両";

                button.append(iconContainer, span);

                button.addEventListener("click", async () => {
                    await selectVehicle(vehicle);
                });

                vehicleSearchResults.appendChild(button);
            });
        } catch (error) {
            console.error("車両検索エラー:", error);

            const message = document.createElement("p");
            message.textContent = "車両データの読み込みに失敗しました。";
            vehicleSearchResults.appendChild(message);
        }
    });
}

// 会社名で検索
const vehicleCompanySearchInput =
    document.getElementById("vehicleCompanySearchInput");

const vehicleCompanySearchResults =
    document.getElementById("vehicleCompanySearchResults");

if (vehicleCompanySearchInput && vehicleCompanySearchResults) {
    vehicleCompanySearchInput.addEventListener("input", async () => {
        const query = vehicleCompanySearchInput.value.trim().toLowerCase();
        vehicleCompanySearchResults.replaceChildren();

        if (!query) return;

        try {
            await window.vehiclesReady;

            if (companyData.length === 0) {
                await loadCompanyData();
            }

            const matchedCompanies = companyData.filter(company =>
                (company.name || "").toLowerCase().includes(query)
            );

            if (matchedCompanies.length === 0) {
                const message = document.createElement("p");
                message.textContent = "該当する会社がありません。";
                vehicleCompanySearchResults.appendChild(message);
                return;
            }

            matchedCompanies.forEach(company => {
                const heading = document.createElement("h3");
                heading.textContent = company.name;
                vehicleCompanySearchResults.appendChild(heading);

                (company.vehicles || []).forEach(vehicleName => {
                    const vehicle = vehicles.find(
                        item => item.name === vehicleName
                    );

                    if (!vehicle) return;

                    const button = document.createElement("button");
                    button.type = "button";

                    const iconContainer = document.createElement("div");
                    iconContainer.className = "vehicleIcons";

                    (vehicle.icons || []).forEach(icon => {
                        const img = document.createElement("img");
                        img.src = icon;
                        img.className = "vehicleIcon";
                        img.alt = "";
                        iconContainer.appendChild(img);
                    });

                    const span = document.createElement("span");
                    span.textContent = vehicle.name || vehicle.id || "車両";

                    button.append(iconContainer, span);

                    button.addEventListener("click", async () => {
                        await selectVehicle(vehicle);
                    });

                    vehicleCompanySearchResults.appendChild(button);
                });
            });
        } catch (error) {
            console.error("会社検索エラー:", error);

            const message = document.createElement("p");
            message.textContent = "会社データの読み込みに失敗しました。";
            vehicleCompanySearchResults.appendChild(message);
        }
    });
}