function drawCarNumber(carNumber, matrix) {

    if (!carNumber) return;

    let usedNormal = true;
    let destinationWidth;

    const view = isCarNumberFullScreen(carNumber)
        ? "full"
        : "normal";

    const data =
        carNumber.view?.[view]?.[lang]
        ?? carNumber.view?.[view]?.ja
        ?? carNumber.view?.normal?.[lang]
        ?? carNumber.view?.normal?.ja;

    if (!data) return;

    const type = getItem("type", typeId);
    const dest = getItem("destination", destinationId);

    if (config.hasCarNumberFull) {
        destinationWidth = 0;
    }
    if (config.hasCarNumberSmall) {
        destinationWidth =
            config.carNumber === "right"
                ? getDestinationWidth(type, dest, usedNormal)
                : 0;
    }
    if (config.hasCarNumberNormal) {
        destinationWidth = getTypeWidth(type, usedNormal);
    }
    drawImage(data, destinationWidth, 0, matrix);
}

function drawType(type, matrix) {
    let usedNormal = true;
    let carNumberWidth;
    let typeLang = lang;
    if (typeMode === "information") {
        typeLang = "information";
    }

    const view = isTypeFullScreen(type)
        ? "full"
        : "normal";

    let data = null;
    
    if (config.languageSwitching) {
        data =
            type.view?.[view]?.[typeLang]
            ?? type.view?.[view]?.ja
            ?? type.view?.normal?.[typeLang]
            ?? type.view?.normal?.ja;
    } else {
        if (nextId != null || scrollId != null) {
            data =
                type.view?.[view]?.[typeLang]
                ?? type.view?.[view]?.ja
                ?? type.view?.normal?.[typeLang]
                ?? type.view?.normal?.ja;
        } else {
            data =
                type.view?.[view]?.ja_en
                ?? type.view?.[view]?.[typeLang]
                ?? type.view?.[view]?.ja
                ?? type.view?.normal?.ja_en
                ?? type.view?.normal?.[typeLang]
                ?? type.view?.normal?.ja
        }
    }

    const carNumber = getItem("carNumber", carNumberId)
    
    if (config.hasCarNumberSmall) {
        carNumberWidth = getCarNumberWidth(carNumber, usedNormal)
    } else {
        carNumberWidth = 0;
    }

    if (!data) return;

    if (!config.hasTypeScroll) { 
        drawImage(data, carNumberWidth, 0, matrix); 
    } else { 
        const typeData = getItem("type", typeId); 
        const typeJaWidth = typeData.view?.[view]?.ja?.width; 
        const typeEnWidth = typeData.view?.[view]?.en?.width; 
        if (typeJaWidth === getItem("type", "null_type").view?.[view]?.ja?.width) {
            data = type.view?.[view]?.ja; 
            if (!data) { 
                return; 
            } 
            drawImage(data, carNumberWidth, 0, matrix); 
        } 
        if (typeEnWidth === getItem("type", "null_type").view?.[view]?.ja?.width) {
            data = type.view?.[view]?.en; 
            if (!data) { 
                return; 
            } 
            const yOffset = getItem("type", typeId).view?.[view]?.ja?.height; 
            drawImage(data, carNumberWidth, yOffset, matrix); 
        } 
        if (typeJaWidth === getItem("type", "null_type").view?.[view]?.ja?.width && typeEnWidth === getItem("type", "null_type").view?.[view]?.ja?.width) {
            typeScroll = false;
        }
    } 
}

function drawTypeSmall(type, matrix) {

    let usedNormal = true;
    let carNumberWidth;
    let typeLang = lang;
    if (typeMode === "information") {
        typeLang = "information";
    }

    const view = isTypeFullScreen(type)
        ? "full"
        : "normal";

    let data =
        type.view?.[view]?.[lang]
        ?? type.view?.[view]?.ja;
        if (view === "normal") {
            usedNormal = true;
        }

    if (!data) {
        data =
            type.view?.normal?.[lang]
            ?? type.view?.normal?.ja;
        usedNormal = true;
    }

    if (!data) return;

    const carNumber = getItem("carNumber", carNumberId)
    if (usedNormal) {
        carNumberWidth = getCarNumberWidth(carNumber, usedNormal);
    } else {
        carNumberWidth = 0;
    }

    drawImage(data, carNumberWidth, 0, matrix);
}

