// ===== 縦スライドアニメーション管理用変数 =====
let isVerticalSliding = false;
let verticalSlideAnimationId = null;
const slideTransitionCanvas = document.createElement("canvas");
const slideTransitionCtx = slideTransitionCanvas.getContext("2d");

function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;

    if (!typeId && !destinationId && !nextId && !carNumberId) {
        clearMatrix();
        drawMatrix(createEmptyMatrix());
        return;
    }

    const matrix = createDisplayMatrix();
    currentMatrix = matrix;

    drawMatrix(matrix, cacheCtx);

    // 縦スライド処理中でなければ通常通り描画
    if (!isVerticalSliding) {
        ctx.clearRect(0, 0, sizeLed.width, sizeLed.height);
        ctx.drawImage(cacheCanvas, 0, 0);
    }
}

function createDisplayMatrix() {
    const matrix = createEmptyMatrix();

    const type = getItem("type", typeId);
    const dest = getItem("destination", destinationId);
    const next = getItem("next", nextId);
    const info = getItem("information", informationId);
    const info2 = getItem("information2", information2Id);
    const line = getItem("line", lineId);
    const carNumber = getItem("carNumber", carNumberId);

    // 号車
    if (config.hasCarNumberSmall) {
        drawCarNumber(carNumber, matrix);
    }

    if (!config.type_destination_changed) {
        if (type) {
            if (config.destinationPosition === "normal") {
                drawType(type, matrix);
            }
            if (config.destinationPosition === "next") {
                if (isTypeFullScreen(type)) {
                    drawType(type, matrix);
                } else {
                    drawTypeSmall(type, matrix);
                }
            }
        }
    }

    // 行先 / 次駅 / 案内表示
    const fullType = isTypeFullScreen(type);

    if (!config.type_destination_changed) {
        if (!fullType) {
            if (scrollId === null) {
                if (showNext) {
                    if (informationMode === "destination") {
                        if (destinationId != null) drawDestinationSmall(dest, matrix);
                    }
                    if (informationMode === "information") {
                        if (info?.view?.small) {
                            if (informationId != null) drawInformationSmall(info, matrix);
                        } else {
                            if (informationId != null) drawInformation(info, matrix);
                        }
                    }
                    if (informationMode === "information2") {
                        if (information2Id != null) drawInformation2(info2, matrix);
                    }
                    if (informationMode === "line") {
                        if (lineId != null) drawLine(line, matrix);
                    }
                    if (informationMode === "carNumber") {
                        if (carNumberId != null) drawCarNumber(carNumber, matrix);
                    }
                    if (informationMode === "information_next") {
                        if (destinationId != null) drawDestinationSmall(dest, matrix);
                        if (informationId != null) drawInformation(info, matrix);
                    }
                    if (informationMode === "information2_next") {
                        if (destinationId != null) drawDestinationSmall(dest, matrix);
                        if (informationId != null) drawInformation2(info2, matrix);
                    }
                    if (informationMode === "carNumber_destination") {
                        if (carNumberId != null) drawCarNumber(carNumber, matrix);
                    }
                    if (informationMode === "destination_next") {
                        if (destinationId != null) drawDestination(dest, matrix);
                    }
                    if (next) {
                        if (informationMode === "destination" || (informationMode === "information" && info?.view?.small)) {
                            drawNext(next, matrix);
                        }
                    }
                } else {
                    if (informationMode === "destination" && destinationId != null) drawDestination(dest, matrix);
                    if (informationMode === "information" && informationId != null) drawInformation(info, matrix);
                    if (informationMode === "information2" && information2Id != null) drawInformation2(info2, matrix);
                    if (informationMode === "information_information2") {
                        if (informationId != null) drawInformationSmall(info, matrix);
                        if (information2Id != null) drawInformation2Small(info2, matrix);
                    }
                    if (informationMode === "line" && lineId != null) drawLine(line, matrix);
                    if (informationMode === "carNumber" && carNumberId != null) drawCarNumber(carNumber, matrix);
                    if (informationMode === "information_next") {
                        if (destinationId != null) drawDestinationSmall(dest, matrix);
                        if (informationId != null) drawInformation(info, matrix);
                    }
                    if (informationMode === "information2_next") {
                        if (destinationId != null) drawDestinationSmall(dest, matrix);
                        if (information2Id != null) drawInformation2(info2, matrix);
                    }
                    if (informationMode === "carNumber_destination" && carNumberId != null) drawCarNumber(carNumber, matrix);
                    if (informationMode === "destination_next" && destinationId != null) drawDestination(dest, matrix);
                }
            } else {
                if (informationMode === "destination" && destinationId != null) drawDestinationSmall(dest, matrix);
                if ((informationMode === "information" || informationMode === "information_small1" || informationMode === "information_small2") && informationId != null) {
                    drawInformationSmall(info, matrix);
                }
                if (informationMode === "information2" && information2Id != null) drawInformation2Small(info2, matrix);
                if (informationMode === "line" && lineId != null) drawLine(line, matrix);
            }
        }
    } else {
        if (informationMode === "type" && typeId != null) drawType(type, matrix);
        if (informationMode === "destination" && destinationId != null) drawDestination(dest, matrix);
    }
    return matrix;
}

