// ===== 縦スライドアニメーション管理用変数 =====
let isVerticalSliding = false;
let verticalSlideAnimationId = null;
const slideTransitionCanvas = document.createElement("canvas");
const slideTransitionCtx = slideTransitionCanvas.getContext("2d");

// ===== 縦スライド演出が有効か判定する関数 =====
function isVerticalSlideEnabled() {
    if (typeId !== null) {
    }
    if (typeof config === "undefined" || !config || config.hasVerticalSlide !== true || config.verticalSlide !== true) {
        return false;
    }

    const checkbox = document.getElementById("verticalSlideCheck");
    const checkbox2 = document.getElementById("verticalSlideCheck2");
    if (checkbox && checkbox2 && !checkbox.checked && !checkbox2.checked) {
        return false;
    }

    if (typeId !== null && isTypeFullScreen(getItem("type", typeId)) && clickTypeBtn === false) {
        return false;
    }

    return true;
}

function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;

    if (
        typeId == null &&
        destinationId == null &&
        nextId == null &&
        carNumberId == null &&
        informationId == null &&
        information2Id == null &&
        lineId == null
    ) {
        const emptyMatrix = createEmptyMatrix();
        currentMatrix = emptyMatrix;

        // 縦スライドの次の表示に使うキャッシュも消す
        drawMatrix(emptyMatrix, cacheCtx);

        if (!isVerticalSliding) {
            ctx.clearRect(0, 0, sizeLed.width, sizeLed.height);
            ctx.drawImage(cacheCanvas, 0, 0);
        }

        return;
    }

    const matrix = createDisplayMatrix();
    currentMatrix = matrix;

    // 表示が空の場合も、キャッシュを必ず更新する
    drawMatrix(matrix, cacheCtx);

    if (!isVerticalSliding) {
        ctx.clearRect(0, 0, sizeLed.width, sizeLed.height);
        ctx.drawImage(cacheCanvas, 0, 0);
    }
}

