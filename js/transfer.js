let transferController = null;
let bleDevice = null;
let bleRxCharacteristic = null;
let isBleTransferring = false;
let autoTransferTimeout = null;

const BLE_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const BLE_CHARACTERISTIC_RX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

const ESP32_MAX_SCENES = 6;
const ESP32_MAX_WIDTH = 256;
const ESP32_MIN_WIDTH = 64;
const ESP32_MAX_SCROLL_WIDTH = 4096;
const ESP32_HEADER_SIZE = 22;

const ESP32_TYPE_DESTINATION_SCROLL_MAGIC = [0x54, 0x53, 0x43, 0x52];
const ESP32_TYPE_DESTINATION_SCROLL_VERSION = 1;
const ESP32_TYPE_DESTINATION_SCROLL_COUNT = 4;
const ESP32_TYPE_DESTINATION_SCROLL_HEADER_SIZE = 8;
const ESP32_TYPE_DESTINATION_SCROLL_DESCRIPTOR_SIZE = 16;

const transferScrollSpeed = 17;
const transferTypeDestinationScrollSpeed = 14;

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

function updateBluetoothUIButtonState(connected) {
    const btBtns = document.querySelectorAll(".btConnectBtn");
    btBtns.forEach((btn) => {
        if (btn) {
            btn.style.display = connected ? "none" : "block";
        }
    });
}

function ensureBluetoothUI() {
    const vehicleSelector = document.getElementById("vehicleSelector");
    if (vehicleSelector && !vehicleSelector.querySelector(".esp32Setting")) {
        const btDiv = document.createElement("div");
        btDiv.className = "esp32Setting";
        btDiv.style.cssText = "margin-bottom: 20px; padding: 15px; background: #eef6ff; border: 1px solid #007bff; border-radius: 8px;";
        btDiv.innerHTML = `
            <h2 style="margin-top: 0; color: #007bff; font-size: 16px;">Bluetooth (ESP32) 接続設定</h2>
            <button type="button" class="btConnectBtn" onclick="connectBluetooth()" style="width: 100%; padding: 12px; font-size: 15px; font-weight: bold; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer;">Bluetooth接続</button>
            <p class="transferStatus" style="margin-top: 10px; margin-bottom: 0; font-size: 13px; font-weight: bold; color: #333;"></p>
        `;
        vehicleSelector.insertBefore(btDiv, vehicleSelector.firstChild);
    }

    const sidebar = document.getElementById("sidebar");
    if (sidebar && !sidebar.querySelector(".esp32Setting")) {
        const btDivSide = document.createElement("div");
        btDivSide.className = "esp32Setting";
        btDivSide.style.cssText = "margin-top: 15px; margin-bottom: 15px; padding: 12px; background: #eef6ff; border: 1px solid #007bff; border-radius: 8px;";
        btDivSide.innerHTML = `
            <h2 style="margin-top: 0; font-size: 14px; color: #007bff;">Bluetooth設定</h2>
            <button type="button" class="btConnectBtn" onclick="connectBluetooth()" style="width: 100%; padding: 10px; font-size: 14px; font-weight: bold; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Bluetooth接続</button>
            <p class="transferStatus" style="margin-top: 8px; margin-bottom: 0; font-size: 12px; font-weight: bold; color: #333;"></p>
        `;
        const returnBtn = document.getElementById("vehicleSelectButton");
        if (returnBtn) {
            sidebar.insertBefore(btDivSide, returnBtn);
        } else {
            sidebar.appendChild(btDivSide);
        }
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureBluetoothUI);
} else {
    ensureBluetoothUI();
}

function updateTransferStatus(text) {
    const elements = document.querySelectorAll(".transferStatus, #transferStatus");
    elements.forEach((el) => {
        if (el) el.textContent = text;
    });
}

