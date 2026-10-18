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

const RAILWAY_OVERLAP_TOLERANCE = 2.5;
const RAILWAY_OVERLAP_MIN_LENGTH = 3;
const RAILWAY_OFFSET_SPACING_PX = 8;
const RAILWAY_OVERLAP_ANGLE = 12;

function getRailwaySegmentOverlap(a, b) {
    const lat0 = (a.start[0] + a.end[0] + b.start[0] + b.end[0]) / 4;
    const lng0 = (a.start[1] + a.end[1] + b.start[1] + b.end[1]) / 4;
    const cosLat = Math.cos(lat0 * Math.PI / 180);
    const M = 111320;

    const xy = p => [
        (p[1] - lng0) * M * cosLat,
        (p[0] - lat0) * M
    ];

    const A = xy(a.start);
    const A1 = xy(a.end);
    const B = xy(b.start);
    const B1 = xy(b.end);

    const ax = A1[0] - A[0];
    const ay = A1[1] - A[1];
    const bx = B1[0] - B[0];
    const by = B1[1] - B[1];

    const lenA = Math.hypot(ax, ay);
    const lenB = Math.hypot(bx, by);

    if (lenA < 0.5 || lenB < 0.5) return null;

    const ux = ax / lenA;
    const uy = ay / lenA;
    const vx = bx / lenB;
    const vy = by / lenB;

    const cosAngle = Math.abs(ux * vx + uy * vy);

    if (cosAngle < Math.cos(RAILWAY_OVERLAP_ANGLE * Math.PI / 180)) {
        return null;
    }

    const crossDistance = p =>
        Math.abs(ux * (p[1] - A[1]) - uy * (p[0] - A[0]));

    if (
        crossDistance(B) > RAILWAY_OVERLAP_TOLERANCE ||
        crossDistance(B1) > RAILWAY_OVERLAP_TOLERANCE
    ) {
        return null;
    }

    const projectA = p => (p[0] - A[0]) * ux + (p[1] - A[1]) * uy;
    const b0 = projectA(B);
    const b1 = projectA(B1);

    const startA = Math.max(0, Math.min(b0, b1));
    const endA = Math.min(lenA, Math.max(b0, b1));

    if (endA - startA < RAILWAY_OVERLAP_MIN_LENGTH) {
        return null;
    }

    const overlapStart = [
        A[0] + ux * startA,
        A[1] + uy * startA
    ];

    const overlapEnd = [
        A[0] + ux * endA,
        A[1] + uy * endA
    ];

    const projectB = p => (p[0] - B[0]) * vx + (p[1] - B[1]) * vy;
    const t0 = projectB(overlapStart);
    const t1 = projectB(overlapEnd);

    const startB = Math.max(0, Math.min(t0, t1));
    const endB = Math.min(lenB, Math.max(t0, t1));

    if (endB - startB < RAILWAY_OVERLAP_MIN_LENGTH) {
        return null;
    }

    return {
        a: [startA / lenA, endA / lenA],
        b: [startB / lenB, endB / lenB]
    };
}

function buildRailwayOverlapData(lines) {
    const overlapData = lines.map(line =>
        Array.from(
            { length: Math.max(0, (line.coordinates || []).length - 1) },
            () => []
        )
    );

    const segments = [];

    lines.forEach((line, lineIndex) => {
        const coords = line.coordinates || [];

        for (let i = 0; i < coords.length - 1; i++) {
            const start = coords[i];
            const end = coords[i + 1];

            if (
                !Array.isArray(start) || !Array.isArray(end) ||
                !Number.isFinite(start[0]) || !Number.isFinite(start[1]) ||
                !Number.isFinite(end[0]) || !Number.isFinite(end[1])
            ) {
                continue;
            }

            segments.push({
                id: segments.length,
                lineIndex,
                segmentIndex: i,
                start,
                end
            });
        }
    });

    // 地理座標のグリッドを使い、近くにある線分だけを比較する
    const CELL_SIZE = 0.00025;
    const buckets = new Map();
    const candidatePairs = new Map();

    for (const segment of segments) {
        const dLat = segment.end[0] - segment.start[0];
        const dLng = segment.end[1] - segment.start[1];
        const steps = Math.max(
            1,
            Math.ceil(Math.max(Math.abs(dLat), Math.abs(dLng)) / (CELL_SIZE / 2))
        );

        const visitedCells = new Set();

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const lat = segment.start[0] + dLat * t;
            const lng = segment.start[1] + dLng * t;
            const cx = Math.floor(lng / CELL_SIZE);
            const cy = Math.floor(lat / CELL_SIZE);

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const key = `${cx + dx},${cy + dy}`;

                    for (const other of buckets.get(key) || []) {
                        if (other.lineIndex === segment.lineIndex) continue;

                        const first = Math.min(other.id, segment.id);
                        const second = Math.max(other.id, segment.id);
                        const pairKey = `${first}:${second}`;

                        if (!candidatePairs.has(pairKey)) {
                            candidatePairs.set(pairKey, [other, segment]);
                        }
                    }
                }
            }

            visitedCells.add(`${cx},${cy}`);
        }

        for (const key of visitedCells) {
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key).push(segment);
        }
    }

    for (const [a, b] of candidatePairs.values()) {
        const overlap = getRailwaySegmentOverlap(a, b);
        if (!overlap) continue;

        overlapData[a.lineIndex][a.segmentIndex].push({
            start: overlap.a[0],
            end: overlap.a[1],
            otherLine: b.lineIndex
        });

        overlapData[b.lineIndex][b.segmentIndex].push({
            start: overlap.b[0],
            end: overlap.b[1],
            otherLine: a.lineIndex
        });
    }

    return overlapData;
}

