// ============================================================
// 車両選択処理 (vehicle.js)
// ============================================================

// 車両リストの描画処理
function renderVehicleList(vehicles) {
    const container = document.getElementById("vehicleSelect");
    if (!container) return;

    container.innerHTML = "";

    if (!Array.isArray(vehicles)) return;

    vehicles.forEach(vehicle => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "vehicleBtn";
        btn.textContent = vehicle.name || vehicle.id || "車両";
        
        btn.addEventListener("click", () => {
            selectVehicle(vehicle);
        });

        container.appendChild(btn);
    });
}

// 設定ファイル (JSON) の非同期読み込み関数
async function loadConfig(pathOrId) {
    if (!pathOrId) throw new Error("設定パスまたはIDが指定されていません");

    // もし既設の loadJson 関数が存在すればそちらを優先使用
    if (typeof loadJson === "function") {
        return await loadJson(pathOrId);
    }

    let fetchPath = pathOrId;
    if (typeof pathOrId === "string" && !pathOrId.endsWith(".json")) {
        fetchPath = `json/vehicle/${pathOrId}.json`;
    }

    const response = await fetch(fetchPath);
    if (!response.ok) {
        throw new Error(`設定ファイルの取得に失敗しました (${response.status})`);
    }

    return await response.json();
}

// 車両選択時のメイン処理 (47行目のエラー修正箇所)
async function selectVehicle(vehicleTarget) {
    try {
        let vehicleData = null;

        if (typeof vehicleTarget === "string") {
            // 文字列（IDまたはパス）が渡された場合
            vehicleData = await loadConfig(vehicleTarget);
        } else if (vehicleTarget && typeof vehicleTarget === "object") {
            if (vehicleTarget.json || vehicleTarget.path || vehicleTarget.id) {
                const target = vehicleTarget.json || vehicleTarget.path || vehicleTarget.id;
                vehicleData = await loadConfig(target);
            } else {
                // オブジェクト自体がすでに config データである場合
                vehicleData = vehicleTarget;
            }
        }

        if (!vehicleData) {
            throw new Error("車両設定データが空です");
        }

        // シミュレーターの初期化
        if (typeof initSimulator === "function") {
            initSimulator(vehicleData);
        } else {
            console.error("initSimulator 関数が見つかりません。script.js の読み込みを確認してください。");
        }

    } catch (error) {
        console.error("車両選択エラー:", error);
        alert("車両データの読み込みに失敗しました: " + (error?.message || error));
    }
}

// 他ファイルからの参照用グローバル定義
window.loadConfig = loadConfig;
window.selectVehicle = selectVehicle;
window.renderVehicleList = renderVehicleList;