function drawDestination(dest, matrix) {

    let usedNormal = false;
    let typewidth;

    const view = isDestinationFullScreen(dest)
        ? "full"
        : "normal";

    let data =
        dest.view?.[view]?.[lang]
        ?? dest.view?.[view]?.ja;
        if (view === "normal") {
            usedNormal = true;
        }

    if (!data) {
        data =
            dest.view?.normal?.[lang]
            ?? dest.view?.normal?.ja;
        usedNormal = true;
    }

    if (!data) return;

    const type = getItem("type", typeId);
    const nullType = getItem("type", "null_type");
    const carNumber = getItem("carNumber", carNumberId);
    let yOffset;
    
    if (usedNormal) {
        if (config.destinationPosition === "normal") {
            if (!typeScroll) {
                typewidth = getTypeWidth(type, usedNormal);
            } else {
                typeScrollId = typeId;
                typewidth = getTypeWidth(nullType, usedNormal);
            }
        }
        if (config.destinationPosition === "next") {
            typewidth = getCarNumberWidth(carNumber, usedNormal);
        }
    } else {
        typewidth = 0;
    }
    if (config.destinationPosition === "next") {
        yOffset = config.nextPosition;
    } else {
        yOffset = 0;
    }

    if (!config.hasDestinationScroll) { 
        drawImage(data, typewidth, yOffset, matrix); 
    } else { 
        const destinationData = getItem("destination", destinationId); 
        const destinationJaWidth = destinationData.view?.normal?.ja?.width; 
        const destinationEnWidth = destinationData.view?.normal?.en?.width; 
        if (destinationJaWidth === getItem("destination", "null_destination").view.normal.ja.width) {
            data = dest.view?.[view]?.ja; 
            if (!data) { 
                return; 
            } 
            drawImage(data, typewidth, yOffset, matrix); 
        } 
        if (destinationEnWidth === getItem("destination", "null_destination").view.normal.ja.width) {
            data = dest.view?.[view]?.en; 
            if (!data) { 
                return; 
            } 
            yOffset = getItem("destination", destinationId).view?.normal?.ja?.height; 
            drawImage(data, typewidth, yOffset, matrix); 
        } 
    } 
}

function drawDestinationSmall(dest, matrix) {

    let usedSmall = false;
    let typewidth;

    const view = isDestinationFullScreen(dest)
        ? "full_small"
        : "small";

    let data =
        dest.view?.[view]?.[lang]
        ?? dest.view?.[view]?.ja;
        if (view === "small") {
            usedSmall = true;
        }

    if (!data) {
        data =
            dest.view?.small?.[lang]
            ?? dest.view?.small?.ja;
        usedSmall = true;
    }

    if (!data) return;

    const type = getItem("type", typeId)
    if (usedSmall) {
        typewidth = getTypeWidth(type, usedSmall);
    } else {
        typewidth = 0;
    }

    drawImage(data, typewidth, 0, matrix);
}

function drawInformation(info, matrix) {

    let usedNormal = false;
    let typewidth;

    let view = isInformationFullScreen(info)
        ? "full"
        : "normal";
    const dest = getItem("destination", destinationId);
    if (isDestinationFullScreen(dest)) {
        view = "full";
    }

    let data =
        info.view?.[view]?.[lang]
        ?? info.view?.[view]?.ja;
        if (view === "normal") {
            usedNormal = true;
        }

    if (!data) {
        data =
            info.view?.normal?.[lang]
            ?? info.view?.normal?.ja;
        usedNormal = true;
    }

    if (!data) return;

    const type = getItem("type", typeId)
    if (usedNormal) {
        typewidth = getTypeWidth(type, usedNormal);
    } else {
        typewidth = 0;
    }
    let yOffset;
    const nextPosition = config.nextPosition;
    if (config.informationPosition === "next") {
        const info = getItem("information", informationId);
        if (!isInformationFullScreen(info)) {
            yOffset = nextPosition;
        } else {
            yOffset = 0;
        }
    } else {
        yOffset = 0;
    }

    drawImage(data, typewidth, yOffset, matrix);
}

function drawInformation2(info2, matrix) {

    let usedNormal = false;
    let typewidth;

    let view = isInformation2FullScreen(info2)
        ? "full"
        : "normal";
    const dest = getItem("destination", destinationId);
    if (isDestinationFullScreen(dest)) {
        view = "full";
    }

    let data =
        info2.view?.[view]?.[lang]
        ?? info2.view?.[view]?.ja;
        if (view === "normal") {
            usedNormal = true;
        }

    if (!data) {
        data =
            info2.view?.normal?.[lang]
            ?? info2.view?.normal?.ja;
        usedNormal = true;
    }

    if (!data) return;

    const type = getItem("type", typeId)
    if (usedNormal) {
        typewidth = getTypeWidth(type, usedNormal);
    } else {
        typewidth = 0;
    }
    let yOffset;
    const nextPosition = config.nextPosition;
    if (config.information2Position === "next") {
        const info = getItem("information2", information2Id);
        if (!isInformation2FullScreen(info)) {
            yOffset = nextPosition;
        } else {
            yOffset = 0;
        }
    } else {
        yOffset = 0;
    }

    drawImage(data, typewidth, yOffset, matrix);
}

function drawLine(info, matrix) {

    let usedNormal = false;
    let typewidth;

    const view = isLineFullScreen(info)
        ? "full"
        : "normal";

    let data =
        info.view?.[view]?.[lang]
        ?? info.view?.[view]?.ja;
        if (view === "normal") {
            usedNormal = true;
        }

    if (!data) {
        data =
            info.view?.normal?.[lang]
            ?? info.view?.normal?.ja;
        usedNormal = true;
    }

    if (!data) return;

    const type = getItem("type", typeId)
    if (usedNormal) {
        typewidth = getTypeWidth(type, usedNormal);
    } else {
        typewidth = 0;
    }

    drawImage(data, typewidth, 0, matrix);
}