function offsetRailwayPoint(start, end, t, offsetPixels) {
    const lat = start[0] + (end[0] - start[0]) * t;
    const lng = start[1] + (end[1] - start[1]) * t;

    if (offsetPixels === 0 || !railwayMap) {
        return [lat, lng];
    }

    const zoom = railwayMap.getZoom();
    const a = railwayMap.project(start, zoom);
    const b = railwayMap.project(end, zoom);

    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const length = Math.hypot(dx, dy);

    if (length < 0.001) return [lat, lng];

    // 座標の並びが逆でも同じ側を基準にずらす
    if (dx < 0 || (Math.abs(dx) < 0.000001 && dy > 0)) {
        dx = -dx;
        dy = -dy;
    }

    const point = railwayMap.project([lat, lng], zoom);

    const result = railwayMap.unproject([
        point.x + offsetPixels * dy / length,
        point.y - offsetPixels * dx / length
    ], zoom);
    
    return [result.lat, result.lng];
}

function createOffsetRailwayCoordinates(coordinates, lineIndex, segmentMatches) {
    const result = [];

    function addPoint(point) {
        const last = result[result.length - 1];

        if (
            !last ||
            Math.abs(last[0] - point[0]) > 1e-10 ||
            Math.abs(last[1] - point[1]) > 1e-10
        ) {
            result.push(point);
        }
    }

    for (let i = 0; i < coordinates.length - 1; i++) {
        const start = coordinates[i];
        const end = coordinates[i + 1];

        if (
            !Array.isArray(start) || !Array.isArray(end) ||
            !Number.isFinite(start[0]) || !Number.isFinite(start[1]) ||
            !Number.isFinite(end[0]) || !Number.isFinite(end[1])
        ) {
            continue;
        }

        const matches = segmentMatches[i] || [];
        const cuts = [0, 1];

        for (const match of matches) {
            cuts.push(match.start, match.end);
        }

        cuts.sort((a, b) => a - b);

        const uniqueCuts = cuts.filter((value, index) =>
            index === 0 || Math.abs(value - cuts[index - 1]) > 1e-8
        );

        for (let j = 0; j < uniqueCuts.length - 1; j++) {
            const t0 = uniqueCuts[j];
            const t1 = uniqueCuts[j + 1];

            if (t1 - t0 < 1e-8) continue;

            const mid = (t0 + t1) / 2;
            const activeMatches = matches.filter(match =>
                mid > match.start - 1e-8 &&
                mid < match.end + 1e-8
            );

            const otherLines = [
                ...new Set(activeMatches.map(match => match.otherLine))
            ];

            let offsetPixels = 0;

            if (otherLines.length > 0) {
                const group = [...new Set([lineIndex, ...otherLines])]
                    .sort((a, b) => a - b);

                const rank = group.indexOf(lineIndex);

                offsetPixels =
                    (rank - (group.length - 1) / 2) * RAILWAY_OFFSET_SPACING_PX;
            }

            addPoint(offsetRailwayPoint(start, end, t0, offsetPixels));
            addPoint(offsetRailwayPoint(start, end, t1, offsetPixels));
        }
    }

    return result;
}