async function connectBluetooth() {
    if (!navigator.bluetooth) {
        updateTransferStatus("エラー: ブラウザがWeb Bluetooth非対応です (Chromeをご使用ください)");
        alert("Web Bluetooth非対応のブラウザです。Google Chromeをご使用ください。");
        return false;
    }

    try {
        updateTransferStatus("Bluetooth機器を検索中...");

        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ name: "ESP32_LED_Matrix" }],
            optionalServices: [BLE_SERVICE_UUID]
        });

        bleDevice.addEventListener("gattserverdisconnected", () => {
            bleRxCharacteristic = null;
            updateTransferStatus("Bluetoothが切断されました");
            updateBluetoothUIButtonState(false);
        });

        updateTransferStatus("GATTサーバー接続中...");
        const server = await bleDevice.gatt.connect();

        updateTransferStatus("サービス取得中...");
        const service = await server.getPrimaryService(BLE_SERVICE_UUID);

        updateTransferStatus("キャラクタリスティック取得中...");
        bleRxCharacteristic = await service.getCharacteristic(BLE_CHARACTERISTIC_RX_UUID);

        updateTransferStatus("Bluetooth接続完了！");
        updateBluetoothUIButtonState(true);

        setTimeout(() => {
            transferToESP32();
        }, 200);

        return true;
    } catch (error) {
        console.error("Bluetooth接続エラー:", error);
        updateTransferStatus("接続失敗: " + (error?.message || error));
        updateBluetoothUIButtonState(false);
        return false;
    }
}

function triggerAutoTransfer() {
    if (autoTransferTimeout) {
        clearTimeout(autoTransferTimeout);
    }
    autoTransferTimeout = setTimeout(() => {
        if (bleRxCharacteristic && bleDevice && bleDevice.gatt.connected) {
            transferToESP32();
        }
    }, 200);
}

function isTypeScrollEnabled() {
    return typeof typeScroll !== "undefined" ? typeScroll : true;
}

function isDestinationScrollEnabled() {
    return typeof destinationScroll !== "undefined" ? destinationScroll : true;
}

function isTypeDestinationScrollCategoryEnabled(category) {
    if (category === "type") return isTypeScrollEnabled();
    if (category === "destination") return isDestinationScrollEnabled();
    return true;
}

function getSlideMode() {
    // 車両config側に slideMode (0x5B 等) の指定がある場合は優先適用
    if (typeof config !== "undefined" && config && typeof config.slideMode === "number") {
        return config.slideMode;
    }

    if (typeof isVerticalSlideEnabled === "function" && !isVerticalSlideEnabled()) {
        return 0x56;
    }
    const vCheck = document.getElementById("verticalSlideCheck");
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
    if (typeof isLedAging !== "undefined" && isLedAging === true) {
        return true;
    }
    const agingCheck = document.getElementById("isLedAging");
    return agingCheck ? agingCheck.checked : false;
}

function ensureLEDAgingForTransfer() {
    if (!isAgingEnabled()) return;
    const hw = getHardwareWidth();
    const height = 32;
    if (typeof createLEDAging === "function") {
        if (!ledAging || !ledAging.data || ledAging.width < hw || ledAging.height < height) {
            ledAging = createLEDAging(Math.max(hw, 256), height);
        }
    }
}

function getAgedColor(x, y, color) {
    if (!isAgingEnabled() || typeof applyLEDAging !== "function" || !ledAging || !ledAging.data) {
        return color;
    }
    const safeX = Math.abs(Math.floor(x)) % ledAging.width;
    const safeY = Math.abs(Math.floor(y)) % ledAging.height;
    return applyLEDAging(safeX, safeY, color);
}

