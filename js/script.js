async function startVehicle() {
    clearInterval(scrollTimer);
    scrollTimer = null;

    clickStartScrollBtn = false;
    scrollId = null;

    showLoading();

    try {
        await loadLed();

        ledsize = config.ledSize;
        ledgap = config.ledGap;
        pitch = ledsize + ledgap;
        pitchY = ledsize * 0.9 + ledgap;
        radius = ledsize / 2;
        sizeLed.width = config.ledWidth * pitch;

        if (config.ledShape === "circle") {
            sizeLed.height = config.ledHeight * pitch;
        }
        if (config.ledShape === "rectangle") {
            sizeLed.height = config.ledHeight * pitchY;
        }

        cacheCanvas.width = sizeLed.width;
        cacheCanvas.height = sizeLed.height;
        slideTransitionCanvas.width = sizeLed.width;
        slideTransitionCanvas.height = sizeLed.height;

        resizeLed();
        setupVehicleUI();
        startRenderLoop();
    } finally {
        hideLoading();
    }
}

function resizeLed() {
    if (!config) return;
    const main = document.querySelector("main");

    const maxWidth = main.clientWidth - 40;
    const canvasWidth = sizeLed.width;
    const scale = Math.min(1, maxWidth / canvasWidth);

    sizeLed.style.width = sizeLed.width * scale + "px";
    sizeLed.style.height = sizeLed.height * scale + "px";
}

async function loadConfig() {
    const response = await fetch(selectedVehicle.config);
    config = await response.json();
}

async function loadLed() {
    let response = await fetch(selectedVehicle.config);
    config = await response.json();

    response = await fetch(selectedVehicle.led);
    jsonData = await response.json();

    response = await fetch(selectedVehicle.site);
    siteData = await response.json();

    if (!jsonData?.categories) {
        console.error("JSONが壊れてる");
        return;
    }
}

async function loadFont() {
    const response = await fetch(selectedVehicle.font);
    fontData = await response.json();
}

function setupVehicleUI() {
    if (config.hasType) {
        document.getElementById("typeGroup").hidden = false;
        createTypeButtons();
    } else {
        document.getElementById("typeGroup").hidden = true;
    }
    if (config.hasDestination) {
        document.getElementById("destinationGroup").hidden = false;
        createDestinationButtons();
    } else {
        document.getElementById("destinationGroup").hidden = true;
    }
    if (config.hasInformation) {
        document.getElementById("informationGroup").hidden = false;
        createInformationButtons();
    } else {
        document.getElementById("informationGroup").hidden = true;
    }
    if (config.hasInformation2) {
        document.getElementById("information2Group").hidden = false;
        createInformation2Buttons();
    } else {
        document.getElementById("information2Group").hidden = true;
    }
    if (config.hasLine) {
        document.getElementById("lineGroup").hidden = false;
        createLineButtons();
    } else {
        document.getElementById("lineGroup").hidden = true;
    }
    if (config.hasNext) {
        document.getElementById("nextModeGroup").hidden = false;
        createNextModeButtons();
    } else {
        document.getElementById("nextModeGroup").hidden = true;
    }
    if (config.hasCarNumber) {
        document.getElementById("carNumberGroup").hidden = false;
        createCarNumberButtons();
    } else {
        document.getElementById("carNumberGroup").hidden = true;
    }
    if (config.hasScroll) {
        document.getElementById("scroll").hidden = false;
    } else {
        document.getElementById("scroll").hidden = true;
    }

    // ===== 縦スライド切り替えUI（チェックボックス）の動的表示制御 =====
    const sidebar = document.getElementById("sidebar");
    let verticalLabel = document.getElementById("verticalSlideLabel");

    // hasVerticalSlide: true かつ verticalSlide: true が指定されている車両のみ表示
    if (config.hasVerticalSlide === true && config.verticalSlide === true) {
        if (!verticalLabel) {
            verticalLabel = document.createElement("label");
            verticalLabel.id = "verticalSlideLabel";
            verticalLabel.style.cssText = "margin-top: 10px; margin-bottom: 8px; font-weight: 650; display: flex; align-items: center; gap: 8px; font-size: 14px;";
            verticalLabel.innerHTML = `<input type="checkbox" id="verticalSlideCheck" checked> 画面切替時に縦スライドする`;

            const buttonGroup = document.getElementById("buttonGroup");
            if (buttonGroup && buttonGroup.parentNode) {
                buttonGroup.parentNode.insertBefore(verticalLabel, buttonGroup.nextSibling);
            } else if (sidebar) {
                sidebar.appendChild(verticalLabel);
            }

            const vCheck = document.getElementById("verticalSlideCheck");
            vCheck.addEventListener("change", () => {
                if (typeof triggerAutoTransfer === "function") triggerAutoTransfer();
            });
        } else {
            verticalLabel.hidden = false;
            const vCheck = document.getElementById("verticalSlideCheck");
            if (vCheck) vCheck.checked = true;
        }
    } else {
        if (verticalLabel) {
            verticalLabel.hidden = true;
            const vCheck = document.getElementById("verticalSlideCheck");
            if (vCheck) vCheck.checked = false;
        }
    }

    const scrollText = document.getElementById("scrollText");
    scrollText.value = config.scrollLabel;

    setVehicleSelectButton();
    resizeButtonText();
}