function getRailwayPolylineMidpoint(coordinates) {
    if (!coordinates || coordinates.length === 0) return null;
    if (coordinates.length === 1) return coordinates[0];

    const lengths = [];
    let totalLength = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
        const a = L.latLng(coordinates[i][0], coordinates[i][1]);
        const b = L.latLng(coordinates[i + 1][0], coordinates[i + 1][1]);
        const length = a.distanceTo(b);

        lengths.push(length);
        totalLength += length;
    }

    if (totalLength === 0) return coordinates[0];

    let distance = totalLength / 2;

    for (let i = 0; i < lengths.length; i++) {
        if (distance <= lengths[i]) {
            const t = distance / lengths[i];
            const a = coordinates[i];
            const b = coordinates[i + 1];

            return [
                a[0] + (b[0] - a[0]) * t,
                a[1] + (b[1] - a[1]) * t
            ];
        }

        distance -= lengths[i];
    }

    return coordinates[coordinates.length - 1];
}

// 地図を作成
function createMap() {
    if (railwayMap !== null) return;

    railwayMap = L.map("map").setView([36.2, 138.25], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(railwayMap);

    const vehicleRouteLabels = [];

    const renderLines = [];

    railwayLines.forEach(line => {
        const coordinates = line.coordinates || [];

        if (!coordinates.length) return;

        // 座標が [緯度, 経度] なのか、
        // 複数の座標列を含む構造なのかを判定する
        const isPoint = point =>
            Array.isArray(point) &&
            point.length >= 2 &&
            Number.isFinite(point[0]) &&
            Number.isFinite(point[1]);

        const parts = isPoint(coordinates[0])
            ? [coordinates]
            : coordinates.filter(part =>
                Array.isArray(part) &&
                part.length >= 2 &&
                isPoint(part[0])
            );

        parts.forEach((part, partIndex) => {
            if (part.length < 2) return;

            renderLines.push({
                ...line,
                coordinates: part,
                _partIndex: partIndex
            });
        });
    });

    const overlapData = buildRailwayOverlapData(renderLines);

    renderLines.forEach((line, index) => {
        const coordinates = line.coordinates;

        const displayCoordinates = createOffsetRailwayCoordinates(
            coordinates,
            index,
            overlapData[index] || []
        );

        if (displayCoordinates.length < 2) return;

        const railwayLine = L.polyline(displayCoordinates, {
            color: line.color || "black",
            weight: 2
        }).addTo(railwayMap);

        const hitLine = L.polyline(displayCoordinates, {
            color: "#000",
            weight: 16,
            opacity: 0,
            interactive: true
        }).addTo(railwayMap);

        hitLine.on("click", () => railwayLine.fire("click"));

        railwayLine.bindTooltip(line.name);

        railwayLine.on("click", () => {
            selectedLineName.textContent = line.name;
            lineVehicleList.innerHTML = "";

            (line.vehicles || []).forEach(vehicleName => {
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
    railwayLines.forEach(line => {
        const coordinates = line.coordinates || [];
        const vehicleNames = (line.vehicles || []).filter(Boolean);

        if (coordinates.length < 2 || vehicleNames.length === 0) return;

        const isPoint = point =>
            Array.isArray(point) &&
            point.length >= 2 &&
            Number.isFinite(point[0]) &&
            Number.isFinite(point[1]);

        const parts = isPoint(coordinates[0])
            ? [coordinates]
            : coordinates.filter(part =>
                Array.isArray(part) &&
                part.length >= 2 &&
                isPoint(part[0])
            );

        const longestPart = parts.reduce(
            (longest, part) => part.length > longest.length ? part : longest,
            []
        );

        if (longestPart.length < 2) return;

        const midpoint = getRailwayPolylineMidpoint(longestPart);

        if (!midpoint) return;

        const label = L.tooltip({
            permanent: true,
            direction: "right",
            offset: [8, 0],
            className: "vehicle-route-label",
            opacity: 1,
            interactive: false
        })
            .setLatLng(midpoint)
            .setContent(vehicleNames.join(" / "))
            .addTo(railwayMap);

        vehicleRouteLabels.push(label);
    });

    // ズーム時に車両名の表示を切り替える
    function updateVehicleRouteLabels() {
        const showLabels = railwayMap.getZoom() >= 7;

        vehicleRouteLabels.forEach(label => {
            const element = label.getElement();

            if (element) {
                element.style.display = showLabels ? "" : "none";
            }
        });
    }

    railwayMap.on("zoomend", updateVehicleRouteLabels);
    updateVehicleRouteLabels();
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
