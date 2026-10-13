// ===== 縦スライドアニメーション管理用変数 =====
let isVerticalSliding = false;
let verticalSlideAnimationId = null;
const slideTransitionCanvas = document.createElement("canvas");
const slideTransitionCtx = slideTransitionCanvas.getContext("2d");

// ===== 縦スライド演出が有効か判定する関数 =====
function isVerticalSlideEnabled() {
    if (typeof config === "undefined" || !config || config.hasVerticalSlide !== true || config.verticalSlide !== true) {
        return false;
    }

    const checkbox = document.getElementById("verticalSlideCheck");
    const checkbox2 = document.getElementById("verticalSlideCheck2");
    if (checkbox && checkbox2 && !checkbox.checked && !checkbox2.checked) {
        return false;
    }

    if (typeId !== null && isTypeFullScreen(getItem("type", typeId)) && destinationId !== null && clickTypeBtn === false) {
        return false;
    }

    return true;
}

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
                        if (information2Id != null) drawInformation2(info2, matrix);
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
    isVerticalSliding = false;

    if (!isVerticalSlideEnabled() || !fromCanvas || !toCanvas || fromCanvas.width === 0 || toCanvas.width === 0) {
        ctx.clearRect(0, 0, sizeLed.width, sizeLed.height);
        ctx.drawImage(toCanvas, 0, 0);
        if (typeof onComplete === "function") onComplete();
        return;
    }

    isVerticalSliding = true;
    const width = sizeLed.width;
    const height = sizeLed.height;
    const duration = 750; // 時間を750msに変更（より滑らか・ゆっくりに）
    const startTime = performance.now();

    function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const offsetY = Math.round(progress * height);

        ctx.clearRect(0, 0, width, height);

        if (offsetY < height) {
            ctx.drawImage(fromCanvas, 0, offsetY, width, height);
        }
        ctx.drawImage(toCanvas, 0, -height + offsetY, width, height);

        if (progress < 1) {
            verticalSlideAnimationId = requestAnimationFrame(animate);
        } else {
            isVerticalSliding = false;
            verticalSlideAnimationId = null;
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(toCanvas, 0, 0, width, height);
            if (typeof onComplete === "function") onComplete();
        }
    }

    verticalSlideAnimationId = requestAnimationFrame(animate);
}

function startVerticalSlideAnimation2(fromCanvas, toCanvas, onComplete) {
    if (verticalSlideAnimationId !== null) {
        cancelAnimationFrame(verticalSlideAnimationId);
        verticalSlideAnimationId = null;
    }
    isVerticalSliding = false;

    if (!isVerticalSlideEnabled() || !fromCanvas || !toCanvas || fromCanvas.width === 0 || toCanvas.width === 0) {
        ctx.clearRect(0, 0, sizeLed.width, sizeLed.height);
        ctx.drawImage(toCanvas, 0, 0);
        if (typeof onComplete === "function") onComplete();
        return;
    }

    isVerticalSliding = true;
    const width = sizeLed.width;
    const height = sizeLed.height;
    const duration = 900; // 時間を900msに変更（より滑らか・ゆっくりに）
    const startTime = performance.now();
    // 最後の3ドットをゆっくり動かす設定
    // 減速を始める位置
    const slowDots = 8;
    const logicalDotHeight = 32;
    const tailStartProgress = Math.max(
        0,
        1 - slowDots / logicalDotHeight
    );

    const tailStartT = 0.75 * (
        1 / 3 +
        (2 / Math.PI) *
        Math.asin(1.5 * tailStartProgress - 0.5)
    );

    const tailStartTime = duration * tailStartT;
    const tailDuration = (duration - tailStartTime) * 3;
    const totalDuration = tailStartTime + tailDuration;

    const tailStartAngle =
        (tailStartT * 4 / 3 - 1 / 3) * Math.PI / 2;

    // 元の動きの速度と加速度
    const tailStartSpeed =
        (4 * Math.PI / 9) * Math.cos(tailStartAngle);

    const tailStartAccel =
        -(8 * Math.PI * Math.PI / 27) * Math.sin(tailStartAngle);

    const remainingProgress = 1 - tailStartProgress;
    const timeScale = tailDuration / duration;

    const m = tailStartSpeed * timeScale / remainingProgress;
    const n = tailStartAccel * timeScale * timeScale / remainingProgress;

    // 滑らかにつなぐための5次曲線
    const a3 = 10 - 6 * m - 1.5 * n;
    const a4 = -15 + 8 * m + 1.5 * n;
    const a5 = 6 - 3 * m - 0.5 * n;

    function animate(now) {
        const elapsed = now - startTime;
        let progress;

        if (elapsed < tailStartTime) {
            // 最後の3ドットに入るまでは、元の動き
            const t = Math.min(1, elapsed / duration);
            progress = (
                Math.sin((t * 4 / 3 - 1 / 3) * Math.PI / 2) + 0.5
            ) / 3 * 2;
        } else {
            const u = Math.min(
                1,
                (elapsed - tailStartTime) / tailDuration
            );

            const u2 = u * u;
            const u3 = u2 * u;
            const u4 = u3 * u;
            const u5 = u4 * u;

            const easedTail = 1 - Math.pow(1 - u, m);

            const easedTail2 =
                m * u +
                (n / 2) * u2 +
                a3 * u3 +
                a4 * u4 +
                a5 * u5;

            progress = tailStartProgress
                + remainingProgress * easedTail;
        }

        const offsetY = Math.round(progress * height);

        ctx.clearRect(0, 0, width, height);

        if (offsetY < height) {
            ctx.drawImage(fromCanvas, 0, offsetY, width, height);
        }
        ctx.drawImage(toCanvas, 0, -height + offsetY, width, height);

        if (progress < totalDuration) {
            verticalSlideAnimationId = requestAnimationFrame(animate);
        } else {
            isVerticalSliding = false;
            verticalSlideAnimationId = null;
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(toCanvas, 0, 0, width, height);
            if (typeof onComplete === "function") onComplete();
        }
    }

    verticalSlideAnimationId = requestAnimationFrame(animate);
}