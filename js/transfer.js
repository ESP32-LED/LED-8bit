let bleDevice = null;
let bleServer = null;
let rxCharacteristic = null;
let isBleTransferring = false;
let autoTransferTimeout = null;

const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const CHARACTERISTIC_UUID_RX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

const transferScrollSpeed = 17;
const transferTypeDestinationScrollSpeed = 13;

// 高速 LZ4 エンコーダー
function compressLZ4(input) {
    const srcLen = input.length;
    if (srcLen === 0) return new Uint8Array(0);

    const hashtable = new Int32Array(4096).fill(-1);
    const compressed = [];

    let anchor = 0;
    let ip = 0;

    const hashFn = (p) => {
        const val = (input[p] | (input[p + 1] << 8) | (input[p + 2] << 16) | (input[p + 3] << 24)) >>> 0;
        return ((val * 2654435761) >>> 0) >> 20;
    };

    while (ip + 12 < srcLen) {
        const h = hashFn(ip);
        const ref = hashtable[h];
        hashtable[h] = ip;

        if (
            ref >= 0 &&
            ip - ref <= 65535 &&
            input[ref] === input[ip] &&
            input[ref + 1] === input[ip + 1] &&
            input[ref + 2] === input[ip + 2] &&
            input[ref + 3] === input[ip + 3]
        ) {
            const litLen = ip - anchor;
            let matchLen = 4;
            while (ip + matchLen < srcLen && input[ref + matchLen] === input[ip + matchLen]) {
                matchLen++;
            }

            let tokenLit = litLen >= 15 ? 15 : litLen;
            let tokenMatch = matchLen - 4 >= 15 ? 15 : matchLen - 4;
            compressed.push((tokenLit << 4) | tokenMatch);

            if (litLen >= 15) {
                let len = litLen - 15;
                while (len >= 255) {
                    compressed.push(255);
                    len -= 255;
                }
                compressed.push(len);
            }

            for (let i = 0; i < litLen; i++) {
                compressed.push(input[anchor + i]);
            }

            const offset = ip - ref;
            compressed.push(offset & 0xff, (offset >> 8) & 0xff);

            if (matchLen - 4 >= 15) {
                let len = matchLen - 4 - 15;
                while (len >= 255) {
                    compressed.push(255);
                    len -= 255;
                }
                compressed.push(len);
            }

            ip += matchLen;
            anchor = ip;
        } else {
            ip++;
        }
    }

    const lastLit = srcLen - anchor;
    let tokenLit = lastLit >= 15 ? 15 : lastLit;
    compressed.push((tokenLit << 4) | 0);

    if (lastLit >= 15) {
        let len = lastLit - 15;
        while (len >= 255) {
            compressed.push(255);
            len -= 255;
        }
        compressed.push(len);
    }

    for (let i = 0; i < lastLit; i++) {
        compressed.push(input[anchor + i]);
    }

    const compLen = compressed.length;
    const header = new Uint8Array(9);
    header[0] = 0xc4;
    header[1] = srcLen & 0xff;
    header[2] = (srcLen >> 8) & 0xff;
    header[3] = (srcLen >> 16) & 0xff;
    header[4] = (srcLen >> 24) & 0xff;
    header[5] = compLen & 0xff;
    header[6] = (compLen >> 8) & 0xff;
    header[7] = (compLen >> 16) & 0xff;
    header[8] = (compLen >> 24) & 0xff;

    const result = new Uint8Array(9 + compLen);
    result.set(header, 0);
    result.set(compressed, 9);
    return result;
}

// 軽量 RLE 圧縮
function compressTypeDestRLE(uint8Array) {
    if (!uint8Array || uint8Array.length === 0) return new Uint8Array(0);

    const output = [0xcf];
    let i = 0;
    const len = uint8Array.length;

    while (i < len) {
        const byteVal = uint8Array[i];
        let runLen = 1;

        while (i + runLen < len && uint8Array[i + runLen] === byteVal && runLen < 255) {
            runLen++;
        }

        if (runLen >= 3 || byteVal === 0xfe) {
            output.push(0xfe, runLen, byteVal);
            i += runLen;
        } else {
            output.push(byteVal);
            i++;
        }
    }

    return new Uint8Array(output);
}