function drawInformationSmall(info, matrix) {

    let usedSmall = false;
    let typewidth;

    let view = isInformationFullScreen(info)
        ? "full_small"
        : "small";
    if (informationMode === "information_small1") {
        view = isInformationFullScreen(info)
            ? "full_small1"
            : "small1";
    }
    if (informationMode === "information_small2") {
        view = isInformationFullScreen(info)
            ? "full_small2"
            : "small2";
    }

    let data =
        info.view?.[view]?.[lang]
        ?? info.view?.[view]?.ja;
        if (view === "small" || view === "small1" || view === "small2") {
            usedSmall = true;
        }

    if (!data) {
        data =
            info.view?.small?.[lang]
            ?? info.view?.small?.ja;
        usedSmall = true;
    }

    if (!data) return;
    const type = getItem("type", typeId)
    if (usedSmall) {
        typewidth = getTypeWidth(type, usedSmall);
    } else {
        typewidth = 0;
    }
    drawImage(data, typewidth, 0, matrix);
}

function drawInformation2Small(info2, matrix) {

    let usedSmall = false;
    let typewidth;

    let view = isInformationFullScreen(info2)
        ? "full_small"
        : "small";
    if (informationMode === "information2_small1") {
        view = isInformationFullScreen(info2)
            ? "full_small1"
            : "small1";
    }
    if (informationMode === "information2_small2") {
        view = isInformationFullScreen(info2)
            ? "full_small2"
            : "small2";
    }

    let data =
        info2.view?.[view]?.[lang]
        ?? info2.view?.[view]?.ja;
        if (view === "small" || view === "small1" || view === "small2") {
            usedSmall = true;
        }

    if (!data) {
        data =
            info2.view?.small?.[lang]
            ?? info2.view?.small?.ja;
        usedSmall = true;
    }

    if (!data) return;
    const type = getItem("type", typeId)
    if (usedSmall) {
        typewidth = getTypeWidth(type, usedSmall);
    } else {
        typewidth = 0;
    }
    let yOffset;
    const nextPosition = config.nextPosition;
    if (informationMode === "information_information2") {
        yOffset = nextPosition;
    } else {
        yOffset = 0;
    }
    drawImage(data, typewidth, yOffset, matrix);
}

function drawNext(next, matrix) {

    let usedNormal = false;
    let typewidth;

    let view = isNextFullScreen(next)
        ? "full"
        : "normal"
    if (config.hasNextFullScreen) {
        view = "full"
    }

    let data =
        next?.view?.[view]?.[lang]
        ?? next?.view?.[view]?.ja;
        if (view === "normal") {
            usedNormal = true;
        }

    if (!data) {
        data =
            next?.view?.normal?.[lang]
            ?? next?.view?.normal?.ja;
        usedNormal = true;
    }

    if (!data) return;
    const type = getItem("type", typeId)
    if (usedNormal) {
        typewidth = getTypeWidth(type, usedNormal);
    } else {
        typewidth = 0;
    }
    const nextPosition = config.nextPosition

    drawImage(data, typewidth, nextPosition, matrix);
}

function getTypeWidth(type, used) {

    if(!type) {
        if (config.hasType) {
            if(used) {
                if (config.hasCarNumber) {
                    let data = getItem("type", "null_type").view.normal.ja.width
                    const carNumber = getItem("carNumber", carNumberId)
                    return (
                        data + getCarNumberWidth(carNumber, true)
                    )

                } else {
                    return (
                        getItem("type", "null_type").view.normal.ja.width
                    );
                }
            } else {
                return 0;
            }
        } else {
            return 0;
        }
    }

    const view = isTypeFullScreen(type)
        ? "full"
        : "normal";

    const lang = getLangForPart();

    if (config.hasCarNumber) {
        let data =
            type.view?.[view]?.[lang]?.width
            ?? type.view?.[view]?.ja?.width
            ?? 0
        const carNumber = getItem("carNumber", carNumberId)
        return (
            data + getCarNumberWidth(carNumber, true)
        )

    } else {

        return (
            type.view?.[view]?.[lang]?.width
            ?? type.view?.[view]?.ja?.width
            ?? 0
        );
    }
}