function createDisplayMatrix() {
    const matrix = createEmptyMatrix();

    const type = typeId != null ? getItem("type", typeId) : null;
    const dest = destinationId != null ? getItem("destination", destinationId) : null;
    const next = nextId != null ? getItem("next", nextId) : null;
    const info = informationId != null ? getItem("information", informationId) : null;
    const info2 = information2Id != null ? getItem("information2", information2Id) : null;
    const line = lineId != null ? getItem("line", lineId) : null;
    const carNumber = carNumberId != null ? getItem("carNumber", carNumberId) : null;

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
    if (
        !ledAging ||
        ledAging.width !== config.ledWidth ||
        ledAging.height !== config.ledHeight
    ) {
        ledAging = createLEDAging(config.ledWidth, config.ledHeight);
    }
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

let ledAging = null;

function createLEDAging(width, height) {
    if (!Number.isInteger(width) || !Number.isInteger(height) ||
        width <= 0 || height <= 0) {
        return null;
    }

    const data = [];

    for (let i = 0; i < width * height; i++) {
        const r = Math.random();
        let brightness = 1;
        let dead = false;
        let colorR = 1;
        let colorG = 1;
        let colorB = 1;

        // 輝度低下：大部分は正常、一部だけ暗くする
        if (r < 0.025) {
            brightness = 0.55 + Math.random() * 0.2;
        } else if (r < 0.10) {
            brightness = 0.8 + Math.random() * 0.15;
        }

       // すべてのLEDをオレンジ寄りにする
        let orange = 0.12 + Math.random() * 0.08;

        // 一部のLEDはさらにオレンジ寄りにする
        if (Math.random() < 0.025) {
            orange = 0.35 + Math.random() * 0.2;
        }

        data.push({ brightness, dead, colorR, colorG, colorB, orange });
    }

    return { width, height, data };
}


function applyLEDAging(x, y, color) {
    if (!ledAging || !ledAging.data) return color;
    if (x >= ledAging.width || y >= ledAging.height || x < 0 || y < 0) return color;

    const aging = ledAging.data[y * ledAging.width + x];
    if (!aging) return color;
    if (aging.dead) return { r: 0, g: 0, b: 0 };
    
    const red = color.r * aging.brightness * aging.colorR;
    const green = color.g * aging.brightness;
    const blue = color.b * aging.brightness;
    const level = Number(ledAgingLebel.value);

    const strengths = [0.14, 0.29, 0.46, 0.66, 0.85, 1.00, 1.30];
    const strength = strengths[level - 1];
    if (strength === undefined) return color;

    // オレンジに近い色ほど強く暖色化
    const orangeSimilarity = Math.max(0, Math.min(1,
        (red - blue * 0.5) / 255
    ));
    const warmth = strength * (0.25 + orangeSimilarity * 0.75);

    return {
        r: Math.min(255, Math.round(red + (255 - red) * warmth * 0.30)),
        g: Math.min(255, Math.round(green + (red - green) * warmth * 0.65)),
        b: Math.max(0, Math.round(blue * (1 - warmth * 0.80)))
    };

}


function drawLEDCircle(targetCtx, x, y, color) {
    if (isLedAging === true) {
        color = applyLEDAging(x, y, color);
        targetCtx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
        targetCtx.beginPath();
        targetCtx.arc(x * pitch + radius, y * pitch + radius, radius, 0, Math.PI * 2);
        targetCtx.fill();
    } else {
        targetCtx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
        targetCtx.beginPath();
        targetCtx.arc(x * pitch + radius, y * pitch + radius, radius, 0, Math.PI * 2);
        targetCtx.fill();
    }
}

function drawLEDRectangle(targetCtx, x, y, color) {
    if (isLedAging === true) {
        color = applyLEDAging(x, y, color);
        targetCtx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
        targetCtx.fillRect(x * pitch, y * pitchY, ledsize, ledsize * 0.9);
    } else {
        targetCtx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
        targetCtx.beginPath();
        targetCtx.fillRect(x * pitch, y * pitchY, ledsize, ledsize * 0.9);
    }
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
        let offsetY;
        if (choppyScroll === false) {
            offsetY = Math.round(progress * height);
        } else {
            offsetY = Math.round(progress * height / (pitch * 2)) * pitch * 2;
        }

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
    const duration = 1000;
    const startTime = performance.now();
    // 最後の3ドットをゆっくり動かす設定
    // 減速を始める位置
    let slowDots = 8;
    const logicalDotHeight = 32;
    const tailStartProgress = Math.max(0, 1 - slowDots / logicalDotHeight);
    const tailStartT = 0.75 * (1 / 3 + (2 / Math.PI) * Math.asin(1.5 * tailStartProgress - 0.5));
    const tailStartTime = duration * tailStartT;
    const tailDuration = (duration - tailStartTime) * 3;
    const totalDuration = tailStartTime + tailDuration;
    const tailStartAngle = (tailStartT * 4 / 3 - 1 / 3) * Math.PI / 2;
    // 元の動きの速度と加速度
    const tailStartSpeed = (4 * Math.PI / 9) * Math.cos(tailStartAngle);
    const remainingProgress = 1 - tailStartProgress;
    const timeScale = tailDuration / duration;
    const m = tailStartSpeed * timeScale / remainingProgress;
    function animate(now) {
        const elapsed = now - startTime;
        let progress;
        if (elapsed < tailStartTime) {
            const t = Math.min(1, elapsed / duration);
            progress = (Math.sin((t * 4 / 3 - 1 / 3) * Math.PI / 2) + 0.5) / 3 * 2;
        } else {
            const u = Math.min(1, (elapsed - tailStartTime) / tailDuration);
            const easedTail = 1 - Math.pow(1 - u, m * 1.2);
            progress = tailStartProgress + remainingProgress * easedTail;
        }
        let offsetY;
        if (choppyScroll === false) {
            offsetY = Math.round(progress * height);
        } else {
            let step;
            if (elapsed < 100) {
                step = pitch * 4;
            } else if (elapsed < tailStartTime) {
                step = pitch * 3
            } else if (elapsed < totalDuration - 100) {
                step = pitch;
            } else {
                step = pitch * 0.5;
            }
            offsetY = Math.round(progress * height / step) * step;
        }
        ctx.clearRect(0, 0, width, height);
        if (offsetY < height) {
            ctx.drawImage(fromCanvas, 0, offsetY, width, height);
        }
        ctx.drawImage(toCanvas, 0, -height + offsetY, width, height);
        if (elapsed < totalDuration) {
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