function ensureBleUI() {
    const renderUI = (container) => {
        if (!container || container.querySelector(".esp32BleSetting")) return;
        const bleDiv = document.createElement("div");
        bleDiv.className = "esp32BleSetting";
        bleDiv.style.cssText = "margin-bottom: 15px; padding: 12px; background: #f0f8ff; border: 1px solid #007bff; border-radius: 8px;";
        bleDiv.innerHTML = `
            <h2 style="margin-top: 0; font-size: 14px; color: #007bff;">ESP32 Bluetooth 接続</h2>
            <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                <button type="button" onclick="connectBLE()" style="flex: 1; padding: 8px; font-size: 13px; font-weight: bold; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Bluetooth 接続</button>
                <button type="button" onclick="disconnectBLE()" style="padding: 8px 12px; font-size: 13px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">切断</button>
            </div>
            <button type="button" onclick="transferToESP32()" style="width: 100%; padding: 10px; font-size: 14px; font-weight: bold; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Bluetooth 高速転送</button>
            <p class="transferStatus" style="margin-top: 8px; margin-bottom: 0; font-size: 12px; font-weight: bold; color: #333;">未接続</p>
        `;
        container.insertBefore(bleDiv, container.firstChild);
    };

    renderUI(document.getElementById("vehicleSelector"));
    renderUI(document.getElementById("sidebar"));
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureBleUI);
} else {
    ensureBleUI();
}

function updateTransferStatus(text) {
    const elements = document.querySelectorAll(".transferStatus, #transferStatus");
    elements.forEach((el) => {
        if (el) el.textContent = text;
    });
}

async function connectBLE() {
    try {
        updateTransferStatus("デバイス検索中...");
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ name: "ESP32_LED_Matrix" }],
            optionalServices: [SERVICE_UUID]
        });

        bleDevice.addEventListener("gattserverdisconnected", onDisconnected);
        updateTransferStatus("接続中...");
        bleServer = await bleDevice.gatt.connect();

        const service = await bleServer.getPrimaryService(SERVICE_UUID);
        rxCharacteristic = await service.getCharacteristic(CHARACTERISTIC_UUID_RX);

        updateTransferStatus("Bluetooth 接続完了！");
    } catch (error) {
        console.error("BLE接続エラー:", error);
        updateTransferStatus("接続失敗: " + error.message);
    }
}

function disconnectBLE() {
    if (bleDevice && bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect();
    }
    onDisconnected();
}

function onDisconnected() {
    rxCharacteristic = null;
    bleServer = null;
    updateTransferStatus("切断されました");
}

function triggerAutoTransfer() {
    if (autoTransferTimeout) clearTimeout(autoTransferTimeout);
    autoTransferTimeout = setTimeout(() => {
        transferToESP32();
    }, 150);
}

function isTypeScrollEnabled() { return typeof typeScroll !== "undefined" ? typeScroll : true; }
function isDestinationScrollEnabled() { return typeof destinationScroll !== "undefined" ? destinationScroll : true; }
function isTypeDestinationScrollCategoryEnabled(category) {
    if (category === "type") return isTypeScrollEnabled();
    if (category === "destination") return isDestinationScrollEnabled();
    return true;
}

function getSlideMode() {
    if (typeof isVerticalSlideEnabled === "function" && !isVerticalSlideEnabled()) return 0x56;
    const vCheck2 = document.getElementById("verticalSlideCheck2");
    const choppyCheck = document.getElementById("choppyScrollCheck");
    const isMode2 = vCheck2 && vCheck2.checked;
    const isChoppy = choppyCheck && choppyCheck.checked;
    if (!isMode2 && !isChoppy) return 0x57;
    if (isMode2 && !isChoppy) return 0x58;
    if (!isMode2 && isChoppy) return 0x59;
    if (isMode2 && isChoppy) return 0x5a;
    return 0x56;
}