function getDestinationWidth(type, dest, used) {
    let typeData;
    let destData;

    if(!type) {
        if (config.hasType) {
            if(used) {
                typeData =
                    getItem("type", "null_type").view.normal.ja.width;
            } else {
                typeData = 0
            }
        } else {
            typeData = 0
        }
    }

    const typeView = isTypeFullScreen(type)
        ? "full"
        : "normal";

    const typeLang = getLangForPart();

    let data;

    if (config.hasCarNumber) {
        if (config.carNumber === "left") {
            if(type != null) {
                data =
                    type.view?.[typeView]?.[typeLang]?.width
                    ?? type.view?.[typeView]?.ja?.width
                    ?? 0
            } else {
                data = typeData
            }
            const carNumber = getItem("carNumber", carNumberId)
            typeData =
                data + getCarNumberWidth(carNumber, true);
        } else {
            if(type != null) {
                typeData =
                    type.view?.[typeView]?.[typeLang]?.width
                    ?? type.view?.[typeView]?.ja?.width
                    ?? 0
            }
        }

    } else {

        if(type != null) {
            typeData =
                type.view?.[typeView]?.[typeLang]?.width
                ?? type.view?.[typeView]?.ja?.width
                ?? 0
        }
    }
    if(!dest) {
        if(used) {
            destData =
                getItem("destination", "null_destination").view.normal.ja.width;
        } else {
            destData = 0
        }
    }
    const destView = isDestinationFullScreen(dest)
        ? "full"
        : "normal";

    const destLang = getLangForPart();

    if (dest != null) {
        destData =
            dest.view?.[destView]?.[destLang]?.width
            ?? dest.view?.[destView]?.ja?.width
            ?? 0
    }
    if (typeView === "full") {
        destData = 0
    }

    return (
        typeData + destData
    )
}

function getCarNumberWidth(carNumber, used) {

    if(!carNumber) {
        if(used) {
            if (config.carNumber === "left") {
                return (
                    getItem("carNumber", "null_carNumber").view.normal.ja.width
                )
            } else {
                return 0;
            }
        } else {
            return 0;
        }
    }

    const view = isCarNumberFullScreen(carNumber)
        ? "full"
        : "normal";

    const lang = getLangForPart();

    if (config.carNumber === "left") {
        return (
            carNumber.view?.[view]?.[lang]?.width
            ?? carNumber.view?.[view]?.ja?.width
            ?? 0
        );
    } else {
        return 0;
    }
}

function isTypeFullScreen(type) {

    if(!type) return false;

    let hasNormal;
    let hasFull;
    if (typeScrollId === null) {
        hasNormal = !!type.view.normal;
        hasFull = !!type.view.full;
    } else {
        const typeScroll = getItem("type", typeScrollId);
        hasNormal = !!typeScroll.view.normal;
        hasFull = !!typeScroll.view.full;
    }

    if(hasFull && !hasNormal){
        return true;
    }

    if(destinationId===null && nextId===null){
        if (hasFull) {
            return true;
        }
    }

    return false;
}

function isCarNumberFullScreen(carNumber) {

    if(!carNumber) return false;

    const hasNormal = !!carNumber.view.normal;
    const hasFull = !!carNumber.view.full;

    if(hasFull && !hasNormal){
        return true;
    }

    if(config.carNumberFull){
        return true;
    }

    return false;
}

function isDestinationFullScreen(dest) {

    if(!dest) return false;

    let hasNormal;
    let hasFull;
    if (destinationScrollId === null) {
        hasNormal = !!dest.view.normal;
        hasFull = !!dest.view.full;
    } else {
        const destinationScroll = getItem("destination", destinationScrollId);
        hasNormal = !!destinationScroll.view.normal;
        hasFull = !!destinationScroll.view.full;
    }

    if(hasFull && !hasNormal){
        return true;
    }

    if(typeId===null){
        if(hasFull) {
            return true;
        }
    }

    return false;
}

function isInformationFullScreen(info) {

    if(!info) return false;

    const hasNormal = !!info.view.normal;
    const hasFull = !!info.view.full || !!info.view.full_small || !!info.view.full_small1 || !!info.view.full_small2;

    if(hasFull && !hasNormal){
        return true;
    }

    if(typeId===null){
        if(hasFull) {
            return true;
        }
    }

    return false;
}

function isInformation2FullScreen(info2) {

    if(!info2) return false;

    const hasNormal = !!info2.view.normal;
    const hasFull = !!info2.view.full;

    if(hasFull && !hasNormal){
        return true;
    }

    if(typeId===null){
        if(hasFull) {
            return true;
        }
    }

    return false;
}

function isLineFullScreen(info) {

    if(!info) return false;

    const hasNormal = !!info.view.normal;
    const hasFull = !!info.view.full;

    if(hasFull && !hasNormal){
        return true;
    }

    if(typeId===null){
        return true;
    }

    return false;
}

function isNextFullScreen(next) {

    if(!next) return false;

    const hasNormal = !!next.view.normal;
    const hasFull = !!next.view.full;

    if(hasFull && !hasNormal){
        return true;
    }

    if(typeId===null){
        return true;
    }

    return false;
}

function getLangForPart() {
    return lang;
}

function hasEnglishType() {
    const type = getItem("type", typeId);
    if (!type) return;
    return !!type.view?.normal?.en
        || !!type.view?.full?.en;
}

function hasEnglishDestination() {
    const dest = getItem("destination", destinationId);
    if (!dest) return;
    return !!dest.view?.normal?.en
        || !!dest.view?.full?.en
        || !!dest.view?.small?.en
        || !!dest.view?.full_small?.en;
}