document.addEventListener("click", (e) => {
    if (!e.target) return;
    if (
        e.target.tagName === "BUTTON" ||
        e.target.closest?.(".buttonGroup") ||
        e.target.closest?.(".selectGroup") ||
        e.target.closest?.(".numberInput") ||
        e.target.closest?.("#scroll") ||
        e.target.id === "scrollText" ||
        e.target.id === "scrollCheck" ||
        e.target.id === "verticalSlideCheck" ||
        e.target.id === "verticalSlideCheck2" ||
        e.target.id === "choppyScrollCheck" ||
        e.target.id === "isLedAging" ||
        e.target.id === "ledAgingLebel" ||
        e.target.id === "ledAgingLevel"
    ) {
        if (e.target.id === "isLedAging" || e.target.id === "ledAgingLebel" || e.target.id === "ledAgingLevel") {
            ledAging = null;
        }
        triggerAutoTransfer();
    }
});

document.addEventListener("input", (e) => {
    if (!e.target) return;
    if (
        e.target.id === "scrollText" ||
        e.target.id === "scroll-text-input" ||
        e.target.id === "scroll-color" ||
        e.target.id === "scroll-speed" ||
        e.target.id === "hardwareWidth" ||
        e.target.id === "softBrightness" ||
        e.target.id === "gammaCorrection" ||
        e.target.id === "hwBrightness" ||
        e.target.id === "isLedAging" ||
        e.target.id === "ledAgingLebel" ||
        e.target.id === "ledAgingLevel"
    ) {
        if (e.target.id === "isLedAging" || e.target.id === "ledAgingLebel" || e.target.id === "ledAgingLevel") {
            ledAging = null;
        }
        triggerAutoTransfer();
    }
});

document.addEventListener("change", (e) => {
    if (!e.target) return;
    if (
        e.target.id === "scrollCheck" ||
        e.target.id === "verticalSlideCheck" ||
        e.target.id === "verticalSlideCheck2" ||
        e.target.id === "choppyScrollCheck" ||
        e.target.id === "scrollText" ||
        e.target.id === "scroll-text-input" ||
        e.target.id === "scroll-color" ||
        e.target.id === "scroll-speed" ||
        e.target.id === "hardwareWidth" ||
        e.target.id === "softBrightness" ||
        e.target.id === "gammaCorrection" ||
        e.target.id === "hwBrightness" ||
        e.target.id === "isLedAging" ||
        e.target.id === "ledAgingLebel" ||
        e.target.id === "ledAgingLevel"
    ) {
        if (e.target.id === "isLedAging" || e.target.id === "ledAgingLebel" || e.target.id === "ledAgingLevel") {
            ledAging = null;
        }
        triggerAutoTransfer();
    }
});

function getNumberValue(id, defaultValue) {
    const element = document.getElementById(id);
    if (!element) return defaultValue;
    let valStr = "";
    if (element.matches && element.matches("input")) {
        valStr = element.value;
    } else {
        const input = element.querySelector ? element.querySelector("input") : null;
        if (input) valStr = input.value;
    }
    if (valStr === "" || valStr === null || valStr === undefined) return defaultValue;
    const value = Number(valStr);
    return (Number.isFinite(value) && value > 0) ? value : defaultValue;
}

function getHardwareWidth() {
    const hwVal = getNumberValue("hardwareWidth", 0);
    if (hwVal >= ESP32_MIN_WIDTH && hwVal <= ESP32_MAX_WIDTH) {
        return hwVal;
    }
    if (typeof config !== "undefined" && config && config.ledWidth && config.ledWidth >= ESP32_MIN_WIDTH) {
        return Math.min(ESP32_MAX_WIDTH, Math.max(ESP32_MIN_WIDTH, Number(config.ledWidth)));
    }
    return 192;
}

function getScrollText() {
    const scrollText = document.getElementById("scrollText");
    if (scrollText) return scrollText.value || "";
    const oldScrollText = document.getElementById("scroll-text-input");
    if (oldScrollText) return oldScrollText.value || "";
    return "";
}

function isScrollEnabled() {
    return typeof clickStartScrollBtn !== "undefined" ? clickStartScrollBtn : false;
}