function isAgingEnabled() {
    if (typeof isLedAging !== "undefined" && isLedAging === true) return true;
    const agingCheck = document.getElementById("isLedAging");
    return agingCheck ? agingCheck.checked : false;
}

function ensureLEDAgingForTransfer() {
    if (!isAgingEnabled()) return;
    const hw = getHardwareWidth();
    if (typeof createLEDAging === "function") {
        if (!ledAging || !ledAging.data || ledAging.width < hw || ledAging.height < 32) {
            ledAging = createLEDAging(Math.max(hw, 256), 32);
        }
    }
}

function getAgedColor(x, y, color) {
    if (!isAgingEnabled() || typeof applyLEDAging !== "function" || !ledAging || !ledAging.data) return color;
    const safeX = Math.abs(Math.floor(x)) % ledAging.width;
    const safeY = Math.abs(Math.floor(y)) % ledAging.height;
    return applyLEDAging(safeX, safeY, color);
}

document.addEventListener("click", (e) => {
    if (!e.target) return;
    if (e.target.tagName === "BUTTON" || e.target.closest?.(".buttonGroup") || e.target.closest?.(".selectGroup") || e.target.id === "isLedAging") {
        if (e.target.id === "isLedAging") ledAging = null;
        triggerAutoTransfer();
    }
});

document.addEventListener("change", (e) => {
    if (!e.target) return;
    if (["scrollCheck", "verticalSlideCheck", "verticalSlideCheck2", "choppyScrollCheck", "hardwareWidth", "softBrightness", "gammaCorrection", "hwBrightness", "isLedAging"].includes(e.target.id)) {
        if (e.target.id === "isLedAging") ledAging = null;
        triggerAutoTransfer();
    }
});

function getNumberValue(id, defaultValue) {
    const element = document.getElementById(id);
    if (!element) return defaultValue;
    let valStr = element.value ?? (element.querySelector?.("input")?.value);
    if (!valStr) return defaultValue;
    const value = Number(valStr);
    return (Number.isFinite(value) && value > 0) ? value : defaultValue;
}

function getHardwareWidth() {
    const hwVal = getNumberValue("hardwareWidth", 0);
    if (hwVal >= 64 && hwVal <= 256) return hwVal;
    if (typeof config !== "undefined" && config && config.ledWidth) return Math.min(256, Math.max(64, Number(config.ledWidth)));
    return 192;
}

function getScrollText() {
    return document.getElementById("scrollText")?.value || document.getElementById("scroll-text-input")?.value || "";
}

function isScrollEnabled() {
    return typeof clickStartScrollBtn !== "undefined" ? clickStartScrollBtn : false;
}