function hasEnglishInformation() {
    const info = getItem("information", informationId);
    if (!info) return;
    return !!info.view?.normal?.en
        || !!info.view?.full?.en
        || !!info.view?.small?.en;
}

function hasInformationDestination() {
    const dest = getItem("destination", destinationId);
    if(!dest) return;
    return !!dest.view?.normal?.info
        || !!dest.view?.full?.info
        || !!dest.view?.small?.info
        || !!dest.view?.full_small?.info;
}

function hasEnglishCarNumber() {
    const carNumber = getItem("carNumber", carNumberId);
    if (!carNumber) return;
    return !!carNumber.view?.normal?.en
        || !!carNumber.view?.full?.en;
}

function hasTypeInformation() {
    const type = getItem("type", typeId);
    if (!type) return;
    return !!type.view?.normal?.information
        || !!type.view?.full?.information;
}
 
// ===== 種別・行先スクロール用 =====
function createScrollState() {
    return {
        canvas: document.createElement("canvas"),
        ctx: null,
        width: 0,
        height: 0,
        x: 0,
        areaLeft: 0,
        areaTop: 0,
        areaRight: 0,
        areaBottom: 0,
        active: false,
        waiting: false,
        waitingUntil: 0,
        lastTime: null,
        signature: null
    };
}

const typeJaScrollState = createScrollState();
typeJaScrollState.ctx = typeJaScrollState.canvas.getContext("2d");

const typeEnScrollState = createScrollState();
typeEnScrollState.ctx = typeEnScrollState.canvas.getContext("2d");

const destinationJaScrollState = createScrollState();
destinationJaScrollState.ctx = destinationJaScrollState.canvas.getContext("2d");

const destinationEnScrollState = createScrollState();
destinationEnScrollState.ctx = destinationEnScrollState.canvas.getContext("2d");

const allScrollStates = [
    typeJaScrollState,
    typeEnScrollState,
    destinationJaScrollState,
    destinationEnScrollState
];

let typeDestinationScrollAnimationId = null;

function updateScrollId() {
    typeDestinationScrollId = allScrollStates.some(state => state.active) ? true : null;
}

function createTypeScrollData(lang) {
    const state = lang === "ja"
        ? typeJaScrollState
        : typeEnScrollState;

    const typeData = getItem("type", typeId);
    const view = typeData.view?.normal?.[lang];
    const data = view?.data;

    if (!data) {
        state.active = false;
        updateScrollId();
        return false;
    }

    state.width = view.width;
    state.height = view.height;
    state.canvas.width = state.width * pitch;
    state.canvas.height = state.height * pitch;

    state.ctx.clearRect(
        0,
        0,
        state.canvas.width,
        state.canvas.height
    );

    let index = 0;

    for (let y = 0; y < state.height; y++) {
        for (let x = 0; x < state.width; x++) {
            drawLEDCircle(state.ctx, x, y, {
                r: data[index],
                g: data[index + 1],
                b: data[index + 2]
            });

            index += 3;
        }
    }

    return true;
}

function createDestinationScrollData(lang) {
    const state = lang === "ja"
        ? destinationJaScrollState
        : destinationEnScrollState;

    const destData = getItem("destination", destinationId);
    const view = destData.view?.normal?.[lang];
    const data = view?.data;

    if (!data) {
        state.active = false;
        updateScrollId();
        return false;
    }

    state.width = view.width;
    state.height = view.height;
    state.canvas.width = state.width * pitch;
    state.canvas.height = state.height * pitch;

    state.ctx.clearRect(
        0,
        0,
        state.canvas.width,
        state.canvas.height
    );

    let index = 0;

    for (let y = 0; y < state.height; y++) {
        for (let x = 0; x < state.width; x++) {
            drawLEDCircle(state.ctx, x, y, {
                r: data[index],
                g: data[index + 1],
                b: data[index + 2]
            });

            index += 3;
        }
    }

    return true;
}

function drawTypeDestinationScroll(state) {
    const areaPixelLeft = state.areaLeft * pitch;
    const areaPixelTop = state.areaTop * pitch;
    const areaPixelWidth =
        (state.areaRight - state.areaLeft) * pitch;
    const areaPixelHeight =
        (state.areaBottom - state.areaTop) * pitch;

    ctx.save();

    ctx.beginPath();
    ctx.rect(
        areaPixelLeft,
        areaPixelTop,
        areaPixelWidth,
        areaPixelHeight
    );

    ctx.clip();

    ctx.drawImage(
        state.canvas,
        state.x,
        areaPixelTop
    );

    ctx.restore();
}

let typeScrollId = null;