function getScrollColor() {
    const colorInput = document.getElementById("scroll-color");
    const defaultColor = { r: 255, g: 242, b: 0 };
    if (!colorInput || !colorInput.value) return defaultColor;
    const value = colorInput.value.trim();
    const match = value.match(/^#([0-9a-fA-F]{6})$/);
    if (!match) return defaultColor;
    return {
        r: parseInt(match[1].slice(0, 2), 16),
        g: parseInt(match[1].slice(2, 4), 16),
        b: parseInt(match[1].slice(4, 6), 16)
    };
}

function createESP32ScrollData(br, gam) {
    const text = getScrollText();

    if (!isScrollEnabled() || !text) {
        return { tw: 0, sbuf: new Uint8Array(0) };
    }

    if (typeof config !== "undefined" && config && config.hasScroll === false) {
        return { tw: 0, sbuf: new Uint8Array(0) };
    }

    if (typeof fontData === "undefined" || !fontData) {
        throw new Error("スクロール用フォントデータ(fontData)が読み込まれていません");
    }

    const chars = [...text];
    const tw = chars.length * 16;

    if (tw > ESP32_MAX_SCROLL_WIDTH) {
        throw new Error(`スクロール文字が長すぎます（最大${ESP32_MAX_SCROLL_WIDTH}px）`);
    }

    const sbuf = new Uint8Array(tw * 16 * 2);
    let sp = 0;
    const baseColor = getScrollColor();

    for (let charIndex = 0; charIndex < chars.length; charIndex++) {
        const char = chars[charIndex];
        const data = fontData[char];

        for (let px = 0; px < 16; px++) {
            for (let py = 0; py < 16; py++) {
                let r = 0, g = 0, b = 0;

                if (data) {
                    const index = py * 16 + px;
                    if (data[index] === 1) {
                        const agedPixel = getAgedColor(charIndex * 16 + px, py, baseColor);
                        r = Math.min(255, Math.max(0, Math.round(Math.pow(agedPixel.r / 255, gam) * br * 255)));
                        g = Math.min(255, Math.max(0, Math.round(Math.pow(agedPixel.g / 255, gam) * br * 255)));
                        b = Math.min(255, Math.max(0, Math.round(Math.pow(agedPixel.b / 255, gam) * br * 255)));
                    }
                }

                const rgb565 = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
                sbuf[sp++] = rgb565 & 0xff;
                sbuf[sp++] = (rgb565 >> 8) & 0xff;
            }
        }
    }

    return { tw, sbuf };
}

function getESP32TypeDestinationScrollStates() {
    const states = [];

    if (typeof typeJaScrollState !== "undefined") {
        states.push({ state: typeJaScrollState, kind: 0, lang: 0, category: "type", langName: "ja" });
    }
    if (typeof typeEnScrollState !== "undefined") {
        states.push({ state: typeEnScrollState, kind: 0, lang: 1, category: "type", langName: "en" });
    }
    if (typeof destinationJaScrollState !== "undefined") {
        states.push({ state: destinationJaScrollState, kind: 1, lang: 0, category: "destination", langName: "ja" });
    }
    if (typeof destinationEnScrollState !== "undefined") {
        states.push({ state: destinationEnScrollState, kind: 1, lang: 1, category: "destination", langName: "en" });
    }

    return states;
}

function createESP32TypeDestinationScrollBitmap(view, br, gam) {
    if (!view || !view.data || !Number.isFinite(Number(view.width)) || !Number.isFinite(Number(view.height))) {
        return null;
    }

    const width = Number(view.width);
    const height = Number(view.height);

    if (width <= 0 || height <= 0) return null;

    if (width > ESP32_MAX_SCROLL_WIDTH) {
        throw new Error(`種別・行先スクロール幅が長すぎます（最大${ESP32_MAX_SCROLL_WIDTH}px）`);
    }

    const data = view.data;
    const sbuf = new Uint8Array(width * height * 2);
    let sp = 0;

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const index = (y * width + x) * 3;

            let rawColor = {
                r: Number(data[index] ?? 0),
                g: Number(data[index + 1] ?? 0),
                b: Number(data[index + 2] ?? 0)
            };

            const pixel = getAgedColor(x, y, rawColor);

            const r = Math.min(255, Math.max(0, Math.round(Math.pow(pixel.r / 255, gam) * br * 255)));
            const g = Math.min(255, Math.max(0, Math.round(Math.pow(pixel.g / 255, gam) * br * 255)));
            const b = Math.min(255, Math.max(0, Math.round(Math.pow(pixel.b / 255, gam) * br * 255)));

            const rgb565 = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);

            sbuf[sp++] = rgb565 & 0xff;
            sbuf[sp++] = (rgb565 >> 8) & 0xff;
        }
    }

    return { width, height, sbuf };
}