let renderTimer = null;

function nextScene() {
    buildSceneList();
    buildTypeSceneList();

    const oldScene = scene;
    scene = frame % sceneList.length;
    typeScene = frame % typeSceneList.length;

    applyScene();
    applyTypeScene();

    // 縦スライド条件を満たしている場合のみスライド演出を実行
    if (typeof isVerticalSlideEnabled === "function" && isVerticalSlideEnabled() && sceneList.length > 1 && frame > 0 && oldScene !== scene) {
        slideTransitionCtx.clearRect(0, 0, slideTransitionCanvas.width, slideTransitionCanvas.height);
        slideTransitionCtx.drawImage(cacheCanvas, 0, 0);

        render();

        const fromCanvas = document.createElement("canvas");
        fromCanvas.width = slideTransitionCanvas.width;
        fromCanvas.height = slideTransitionCanvas.height;
        fromCanvas.getContext("2d").drawImage(slideTransitionCanvas, 0, 0);

        startVerticalSlideAnimation(fromCanvas, cacheCanvas);
    } else {
        render();
    }

    frame++;
    renderTimer = setTimeout(nextScene, getSceneInterval());
}

function getSceneInterval() {
    if (sceneList.length === 0) return 1000;
    let sceneInterval = config.sceneInterval;
    const jaTime = Number(document.querySelector("#jaTime input")?.value || 3);
    const enTime = Number(document.querySelector("#enTime input")?.value || 3);
    const infoTime = Number(document.querySelector("#infoTime input")?.value || 3);
    const carNumberTime = Number(document.querySelector("#carNumberTime input")?.value || 3);

    if (config.setSwitchingTime) {
        const currentScene = sceneList[scene];
        if (currentScene.information === "carNumber" || currentScene.information === "carNumber_destination") {
            sceneInterval = carNumberTime * 1000;
        }
        if (currentScene.information === "information") {
            sceneInterval = infoTime * 1000;
        }
        if (currentScene.information === "destination") {
            if (currentScene.lang === "ja") sceneInterval = jaTime * 1000;
            if (currentScene.lang === "en") sceneInterval = enTime * 1000;
        }
    } else {
        sceneInterval = config.sceneInterval;
    }
    return sceneInterval;
}

function startRenderLoop() {
    if (renderTimer !== null) {
        clearTimeout(renderTimer);
    }

    if (typeof isVerticalSlideEnabled === "function" && isVerticalSlideEnabled() && cacheCanvas.width > 0) {
        const fromCanvas = document.createElement("canvas");
        fromCanvas.width = cacheCanvas.width;
        fromCanvas.height = cacheCanvas.height;
        fromCanvas.getContext("2d").drawImage(cacheCanvas, 0, 0);

        nextScene();

        startVerticalSlideAnimation(fromCanvas, cacheCanvas);
    } else {
        nextScene();
    }
}