function startTypeScroll(lang) {
    const state = lang === "ja"
        ? typeJaScrollState
        : typeEnScrollState;

    if (!typeScroll) {
        state.active = false;
        updateScrollId();
        return;
    }

    if (config.hasCarNumberSmall && config.carNumber === "left") {
        const carNumber = getItem("carNumber", carNumberId);
        state.areaLeft = getCarNumberWidth(carNumber, true);
    } else {
        state.areaLeft = 0;
    }

    typeScrollId = typeId;
    const nullType = getItem("type", "null_type");

    state.areaRight = getTypeWidth(nullType, true);

    const typeData = getItem("type", typeId);
    const jaHeight =
        typeData.view?.normal?.ja?.height ?? 0;

    if (lang === "ja") {
        state.areaTop = 0;
        state.areaBottom = jaHeight;
    } else {
        state.areaTop = jaHeight;
        state.areaBottom =
            jaHeight +
            (typeData.view?.normal?.en?.height ?? 0);
    }

    const signature =
        `${typeId}_${lang}_${state.areaLeft}_${state.areaRight}_${state.areaTop}_${state.areaBottom}`;

    if (state.signature !== signature || !state.active) {
        if (!createTypeScrollData(lang)) {
            return;
        }

        state.signature = signature;
        state.x = state.areaRight * pitch;
        state.lastTime = null;
        state.waiting = false;
        state.waitingUntil = 0;
        state.active = true;
    }
    typeScrollId = null;

    updateScrollId();
    drawTypeDestinationScroll(state);
    startTypeDestinationScrollAnimation();
}

let typeDestinationId = null;

function startDestinationScroll(lang) {
    const state = lang === "ja"
        ? destinationJaScrollState
        : destinationEnScrollState;

    if (!destinationScroll) {
        state.active = false;
        updateScrollId();
        return;
    }

    const type = getItem("type", typeId);

    // 行先ボタンを押した時点の種別幅を保存
    destinationScrollId = destinationId;
    const nullType = getItem("type", "null_type");
    if (typeScroll === true) {
        typeScrollId = typeId;
        state.areaLeft = getTypeWidth(nullType, true);
    } else {
        state.areaLeft = getTypeWidth(type, true);
    }

    // 行先の右端
    
    const nullDestination = getItem("destination", "null_destination");

    state.areaRight = getDestinationWidth(nullType, nullDestination, true);

    const destData = getItem("destination", destinationId);
    const jaHeight =
        destData.view?.normal?.ja?.height ?? 0;

    if (lang === "ja") {
        state.areaTop = 0;
        state.areaBottom = jaHeight;
    } else {
        state.areaTop = jaHeight;
        state.areaBottom =
            jaHeight +
            (destData.view?.normal?.en?.height ?? 0);
    }

    // 種別IDは入れない
    // 行先ボタンを押した時の領域を維持する
    const signature =
        `${destinationId}_${lang}_${state.areaLeft}_${state.areaRight}_${state.areaTop}_${state.areaBottom}`;

    if (state.signature !== signature || !state.active) {
        if (!createDestinationScrollData(lang)) {
            return;
        }

        state.signature = signature;
        state.x = state.areaRight * pitch;
        state.lastTime = null;
        state.waiting = false;
        state.waitingUntil = 0;
        state.active = true;
    }

    updateScrollId();
    drawTypeDestinationScroll(state);
    startTypeDestinationScrollAnimation();
}

function startTypeDestinationScrollAnimation() {
    if (typeDestinationScrollAnimationId !== null) {
        return;
    }

    typeDestinationScrollAnimationId =
        requestAnimationFrame(animateTypeDestinationScroll);
}

function animateTypeDestinationScroll(now) {
    typeDestinationScrollAnimationId = null;

    let active = false;

    ctx.drawImage(
        cacheCanvas,
        0,
        0,
        cacheCanvas.width,
        cacheCanvas.height,
        0,
        0,
        cacheCanvas.width,
        cacheCanvas.height
    );

    for (const state of allScrollStates) {
        if (!state.active) {
            continue;
        }

        if (
            (state === typeJaScrollState || state === typeEnScrollState) &&
            !typeScroll
        ) {
            state.active = false;
            state.waiting = false;
            state.lastTime = null;
            continue;
        }

        if (
            (state === destinationJaScrollState || state === destinationEnScrollState) &&
            !destinationScroll
        ) {
            state.active = false;
            state.waiting = false;
            state.lastTime = null;
            continue;
        }

        active = true;

        if (state.waiting) {
            continue;
        }

        if (state.lastTime === null) {
            state.lastTime = now;
        }

        const deltaTime = now - state.lastTime;
        state.lastTime = now;

        state.x -= scrollSpeed * deltaTime / 1000;

        if (
            state.x + state.width * pitch <
            state.areaLeft * pitch
        ) {
            state.waiting = true;

            // 完全に消えてから500ms待つ
            state.waitingUntil = now;

            continue;
        }

        drawTypeDestinationScroll(state);
    }

    for (const state of allScrollStates) {
        if (!state.active || !state.waiting) {
            continue;
        }

        if (now >= state.waitingUntil) {
            state.x = state.areaRight * pitch;
            state.lastTime = null;
            state.waiting = false;
            state.waitingUntil = 0;

            drawTypeDestinationScroll(state);
        }
    }

    if (!active) {
        updateScrollId();
        return;
    }

    typeDestinationScrollAnimationId =
        requestAnimationFrame(animateTypeDestinationScroll);
}