function createESP32TypeDestinationScrollPacket(br, gam) {
    const states = getESP32TypeDestinationScrollStates();

    const hw = getHardwareWidth();
    const pw =
        typeof config !== "undefined" && config && Number.isFinite(Number(config.ledWidth))
            ? Number(config.ledWidth)
            : 160;
    const margin = Math.max(0, hw - pw);

    const descriptors = [];
    const bitmaps = [];
    let totalDataLength = 0;

    for (let i = 0; i < ESP32_TYPE_DESTINATION_SCROLL_COUNT; i++) {
        const info = states[i];

        let descriptor = {
            active: 0,
            kind: info ? info.kind : 0,
            lang: info ? info.lang : 0,
            width: 0,
            height: 0,
            areaLeft: 0,
            areaRight: 0,
            areaTop: 0,
            areaBottom: 0,
            dataLength: 0
        };

        let bitmap = new Uint8Array(0);

        if (info && info.state && info.state.active && isTypeDestinationScrollCategoryEnabled(info.category)) {
            let item = null;
            if (typeof getItem === "function") {
                if (info.category === "type" && typeof typeId !== "undefined") {
                    item = getItem("type", typeId);
                } else if (info.category === "destination" && typeof destinationId !== "undefined") {
                    item = getItem("destination", destinationId);
                }
            }

            const view = item?.view?.normal?.[info.langName];
            const created = createESP32TypeDestinationScrollBitmap(view, br, gam);

            if (created) {
                descriptor.active = 1;
                descriptor.width = created.width;
                descriptor.height = created.height;
                descriptor.areaLeft = Math.min(hw, Math.max(0, Math.round(info.state.areaLeft) + margin));
                descriptor.areaRight = Math.min(hw, Math.max(0, Math.round(info.state.areaRight) + margin));
                descriptor.areaTop = Math.max(0, Math.round(info.state.areaTop));
                descriptor.areaBottom = Math.max(0, Math.round(info.state.areaBottom));
                descriptor.dataLength = created.sbuf.length;
                bitmap = created.sbuf;
            }
        }

        descriptors.push(descriptor);
        bitmaps.push(bitmap);
        totalDataLength += bitmap.length;
    }

    const packetLength =
        ESP32_TYPE_DESTINATION_SCROLL_HEADER_SIZE +
        ESP32_TYPE_DESTINATION_SCROLL_COUNT * ESP32_TYPE_DESTINATION_SCROLL_DESCRIPTOR_SIZE +
        totalDataLength;

    const packet = new Uint8Array(packetLength);
    let offset = 0;

    packet.set(ESP32_TYPE_DESTINATION_SCROLL_MAGIC, offset);
    offset += 4;

    packet[offset++] = ESP32_TYPE_DESTINATION_SCROLL_VERSION;
    packet[offset++] = ESP32_TYPE_DESTINATION_SCROLL_COUNT;
    packet[offset++] = transferTypeDestinationScrollSpeed & 0xff;
    packet[offset++] = 0;

    for (const descriptor of descriptors) {
        packet[offset++] = descriptor.active & 0xff;
        packet[offset++] = descriptor.kind & 0xff;
        packet[offset++] = descriptor.lang & 0xff;

        packet[offset++] = descriptor.width & 0xff;
        packet[offset++] = (descriptor.width >> 8) & 0xff;

        packet[offset++] = descriptor.height & 0xff;

        packet[offset++] = descriptor.areaLeft & 0xff;
        packet[offset++] = (descriptor.areaLeft >> 8) & 0xff;

        packet[offset++] = descriptor.areaRight & 0xff;
        packet[offset++] = (descriptor.areaRight >> 8) & 0xff;

        packet[offset++] = descriptor.areaTop & 0xff;
        packet[offset++] = descriptor.areaBottom & 0xff;

        packet[offset++] = descriptor.dataLength & 0xff;
        packet[offset++] = (descriptor.dataLength >> 8) & 0xff;
        packet[offset++] = (descriptor.dataLength >> 16) & 0xff;
        packet[offset++] = (descriptor.dataLength >> 24) & 0xff;
    }

    for (const bitmap of bitmaps) {
        if (bitmap.length > 0) {
            packet.set(bitmap, offset);
            offset += bitmap.length;
        }
    }

    return packet;
}