function buildSceneList() {
    sceneList = [];
    const type = getItem("type", typeId);

    if (!config.type_destination_changed) {
        if (information2Id != null) {
            if (config.information2Position === "next" && config.information2Ahead) {
                sceneList.push({ lang: "ja", information: "information2_next", next: false });
            }
        }

        if (informationId != null) {
            if (config.informationPosition === "next" && config.informationAhead) {
                sceneList.push({ lang: "ja", information: "information_next", next: false });
            }
        }

        if (nextId != null) {
            sceneList.push({ lang: "ja", information: "destination", next: true });
        } else {
            if (!config.informationAhead) {
                if (destinationId != null) {
                    if (config.destinationPosition === "normal") {
                        sceneList.push({ lang: "ja", information: "destination", next: false });
                    }
                    if (config.destinationPosition === "next") {
                        sceneList.push({ lang: "ja", information: "destination_next", next: false });
                    }
                } else {
                    sceneList.push({ lang: "ja", information: "destination", next: false });
                }
            } else {
                if (informationId === null) {
                    sceneList.push({ lang: "ja", information: "destination", next: false });
                }
            }
        }

        if (informationId != null && config.informationAhead && hasEnglishInformation()) {
            sceneList.push({ lang: "en", information: "information_next", next: false });
        }

        if (config.languageSwitching) {
            if (hasEnglishType()) {
                if (nextId != null) {
                    sceneList.push({ lang: "en", information: "destination", next: true });
                } else {
                    if (!config.destinationLanguageSwitching) {
                        if (informationId === null) {
                            sceneList.push({ lang: "en", information: "destination", next: false });
                        } else {
                            sceneList.push({ lang: "en", information: "information", next: false });
                        }
                    } else {
                        sceneList.push({ lang: "en", information: "destination", next: false });
                    }
                }
            }
            if (typeId === null) {
                if (nextId != null) {
                    sceneList.push({ lang: "en", information: "destination", next: true });
                } else {
                    if (destinationId != null) {
                        if (config.destinationPosition === "normal") {
                            sceneList.push({ lang: "en", information: "destination", next: false });
                        }
                        if (config.destinationPosition === "next") {
                            sceneList.push({ lang: "en", information: "destination_next", next: false });
                        }
                    } else {
                        sceneList.push({ lang: "en", information: "destination", next: false });
                    }
                }
            } else {
                if (!hasEnglishType() && nextId != null) {
                    sceneList.push({ lang: "en", information: "destination", next: true });
                }
            }
        } else {
            if (nextId != null || scrollId != null) {
                sceneList.push({ lang: "en", information: "destination", next: true });
            }
        }

        if (config.destinationLanguageSwitching) {
            if (!config.languageSwitching) {
                if (hasEnglishDestination() && nextId === null) {
                    sceneList.push({ lang: "en", information: "destination", next: false });
                }
            } else {
                if (!hasEnglishType() && nextId === null) {
                    if (config.hasScroll) {
                        if (scrollId === null) {
                            sceneList.push({ lang: "en", information: "destination", next: false });
                        }
                    } else {
                        if (hasEnglishDestination()) {
                            sceneList.push({ lang: "en", information: "destination", next: false });
                        }
                    }
                }
            }
        }

        if (hasInformationDestination()) {
            sceneList.push({ lang: "info", information: "destination", next: nextId != null });
        }

        if (informationId != null) {
            if (config.informationPosition === "normal") {
                if (scrollId === null) {
                    if (nextId != null) {
                        if (!config.information_ja_en) {
                            sceneList.push({ lang: "ja", information: "information", next: !config.informationNormalOnNext });
                            if (config.informationLanguageSwitching) {
                                sceneList.push({ lang: "en", information: "information", next: !config.informationNormalOnNext });
                            }
                        } else {
                            sceneList.push({ lang: "ja_en", information: "information", next: config.informationNormalOnNext });
                        }
                    } else {
                        if (!config.information_ja_en) {
                            sceneList.push({ lang: "ja", information: "information", next: false });
                            if (config.informationLanguageSwitching && hasEnglishInformation()) {
                                sceneList.push({ lang: "en", information: "information", next: false });
                            }
                        } else {
                            sceneList.push({ lang: "ja_en", information: "information", next: false });
                        }
                    }
                } else {
                    const info = getItem("information", informationId);
                    const hasInformationSmall1 = !!info?.view?.small1 || !!info?.view?.full_small1;
                    if (!hasInformationSmall1) {
                        sceneList.push({ lang: "ja", information: "information", next: false });
                    } else {
                        sceneList.push({ lang: "ja", information: "information_small1", next: false });
                        sceneList.push({ lang: "ja", information: "information_small2", next: false });
                    }
                }
            }
            if (config.informationPosition === "next" && !config.informationAhead) {
                sceneList.push({ lang: "ja", information: "information_next", next: false });
                if (config.informationLanguageSwitching && hasEnglishInformation()) {
                    sceneList.push({ lang: "en", information: "information_next", next: false });
                }
            }
        }

        if (information2Id != null && !config.information2Ahead) {
            sceneList.push({ lang: "ja", information: "information2", next: nextId != null && !config.informationNormalOnNext });
        }

        if (lineId != null) {
            sceneList.push({ lang: "ja", information: "line", next: nextId != null });
        }

        if (carNumberId != null) {
            if (config.hasCarNumberFull) {
                sceneList.push({ lang: "ja", information: "carNumber", next: nextId != null });
                if (hasEnglishCarNumber()) {
                    sceneList.push({ lang: "en", information: "carNumber", next: nextId != null });
                }
            }
            if (!isTypeFullScreen(type) && config.hasCarNumberNormal) {
                sceneList.push({ lang: "ja", information: "carNumber_destination", next: nextId != null });
                if (hasEnglishCarNumber()) {
                    sceneList.push({ lang: "en", information: "carNumber_destination", next: nextId != null });
                }
            }
        }

        if (config.next_normal && nextId != null) {
            sceneList.push({ lang: "ja", information: "destination", next: false });
            sceneList.push({ lang: "en", information: "destination", next: false });
        }
    } else {
        if (typeId === null && destinationId === null) {
            sceneList.push({ lang: "ja", information: "type", next: false });
        }
        if (typeId != null) {
            sceneList.push({ lang: "ja", information: "type", next: false });
        }
        if (destinationId != null) {
            sceneList.push({ lang: "ja", information: "destination", next: false });
        }
    }
}