function createEmptyMatrix() {
    return Array.from({ length: config.ledHeight }, () =>
        Array.from({ length: config.ledWidth }, () => ({ r: 0, g: 0, b: 0 }))
    );
}

function drawMatrix(matrix, targetCtx = ctx) {
    targetCtx.fillStyle = "black";
    targetCtx.fillRect(0, 0, sizeLed.width, sizeLed.height);

    for (let y = 0; y < config.ledHeight; y++) {
        for (let x = 0; x < config.ledWidth; x++) {
            const p = matrix[y][x];

            if (config.ledShape === "circle") {
                drawLEDCircle(targetCtx, x, y, {
                    r: p?.r ?? 0,
                    g: p?.g ?? 0,
                    b: p?.b ?? 0
                });
            }
            if (config.ledShape === "rectangle") {
                drawLEDRectangle(targetCtx, x, y, {
                    r: p?.r ?? 0,
                    g: p?.g ?? 0,
                    b: p?.b ?? 0
                });
            }
        }
    }
}

function drawLEDCircle(targetCtx, x, y, color) {
    targetCtx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
    targetCtx.beginPath();
    targetCtx.arc(x * pitch + radius, y * pitch + radius, radius, 0, Math.PI * 2);
    targetCtx.fill();
}

function drawLEDRectangle(targetCtx, x, y, color) {
    targetCtx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
    targetCtx.beginPath();
    targetCtx.fillRect(x * pitch, y * pitchY, ledsize, ledsize * 0.9);
}

function drawImage(displayData, startX, startY, matrix) {
    const data = displayData.data;
    let index = 0;

    for (let y = 0; y < displayData.height; y++) {
        for (let x = 0; x < displayData.width; x++) {
            matrix[startY + y][startX + x] = {
                r: data[index],
                g: data[index + 1],
                b: data[index + 2]
            };
            index += 3;
        }
    }
}

function clearMatrix() {
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.fillRect(0, 0, led.width, led.height);
}

// ===== 縦スライド演出実行関数 =====
function startVerticalSlideAnimation(fromCanvas, toCanvas, onComplete) {
    if (verticalSlideAnimationId !== null) {
        cancelAnimationFrame(verticalSlideAnimationId);
        verticalSlideAnimationId = null;
    }

    isVerticalSliding = true;
    const totalHeight = sizeLed.height;
    const duration = 320; // 320msかけて下から上へスライド
    const startTime = performance.now();

    function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);

        // イージング（滑らかな移動）
        const offsetY = Math.round(progress * totalHeight);

        ctx.clearRect(0, 0, sizeLed.width, sizeLed.height);

        // 前の画面を上へ押し出す
        ctx.drawImage(fromCanvas, 0, -offsetY);
        // 新しい画面を下から競り上がらせる
        ctx.drawImage(toCanvas, 0, totalHeight - offsetY);

        if (progress < 1) {
            verticalSlideAnimationId = requestAnimationFrame(animate);
        } else {
            isVerticalSliding = false;
            verticalSlideAnimationId = null;
            ctx.clearRect(0, 0, sizeLed.width, sizeLed.height);
            ctx.drawImage(toCanvas, 0, 0);
            if (typeof onComplete === "function") onComplete();
        }
    }

    verticalSlideAnimationId = requestAnimationFrame(animate);
}