function createESP32Packet() {
    if (
        typeof buildSceneList !== "function" ||
        typeof buildTypeSceneList !== "function" ||
        typeof createDisplayMatrix !== "function" ||
        typeof applyScene !== "function" ||
        typeof applyTypeScene !== "function"
    ) {
        throw new Error("表示関連のJavaScriptが正しく読み込まれていません");
    }

    if (typeof config === "undefined" || !config) {
        throw new Error("車両configが読み込まれていません");
    }

    const scrollText = getScrollText();
    const scrollActive = config.hasScroll === true && isScrollEnabled() && scrollText.length > 0;
    const oldScrollId = typeof scrollId !== "undefined" ? scrollId : null;

    if (scrollActive) scrollId = true;

    try {
        buildSceneList();
        buildTypeSceneList();

        if (sceneList.length === 0) return new Uint8Array();

        const type = typeof getItem === "function" && typeof typeId !== "undefined" ? getItem("type", typeId) : null;
        let typeIsFull = false;
        if (type && typeof isTypeFullScreen === "function") {
            typeIsFull = isTypeFullScreen(type);
        }

        const typeCount = typeSceneList.length > 0 ? typeSceneList.length : 1;
        let rawSceneCount = lcm(sceneList.length, typeCount);

        if (typeIsFull) {
            rawSceneCount = 1;
        }

        const sceneCount = Math.min(rawSceneCount, ESP32_MAX_SCENES);

        const hw = getHardwareWidth();

        const pw = Number(config.ledWidth);
        if (!Number.isFinite(pw) || pw <= 0) {
            throw new Error("config.ledWidth が正しくありません");
        }

        const margin = Math.max(0, hw - pw);
        const br = getNumberValue("softBrightness", 1.0);
        const gam = getNumberValue("gammaCorrection", 2.5);

        const scrollData = createESP32ScrollData(br, gam);

        let areaLeft = 48;

        if (scrollActive && typeIsFull) {
            scrollData.tw = 0;
            scrollData.sbuf = new Uint8Array(0);
        }

        if (typeof typeId !== "undefined" && typeId === null && config.hasScrollFullScreen) {
            areaLeft = 0;
        }

        if (config.hasNextFullScreen) {
            areaLeft = 0;
        }

        let xOff = Math.max(0, Math.min(255, areaLeft + margin));

        const header = createESP32Header(sceneCount, hw, margin, scrollData.tw, transferScrollSpeed, xOff);
        const sceneData = createAllESP32Scenes(sceneCount, hw, margin);

        const packet = new Uint8Array(header.length + scrollData.sbuf.length + sceneData.length);
        packet.set(header, 0);
        packet.set(scrollData.sbuf, header.length);
        packet.set(sceneData, header.length + scrollData.sbuf.length);

        return packet;
    } finally {
        if (typeof scrollId !== "undefined") scrollId = oldScrollId;
    }
}