function getScrollColor() {
    const colorInput = document.getElementById("scroll-color");
    const defaultColor = { r: 255, g: 242, b: 0 };
    if (!colorInput || !colorInput.value) return defaultColor;
    const match = colorInput.value.trim().match(/^#([0-9a-fA-F]{6})$/);
    if (!match) return defaultColor;
    return {
        r: parseInt(match[1].slice(0, 2), 16),
        g: parseInt(match[1].slice(2, 4), 16),
        b: parseInt(match[1].slice(4, 6), 16)
    };
}

function createESP32ScrollData(br, gam) {
    const text = getScrollText();
    if (!isScrollEnabled() || !text || (typeof config !== "undefined" && config?.hasScroll === false)) {
        return { tw: 0, sbuf: new Uint8Array(0) };
    }
    if (typeof fontData === "undefined" || !fontData) return { tw: 0, sbuf: new Uint8Array(0) };

    const chars = [...text];
    const tw = chars.length * 16;
    const sbuf = new Uint8Array(tw * 16 * 2);
    let sp = 0;
    const baseColor = getScrollColor();

    for (let charIndex = 0; charIndex < chars.length; charIndex++) {
        const char = chars[charIndex];
        const data = fontData[char];

        for (let px = 0; px < 16; px++) {
            for (let py = 0; py < 16; py++) {
                let r = 0, g = 0, b = 0;

                if (data && data[py * 16 + px] === 1) {
                    const agedPixel = getAgedColor(charIndex * 16 + px, py, baseColor);
                    r = Math.min(255, Math.max(0, Math.round(Math.pow(agedPixel.r / 255, gam) * br * 255)));
                    g = Math.min(255, Math.max(0, Math.round(Math.pow(agedPixel.g / 255, gam) * br * 255)));
                    b = Math.min(255, Math.max(0, Math.round(Math.pow(agedPixel.b / 255, gam) * br * 255)));
                }

                const rgb565 = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
                sbuf[sp++] = rgb565 & 0xff;
                sbuf[sp++] = (rgb565 >> 8) & 0xff;
            }
        }
    }
    return { tw, sbuf };
}

function createESP32TypeDestinationScrollPacket(br, gam) {
    const states = [
        { state: typeof typeJaScrollState !== "undefined" ? typeJaScrollState : null, kind: 0, lang: 0, category: "type", langName: "ja" },
        { state: typeof typeEnScrollState !== "undefined" ? typeEnScrollState : null, kind: 0, lang: 1, category: "type", langName: "en" },
        { state: typeof destinationJaScrollState !== "undefined" ? destinationJaScrollState : null, kind: 1, lang: 0, category: "destination", langName: "ja" },
        { state: typeof destinationEnScrollState !== "undefined" ? destinationEnScrollState : null, kind: 1, lang: 1, category: "destination", langName: "en" }
    ];

    const hw = getHardwareWidth();
    const pw = Number(config?.ledWidth || 160);
    const margin = Math.max(0, hw - pw);

    const descriptors = [];
    const bitmaps = [];
    let totalDataLength = 0;

    for (let i = 0; i < 4; i++) {
        const info = states[i];
        let descriptor = { active: 0, kind: info.kind, lang: info.lang, width: 0, height: 0, areaLeft: 0, areaRight: 0, areaTop: 0, areaBottom: 0, dataLength: 0 };
        let bitmap = new Uint8Array(0);

        if (info.state && info.state.active && isTypeDestinationScrollCategoryEnabled(info.category)) {
            let item = null;
            if (typeof getItem === "function") {
                item = getItem(info.category, info.category === "type" ? typeId : destinationId);
            }
            const view = item?.view?.normal?.[info.langName];
            if (view && view.data && view.width > 0 && view.height > 0) {
                const width = Number(view.width);
                const height = Number(view.height);
                const data = view.data;
                const sbuf = new Uint8Array(width * height * 2);
                let sp = 0;

                for (let x = 0; x < width; x++) {
                    for (let y = 0; y < height; y++) {
                        const idx = (y * width + x) * 3;
                        const pixel = getAgedColor(x, y, { r: data[idx] ?? 0, g: data[idx + 1] ?? 0, b: data[idx + 2] ?? 0 });
                        const r = Math.min(255, Math.max(0, Math.round(Math.pow(pixel.r / 255, gam) * br * 255)));
                        const g = Math.min(255, Math.max(0, Math.round(Math.pow(pixel.g / 255, gam) * br * 255)));
                        const b = Math.min(255, Math.max(0, Math.round(Math.pow(pixel.b / 255, gam) * br * 255)));
                        const rgb565 = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
                        sbuf[sp++] = rgb565 & 0xff;
                        sbuf[sp++] = (rgb565 >> 8) & 0xff;
                    }
                }

                descriptor.active = 1;
                descriptor.width = width;
                descriptor.height = height;
                descriptor.areaLeft = Math.min(hw, Math.max(0, Math.round(info.state.areaLeft) + margin));
                descriptor.areaRight = Math.min(hw, Math.max(0, Math.round(info.state.areaRight) + margin));
                descriptor.areaTop = Math.max(0, Math.round(info.state.areaTop));
                descriptor.areaBottom = Math.max(0, Math.round(info.state.areaBottom));
                descriptor.dataLength = sbuf.length;
                bitmap = sbuf;
            }
        }
        descriptors.push(descriptor);
        bitmaps.push(bitmap);
        totalDataLength += bitmap.length;
    }

    const packet = new Uint8Array(8 + 4 * 16 + totalDataLength);
    let offset = 0;

    packet.set([0x54, 0x53, 0x43, 0x52, 1, 4, transferTypeDestinationScrollSpeed & 0xff, 0], offset);
    offset += 8;

    for (const d of descriptors) {
        packet[offset++] = d.active & 0xff;
        packet[offset++] = d.kind & 0xff;
        packet[offset++] = d.lang & 0xff;
        packet[offset++] = d.width & 0xff;
        packet[offset++] = (d.width >> 8) & 0xff;
        packet[offset++] = d.height & 0xff;
        packet[offset++] = d.areaLeft & 0xff;
        packet[offset++] = (d.areaLeft >> 8) & 0xff;
        packet[offset++] = d.areaRight & 0xff;
        packet[offset++] = (d.areaRight >> 8) & 0xff;
        packet[offset++] = d.areaTop & 0xff;
        packet[offset++] = d.areaBottom & 0xff;
        packet[offset++] = d.dataLength & 0xff;
        packet[offset++] = (d.dataLength >> 8) & 0xff;
        packet[offset++] = (d.dataLength >> 16) & 0xff;
        packet[offset++] = (d.dataLength >> 24) & 0xff;
    }

    for (const bm of bitmaps) {
        if (bm.length > 0) {
            packet.set(bm, offset);
            offset += bm.length;
        }
    }

    return packet;
}

function createESP32Packet() {
    buildSceneList();
    buildTypeSceneList();
    if (sceneList.length === 0) return new Uint8Array();

    const typeCount = typeSceneList.length > 0 ? typeSceneList.length : 1;
    const sceneCount = Math.min(lcm(sceneList.length, typeCount), 6);
    const hw = getHardwareWidth();
    const pw = Number(config.ledWidth);
    const margin = Math.max(0, hw - pw);
    const br = getNumberValue("softBrightness", 1.0);
    const gam = getNumberValue("gammaCorrection", 2.5);

    const scrollData = createESP32ScrollData(br, gam);
    let areaLeft = 48;
    let xOff = Math.max(0, Math.min(255, areaLeft + margin));

    const header = new Uint8Array(22);
    header[0] = 0xaa;
    header[1] = getSlideMode();
    header[2] = sceneCount & 0xff;
    header[3] = transferScrollSpeed & 0xff;
    header[4] = scrollData.tw & 0xff;
    header[5] = (scrollData.tw >> 8) & 0xff;
    header[6] = xOff & 0xff;

    const defaultInterval = config?.sceneInterval || 3000;
    for (let i = 0; i < 6; i++) {
        header[7 + i * 2] = defaultInterval & 0xff;
        header[8 + i * 2] = (defaultInterval >> 8) & 0xff;
    }

    header[19] = Math.max(0, Math.min(255, Math.round(getNumberValue("hwBrightness", 20))));
    header[20] = hw & 0xff;
    header[21] = (hw >> 8) & 0xff;

    const sceneData = createAllESP32Scenes(sceneCount, hw, margin, br, gam);
    const packet = new Uint8Array(header.length + scrollData.sbuf.length + sceneData.length);
    packet.set(header, 0);
    packet.set(scrollData.sbuf, header.length);
    packet.set(sceneData, header.length + scrollData.sbuf.length);

    return packet;
}

function createAllESP32Scenes(sceneCount, hw, margin, br, gam) {
    const sceneSize = 8 * 16 * hw;
    const allData = new Uint8Array(sceneCount * sceneSize);
    let offset = 0;

    for (let i = 0; i < sceneCount; i++) {
        scene = i % sceneList.length;
        typeScene = typeSceneList.length > 0 ? i % typeSceneList.length : 0;
        applyScene();
        applyTypeScene();

        const matrix = createDisplayMatrix();
        const frame = Array.from({ length: 8 }, () => Array.from({ length: 16 }, () => new Uint8Array(hw)));
        const ledHeight = Number(config.ledHeight);
        const ledWidth = Number(config.ledWidth);
        const yOffset = ledHeight < 32 ? Math.floor((32 - ledHeight) / 2) : 0;

        for (let y = 0; y < ledHeight; y++) {
            for (let x = 0; x < ledWidth; x++) {
                const sourcePixel = matrix[y]?.[x];
                if (!sourcePixel) continue;

                const targetX = x + margin;
                const targetY = y + yOffset;
                if (targetX < 0 || targetX >= hw || targetY < 0 || targetY >= 32) continue;

                const pixel = getAgedColor(targetX, targetY, sourcePixel);
                const r = Math.min(255, Math.max(0, Math.round(Math.pow(pixel.r / 255, gam) * br * 255)));
                const g = Math.min(255, Math.max(0, Math.round(Math.pow(pixel.g / 255, gam) * br * 255)));
                const b = Math.min(255, Math.max(0, Math.round(Math.pow(pixel.b / 255, gam) * br * 255)));

                for (let bit = 0; bit < 8; bit++) {
                    if ((r >> bit) & 1) frame[bit][targetY % 16][targetX] |= targetY < 16 ? 0x01 : 0x08;
                    if ((g >> bit) & 1) frame[bit][targetY % 16][targetX] |= targetY < 16 ? 0x02 : 0x10;
                    if ((b >> bit) & 1) frame[bit][targetY % 16][targetX] |= targetY < 16 ? 0x04 : 0x20;
                }
            }
        }

        for (let bit = 0; bit < 8; bit++) {
            for (let y = 0; y < 16; y++) {
                for (let x = 0; x < hw; x++) {
                    allData[offset++] = frame[bit][y][x];
                }
            }
        }
    }
    return allData;
}

// 応答待ちなし（writeValueWithoutResponse）による超高速分割送信
async function sendPacketFast(uint8Data) {
    if (!rxCharacteristic) return;
    const chunkSize = 480; // 大容量Chunkサイズ
    let offset = 0;

    while (offset < uint8Data.length) {
        const chunk = uint8Data.subarray(offset, offset + chunkSize);
        
        if (rxCharacteristic.writeValueWithoutResponse) {
            await rxCharacteristic.writeValueWithoutResponse(chunk);
        } else {
            await rxCharacteristic.writeValue(chunk);
        }
        
        offset += chunkSize;
        // バッファ溢れ防止のための極小ウェイト
        if (offset % (chunkSize * 4) === 0) {
            await new Promise((r) => setTimeout(r, 5));
        }
    }
}

async function transferToESP32() {
    if (isBleTransferring) return;
    if (!rxCharacteristic || !bleDevice || !bleDevice.gatt.connected) {
        updateTransferStatus("エラー: Bluetoothが接続されていません");
        return;
    }

    isBleTransferring = true;
    updateTransferStatus("高速転送中...");

    try {
        ensureLEDAgingForTransfer();

        // 1. メイン画面データの送信（LZ4圧縮）
        const rawPacket = createESP32Packet();
        if (rawPacket && rawPacket.length > 0) {
            const lz4Packet = compressLZ4(rawPacket);
            await sendPacketFast(lz4Packet);
        }

        // 2. 種別・行先スクロールデータの送信（RLE圧縮）
        const br = getNumberValue("softBrightness", 1.0);
        const gam = getNumberValue("gammaCorrection", 2.5);
        const rawTypeDestPacket = createESP32TypeDestinationScrollPacket(br, gam);

        if (rawTypeDestPacket && rawTypeDestPacket.length > 0) {
            const rlePacket = compressTypeDestRLE(rawTypeDestPacket);
            await sendPacketFast(rlePacket);
        }

        updateTransferStatus("転送完了！");
    } catch (error) {
        console.error("転送エラー:", error);
        updateTransferStatus("転送エラー: " + error.message);
    } finally {
        isBleTransferring = false;
    }
}

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
function lcm(a, b) { return (a === 0 || b === 0) ? 0 : Math.abs((a / gcd(a, b)) * b); }