function stopTypeScroll(lang) {
    const state = lang === "ja"
        ? typeJaScrollState
        : typeEnScrollState;

    state.active = false;
    state.waiting = false;
    state.waitingUntil = 0;
    state.lastTime = null;
    state.signature = null;

    updateScrollId();
}

function stopDestinationScroll(lang) {
    const state = lang === "ja"
        ? destinationJaScrollState
        : destinationEnScrollState;

    state.active = false;
    state.waiting = false;
    state.waitingUntil = 0;
    state.lastTime = null;
    state.signature = null;

    updateScrollId();
}

function textToMatrix16(char) {
    const data = fontData[char];

    // 登録されていない文字 → 16×16の全消灯
    if (!data) {
        return Array.from({ length: 16 }, () =>
            Array(16).fill(false)
        );
    }

    const matrix = [];

    for (let y = 0; y < 16; y++) {
        matrix.push(
            data
                .slice(y * 16, y * 16 + 16)
                .map(value => value === 1)
        );
    }

    return matrix;
}

let previousScrollDots = [];

let scrollPixelX = 0;
let scrollAnimationId = null;
let lastScrollTime = null;
let scrollSpeed = 450;

function createScrollMatrix() {
    scrollTextMatrix = [];
    previousScrollDots = [];

    const text = scrollText.value;

    // 各文字を16×16に変換
    for (const char of text) {
        scrollTextMatrix.push(textToMatrix16(char));
    }

    // 文字全体の幅
    scrollTextWidth = scrollTextMatrix.length * 16;

    /*
     * スクロール文字専用Canvas
     *
     * 横幅 = 文字全体
     * 縦幅 = 16行分
     */
    scrollTextCanvas.width = scrollTextWidth * pitch;
    scrollTextCanvas.height = 16 * pitch;

    // 一旦透明にする
    scrollTextCtx.clearRect(
        0,
        0,
        scrollTextCanvas.width,
        scrollTextCanvas.height
    );

    /*
     * 文字をCanvasへ一度だけ描画
     */
    for (let charIndex = 0; charIndex < scrollTextMatrix.length; charIndex++) {
        const charMatrix = scrollTextMatrix[charIndex];

        const charX = charIndex * 16;

        for (let py = 0; py < 16; py++) {
            for (let px = 0; px < 16; px++) {

                if (!charMatrix[py][px]) {
                    continue;
                }

                const x = charX + px;
                const y = py;

                drawLEDCircle(scrollTextCtx, x, y, {
                    r: 255,
                    g: 242,
                    b: 0
                }, false);
            }
        }
    }
}
 