function applyScene() {
    lang = sceneList[scene].lang;
    informationMode = sceneList[scene].information;
    showNext = sceneList[scene].next;
}

let typeTimer = null;

function buildTypeSceneList() {
    typeSceneList = [];
    typeSceneList.push({ typeInfo: null });
    if (hasTypeInformation()) {
        typeSceneList.push({ typeInfo: "information" });
    }
}

function applyTypeScene() {
    typeMode = typeSceneList[typeScene].typeInfo;
}

function initSimulator() {
    if (renderTimer !== null) {
        clearInterval(renderTimer);
        renderTimer = null;
    }

    if (typeTimer !== null) {
        clearInterval(typeTimer);
        typeTimer = null;
    }

    if (config) {
        clearMatrix();
        drawMatrix(createEmptyMatrix());
    }

    if (transferController) {
        transferController.abort();
        transferController = null;
    }
    document.getElementById("transferStatus").textContent = "";
    document.getElementById("typeButtons").innerHTML = "";
    document.getElementById("destinationButtons").innerHTML = "";
    document.getElementById("informationButtons").innerHTML = "";
    document.getElementById("information2Buttons").innerHTML = "";
    document.getElementById("lineButtons").innerHTML = "";
    document.getElementById("nextModeButtons").innerHTML = "";
    document.getElementById("carNumberButtons").innerHTML = "";

    document.getElementById("type").textContent = "種別:なし";
    document.getElementById("destination").textContent = "行先:なし";
    document.getElementById("information").textContent = "案内:なし";
    document.getElementById("information2").textContent = "案内2:なし";
    document.getElementById("line").textContent = "路線名:なし";
    document.getElementById("nextMode").textContent = "次駅:なし";
    document.getElementById("carNumber").textContent = "号車:なし";

    typeId = null;
    destinationId = null;
    informationId = null;
    information2Id = null;
    lineId = null;
    carNumberId = null;
    nextId = null;
    sceneList = [];
    lang = "ja";
    scene = 0;
    selectedVehicle = null;
    displayMode = "normal";
    informationMode = "destination";
    langIndex = 0;
    languageSwitching = null;
}

window.addEventListener("resize", () => {
    requestResizeRender();
});

let resizeRequest = null;

function requestResizeRender() {
    if (resizeRequest) return;

    resizeRequest = requestAnimationFrame(() => {
        resizeLed();
        const now = performance.now();
        if (now - lastRender > 16) {
            ctx.clearRect(0, 0, sizeLed.width, sizeLed.height);
            ctx.drawImage(cacheCanvas, 0, 0);
            lastRender = now;
        }
        resizeRequest = null;
    });
}

const sidebar = document.getElementById("sidebar");
const resizer = document.getElementById("resizer");

let dragging = false;
let startX;
let startWidth;

resizer.addEventListener("mousedown", (e) => {
    dragging = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
});

let lastRender = 0;