function createESP32Frame(matrix, hw, margin) {
    const frame = Array.from({ length: 8 }, () => Array.from({ length: 16 }, () => new Uint8Array(hw)));

    const br = getNumberValue("softBrightness", 1.0);
    const gam = getNumberValue("gammaCorrection", 2.5);
    const ledHeight = Number(config.ledHeight);
    const ledWidth = Number(config.ledWidth);
    const yOffset = ledHeight < 32 ? Math.floor((32 - ledHeight) / 2) : 0;

    for (let y = 0; y < ledHeight; y++) {
        for (let x = 0; x < ledWidth; x++) {
            const sourcePixel = matrix[y]?.[x];
            if (!sourcePixel) continue;

            const targetX = x + margin;
            if (targetX < 0 || targetX >= hw) continue;

            const targetY = y + yOffset;
            if (targetY < 0 || targetY >= 32) continue;

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

    return frame;
}

function frameToUint8Array(frame, hw) {
    const sceneBuf = new Uint8Array(8 * 16 * hw);
    let p = 0;

    for (let bit = 0; bit < 8; bit++) {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < hw; x++) {
                sceneBuf[p++] = frame[bit][y][x];
            }
        }
    }

    return sceneBuf;
}

function createAllESP32Scenes(sceneCount, hw, margin) {
    const sceneSize = 8 * 16 * hw;
    const allData = new Uint8Array(sceneCount * sceneSize);
    let offset = 0;

    const oldScene = scene;
    const oldTypeScene = typeScene;

    try {
        for (let i = 0; i < sceneCount; i++) {
            scene = i % sceneList.length;
            typeScene = typeSceneList.length > 0 ? i % typeSceneList.length : 0;

            applyScene();
            applyTypeScene();

            const matrix = createDisplayMatrix();
            const frame = createESP32Frame(matrix, hw, margin);
            const sceneBuf = frameToUint8Array(frame, hw);

            allData.set(sceneBuf, offset);
            offset += sceneSize;
        }
    } finally {
        scene = oldScene;
        typeScene = oldTypeScene;

        try {
            applyScene();
            applyTypeScene();
        } catch (e) {
            console.warn("表示状態の復元に失敗:", e);
        }
    }

    return allData;
}

function createESP32Header(sceneCount, hw, margin, scrollWidth, transferScrollSpeed, xOff) {
    const header = new Uint8Array(ESP32_HEADER_SIZE);
    let times;

    const defaultInterval = (typeof config !== "undefined" && config && config.sceneInterval) ? config.sceneInterval : 3000;

    if (config.setSwitchingTime) {
        const jaTime = getNumberValue("jaTime", 3) * 1000;
        const enTime = getNumberValue("enTime", 3) * 1000;
        const infoTime = getNumberValue("infoTime", 3) * 1000;
        const carNumberTime = getNumberValue("carNumberTime", 3) * 1000;

        times = sceneList.slice(0, ESP32_MAX_SCENES).map((currentScene) => {
            if (
                currentScene.information === "carNumber" ||
                currentScene.information === "carNumber_normal" ||
                currentScene.information === "carNumber_destination"
            ) {
                return carNumberTime;
            }
            if (currentScene.information === "information") return infoTime;
            if (currentScene.information === "destination") {
                if (currentScene.lang === "ja") return jaTime;
                if (currentScene.lang === "en") return enTime;
            }
            return defaultInterval;
        });
    } else {
        times = Array(6).fill(defaultInterval);
    }

    header[0] = 0xaa;
    header[1] = getSlideMode();
    header[2] = sceneCount & 0xff;
    header[3] = transferScrollSpeed & 0xff;
    header[4] = scrollWidth & 0xff;
    header[5] = (scrollWidth >> 8) & 0xff;
    header[6] = xOff & 0xff;

    for (let i = 0; i < 6; i++) {
        const time = Math.max(0, Math.min(65535, Math.round(times[i] ?? defaultInterval)));
        header[7 + i * 2] = time & 0xff;
        header[8 + i * 2] = (time >> 8) & 0xff;
    }

    const hwBright = Math.max(0, Math.min(255, Math.round(getNumberValue("hwBrightness", 20))));

    header[19] = hwBright & 0xff;
    header[20] = hw & 0xff;
    header[21] = (hw >> 8) & 0xff;

    return header;
}

