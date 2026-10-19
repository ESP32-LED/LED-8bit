const vehicleSelectMethod = document.getElementById("vehicleSelectMethod");
const vehicleSelect = document.getElementById("vehicleSelect");
const mapElement = document.getElementById("map");
const prefectureList = document.getElementById("prefectureList");
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

    const tolerance = RAILWAY_OVERLAP_TOLERANCE;

    if (
        crossDistance(B) > tolerance ||
        crossDistance(B1) > tolerance
    ) {
        return null;
    }

    const projectA = p => (p[0] - A[0]) * ux + (p[1] - A[1]) * uy;
    const b0 = projectA(B);
    const b1 = projectA(B1);

    const startA = Math.max(0, Math.min(b0, b1));
    const endA = Math.min(lenA, Math.max(b0, b1));

    if (endA <= startA) return null;

    const overlapLength = endA - startA;

    if (overlapLength < RAILWAY_OVERLAP_MIN_LENGTH) {
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

    if (endB <= startB) return null;

    if (endB - startB < RAILWAY_OVERLAP_MIN_LENGTH) {
        return null;
    }

    return {
        a: [
            Math.max(0, Math.min(1, startA / lenA)),
            Math.max(0, Math.min(1, endA / lenA))
        ],
        b: [
            Math.max(0, Math.min(1, startB / lenB)),
            Math.max(0, Math.min(1, endB / lenB))
        ]
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

function offsetRailwayPoint(start, end, t, offsetPixels, directionSign) {
    const lat = start[0] + (end[0] - start[0]) * t;
    const lng = start[1] + (end[1] - start[1]) * t;

    if (offsetPixels === 0 || !railwayMap) return [lat, lng];

    const zoom = railwayMap.getZoom();
    const a = railwayMap.project(start, zoom);
    const b = railwayMap.project(end, zoom);
    let dx = b.x - a.x;
    let dy = b.y - a.y;

    if (directionSign < 0) {
        dx = -dx;
        dy = -dy;
    }

    const length = Math.hypot(dx, dy);
    if (length < 0.001) return [lat, lng];

    const point = railwayMap.project([lat, lng], zoom);
    const result = railwayMap.unproject([
        point.x + offsetPixels * dy / length,
        point.y - offsetPixels * dx / length
    ], zoom);

    return [result.lat, result.lng];
}

function createOffsetRailwayCoordinates(coordinates, lineIndex, segmentMatches) {
    if (!railwayMap || !Array.isArray(coordinates) || coordinates.length < 2) {
        return coordinates;
    }

    if (!coordinates.every(p =>
        Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])
    )) {
        return coordinates;
    }

    const zoom = railwayMap.getZoom();
    const spacing = RAILWAY_OFFSET_SPACING_PX;
    const sampleStep = 4;
    const tangentWindow = 24;
    const maxGapPixels = 80;
    const transitionDistance = 28;
    const minOverlapMeters = 30;

    const projected = coordinates.map(p => railwayMap.project(p, zoom));
    const lengths = [];
    const groundLengths = [];
    const cumulative = [0];

    for (let i = 0; i < projected.length - 1; i++) {
        const length = Math.hypot(
            projected[i + 1].x - projected[i].x,
            projected[i + 1].y - projected[i].y
        );

        lengths.push(length);
        groundLengths.push(
            L.latLng(coordinates[i][0], coordinates[i][1])
                .distanceTo(L.latLng(coordinates[i + 1][0], coordinates[i + 1][1]))
        );
        cumulative.push(cumulative[i] + length);
    }

    const totalDistance = cumulative[cumulative.length - 1];
    if (totalDistance < 0.001) return coordinates;

    const peersBySegment = lengths.map((_, i) =>
        new Set((segmentMatches[i] || [])
            .filter(m =>
                Number.isFinite(m.start) &&
                Number.isFinite(m.end) &&
                m.end - m.start > 1e-8
            )
            .map(m => m.otherLine))
    );

    function getPeerOverlapMeters(segmentIndex, peer) {
        const ranges = (segmentMatches[segmentIndex] || [])
            .filter(m => m.otherLine === peer)
            .map(m => [
                Math.max(0, Math.min(1, m.start)),
                Math.max(0, Math.min(1, m.end))
            ])
            .filter(r => r[1] > r[0])
            .sort((a, b) => a[0] - b[0]);

        if (!ranges.length) return 0;

        let fraction = 0;
        let start = ranges[0][0];
        let end = ranges[0][1];

        for (let i = 1; i < ranges.length; i++) {
            if (ranges[i][0] <= end) {
                end = Math.max(end, ranges[i][1]);
            } else {
                fraction += end - start;
                start = ranges[i][0];
                end = ranges[i][1];
            }
        }

        fraction += end - start;
        return groundLengths[segmentIndex] * fraction;
    }

    // 短い未検出区間を挟んでいても、同じ路線との重なりをつなぐ
    const allPeers = new Set(peersBySegment.flatMap(set => [...set]));

    for (const peer of allPeers) {
        let i = 0;

        while (i < peersBySegment.length) {
            if (!peersBySegment[i].has(peer)) {
                i++;
                continue;
            }

            let end = i + 1;

            while (end < peersBySegment.length) {
                if (peersBySegment[end].has(peer)) {
                    end++;
                    continue;
                }

                let next = end;

                while (next < peersBySegment.length &&
                    !peersBySegment[next].has(peer)) {
                    next++;
                }

                if (next >= peersBySegment.length) break;

                const gapPixels = cumulative[next] - cumulative[end];

                if (gapPixels > maxGapPixels) break;

                for (let j = end; j < next; j++) {
                    peersBySegment[j].add(peer);
                }

                end = next + 1;
            }

            i = Math.max(end, i + 1);
        }
    }

    const persistentPeers = lengths.map(() => new Set());

    for (const peer of allPeers) {
        let i = 0;

        while (i < peersBySegment.length) {
            if (!peersBySegment[i].has(peer)) {
                i++;
                continue;
            }

            const start = i;
            let overlapMeters = 0;

            while (i < peersBySegment.length && peersBySegment[i].has(peer)) {
                overlapMeters += getPeerOverlapMeters(i, peer);
                i++;
            }

            if (i - start >= 2 && overlapMeters >= minOverlapMeters) {
                for (let j = start; j < i; j++) {
                    persistentPeers[j].add(peer);
                }
            }
        }
    }

    if (!persistentPeers.some(set => set.size > 0)) return coordinates;

    // 区間ごとのオフセットを作る。短い未検出区間にも同じオフセットを適用する
    const spans = [];

    for (let i = 0; i < lengths.length; i++) {
        if (lengths[i] < 0.001) continue;

        const group = [...new Set([
            lineIndex,
            ...persistentPeers[i]
        ])].sort((a, b) => a - b);

        const offset = persistentPeers[i].size
            ? (group.indexOf(lineIndex) - (group.length - 1) / 2) * spacing
            : 0;

        spans.push({
            start: cumulative[i],
            end: cumulative[i + 1],
            offset
        });
    }

    if (!spans.some(span => Math.abs(span.offset) > 0.001)) {
        return coordinates;
    }

    // 区間境界では滑らかに切り替え、オフセット中の間隔を平均処理で縮めない
    function getRawOffset(distance) {
        distance = Math.max(0, Math.min(totalDistance, distance));

        let low = 0;
        let high = spans.length - 1;

        while (low < high) {
            const mid = Math.floor((low + high) / 2);

            if (spans[mid].end < distance) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        return spans[low].offset;
    }

    function smoothStep(t) {
        t = Math.max(0, Math.min(1, t));
        return t * t * (3 - 2 * t);
    }

    function getSmoothOffset(distance) {
        const raw = getRawOffset(distance);
        const left = Math.max(0, distance - transitionDistance);
        const right = Math.min(totalDistance, distance + transitionDistance);

        const leftOffset = getRawOffset(left);
        const rightOffset = getRawOffset(right);

        if (leftOffset === raw && rightOffset === raw) return raw;

        const t = (distance - left) / Math.max(0.001, right - left);

        return leftOffset + (rightOffset - leftOffset) * smoothStep(t);
    }

    function getPointAtDistance(distance) {
        distance = Math.max(0, Math.min(totalDistance, distance));

        let low = 0;
        let high = lengths.length - 1;

        while (low < high) {
            const mid = Math.floor((low + high) / 2);

            if (cumulative[mid + 1] < distance) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        const i = low;
        if (lengths[i] < 0.001) return projected[i];

        const t = Math.max(0, Math.min(
            1,
            (distance - cumulative[i]) / lengths[i]
        ));

        return {
            x: projected[i].x + (projected[i + 1].x - projected[i].x) * t,
            y: projected[i].y + (projected[i + 1].y - projected[i].y) * t
        };
    }

    const distances = [0, totalDistance, ...cumulative];

    for (let d = sampleStep; d < totalDistance; d += sampleStep) {
        distances.push(d);
    }

    for (const span of spans) {
        distances.push(span.start, span.end);
    }

    distances.sort((a, b) => a - b);

    const uniqueDistances = distances.filter((d, i, arr) =>
        i === 0 || Math.abs(d - arr[i - 1]) > 0.001
    );

    const first = projected[0];
    const last = projected[projected.length - 1];
    const dxAll = last.x - first.x;
    const dyAll = last.y - first.y;

    const directionSign =
        dxAll < 0 || (Math.abs(dxAll) < 1e-6 && dyAll > 0) ? -1 : 1;

    const result = [];

    for (const distance of uniqueDistances) {
        const point = getPointAtDistance(distance);
        const offset = getSmoothOffset(distance);

        if (Math.abs(offset) < 0.01) {
            const p = railwayMap.unproject(point, zoom);
            result.push([p.lat, p.lng]);
            continue;
        }

        const before = getPointAtDistance(
            Math.max(0, distance - tangentWindow)
        );
        const after = getPointAtDistance(
            Math.min(totalDistance, distance + tangentWindow)
        );

        let dx = after.x - before.x;
        let dy = after.y - before.y;

        if (directionSign < 0) {
            dx = -dx;
            dy = -dy;
        }

        const length = Math.hypot(dx, dy);

        if (length < 0.001) {
            const p = railwayMap.unproject(point, zoom);
            result.push([p.lat, p.lng]);
            continue;
        }

        const p = railwayMap.unproject([
            point.x + offset * dy / length,
            point.y - offset * dx / length
        ], zoom);

        result.push([p.lat, p.lng]);
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
    const renderedRailwayLines = [];

    railwayLines.forEach(line => {
        const coordinates = line.coordinates || [];
        if (!coordinates.length) return;

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
        const segmentMatches = overlapData[index] || [];

        const displayCoordinates = createOffsetRailwayCoordinates(
            coordinates,
            index,
            segmentMatches
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

        renderedRailwayLines.push({
            coordinates,
            lineIndex: index,
            segmentMatches,
            railwayLine,
            hitLine
        });

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

        if (!coordinates.length || vehicleNames.length === 0) return;

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
            (longest, part) =>
                part.length > longest.length ? part : longest,
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

    function updateRailwayLineOffsets() {
        renderedRailwayLines.forEach(item => {
            const displayCoordinates = createOffsetRailwayCoordinates(
                item.coordinates,
                item.lineIndex,
                item.segmentMatches
            );

            item.railwayLine.setLatLngs(displayCoordinates);
            item.hitLine.setLatLngs(displayCoordinates);
        });
    }

    function updateVehicleRouteLabels() {
        const showLabels = railwayMap.getZoom() >= 7;

        vehicleRouteLabels.forEach(label => {
            const element = label.getElement();

            if (element) {
                element.style.display = showLabels ? "" : "none";
            }
        });
    }

    railwayMap.on("zoomend", () => {
        updateRailwayLineOffsets();
        updateVehicleRouteLabels();
    });

    updateVehicleRouteLabels();
}

let prefectureData = [];
async function loadPrefectureData() {
    const response = await fetch("data/prefectures.json");
    const data = await response.json();

    prefectureData = data.prefectures;
}

// 車両選択方法を変更
vehicleSelectMethod.addEventListener("change", async () => {

    if (vehicleSelectMethod.value === "grid") {
        vehicleSelect.hidden = true;
        mapElement.hidden = false;
        prefectureList.hidden = true;

        await window.vehiclesReady;
        await loadRailwayLines();

        // 地図を作成
        createMap();

        // hidden状態から表示した直後のサイズをLeafletに再計算させる
        setTimeout(() => {
            railwayMap.invalidateSize();
        }, 100);

    } else if (vehicleSelectMethod.value === "list") {
        mapElement.hidden = true;
        vehicleSelect.hidden = false;
        prefectureList.hidden = true;
    } else {
        mapElement.hidden = true;
        vehicleSelect.hidden = true;
        prefectureList.hidden = false;
        const prefectureHeader = document.createElement("div");
        const prefectureList = document.createElement("prefectureList");
        prefectureData.forEach(items => {
            prefectureHeader.className = "prefectureGroupHeader";
            prefectureHeader.textContent = "▸ " + items.name;
            
            const prefectureGroupContainer = document.createElement("div");
            prefectureGroupContainer.innerHTML = "";
            prefectureGroupContainer.className = "prefectureGroupButtons";
            prefectureGroupContainer.hidden = true;
            prefectureHeader.addEventListener("click", () => {
                prefectureGroupContainer.hidden = !prefectureGroupContainer.hidden;
                prefectureHeader.textContent = (prefectureGroupContainer.hidden ? "▸ " : "▾ ") + items.name;
            });
            prefectureList.appendChild(prefectureHeader);
            prefectureList.appendChild(prefectureGroupContainer);
            prefectureData.vehicles.forEach(vehicle => {
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
                prefectureGroupContainer.appendChild(btn);
            });
        });
    }

});
