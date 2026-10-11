const vehicleSelectMethod = document.getElementById("vehicleSelectMethod");
const vehicleSelect = document.getElementById("vehicleSelect");
const mapElement = document.getElementById("map");
const lineVehicleList = document.getElementById("lineVehicleList");
const closeLinePanel = document.getElementById("closeLinePanel");
closeLinePanel.addEventListener("click", () => {
    linePanel.hidden = true;
});

let railwayMap = null;

const selectedLineName = document.getElementById("selectedLineName");
const linePanel = document.getElementById("linePanel");

let railwayLines = [];

async function loadRailwayLines() {
    const response = await fetch("data/lines.json");
    const data = await response.json();

    railwayLines = data.lines;
}

// 地図を作成
function createMap() {

    if (railwayMap !== null) {
        return;
    }

    railwayMap = L.map("map").setView([36.2, 138.25], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(railwayMap);

    railwayLines.forEach(line => {
        const railwayLine = L.polyline(line.coordinates, {
            color: line.color || "black",
            weight: 2
        }).addTo(railwayMap);

        railwayLine.bindTooltip(line.name);

        railwayLine.on("click", () => {
            selectedLineName.textContent = line.name;

            lineVehicleList.innerHTML = "";

            line.vehicles.forEach(vehicleName => {
                const vehicle = vehicles.find(
                    vehicle => vehicle.name === vehicleName
                );

                if (!vehicle) {
                    return;
                }

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
                span.textContent = vehicle.name;

                button.append(iconContainer, span);

                button.addEventListener("click", async () => {
                    await selectVehicle(vehicle);
                });

                lineVehicleList.appendChild(button);
            });

            linePanel.hidden = false;
        });
    });
}



// 車両選択方法を変更
vehicleSelectMethod.addEventListener("change", async () => {

    if (vehicleSelectMethod.value === "grid") {

        // リストを隠す
        vehicleSelect.hidden = true;

        // 地図を表示
        mapElement.hidden = false;

        await window.vehiclesReady;
        await loadRailwayLines();

        // 地図を作成
        createMap();

        // hidden状態から表示した直後のサイズをLeafletに再計算させる
        setTimeout(() => {
            railwayMap.invalidateSize();
        }, 100);

    } else {

        // 地図を隠す
        mapElement.hidden = true;

        // リストを表示
        vehicleSelect.hidden = false;
    }

});