async function sendChunkedData(characteristic, uint8Array, label, chunkSize = 496) {
    const total = uint8Array.length;
    let packetCount = 0;
    const startTime = performance.now();

    for (let i = 0; i < total; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);

        await characteristic.writeValueWithoutResponse(chunk);
        packetCount++;

        if (packetCount % 8 === 0 || i + chunkSize >= total) {
            const progress = Math.min(100, Math.floor(((i + chunk.length) / total) * 100));
            updateTransferStatus(`${label} 転送中... ${progress}%`);
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    }

    const elapsed = Math.round(performance.now() - startTime);
    console.log(`[BLE送信ログ] ${label}: ${total}バイト (${packetCount}パケット) -> 送信時間: ${elapsed}ms`);
}

async function transferToESP32() {
    if (!bleRxCharacteristic || !bleDevice || !bleDevice.gatt.connected) {
        updateTransferStatus("未接続：「Bluetooth接続」ボタンを押してください");
        return;
    }

    if (typeof config === "undefined" || !config) {
        updateTransferStatus("Bluetooth接続完了！車両を選択してください");
        return;
    }

    if (isBleTransferring) {
        return;
    }

    isBleTransferring = true;
    const totalStart = performance.now();

    try {
        updateTransferStatus("データ作成・圧縮中...");

        ensureLEDAgingForTransfer();

        const prepStart = performance.now();
        const rawPacket = createESP32Packet();
        if (!rawPacket || rawPacket.length === 0) {
            updateTransferStatus("表示シーンが選択されていません");
            return;
        }

        const lz4Packet = compressLZ4(rawPacket);
        console.log(`[生成ログ] メイン表示データ: 生サイズ=${rawPacket.length}B, 圧縮後=${lz4Packet.length}B (生成時間: ${Math.round(performance.now() - prepStart)}ms)`);

        await sendChunkedData(bleRxCharacteristic, lz4Packet, "メイン表示(LZ4)");

        const br = getNumberValue("softBrightness", 1.0);
        const gam = getNumberValue("gammaCorrection", 2.5);
        const rawTypeDestinationPacket = createESP32TypeDestinationScrollPacket(br, gam);

        if (rawTypeDestinationPacket && rawTypeDestinationPacket.length > 0) {
            const rleTypeDestPacket = compressTypeDestRLE(rawTypeDestinationPacket);
            await sendChunkedData(bleRxCharacteristic, rleTypeDestPacket, "種別・行先スクロール(RLE)");
        }

        const totalElapsed = Math.round(performance.now() - totalStart);
        console.log(`[全体完了] トータル所要時間: ${totalElapsed}ms`);

        updateTransferStatus("転送完了！");
    } catch (error) {
        console.error("BLE転送エラー:", error);
        updateTransferStatus("転送失敗: " + (error?.message || error));
    } finally {
        isBleTransferring = false;
    }
}

function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
        const temp = a % b;
        a = b;
        b = temp;
    }
    return a;
}

function lcm(a, b) {
    if (a === 0 || b === 0) return 0;
    return Math.abs((a / gcd(a, b)) * b);
}