function drawScroll() {
    if (!typeId && !destinationId) {
        stopScroll();
        return;
    }

    let type;
    let isTypeFull;
    areaLeft = 48;

    if (typeId != null) {
        type = getItem("type", typeId);
        isTypeFull = isTypeFullScreen(type);
    } else {
        isTypeFull = false;
        areaLeft = config.hasScrollFullScreen ? -1 : 48;
    }

    if (config.hasNextFullScreen && !destinationCycleActive) {
        areaLeft = -1;
    }

    if (
        !scrollCheck.checked ||
        clickStartScrollBtn === false ||
        scrollId === null ||
        isTypeFull === true
    ) {
        stopScroll();
        return;
    }

    const areaPixelLeft = areaLeft * pitch;
    const areaPixelTop = areaTop * pitch;
    const areaPixelWidth = (areaRight - areaLeft) * pitch;
    const areaPixelHeight = (areaBottom - areaTop) * pitch;

    // スクロール領域を通常表示に戻す
    ctx.drawImage(
        cacheCanvas,
        areaPixelLeft,
        areaPixelTop,
        areaPixelWidth,
        areaPixelHeight,
        areaPixelLeft,
        areaPixelTop,
        areaPixelWidth,
        areaPixelHeight
    );

    // スクロール領域からはみ出さないようにする
    ctx.save();
    ctx.beginPath();
    ctx.rect(
        areaPixelLeft,
        areaPixelTop,
        areaPixelWidth,
        areaPixelHeight
    );
    ctx.clip();

    // スクロール文字を描画
    const baseColor = {
        r: 255,
        g: 242,
        b: 0
    };

    for (let charIndex = 0; charIndex < scrollTextMatrix.length; charIndex++) {
        const charMatrix = scrollTextMatrix[charIndex];

        for (let py = 0; py < 16; py++) {
            for (let px = 0; px < 16; px++) {
                if (!charMatrix[py][px]) continue;

                // LEDのドット位置をピクセル単位で計算
                const centerX =
                    scrollPixelX + (charIndex * 16 + px) * pitch + radius;
                const centerY =
                    areaPixelTop + py * pitch + radius;

                // 実際に表示されるLEDの座標で劣化を取得
                const ledX = Math.floor(centerX / pitch);
                const ledY = Math.floor(centerY / pitch);

                const color = isLedAging === true
                    ? applyLEDAging(ledX, ledY, baseColor)
                    : baseColor;

                ctx.fillStyle =
                    `rgb(${color.r},${color.g},${color.b})`;

                ctx.beginPath();
                ctx.arc(
                    centerX,
                    centerY,
                    radius,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        }
    }

    ctx.restore();
}

 
function startScroll() {
    const scrollCheck = document.getElementById("scrollCheck");
    if (config.scroll_normal) {
        if (destinationScrollTimer !== null) {
            clearTimeout(destinationScrollTimer);
            destinationScrollTimer = null;
        }
    }

    if (!scrollCheck.checked || clickStartScrollBtn === false) {
        stopScroll();
        return;
    }

    if (!typeId && !destinationId) {
        return;
    }

    let type;
    let isTypeFull;
    areaLeft = 48;
    areaRight = config.ledWidth;
    if (typeId != null) {
        type = getItem("type", typeId);
        isTypeFull = isTypeFullScreen(type);
    } else {
        isTypeFull = false;
        if (config.hasScrollFullScreen) {
            areaLeft = -1;
        } else {
            areaLeft =  48;
        }
    }

    if (destinationCycleActive) {
        areaLeft = 48;
    } else if (config.hasNextFullScreen) {
        areaLeft = -1;
    }

    if (isTypeFull === true) {
        return;
    }

    // 古いスクロールを無効化
    scrollGeneration++;

    const generation = scrollGeneration;

    // 古いアニメーションを停止
    if (scrollAnimationId !== null) {
        cancelAnimationFrame(scrollAnimationId);
        scrollAnimationId = null;
    }

    // スクロール用文字画像を作成
    createScrollMatrix();

    // 右端から開始
    scrollPixelX = areaRight * pitch;

    // 時間計測をリセット
    lastScrollTime = null;

    // スクロール中
    scrollId = true;
    if (destinationCycleActive && destinationCyclePhase === "scroll") {
        startDestinationCycleSmallSwitch();
        informationMode = "destination";
    }

    // スクロール表示をすぐ反映
    render();

    function animateScroll(now) {

    // 古い世代なら終了
    if (generation !== scrollGeneration) {
        return;
    }

    // 停止条件
    if (
        !scrollCheck.checked ||
        clickStartScrollBtn === false ||
        scrollId === null
    ) {
        if (destinationCycleSmallTimer !== null) {
            clearInterval(destinationCycleSmallTimer);
            destinationCycleSmallTimer = null;
        }
        stopScroll();
        return;
    }

    // 初回
    if (lastScrollTime === null) {
        lastScrollTime = now;
    }

    // 経過時間
    const deltaTime = now - lastScrollTime;
    lastScrollTime = now;

    // 左へ移動
    scrollPixelX -= scrollSpeed * deltaTime / 1000;

    // 文字が全部左へ消えた
    if (scrollPixelX + scrollTextWidth * pitch < areaLeft * pitch) {
        if (destinationCycleActive && destinationCyclePhase === "scroll") {
            stopScroll();

            // スクロール終了後、0.5秒待つ
            renderTimer = setTimeout(() => {
                renderTimer = null;
                if (!destinationCycleActive) return;

                // 通常サイズの行先表示に戻す
                destinationCyclePhase = "normal";
                showDestinationCycleScene(destinationCycleNormalScene);

                // 通常表示を3秒間維持
                renderTimer = setTimeout(() => {
                    renderTimer = null;
                    if (!destinationCycleActive) return;

                    // 小さい行先表示に切り替える
                    destinationCyclePhase = "scroll";
                    destinationCycleSmallMode = "destination";
                    informationMode = "destination";
                    showNext = true;
                    render();

                    // 0.5秒後に次のスクロールを開始
                    renderTimer = setTimeout(() => {
                        renderTimer = null;
                        if (!destinationCycleActive) return;

                        clickStartScrollBtn = true;
                        startScroll();
                    }, 1500);
                }, 3000);
            }, 1500);
        }

        if (!scrollWaiting) {
            scrollWaiting = true;

            setTimeout(() => {
                if (
                    generation !== scrollGeneration ||
                    !scrollCheck.checked ||
                    clickStartScrollBtn === false ||
                    scrollId === null
                ) {
                    scrollWaiting = false;
                    return;
                }

                scrollPixelX = areaRight * pitch;
                lastScrollTime = null;
                scrollWaiting = false;
                scrollAnimationId = requestAnimationFrame(animateScroll);
            }, 500);
        }

        return;
    }

    // 描画
    drawScroll();

    // 次のフレーム
    scrollAnimationId =
        requestAnimationFrame(animateScroll);
}

    // アニメーション開始
    scrollAnimationId = requestAnimationFrame(animateScroll);
}

function stopScroll() {
    scrollGeneration++;

    if (scrollAnimationId !== null) {
        cancelAnimationFrame(scrollAnimationId);
        scrollAnimationId = null;
    }

    if (scrollTimer !== null) {
        clearInterval(scrollTimer);
        scrollTimer = null;
    }

    scrollId = null;
    clickStartScrollBtn = false;
    lastScrollTime = null;
}