document.addEventListener("mousemove", (e) => {
    if (!dragging) return;

    const dx = e.clientX - startX;
    let width = startWidth + dx;

    width = Math.max(260, Math.min(width, 1700));
    sidebar.style.width = width + "px";

    resizeLed();
    resizeButtonText();
    const now = performance.now();
    if (now - lastRender > 16) {
        ctx.clearRect(0, 0, sizeLed.width, sizeLed.height);
        ctx.drawImage(cacheCanvas, 0, 0);
        lastRender = now;
    }
});

document.addEventListener("mouseup", () => {
    dragging = false;
});

document.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("touchstart", () => {
        btn.classList.add("tap");
    });
    btn.addEventListener("touchend", () => {
        btn.classList.remove("tap");
    });
});

document.querySelectorAll(".numberInput").forEach((container) => {
    const input = container.querySelector("input");
    const minus = container.querySelector(".minus");
    const plus = container.querySelector(".plus");

    let startTimer = null;
    let repeatTimer = null;

    function startChanging(change) {
        change();
        startTimer = setTimeout(() => {
            repeatTimer = setInterval(() => {
                change();
            }, 60);
        }, 500);
    }

    function stopChanging() {
        clearTimeout(startTimer);
        clearInterval(repeatTimer);
        startTimer = null;
        repeatTimer = null;
    }

    plus.addEventListener("pointerdown", () => {
        startChanging(() => input.stepUp());
    });

    minus.addEventListener("pointerdown", () => {
        startChanging(() => input.stepDown());
    });

    document.addEventListener("pointerup", stopChanging);
    document.addEventListener("pointercancel", stopChanging);
});

const tittle = document.getElementById("tittle");
tittle.addEventListener("click", () => {
    document.body.classList.remove("simulatorMode");
    initSimulator();
    clearReferenceSite();
    clearExplanation();
    document.getElementById("scrollText").hidden = true;
    document.getElementById("startScrollBtn").hidden = true;
    document.getElementById("referenceSite").hidden = true;
    document.getElementById("explanation").hidden = true;
    document.getElementById("jaTime").hidden = true;
    document.getElementById("enTime").hidden = true;
    document.getElementById("infoTime").hidden = true;
    document.getElementById("carNumberTime").hidden = true;
    document.getElementById("simulator").hidden = true;
    document.getElementById("vehicleSelector").hidden = false;
    document.getElementById("scrollCheck").checked = false;
    scrollId = null;
    scrollTimer = null;
    clickStartScrollBtn = false;
    typeDestinationScrollAnimationId = null;
    typeScroll = false;
    destinationScroll = false;
    stopTypeScroll("ja");
    stopTypeScroll("en");
    stopDestinationScroll("ja");
    stopDestinationScroll("en");
    stopScroll();
});

function setExplanation() {
    document.getElementById("explanation").hidden = false;
    const explanationLabel = document.getElementById("explanationLabel");
    const label = document.createElement("label");
    label.textContent = config.explanation;
    explanationLabel.appendChild(label);
}

function clearExplanation() {
    const explanationLabel = document.getElementById("explanationLabel");
    explanationLabel.innerHTML = "";
}

function setReferenceSite() {
    document.getElementById("referenceSite").hidden = false;
    const referenceSiteLink = document.getElementById("referenceSiteLink");

    siteData.forEach((element) => {
        const a = document.createElement("a");
        a.href = element.link;
        a.textContent = element.name;
        a.target = "_blank";
        referenceSiteLink.appendChild(a);
    });
}

function clearReferenceSite() {
    const referenceSiteLink = document.getElementById("referenceSiteLink");
    referenceSiteLink.innerHTML = "";
}

tittle.addEventListener("pointerup", () => {
    tittle.style.backgroundColor = "white";
});

function showLoading() {
    document.getElementById("loading").hidden = false;
}

function hideLoading() {
    document.getElementById("loading").hidden = true;
}

const scrollCheck = document.getElementById("scrollCheck");
const scrollText = document.getElementById("scrollText");
const startScrollBtn = document.getElementById("startScrollBtn");

scrollCheck.addEventListener("change", () => {
    if (scrollCheck.checked) {
        scrollText.hidden = false;
        startScrollBtn.hidden = false;
    } else {
        scrollText.hidden = true;
        startScrollBtn.hidden = true;
        scrollId = null;
        clearInterval(scrollTimer);
    }
});
