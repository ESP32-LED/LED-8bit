(function () {
    const errorBox = document.createElement("pre");

    Object.assign(errorBox.style, {
        position: "fixed",
        bottom: "10px",
        left: "10px",
        right: "10px",
        maxHeight: "40vh",
        overflowY: "auto",
        padding: "12px",
        background: "#300",
        color: "#fff",
        border: "2px solid #f44",
        borderRadius: "8px",
        zIndex: "999999",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        fontSize: "12px",
        display: "none"
    });

    function attachErrorBox() {
        if (!errorBox.isConnected && document.body) {
            document.body.appendChild(errorBox);
        }
    }

    if (document.body) {
        attachErrorBox();
    } else {
        document.addEventListener("DOMContentLoaded", attachErrorBox, {
            once: true
        });
    }

    function showError(message) {
        attachErrorBox();

        errorBox.style.display = "block";
        errorBox.textContent += message + "\n\n";
        errorBox.scrollTop = errorBox.scrollHeight;
    }

    window.mobileLog = function (...args) {
        const log = document.getElementById("debugLog");

        const message = args.map(arg => {
            if (arg instanceof Error) {
                return arg.stack || `${arg.name}: ${arg.message}`;
            }

            if (typeof arg === "object" && arg !== null) {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch {
                    return String(arg);
                }
            }

            return String(arg);
        }).join(" ");

        if (!log) {
            console.warn("[mobileLog] debugLog が見つかりません:", message);
            return;
        }

        log.textContent += message + "\n";
        log.scrollTop = log.scrollHeight;
    };

    window.addEventListener("error", event => {
        if (event instanceof ErrorEvent) {
            const message =
                `[JavaScriptエラー]\n` +
                `メッセージ: ${event.message}\n` +
                `ファイル: ${event.filename || "(不明)"}\n` +
                `行: ${event.lineno || "(不明)"}, ` +
                `列: ${event.colno || "(不明)"}\n` +
                `スタック:\n${event.error?.stack || "(取得できません)"}`;

            showError(message);
            mobileLog(message);

        } else {
            const message =
                `[リソース読み込みエラー]\n` +
                `対象: ${event.target?.src || event.target?.href || "(不明)"}`;

            showError(message);
            mobileLog(message);
        }
    }, true);

    window.addEventListener("unhandledrejection", event => {
        const reason = event.reason;

        const message =
            `[未処理の非同期エラー]\n` +
            `メッセージ: ${reason?.message || String(reason)}\n` +
            `スタック:\n${reason?.stack || "(取得できません)"}`;

        showError(message);
        mobileLog(message);
    });

})();

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

        if (config.hasType) {
            const typeCategory = getCategory("type");
            do {
                if (config.typeDistinction) {
                    const randomIndexGroups = Math.floor(Math.random() * typeCategory.groups.length);
                    const groups = typeCategory.groups[randomIndexGroups];
                    const randomIndexItems = Math.floor(Math.random() * groups.items.length);
                    typeId = groups.items[randomIndexItems].id;
                } else {
                    const randomIndex = Math.floor(Math.random() * typeCategory.items.length);
                    typeId = typeCategory.items[randomIndex].id;
                }
            } while (
                typeId === "null_type" &&
                (
                    config.typeDistinction
                        ? typeCategory.groups.some(group => group.items.some(item => item.id !== "null_type"))
                        : typeCategory.items.some(item => item.id !== "null_type")
                )
            );

            if (selectedVehicle.name === "E233系0番台") {
                const randomIndex = Math.floor(Math.random() * 9) + 1;
                if (randomIndex === 1) {
                    typeId = null;
                }
            }

            if (config.hasTypeScroll) {
                const typeData = getItem("type", typeId);
                const nullType = getItem("type", "null_type");
                let view;
                if (isTypeFullScreen(typeData)) {
                    view = "full";
                } else {
                    view = "normal";
                }

                const typeJaWidth = typeData.view?.[view]?.ja?.width;
                const typeEnWidth = typeData.view?.[view]?.en?.width;
                const nullTypeJaWidth = nullType.view?.[view]?.ja?.width;
                const nullTypeEnWidth = nullType.view?.[view]?.en?.width ?? nullType.view?.[view]?.ja?.width;

                typeScroll = typeJaWidth !== nullTypeJaWidth || typeEnWidth !== nullTypeEnWidth;

                if (typeJaWidth !== nullTypeJaWidth) {
                    startTypeScroll("ja");
                } else {
                    stopTypeScroll("ja");
                }

                if (typeEnWidth !== nullTypeEnWidth) {
                    startTypeScroll("en");
                } else {
                    stopTypeScroll("en");
                }
            }

            if (config.hasDestinationScroll && destinationId != null) {
                const destinationData = getItem("destination", destinationId);
                const nullDestination = getItem("destination", "null_destination");
                let view;
                if (isDestinationFullScreen(destinationData)) {
                    view = "full";
                } else {
                    view = "normal";
                }

                const destinationJaWidth = destinationData.view?.[view]?.ja?.width;
                const destinationEnWidth = destinationData.view?.[view]?.en?.width;
                const nullDestinationJaWidth = nullDestination.view?.[view]?.ja?.width;
                const nullDestinationEnWidth = nullDestination.view?.[view]?.en?.width ?? nullDestination.view?.[view]?.ja?.width;

                destinationScroll = destinationJaWidth !== nullDestinationJaWidth || destinationEnWidth !== nullDestinationEnWidth;

                if (destinationJaWidth !== nullDestinationJaWidth) {
                    startDestinationScroll("ja");
                } else {
                    stopDestinationScroll("ja");
                }

                if (destinationEnWidth !== nullDestinationEnWidth) {
                    startDestinationScroll("en");
                } else {
                    stopDestinationScroll("en");
                }
            }

            const typeLabel = document.getElementById("type");
            if (typeId != null) {
                const typeName = getName("type", typeId);
                typeLabel.textContent = "種別:" + typeName;
            } else {
                typeLabel.textContent = "種別:なし";
            }
        }

        if (config.hasDestination) {
            const destinationCategory = getCategory("destination");
            do {
                if (config.destinationDistinction) {
                    const randomIndexGroups = Math.floor(Math.random() * destinationCategory.groups.length);
                    const groups = destinationCategory.groups[randomIndexGroups];
                    const randomIndexItems = Math.floor(Math.random() * groups.items.length);
                    destinationId = groups.items[randomIndexItems].id;
                } else {
                    const randomIndex = Math.floor(Math.random() * destinationCategory.items.length);
                    destinationId = destinationCategory.items[randomIndex].id;
                }
            } while (
                destinationId === "null_destination" &&
                (
                    config.destinationDistinction
                        ? destinationCategory.groups.some(group => group.items.some(item => item.id !== "null_destination"))
                        : destinationCategory.items.some(item => item.id !== "null_destination")
                )
            );

            if (typeId != null) {
                const type = getItem("type", typeId);
                const typeHasFull = !!type.view?.full;
                if (typeHasFull) {
                    const randomIndex = Math.floor(Math.random() * 9) + 1;
                    if (randomIndex === 1) {
                        destinationId = null;
                    }
                }
            }

            if (config.hasDestinationScroll) {
                const destinationData = getItem("destination", destinationId);
                const nullDestination = getItem("destination", "null_destination");
                let view;
                if (isDestinationFullScreen(destinationData)) {
                    view = "full";
                } else {
                    view = "normal";
                }

                const destinationJaWidth = destinationData.view?.[view]?.ja?.width;
                const destinationEnWidth = destinationData.view?.[view]?.en?.width;
                const nullDestinationJaWidth = nullDestination.view?.[view]?.ja?.width;
                const nullDestinationEnWidth = nullDestination.view?.[view]?.en?.width ?? nullDestination.view?.[view]?.ja?.width;

                destinationScroll = destinationJaWidth !== nullDestinationJaWidth || destinationEnWidth !== nullDestinationEnWidth;

                if (destinationJaWidth !== nullDestinationJaWidth) {
                    startDestinationScroll("ja");
                } else {
                    stopDestinationScroll("ja");
                }

                if (destinationEnWidth !== nullDestinationEnWidth) {
                    startDestinationScroll("en");
                } else {
                    stopDestinationScroll("en");
                }
            }

            if (config.hasTypeScroll && typeId != null) {
                const typeData = getItem("type", typeId);
                const nullType = getItem("type", "null_type");
                let view;
                if (isTypeFullScreen(typeData)) {
                    view = "full";
                } else {
                    view = "normal";
                }

                const typeJaWidth = typeData.view?.[view]?.ja?.width;
                const typeEnWidth = typeData.view?.[view]?.en?.width;
                const nullTypeJaWidth = nullType.view?.[view]?.ja?.width;
                const nullTypeEnWidth = nullType.view?.[view]?.en?.width ?? nullType.view?.[view]?.ja?.width;

                typeScroll = typeJaWidth !== nullTypeJaWidth || typeEnWidth !== nullTypeEnWidth;

                if (typeJaWidth !== nullTypeJaWidth) {
                    startTypeScroll("ja");
                } else {
                    stopTypeScroll("ja");
                }

                if (typeEnWidth !== nullTypeEnWidth) {
                    startTypeScroll("en");
                } else {
                    stopTypeScroll("en");
                }
            }

            const destinationLabel = document.getElementById("destination");
            if (destinationId != null) {
                const destinationName = getName("destination", destinationId);
                destinationLabel.textContent = "行先:" + destinationName;
            } else {
                destinationLabel.textContent = "行先:なし";
            }
        }

        if (config.hasCarNumber) {
            if (destinationId != null || config.hasCarNumberSmall) {
                const carNumberCategory = getCategory("carNumber");
                do {
                    if (config.carNumberDistinction) {
                        const randomIndexGroups = Math.floor(Math.random() * carNumberCategory.groups.length);
                        const groups = carNumberCategory.groups[randomIndexGroups];
                        const randomIndexItems = Math.floor(Math.random() * groups.items.length);
                        carNumberId = groups.items[randomIndexItems].id;
                    } else {
                        const randomIndex = Math.floor(Math.random() * carNumberCategory.items.length);
                        carNumberId = carNumberCategory.items[randomIndex].id;
                    }
                } while (
                    carNumberId === "null_carNumber" &&
                    (
                        config.carNumberDistinction
                            ? carNumberCategory.groups.some(group => group.items.some(item => item.id !== "null_carNumber"))
                            : carNumberCategory.items.some(item => item.id !== "null_carNumber")
                    )
                );
            }

            if (!config.hasCarNumberSmall) {
                const randomIndex = Math.floor(Math.random() * 9) + 1;
                if (randomIndex === 1) {
                    carNumberId = null;
                }
            }

            const carNumberLabel = document.getElementById("carNumber");
            if (carNumberId != null) {
                const carNumberName = getName("carNumber", carNumberId);
                carNumberLabel.textContent = "号車:" + carNumberName;
            } else {
                carNumberLabel.textContent = "号車:なし";
            }
        }

        if (config.hasInformation) {
            if (destinationId != null) {
                const informationCategory = getCategory("information");
                do {
                    if (config.informationDistinction) {
                        const randomIndexGroups = Math.floor(Math.random() * informationCategory.groups.length);
                        const groups = informationCategory.groups[randomIndexGroups];
                        const randomIndexItems = Math.floor(Math.random() * groups.items.length);
                        informationId = groups.items[randomIndexItems].id;
                    } else {
                        const randomIndex = Math.floor(Math.random() * informationCategory.items.length);
                        informationId = informationCategory.items[randomIndex].id;
                    }
                } while (
                    informationId === "null_information" &&
                    (
                        config.informationDistinction
                            ? informationCategory.groups.some(group => group.items.some(item => item.id !== "null_information"))
                            : informationCategory.items.some(item => item.id !== "null_information")
                    )
                );
            }

            const randomIndex = Math.floor(Math.random() * 9) + 1;
            if (randomIndex === 1) {
                informationId = null;
            }

            const informationLabel = document.getElementById("information");
            if (informationId != null) {
                const informationName = getName("information", informationId);
                informationLabel.textContent = "案内:" + informationName;
            } else {
                informationLabel.textContent = "案内:なし";
            }
        }

        if (config.hasInformation2) {
            if (destinationId != null) {
                const information2Category = getCategory("information2");
                do {
                    if (config.information2Distinction) {
                        const randomIndexGroups = Math.floor(Math.random() * information2Category.groups.length);
                        const groups = information2Category.groups[randomIndexGroups];
                        const randomIndexItems = Math.floor(Math.random() * groups.items.length);
                        information2Id = groups.items[randomIndexItems].id;
                    } else {
                        const randomIndex = Math.floor(Math.random() * information2Category.items.length);
                        information2Id = information2Category.items[randomIndex].id;
                    }
                } while (
                    information2Id === "null_information2" &&
                    (
                        config.information2Distinction
                            ? information2Category.groups.some(group => group.items.some(item => item.id !== "null_information2"))
                            : information2Category.items.some(item => item.id !== "null_information2")
                    )
                );
            }

            const randomIndex = Math.floor(Math.random() * 9) + 1;
            if (randomIndex === 1) {
                information2Id = null;
            }

            const information2Label = document.getElementById("information2");
            if (information2Id != null) {
                const information2Name = getName("information2", information2Id);
                information2Label.textContent = "案内2:" + information2Name;
            } else {
                information2Label.textContent = "案内2:なし";
            }
        }

        if (config.hasNext) {
            if (destinationId != null) {
                const nextCategory = getCategory("next");
                do {
                    if (config.nextModeDistinction) {
                        const randomIndexGroups = Math.floor(Math.random() * nextCategory.groups.length);
                        const groups = nextCategory.groups[randomIndexGroups];
                        const randomIndexItems = Math.floor(Math.random() * groups.items.length);
                        nextId = groups.items[randomIndexItems].id;
                    } else {
                        const randomIndex = Math.floor(Math.random() * nextCategory.items.length);
                        nextId = nextCategory.items[randomIndex].id;
                    }
                } while (
                    nextId === "null_next" &&
                    (
                        config.nextModeDistinction
                            ? nextCategory.groups.some(group => group.items.some(item => item.id !== "null_next"))
                            : nextCategory.items.some(item => item.id !== "null_next")
                    )
                );
            }

            const randomIndex = Math.floor(Math.random() * 9) + 1;
            if (randomIndex === 1) {
                nextId = null;
            }

            const nextLabel = document.getElementById("nextMode");
            if (nextId != null) {
                const nextName = getName("next", nextId);
                nextLabel.textContent = "次駅:" + nextName;
            } else {
                nextLabel.textContent = "次駅:なし";
            }
        }

        if (config.hasLine) {
            if (destinationId != null) {
                const lineCategory = getCategory("line");
                do {
                    if (config.lineDistinction) {
                        const randomIndexGroups = Math.floor(Math.random() * lineCategory.groups.length);
                        const groups = lineCategory.groups[randomIndexGroups];
                        const randomIndexItems = Math.floor(Math.random() * groups.items.length);
                        lineId = groups.items[randomIndexItems].id;
                    } else {
                        const randomIndex = Math.floor(Math.random() * lineCategory.items.length);
                        lineId = lineCategory.items[randomIndex].id;
                    }
                } while (
                    lineId === "null_line" &&
                    (
                        config.lineDistinction
                            ? lineCategory.groups.some(group => group.items.some(item => item.id !== "null_line"))
                            : lineCategory.items.some(item => item.id !== "null_line")
                    )
                );
            }

            const randomIndex = Math.floor(Math.random() * 9) + 1;
            if (randomIndex === 1) {
                lineId = null;
            }

            const lineLabel = document.getElementById("line");
            if (lineId != null) {
                const lineName = getName("line", lineId);
                lineLabel.textContent = "路線名:" + lineName;
            } else {
                lineLabel.textContent = "路線名:なし";
            }
        }

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

    const verticalSlide = document.getElementById("verticalSlide");

    if (config.hasVerticalSlide === true && config.verticalSlide === true) {
        if (verticalSlide) {
            verticalSlide.hidden = false;
            const verticalSlideLabel1 = document.getElementById("verticalSlideLabel1");
            const verticalSlideLabel2 = document.getElementById("verticalSlideLabel2");
            if (verticalSlideLabel1) {
                if (config.hasVerticalSlideLabel1) {
                    verticalSlideLabel1.hidden = false;
                } else {
                    verticalSlideLabel1.hidden = true;
                }
            }
            if (verticalSlideLabel2) {
                if (config.hasVerticalSlideLabel2) {
                    verticalSlideLabel2.hidden = false;
                }else {
                    verticalSlideLabel2.hidden = true;
                }
            }
            const verticalSlideCheck = document.getElementById("verticalSlideCheck");
            const verticalSlideCheck2 = document.getElementById("verticalSlideCheck2");
            const choppyScrollCheck = document.getElementById("choppyScrollCheck");
            if (config.verticalSlideCheckChecked) {
                verticalSlideCheck.checked = true;
            } else {
                verticalSlideCheck.checked = false;
            }
            if (config.verticalSlideCheck2Checked) {
                verticalSlideCheck2.checked = true;
            } else {
                verticalSlideCheck2.checked = false;
            }
            if (config.choppyScrollCheckChecked) {
                choppyScrollCheck.checked = true;
                choppyScroll = true;
            } else {
                choppyScrollCheck.checked = false;
                choppyScroll = false;
            }
        }
    } else {
        if (verticalSlide) {
            verticalSlide.hidden = true;
            const verticalSlideLabel1 = document.getElementById("verticalSlideLabel1");
            const verticalSlideLabel2 = document.getElementById("verticalSlideLabel2");
            if (verticalSlideLabel1) {
                verticalSlideLabel1.hidden = true;
            }
            if (verticalSlideLabel2) {
                verticalSlideLabel2.hidden = true;
            }
            const verticalSlideCheck = document.getElementById("verticalSlideCheck");
            const verticalSlideCheck2 = document.getElementById("verticalSlideCheck2");
            const choppyScrollCheck = document.getElementById("choppyScrollCheck");
            choppyScroll = false;
            verticalSlideCheck.checked = false;
            verticalSlideCheck2.checked = false;
            choppyScrollCheck.checked = false;
        }
    }

    const scrollText = document.getElementById("scrollText");
    scrollText.value = config.scrollLabel;

    setVehicleSelectButton();
    resizeButtonText();
}

function startDestinationDisplayCycle() {
    if (typeId == null && destinationId == null) return;

    const scrollCheck = document.getElementById("scrollCheck");
    if (!scrollCheck?.checked) return;

    const type = typeId != null ? getItem("type", typeId) : null;
    if (type && isTypeFullScreen(type)) return;

    if (renderTimer !== null) {
        clearTimeout(renderTimer);
        renderTimer = null;
    }

    if (verticalSlideAnimationId !== null) {
        cancelAnimationFrame(verticalSlideAnimationId);
        verticalSlideAnimationId = null;
        isVerticalSliding = false;
    }

    stopScroll();
    clickStartScrollBtn = true;

    buildSceneList();
    buildTypeSceneList();

    destinationCycleNormalScene = sceneList.findIndex(
        s => s.information === "destination" &&
             s.lang === "ja" &&
             s.next !== true
    );

    if (destinationCycleNormalScene < 0) {
        destinationCycleNormalScene = sceneList.findIndex(
            s => s.information === "destination" && s.lang === "ja"
        );
    }

    destinationCycleInfoScene = sceneList.findIndex(
        s => typeof s.information === "string" &&
             s.information.startsWith("information") &&
             s.lang === "ja"
    );

    if (destinationCycleNormalScene < 0) {
        destinationCycleActive = false;
        console.warn("通常の行先表示シーンが見つかりません");
        return;
    }

    destinationCycleActive = true;
    destinationCyclePhase = "normal";
    destinationCycleSmallMode = "destination";

    showDestinationCycleScene(destinationCycleNormalScene);

    renderTimer = setTimeout(() => {
        renderTimer = null;
        if (!destinationCycleActive) return;

        destinationCyclePhase = "scroll";
        destinationCycleSmallMode = "destination";
        informationMode = "destination";
        render();

        renderTimer = setTimeout(() => {
            renderTimer = null;
            if (!destinationCycleActive) return;

            startDestinationCycleSmallSwitch();
            clickStartScrollBtn = true;
            startScroll();
        }, 1500);
    }, 3000);
}

function startDestinationCycleSmallSwitch() {
    if (destinationCycleSmallTimer !== null) {
        clearInterval(destinationCycleSmallTimer);
        destinationCycleSmallTimer = null;
    }

    destinationCycleSmallMode = "destination";

    destinationCycleSmallTimer = setInterval(() => {
        if (
            !destinationCycleActive ||
            destinationCyclePhase !== "scroll" ||
            scrollId === null
        ) {
            clearInterval(destinationCycleSmallTimer);
            destinationCycleSmallTimer = null;
            return;
        }

        if (informationId != null) {
            destinationCycleSmallMode =
                destinationCycleSmallMode === "destination"
                    ? "information"
                    : "destination";
        } else {
            destinationCycleSmallMode = "destination";
        }

        informationMode = destinationCycleSmallMode;
        render();
    }, 3000);
}

function showDestinationCycleScene(index) {
    if (index < 0 || !sceneList[index]) return;

    scene = index;
    typeScene = frame % typeSceneList.length;

    applyScene();
    applyTypeScene();
    render();

    frame++;
}

let renderTimer = null;

function nextScene() {
    if (config.scroll_normal && destinationCycleActive) {
        renderTimer = null;

        if (destinationCyclePhase === "information") {
            destinationCyclePhase = "normal";
            showDestinationCycleScene(destinationCycleNormalScene);

            renderTimer = setTimeout(() => {
                renderTimer = null;

                if (!destinationCycleActive) return;

                destinationCyclePhase = "scroll";
                clickStartScrollBtn = true;
                startScroll();
            }, 3000);

            return;
        }

        return;
    }
    buildSceneList();
    buildTypeSceneList();

    const oldScene = scene;
    scene = frame % sceneList.length;
    typeScene = frame % typeSceneList.length;

    applyScene();
    applyTypeScene();

    const isSlideValid = typeof isVerticalSlideEnabled === "function" && isVerticalSlideEnabled() && sceneList.length > 1 && frame > 0 && oldScene !== scene;

    if (isSlideValid) {
        const fromCanvas = document.createElement("canvas");
        fromCanvas.width = cacheCanvas.width;
        fromCanvas.height = cacheCanvas.height;
        fromCanvas.getContext("2d").drawImage(cacheCanvas, 0, 0);

        render();

        const checkbox = document.getElementById("verticalSlideCheck");
        const checkbox2 = document.getElementById("verticalSlideCheck2");

        if (checkbox2.checked) {
            startVerticalSlideAnimation2(fromCanvas, cacheCanvas, () => {
                renderTimer = setTimeout(nextScene, 3000);
            });
        } else if (checkbox.checked) {
            startVerticalSlideAnimation(fromCanvas, cacheCanvas, () => {
                renderTimer = setTimeout(nextScene, 3000);
            });
        }
    } else {
        render();
    }

    frame++;
    if (!isSlideValid) {
        renderTimer = setTimeout(nextScene, getSceneInterval());
    }
}

function getSceneInterval() {
    if (sceneList.length === 0) return 1000;
    let sceneInterval = config.sceneInterval;
    const jaTime = Number(document.querySelector("#jaTime input")?.value || config.jaTime || 3);
    const enTime = Number(document.querySelector("#enTime input")?.value || config.enTime || 3);
    const infoTime = Number(document.querySelector("#infoTime input")?.value || config.infoTime || 3);
    const carNumberTime = Number(document.querySelector("#carNumberTime input")?.value || config.carNumberTime || 3);

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
    if (destinationCycleActive) {
        destinationCycleActive = false;
        stopScroll();
    }
    if (renderTimer !== null) {
        clearTimeout(renderTimer);
        renderTimer = null;
    }

    if (verticalSlideAnimationId !== null) {
        cancelAnimationFrame(verticalSlideAnimationId);
        verticalSlideAnimationId = null;
        isVerticalSliding = false;
    }

    if (typeof isVerticalSlideEnabled === "function" && isVerticalSlideEnabled() && cacheCanvas.width > 0) {
        const fromCanvas = document.createElement("canvas");
        fromCanvas.width = cacheCanvas.width;
        fromCanvas.height = cacheCanvas.height;
        fromCanvas.getContext("2d").drawImage(cacheCanvas, 0, 0);

        frame = 0;
        buildSceneList();
        buildTypeSceneList();
        scene = 0;
        typeScene = 0;
        applyScene();
        applyTypeScene();

        render();

        const checkbox = document.getElementById("verticalSlideCheck");
        const checkbox2 = document.getElementById("verticalSlideCheck2");

        if (checkbox.checked) {
            startVerticalSlideAnimation(fromCanvas, cacheCanvas, () => {
                if (renderTimer === null) {
                    frame = 1;
                    renderTimer = setTimeout(nextScene, getSceneInterval());
                }
            });
        } else if (checkbox2.checked) {
            startVerticalSlideAnimation2(fromCanvas, cacheCanvas, () => {
                if (renderTimer === null) {
                    frame = 1;
                    renderTimer = setTimeout(nextScene, getSceneInterval());
                }
            });
        }
    } else {
        frame = 0;
        nextScene();
    }
}

function buildSceneList() {
    sceneList = [];
    const type = getItem("type", typeId);

    if (!config.type_destination_changed) {
        if (information2Id != null) {
            if (config.information2Position === "next") {
                if (config.information2Ahead) {
                    sceneList.push({
                        lang: "ja",
                        information: "information2_next",
                        next: false
                    });
                }
            }
        }
        
        if (informationId != null) {
            if (config.informationPosition === "next") {
                if (config.informationAhead) {
                    sceneList.push({
                        lang: "ja",
                        information: "information_next",
                        next: false
                    });
                }
            }
        }

        if(nextId != null) {
            if (config.hasDestinationInformationCombined && informationId != null) {
                sceneList.push({
                    lang: "ja",
                    information: "destination_information",
                    next: true,
                });
            } else {
                sceneList.push({
                    lang: "ja",
                    information: "destination",
                    next: true,
                });
            }
        } else {
            if (!config.informationAhead) {
                if (destinationId != null) {
                    if (config.destinationPosition === "normal") {
                        sceneList.push({
                            lang: "ja",
                            information: "destination",
                            next: false,
                        });
                    }
                    if (config.destinationPosition === "next") {
                        sceneList.push({
                            lang: "ja",
                            information: "destination_next",
                            next: false,
                        });
                    }
                } else {
                    sceneList.push({
                        lang: "ja",
                        information: "destination",
                        next: false,
                    });
                }
            } else {
                if (informationId === null) {
                    sceneList.push({
                        lang: "ja",
                        information: "destination",
                        next: false,
                    });
                }
            }
        }

        if (informationId != null) {
            if (!config.hasDestinationInformationCombined) {
                if (config.informationAhead) {
                    if (hasEnglishInformation()) {
                        sceneList.push({
                            lang: "en",
                            information: "information_next",
                            next: false
                        });
                    }
                }
            }
        }

        if (config.languageSwitching) {
            if (hasEnglishType()) {
                if (nextId != null) {
                    if (!config.nextJaOnly) {
                        if (informationId != null && config.hasDestinationInformationCombined) {
                            if (hasEnglishInformation()) {
                                sceneList.push({
                                    lang: "en",
                                    information: "destination_information",
                                    next: true
                                });
                            } else {
                                sceneList.push({
                                    lang: "en",
                                    information: "destination",
                                    next: true
                                });
                            }
                        } else {
                            sceneList.push({
                                lang: "en",
                                information: "destination",
                                next: true
                            });
                        }
                    }
                } else {
                    if (!config.destinationLanguageSwitching) {
                        if (informationId === null) {
                            sceneList.push({
                                lang: "en",
                                information: "destination",
                                next: false
                            });
                        } else {
                            sceneList.push({
                                lang: "en",
                                information: "information",
                                next: false
                            });
                        }
                    } else {
                        sceneList.push({
                            lang: "en",
                            information: "destination",
                            next: false
                        });
                    }
                }
            }
            if (typeId === null) {
                if (nextId != null) {
                    if (!config.nextJaOnly) {
                        if (informationId != null && config.hasDestinationInformationCombined) {
                            if (hasEnglishInformation()) {
                                sceneList.push({
                                    lang: "en",
                                    information: "destination_information",
                                    next: true
                                });
                            }
                        } else {
                            sceneList.push({
                                lang: "en",
                                information: "destination",
                                next: true
                            });
                        }
                    }
                } else {
                    if (destinationId != null) {
                        if (config.destinationPosition === "normal") {
                            sceneList.push({
                                lang: "en",
                                information: "destination",
                                next: false,
                            });
                        }
                        if (config.destinationPosition === "next") {
                            sceneList.push({
                                lang: "en",
                                information: "destination_next",
                                next: false,
                            });
                        }
                    } else {
                        sceneList.push({
                            lang: "en",
                            information: "destination",
                            next: false,
                        });
                    }
                }
            } else {
                if (!hasEnglishType()) {
                    if (nextId != null) {
                        if (!config.nextJaOnly) {
                            if (informationId != null && config.hasDestinationInformationCombined) {
                                if (hasEnglishInformation()) {
                                    sceneList.push({
                                        lang: "en",
                                        information: "destination_information",
                                        next: true
                                    });
                                }
                            } else {
                                sceneList.push({
                                    lang: "en",
                                    information: "destination",
                                    next: true
                                });
                            }
                        }
                    }
                }
            }
        } else {
            if (nextId != null || scrollId != null) {
                if (!config.nextJaOnly) {
                    if (informationId != null && config.hasDestinationInformationCombined) {
                        if (hasEnglishInformation()) {
                            sceneList.push({
                                lang: "en",
                                information: "destination_information",
                                next: true
                            });
                        }
                    } else {
                        sceneList.push({
                            lang: "en",
                            information: "destination",
                            next: true
                        });
                    }
                }
            }
        }

        if (config.destinationLanguageSwitching) {
            if (!config.languageSwitching) {
                if (hasEnglishDestination()) {
                    if (nextId === null) {
                        sceneList.push({
                            lang: "en",
                            information: "destination",
                            next: false
                        });
                    }
                }
            } else {
                if (!hasEnglishType()) {
                    if (nextId === null) {
                        if (config.hasScroll) {
                            if (scrollId === null) {
                                if (!config.nextJaOnly) {
                                    sceneList.push({
                                        lang: "en",
                                        information: "destination",
                                        next: true
                                    });
                                }
                            }
                        } else {
                            if (hasEnglishDestination()) {
                                sceneList.push({
                                    lang: "en",
                                    information: "destination",
                                    next: false
                                });
                            }
                        }
                    }
                }
            }
        }

        if (hasInformationDestination()) {
            if (nextId != null) {
                sceneList.push({
                    lang: "info",
                    information: "destination",
                    next: true
                });
            } else {
                sceneList.push({
                    lang: "info",
                    information: "destination",
                    next: false
                });
            }
        }

        if (config.carNumberAhead) {
            if (carNumberId != null) {
                if (config.hasCarNumberFull) {
                    if (nextId != null) {
                        sceneList.push({
                            lang: "ja",
                            information: "carNumber",
                            next: true
                        });
                    } else {
                        sceneList.push({
                            lang: "ja",
                            information: "carNumber",
                            next: false
                        });
                    }
                    if (hasEnglishCarNumber()) {
                        if (nextId != null) {
                            sceneList.push({
                                lang: "en",
                                information: "carNumber",
                                next: true
                            });
                        } else {
                            sceneList.push({
                                lang: "en",
                                information: "carNumber",
                                next: false
                            });
                        }
                    }
                }
                if (!isTypeFullScreen(type)) {
                    if (config.hasCarNumberNormal) {
                        if (nextId != null) {
                            sceneList.push({
                                lang: "ja",
                                information: "carNumber_destination",
                                next: true
                            });
                        } else {
                            sceneList.push({
                                lang: "ja",
                                information: "carNumber_destination",
                                next: false
                            });
                        }
                        if (hasEnglishCarNumber()) {
                            if (nextId != null) {
                                sceneList.push({
                                    lang: "en",
                                    information: "carNumber_destination",
                                    next: true
                                });
                            } else {
                                sceneList.push({
                                    lang: "en",
                                    information: "carNumber_destination",
                                    next: false
                                });
                            }
                        }
                    }
                }
            }
        }

        if (informationId != null && !config.hasDestinationInformationCombined) {
            if (config.informationPosition === "normal") {
                if (scrollId === null) {
                    if (nextId != null) {
                        if (!config.information_ja_en) {
                            if (information2Id === null) {
                                if (!config.informationNormalOnNext) {
                                    sceneList.push({
                                        lang: "ja",
                                        information: "information",
                                        next: true
                                    });
                                    if (config.informationLanguageSwitching) {
                                        sceneList.push({
                                            lang: "en",
                                            information: "information",
                                            next: true
                                        });
                                    }
                                } else {
                                    sceneList.push({
                                        lang: "ja",
                                        information: "information",
                                        next: false
                                    });
                                    if (config.informationLanguageSwitching) {
                                        sceneList.push({
                                            lang: "en",
                                            information: "information",
                                            next: false
                                        });
                                    }
                                }
                            } else {
                                if (config.hasInformationCombined) {
                                    sceneList.push({
                                        lang: "ja",
                                        information: "information_information2",
                                        next: false
                                    })
                                    if (config.informationLanguageSwitching) {
                                        sceneList.push({
                                            lang: "en",
                                            information: "information_information2",
                                            next: false
                                        });
                                    }
                                } else {
                                    if (!config.informationNormalOnNext) {
                                        sceneList.push({
                                            lang: "ja",
                                            information: "information",
                                            next: true
                                        });
                                        if (config.informationLanguageSwitching) {
                                            sceneList.push({
                                                lang: "en",
                                                information: "information",
                                                next: true
                                            });
                                        }
                                    } else {
                                        sceneList.push({
                                            lang: "ja",
                                            information: "information",
                                            next: false
                                        });
                                        if (config.informationLanguageSwitching) {
                                            sceneList.push({
                                                lang: "en",
                                                information: "information",
                                                next: false
                                            });
                                        }
                                    }
                                }
                            }
                        } else {
                            if (config.informationNormalOnNext) {
                                sceneList.push({
                                    lang: "ja_en",
                                    information: "information",
                                    next: true
                                });
                            } else {
                                sceneList.push({
                                    lang: "ja_en",
                                    information: "information",
                                    next: false
                                });
                            }
                        }
                    } else {
                        if (!config.information_ja_en) {
                            if (hasEnglishType()) {
                                if (!config.languageSwitching || config.languageSwitching && config.destinationLanguageSwitching) {
                                    sceneList.push({
                                        lang: "ja",
                                        information: "information",
                                        next: false
                                    });
                                    if (config.informationLanguageSwitching) {
                                        if (hasEnglishInformation()) {
                                            sceneList.push({
                                                lang: "en",
                                                information: "information",
                                                next: false
                                            });
                                        }
                                    }
                                }
                            } else {
                                sceneList.push({
                                    lang: "ja",
                                    information: "information",
                                    next: false
                                });
                                if (config.informationLanguageSwitching) {
                                    if (hasEnglishInformation()) {
                                        sceneList.push({
                                            lang: "en",
                                            information: "information",
                                            next: false
                                        });
                                    }
                                }
                            }
                        } else {
                            sceneList.push({
                                lang: "ja_en",
                                information: "information",
                                next: false
                            });
                        }
                    }
                } else {
                    const info = getItem ("information", informationId);
                    const hasInformationSmall1 = !!info.view.small1 || !!info.view.full_small1;
                    if (!hasInformationSmall1) {
                        sceneList.push({
                            lang: "ja",
                            information: "information",
                            next: false
                        });
                    } else {
                        sceneList.push({
                            lang: "ja",
                            information: "information_small1",
                            next: false
                        });
                        sceneList.push({
                            lang: "ja",
                            information: "information_small2",
                            next: false
                        });
                    }
                }
            }
            if (config.informationPosition === "next") {
                if (!config.informationAhead) {
                    sceneList.push({
                        lang: "ja",
                        information: "information_next",
                        next: false
                    });
                    if (config.informationLanguageSwitching) {
                        if (hasEnglishInformation()) {
                            sceneList.push({
                                lang: "en",
                                information: "information_next",
                                next: false
                            });
                        }
                    }
                }
            }
        }

        if (information2Id != null) {
            if (!config.information2Ahead) {
                if (scrollId === null) {
                    if (nextId != null) {
                        if (informationId != null) {
                            if (!config.informationNormalOnNext) {
                                if (!config.hasInformationCombined) {
                                    sceneList.push({
                                        lang: "ja",
                                        information: "information2",
                                        next: true
                                    });
                                }
                            } else {
                                if (!config.hasInformationCombined) {
                                    sceneList.push({
                                        lang: "ja",
                                        information: "information2",
                                        next: false
                                    });
                                }
                            }
                        } else {
                            if (!config.informationNormalOnNext) {
                                sceneList.push({
                                    lang: "ja",
                                    information: "information2",
                                    next: true
                                });
                            } else {
                                sceneList.push({
                                    lang: "ja",
                                    information: "information2",
                                    next: false
                                });
                            }
                        }
                    } else {
                        if (!config.informationNormalOnNext) {
                            sceneList.push({
                                lang: "ja",
                                information: "information2",
                                next: true
                            });
                        } else {
                            sceneList.push({
                                lang: "ja",
                                information: "information2",
                                next: false
                            });
                        }
                    }
                } else {
                    sceneList.push({
                        lang: "ja",
                        information: "information2",
                        next: true
                    });
                }
            }
        }

        if (lineId != null) {
            if (nextId != null) {
                sceneList.push({
                    lang: "ja",
                    information: "line",
                    next: true
                });
            } else {
                sceneList.push({
                    lang: "ja",
                    information: "line",
                    next: false
                });
            }
        }

        if (!config.carNumberAhead) {
            if (carNumberId != null) {
                if (config.hasCarNumberFull) {
                    if (nextId != null) {
                        sceneList.push({
                            lang: "ja",
                            information: "carNumber",
                            next: true
                        });
                    } else {
                        sceneList.push({
                            lang: "ja",
                            information: "carNumber",
                            next: false
                        });
                    }
                    if (hasEnglishCarNumber()) {
                        if (nextId != null) {
                            sceneList.push({
                                lang: "en",
                                information: "carNumber",
                                next: true
                            });
                        } else {
                            sceneList.push({
                                lang: "en",
                                information: "carNumber",
                                next: false
                            });
                        }
                    }
                }
                if (!isTypeFullScreen(type)) {
                    if (config.hasCarNumberNormal) {
                        if (nextId != null) {
                            sceneList.push({
                                lang: "ja",
                                information: "carNumber_destination",
                                next: true
                            });
                        } else {
                            sceneList.push({
                                lang: "ja",
                                information: "carNumber_destination",
                                next: false
                            });
                        }
                        if (hasEnglishCarNumber()) {
                            if (nextId != null) {
                                sceneList.push({
                                    lang: "en",
                                    information: "carNumber_destination",
                                    next: true
                                });
                            } else {
                                sceneList.push({
                                    lang: "en",
                                    information: "carNumber_destination",
                                    next: false
                                });
                            }
                        }
                    }
                }
            }
        }

        if (config.next_normal) {
            if (nextId != null) {
                sceneList.push({
                    lang: "ja",
                    information: "destination",
                    next: false
                });
                if (config.destinationLanguageSwitching) {
                    sceneList.push({
                        lang: "en",
                        information: "destination",
                        next: false
                    });
                }
            }
        }
    } else {
        if (typeId === null && destinationId === null) {
            sceneList.push({
                lang: "ja",
                information: "type",
                next: false
            });
        }
        if (typeId != null) {
            sceneList.push({
                lang: "ja",
                information: "type",
                next: false
            });
            if (hasEnglishType()) {
                sceneList.push({
                    lang: "en",
                    information: "type",
                    next: false
                });
            }
        }
        if (destinationId != null) {
            sceneList.push({
                lang: "ja",
                information: "destination",
                next: false
            });
            if (hasEnglishDestination()) {
                sceneList.push({
                    lang: "en",
                    information: "destination",
                    next: false
                });
            }
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

    const transferStatusEl = document.getElementById("transferStatus");
    if (transferStatusEl) transferStatusEl.textContent = "";

    const elementsToClear = [
        "typeButtons", "destinationButtons", "informationButtons", 
        "information2Buttons", "lineButtons", "nextModeButtons", "carNumberButtons"
    ];
    elementsToClear.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
    });

    if (document.getElementById("type")) document.getElementById("type").textContent = "種別:なし";
    if (document.getElementById("destination")) document.getElementById("destination").textContent = "行先:なし";
    if (document.getElementById("information")) document.getElementById("information").textContent = "案内:なし";
    if (document.getElementById("information2")) document.getElementById("information2").textContent = "案内2:なし";
    if (document.getElementById("line")) document.getElementById("line").textContent = "路線名:なし";
    if (document.getElementById("nextMode")) document.getElementById("nextMode").textContent = "次駅:なし";
    if (document.getElementById("carNumber")) document.getElementById("carNumber").textContent = "号車:なし";

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
tittle.addEventListener("click", returnToVehicleSelector);

async function returnToVehicleSelector() {
    const returningFromMessageBoard = isMessageBoard;

    const simulatorForGuard = document.getElementById("simulator");
    const messageBoardForGuard = document.getElementById("messageBoard");

    if (
        simulatorForGuard?.dataset.returning === "true" ||
        messageBoardForGuard?.dataset.returning === "true"
    ) {
        return;
    }

    if (!returningFromMessageBoard) {
        const simulator = document.getElementById("simulator");
        const vehicleSelector = document.getElementById("vehicleSelector");

        if (!simulator || !vehicleSelector) return;

        if (simulator.dataset.returning === "true") return;
        simulator.dataset.returning = "true";

        const hideIds = [
            "scrollText",
            "startScrollBtn",
            "referenceSite",
            "explanation",
            "jaTime",
            "enTime",
            "infoTime",
            "carNumberTime",
            "setLedAgingLebel",
            "verticalSlideCheckbox"
        ];

        try {
            await showScreenSmoothly(
                vehicleSelector,
                simulator,
                () => {
                    initSimulator();
                    clearReferenceSite();
                    clearExplanation();

                    hideIds.forEach(id => {
                        const element = document.getElementById(id);
                        if (element) element.hidden = true;
                    });

                    const resetCheckboxes = [
                        "scrollCheck",
                        "choppyScrollCheck",
                        "ledAgingCheck"
                    ];

                    resetCheckboxes.forEach(id => {
                        const element = document.getElementById(id);
                        if (element) element.checked = false;
                    });

                    const agingLevel =
                        document.getElementById("ledAgingLebel");
                    const agingValue =
                        document.getElementById("ledAgingLebelValue");
                    const verticalSlideButton =
                        document.getElementById("displayVerticalSlideBtn");

                    if (agingLevel) agingLevel.value = 3;
                    if (agingValue) agingValue.textContent = "3";

                    if (verticalSlideButton) {
                        verticalSlideButton.textContent =
                            "縦スライド設定を表示する";
                    }

                    isDisplayVerticalSlide = false;
                    isLedAging = false;
                    choppyScroll = false;
                    clickTypeBtn = false;
                    typeScroll = false;
                    destinationScroll = false;

                    typeScrollId = null;
                    destinationScrollId = null;
                    scrollSpeed = 450;
                    typeDestinationScrollAnimationId = null;

                    stopTypeScroll("ja");
                    stopTypeScroll("en");
                    stopDestinationScroll("ja");
                    stopDestinationScroll("en");

                    resetDestinationCycle();

                    document.body.classList.remove("simulatorMode");
                }
            );
        } finally {
            delete simulator.dataset.returning;
        }
    } else {
        const messageBoard = document.getElementById("messageBoard");
        const vehicleSelector = document.getElementById("vehicleSelector");

        if (!messageBoard || !vehicleSelector) return;

        if (messageBoard.dataset.returning === "true") return;
        messageBoard.dataset.returning = "true";

        const hideIds = [
            "messageBoardScrollText",
            "startMessageBoardScrollBtn"
        ];

        try {
            const transitionPromise = showScreenSmoothly(
                vehicleSelector,
                messageBoard,
                () => {
                    hideIds.forEach(id => {
                        const element = document.getElementById(id);
                        if (element) element.hidden = true;
                    });

                    const resetCheckboxes = [
                        "timeCheck",
                        "messageBoardScrollCheck"
                    ];

                    resetCheckboxes.forEach(id => {
                        const element = document.getElementById(id);
                        if (element) element.checked = false;
                    });
                }
            );

            isMessageBoard = false;

            await transitionPromise;
        } finally {
            delete messageBoard.dataset.returning;
        }
    }
}

function resetDestinationCycle() {
    if (destinationScrollTimer !== null) {
        clearTimeout(destinationScrollTimer);
        destinationScrollTimer = null;
    }

    if (destinationCycleSmallTimer !== null) {
        clearInterval(destinationCycleSmallTimer);
        destinationCycleSmallTimer = null;
    }

    if (renderTimer !== null) {
        clearTimeout(renderTimer);
        renderTimer = null;
    }

    destinationCycleActive = false;
    destinationCyclePhase = "normal";
    destinationCycleNormalScene = -1;
    destinationCycleInfoScene = -1;
    destinationCycleSmallMode = "destination";

    stopScroll();
}

function setExplanation() {
    if (config.hasExplanation) {
        document.getElementById("explanation").hidden = false;
    } else {
        document.getElementById("explanation").hidden = true;
    }
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

        stopScroll();

        if (destinationScrollTimer !== null) {
            clearTimeout(destinationScrollTimer);
            destinationScrollTimer = null;
        }

        if (destinationCycleSmallTimer !== null) {
            clearInterval(destinationCycleSmallTimer);
            destinationCycleSmallTimer = null;
        }

        if (renderTimer !== null) {
            clearTimeout(renderTimer);
            renderTimer = null;
        }

        destinationCycleActive = false;
        destinationCyclePhase = "normal";
        destinationCycleNormalScene = -1;
        destinationCycleInfoScene = -1;
        destinationCycleSmallMode = "destination";

        startRenderLoop();
    }
});

const vCheck = document.getElementById("verticalSlideCheck");
const vCheck2 = document.getElementById("verticalSlideCheck2");
vCheck.addEventListener("change", () => {
    vCheck2.checked = false;
});
vCheck2.addEventListener("change", () => {
    vCheck.checked = false;
});

const choppyScrollCheck = document.getElementById("choppyScrollCheck");
choppyScrollCheck.addEventListener("change", () => {
    if (choppyScrollCheck.checked) {
        choppyScroll = true;
    } else {
        choppyScroll = false;
    }
});

const ledAgingCheck = document.getElementById("ledAgingCheck");
const ledAgingLebel = document.getElementById("ledAgingLebel");
const setLedAgingLebel = document.getElementById("setLedAgingLebel");
const ledAgingLebelValue = document.getElementById("ledAgingLebelValue");
ledAgingCheck.addEventListener("change", () => {
    if (ledAgingCheck.checked) {
        isLedAging = true;
        setLedAgingLebel.hidden = false;
    } else {
        isLedAging = false;
        setLedAgingLebel.hidden = true;
    }
});

ledAgingLebel.addEventListener("input", () => {
    ledAgingLebelValue.textContent = ledAgingLebel.value;
});

const displayVerticalSlideBtn = document.getElementById("displayVerticalSlideBtn") ;
displayVerticalSlideBtn.addEventListener("click", () => {
    if (isDisplayVerticalSlide === false) {
        isDisplayVerticalSlide = true;
        displayVerticalSlideBtn.textContent = "縦スライド設定を非表示にする";
        verticalSlideCheckbox.hidden = false;
        if (config.verticalSlideCheckChecked) {
            verticalSlideCheck.checked = true;
        } else {
            verticalSlideCheck.checked = false;
        }
        if (config.verticalSlideCheck2Checked) {
            verticalSlideCheck2.checked = true;
        } else {
            verticalSlideCheck2.checked = false;
        }
        if (config.choppyScrollCheckChecked) {
            choppyScrollCheck.checked = true;
            choppyScroll = true;
        } else {
            choppyScrollCheck.checked = false;
            choppyScroll = false;
        }
    } else {
        isDisplayVerticalSlide = false;
        displayVerticalSlideBtn.textContent = "縦スライド設定を表示する";
        verticalSlideCheckbox.hidden = true;
        if (config.verticalSlideCheckChecked) {
            verticalSlideCheck.checked = true;
        } else {
            verticalSlideCheck.checked = false;
        }
        if (config.verticalSlideCheck2Checked) {
            verticalSlideCheck2.checked = true;
        } else {
            verticalSlideCheck2.checked = false;
        }
        if (config.choppyScrollCheckChecked) {
            choppyScrollCheck.checked = true;
            choppyScroll = true;
        } else {
            choppyScrollCheck.checked = false;
            choppyScroll = false;
        }
    }
});

const debugConsole = document.getElementById("debugConsole");
const displayLog = document.getElementById("displayLog");

displayLog.addEventListener("click", () => {
    isDisplayLog = !isDisplayLog;
    debugConsole.hidden = !isDisplayLog;
    displayLog.textContent = isDisplayLog ? "ログを非表示にする" : "ログを表示する";
});

document.addEventListener("DOMContentLoaded", () => {
    const toggleLedSettingsBtn = document.getElementById("toggleLedSettingsBtn");
    const ledSettings = document.getElementById("ledSettings");
    if (toggleLedSettingsBtn && ledSettings) {
        toggleLedSettingsBtn.addEventListener("click", () => {
            const isHidden = ledSettings.hidden;
            ledSettings.hidden = !isHidden;
            toggleLedSettingsBtn.textContent = isHidden ? "LED設定を閉じる" : "LED設定を開く";
        });
    }
});

function setupTitleScrollAnimation() {
    const title = document.getElementById("tittle");
    if (!title) return;

    if (title.dataset.scrollAnimationReady === "true") return;
    title.dataset.scrollAnimationReady = "true";

    title.classList.add("scroll-fade-title");

    const mobileQuery = window.matchMedia("(max-width: 768px)");
    let frameId = 0;
    let latestTarget = null;

    function getScrollTop(target) {
        if (
            target instanceof Element &&
            target !== document.documentElement &&
            target !== document.body &&
            target.scrollHeight > target.clientHeight + 1
        ) {
            return target.scrollTop;
        }

        return Math.max(
            window.scrollY || 0,
            document.documentElement.scrollTop || 0,
            document.body.scrollTop || 0
        );
    }

    function updateTitle(target = null) {
        const isMobileSimulator =
            mobileQuery.matches &&
            document.body.classList.contains("simulatorMode");

        if (isMobileSimulator) {
            title.style.opacity = "1";
            title.style.transform = "none";
            title.style.pointerEvents = "auto";
            return;
        }

        const scrollTop = getScrollTop(target);

        const progress = Math.min(
            1,
            Math.max(0, scrollTop / 360)
        );

        title.style.opacity = String(1 - progress);
        title.style.transform =
            `translateY(${-16 * progress}px)`;

        title.style.pointerEvents =
            progress >= 1 ? "none" : "";
    }

    function onScroll(event) {
        latestTarget = event.target;

        if (frameId) return;

        frameId = requestAnimationFrame(() => {
            frameId = 0;
            updateTitle(latestTarget);
        });
    }

    window.addEventListener("scroll", onScroll, {
        passive: true
    });

    document.addEventListener("scroll", onScroll, {
        passive: true,
        capture: true
    });

    window.addEventListener("resize", () => {
        updateTitle(latestTarget);
    }, { passive: true });

    const observer = new MutationObserver(() => {
        updateTitle();
        requestAnimationFrame(() => updateTitle());
    });

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"]
    });

    updateTitle();
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        setupTitleScrollAnimation,
        { once: true }
    );
} else {
    setupTitleScrollAnimation();
}

const messageBoardBtn = document.getElementById("messageBoardBtn");
messageBoardBtn.addEventListener("click", async () => {
    isMessageBoard = true;
    await startMessageBoard();
});

async function startMessageBoard() {
    const vehicleSelector = document.getElementById("vehicleSelector");
    const messageBoard = document.getElementById("messageBoard");

    if (!vehicleSelector || !messageBoard) return;

    if (messageBoard.dataset.transitioning === "true") return;
    messageBoard.dataset.transitioning = "true";

    try {
        await showScreenSmoothly(messageBoard, vehicleSelector);
        setVehicleSelectButton();

        requestAnimationFrame(resizeMessageBoardLED);
    } finally {
        delete messageBoard.dataset.transitioning;
    }
}

const timeCheck = document.getElementById("timeCheck");
const messageBoardScrollCheck = document.getElementById("messageBoardScrollCheck");
const messageBoardScrollText = document.getElementById("messageBoardScrollText");
const startMessageBoardScrollBtn = document.getElementById("startMessageBoardScrollBtn");
const messageBoardLedPreview = document.getElementById("messageBoardLedPreview");

/* ===== メッセージボードLED設定 ===== */
const MB_DISPLAY_CONFIG = {
    width: 192,
    height: 32,
    ledSize: 6.5,
    ledGap: 2
};

const MB_WIDTH = MB_DISPLAY_CONFIG.width;
const MB_HEIGHT = MB_DISPLAY_CONFIG.height;

const MB_LED_SIZE = MB_DISPLAY_CONFIG.ledSize;
const MB_LED_GAP = MB_DISPLAY_CONFIG.ledGap;
const MB_PITCH = MB_LED_SIZE + MB_LED_GAP;
const MB_DOT_RADIUS = MB_LED_SIZE / 2;

const MB_CANVAS_WIDTH = Math.ceil(
    (MB_WIDTH - 1) * MB_PITCH + MB_LED_SIZE
);

const MB_CANVAS_HEIGHT = Math.ceil(
    (MB_HEIGHT - 1) * MB_PITCH + MB_LED_SIZE
);

const MB_SCROLL_SPEED = 450;

let mbScrollActive = false;
let mbScrollText = "";
let mbScrollWidth = 0;

let mbScrollPixelX = 0;

let mbPreviousFrameTime = 0;
let mbAnimationFrame = null;

const mbScrollCanvas = document.createElement("canvas");
const mbScrollSourceCanvas = document.createElement("canvas");

const mbOutputContext = messageBoardLedPreview?.getContext("2d");

/* ===== メッセージボード用JSONフォント ===== */

let mbClockFont16 = null;
let mbClockFont24 = null;

async function loadMessageBoardClockFonts() {
    async function loadFont(path, size) {
        const response = await fetch(
            new URL(path, document.baseURI)
        );

        if (!response.ok) {
            throw new Error(
                `フォント読み込み失敗: ${path} (${response.status})`
            );
        }

        const font = await response.json();

        if (
            font.width !== size ||
            font.height !== size ||
            !font.glyphs
        ) {
            throw new Error(
                `${path} のwidth・height・glyphsを確認してください`
            );
        }

        for (const character of "0123456789:") {
            const rows = font.glyphs[character];

            if (!Array.isArray(rows) || rows.length !== size) {
                throw new Error(
                    `${path}: 文字「${character}」のデータがありません`
                );
            }

            for (const row of rows) {
                if (
                    typeof row !== "string" ||
                    !/^[0-9a-fA-F]+$/.test(row) ||
                    row.length !== size / 4
                ) {
                    throw new Error(
                        `${path}: 文字「${character}」の行データが不正です`
                    );
                }
            }
        }

        return font;
    }

    const [font16, font24] = await Promise.all([
        loadFont("fonts/clock16.json", 16),
        loadFont("fonts/clock24.json", 24)
    ]);

    mbClockFont16 = font16;
    mbClockFont24 = font24;

    return true;
}

const mbClockFontsReady = loadMessageBoardClockFonts().catch(error => {
    console.error("時刻用JSONフォントを読み込めませんでした:", error);
    return false;
});

const mbTextCanvas = document.createElement("canvas");
mbTextCanvas.width = MB_WIDTH;
mbTextCanvas.height = MB_HEIGHT;

const mbTextContext = mbTextCanvas.getContext("2d", {
    willReadFrequently: true
});

const mbBackgroundCanvas = document.createElement("canvas");

mbBackgroundCanvas.width = MB_CANVAS_WIDTH;
mbBackgroundCanvas.height = MB_CANVAS_HEIGHT;

const mbBackgroundContext =
    mbBackgroundCanvas.getContext("2d");

if (messageBoardLedPreview && mbOutputContext) {
    messageBoardLedPreview.width = MB_CANVAS_WIDTH;
    messageBoardLedPreview.height = MB_CANVAS_HEIGHT;
}

if (messageBoardLedPreview && mbBackgroundContext) {
    drawMessageBoardBackground();
}

function drawMessageBoardBackground() {
    mbBackgroundContext.fillStyle = "rgb(0, 0, 0)";

    mbBackgroundContext.fillRect(
        0,
        0,
        MB_CANVAS_WIDTH,
        MB_CANVAS_HEIGHT
    );

    mbBackgroundContext.fillStyle = "rgb(0, 0, 0)";

    for (let y = 0; y < MB_HEIGHT; y++) {
        for (let x = 0; x < MB_WIDTH; x++) {
            mbBackgroundContext.beginPath();

            mbBackgroundContext.arc(
                x * MB_PITCH + MB_DOT_RADIUS,
                y * MB_PITCH + MB_DOT_RADIUS,
                MB_DOT_RADIUS,
                0,
                Math.PI * 2
            );

            mbBackgroundContext.fill();
        }
    }
}

function getMessageBoardTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
}

function drawMessageBoardClockBitmap(font, displayWidth, top, areaHeight) {
    if (!font) return;

    const time = getMessageBoardTime();
    const characterCount = time.length;
    const totalWidth = characterCount * displayWidth;

    const startX = Math.floor((MB_WIDTH - totalWidth) / 2);

    const startY = top + Math.floor((areaHeight - font.height) / 2);

    const hexLength = font.width / 4;

    mbTextContext.fillStyle = "#ffffff";

    for (let i = 0; i < characterCount; i++) {
        const rows = font.glyphs[time[i]];
        if (!rows) continue;

        for (let y = 0; y < font.height; y++) {
            const rowBits = Number.parseInt(
                rows[y].padStart(hexLength, "0"),
                16
            );

            for (let x = 0; x < displayWidth; x++) {
                const sourceX = Math.floor(
                    x * font.width / displayWidth
                );

                const bit = Math.floor(
                    rowBits / (2 ** (font.width - 1 - sourceX))
                ) % 2;

                if (bit !== 1) continue;

                mbTextContext.fillRect(
                    startX + i * displayWidth + x,
                    startY + y,
                    1,
                    1
                );
            }
        }
    }
}

function drawMessageBoardClockLarge() {
    drawMessageBoardClockBitmap(
        mbClockFont24,
        24,
        0,
        MB_HEIGHT
    );
}

function drawMessageBoardClockSmall() {
    drawMessageBoardClockBitmap(
        mbClockFont16,
        16,
        0,
        16
    );
}

function createMessageBoardScrollCanvas() {
    const hasClock = !!timeCheck?.checked;

    const fontSize = hasClock ? 16 : 20;
    const top = hasClock ? 16 : 6;
    const height = hasClock ? 16 : 20;
    const font = `${fontSize}px "MS PGothic", "ＭＳ Ｐゴシック", sans-serif`;

    let ctx = mbScrollSourceCanvas.getContext("2d", {
        willReadFrequently: true
    });

    ctx.font = font;

    const textWidth = Math.ceil(
        ctx.measureText(mbScrollText).width
    ) + 4;

    mbScrollSourceCanvas.width = Math.max(1, textWidth);
    mbScrollSourceCanvas.height = MB_HEIGHT;

    ctx = mbScrollSourceCanvas.getContext("2d", {
        willReadFrequently: true
    });
    ctx.clearRect(0, 0, textWidth, MB_HEIGHT);
    ctx.font = font;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";

    ctx.fillText(
        mbScrollText,
        2,
        top + height / 2
    );

    mbScrollCanvas.width = Math.ceil(
        (textWidth - 1) * MB_PITCH + MB_LED_SIZE
    );
    mbScrollCanvas.height = MB_CANVAS_HEIGHT;

    const out = mbScrollCanvas.getContext("2d");
    out.clearRect(
        0,
        0,
        mbScrollCanvas.width,
        mbScrollCanvas.height
    );

    const pixels = ctx.getImageData(
        0,
        0,
        textWidth,
        MB_HEIGHT
    ).data;

    out.fillStyle = "rgb(255, 255, 255)";

    for (let y = 0; y < MB_HEIGHT; y++) {
        for (let x = 0; x < textWidth; x++) {
            const index = (y * textWidth + x) * 4;

            if (pixels[index + 3] < 128) continue;

            out.beginPath();
            out.arc(
                x * MB_PITCH + MB_DOT_RADIUS,
                y * MB_PITCH + MB_DOT_RADIUS,
                MB_DOT_RADIUS,
                0,
                Math.PI * 2
            );
            out.fill();
        }
    }

    mbScrollWidth = mbScrollCanvas.width;
}

function drawMessageBoardScrollTextFrame() {
    const ctx = mbTextContext;
    const hasClock = !!timeCheck?.checked;

    const top = hasClock ? 16 : 6;
    const height = hasClock ? 16 : 20;

    ctx.save();

    ctx.beginPath();
    ctx.rect(0, top, MB_WIDTH, height);
    ctx.clip();

    ctx.drawImage(
        mbScrollCanvas,
        Math.floor(mbScrollPixelX),
        0
    );

    ctx.restore();
}

function renderMessageBoardLEDs() {
    if (!mbOutputContext || !mbTextContext) return;

    mbOutputContext.drawImage(mbBackgroundCanvas, 0, 0);

    const pixels = mbTextContext.getImageData(
        0,
        0,
        MB_WIDTH,
        MB_HEIGHT
    ).data;

    mbOutputContext.fillStyle = "rgb(255, 255, 255)";

    for (let y = 0; y < MB_HEIGHT; y++) {
        for (let x = 0; x < MB_WIDTH; x++) {
            const index = (y * MB_WIDTH + x) * 4;

            if (pixels[index + 3] < 128) continue;

            mbOutputContext.beginPath();
            mbOutputContext.arc(
                x * MB_PITCH + MB_DOT_RADIUS,
                y * MB_PITCH + MB_DOT_RADIUS,
                MB_DOT_RADIUS,
                0,
                Math.PI * 2
            );
            mbOutputContext.fill();
        }
    }

    if (mbScrollActive && messageBoardScrollCheck?.checked) {
        const hasClock = !!timeCheck?.checked;
        const top = (hasClock ? 16 : 6) * MB_PITCH;
        const height = (hasClock ? 16 : 20) * MB_PITCH;

        mbOutputContext.save();
        mbOutputContext.beginPath();
        mbOutputContext.rect(
            0,
            top,
            MB_CANVAS_WIDTH,
            height
        );
        mbOutputContext.clip();

        const drawX =
            Math.round(mbScrollPixelX / MB_PITCH) * MB_PITCH;

        mbOutputContext.drawImage(
            mbScrollCanvas,
            drawX,
            0
        );

        mbOutputContext.restore();
    }
}

function drawMessageBoardFrame() {
    if (!mbTextContext) return;

    mbTextContext.clearRect(
        0,
        0,
        MB_WIDTH,
        MB_HEIGHT
    );

    if (mbScrollActive && messageBoardScrollCheck?.checked) {
        if (timeCheck?.checked) {
            drawMessageBoardClockSmall();
        }
    } else if (timeCheck?.checked) {
        drawMessageBoardClockLarge();
    }

    renderMessageBoardLEDs();
}

function stopMessageBoardScroll() {
    mbScrollActive = false;

    if (mbAnimationFrame !== null) {
        cancelAnimationFrame(mbAnimationFrame);
        mbAnimationFrame = null;
    }

    mbPreviousFrameTime = 0;
    mbScrollPixelX = MB_CANVAS_WIDTH;

    if (typeof messageBoardScroll !== "undefined") {
        messageBoardScroll = false;
    }

    drawMessageBoardFrame();
    if (typeof triggerAutoTransfer === "function") triggerAutoTransfer();
}

function animateMessageBoardScroll(timestamp) {
    if (!mbScrollActive || !messageBoardScrollCheck?.checked) {
        mbAnimationFrame = null;
        return;
    }

    if (mbPreviousFrameTime !== 0) {
        const deltaTime = Math.min(
            (timestamp - mbPreviousFrameTime) / 1000,
            0.05
        );

        mbScrollPixelX -= MB_SCROLL_SPEED * deltaTime;
    }

    mbPreviousFrameTime = timestamp;

    const gap = 32 * MB_PITCH;

    if (mbScrollPixelX + mbScrollWidth < -gap) {
        mbScrollPixelX = MB_CANVAS_WIDTH;
    }

    drawMessageBoardFrame();

    mbAnimationFrame = requestAnimationFrame(
        animateMessageBoardScroll
    );
}

async function startMessageBoardScroll() {
    if (!messageBoardScrollCheck?.checked) return;
    if (!messageBoardScrollText || !mbTextContext) return;

    mbScrollText = messageBoardScrollText.value
        .replace(/\r?\n/g, " ");

    if (!mbScrollText.trim()) {
        stopMessageBoardScroll();
        return;
    }

    if (mbAnimationFrame !== null) {
        cancelAnimationFrame(mbAnimationFrame);
        mbAnimationFrame = null;
    }

    mbScrollActive = false;

    if (timeCheck?.checked) {
        const fontsLoaded = await mbClockFontsReady;

        if (!fontsLoaded) {
            console.error("時刻用JSONフォントを確認してください。");
            drawMessageBoardFrame();
            return;
        }
    }

    createMessageBoardScrollCanvas();

    mbScrollPixelX = MB_CANVAS_WIDTH;
    mbPreviousFrameTime = 0;
    mbScrollActive = true;

    if (typeof messageBoardScroll !== "undefined") {
        messageBoardScroll = true;
    }

    drawMessageBoardFrame();

    mbAnimationFrame = requestAnimationFrame(
        animateMessageBoardScroll
    );

    if (typeof triggerAutoTransfer === "function") triggerAutoTransfer();
}

timeCheck?.addEventListener("change", () => {
    if (mbScrollActive && messageBoardScrollCheck?.checked) {
        startMessageBoardScroll();
    } else {
        drawMessageBoardFrame();
        if (typeof triggerAutoTransfer === "function") triggerAutoTransfer();
    }
});

messageBoardScrollCheck?.addEventListener("change", () => {
    if (messageBoardScrollCheck.checked) {
        messageBoardScrollText.hidden = false;
        startMessageBoardScrollBtn.hidden = false;

        drawMessageBoardFrame();
    } else {
        messageBoardScrollText.hidden = true;
        startMessageBoardScrollBtn.hidden = true;

        stopMessageBoardScroll();
    }
    if (typeof triggerAutoTransfer === "function") triggerAutoTransfer();
});

startMessageBoardScrollBtn?.addEventListener(
    "click",
    startMessageBoardScroll
);

/* 時刻（分）の切り替わりを記録する変数 */
let lastMbTime = "";

/* スクロールしていない間も時刻を定期的に更新 & 分変更時に自動再転送 */
setInterval(() => {
    const currentTime = getMessageBoardTime();
    const timeChanged = currentTime !== lastMbTime;

    if (!mbScrollActive) {
        drawMessageBoardFrame();
    }

    if (timeCheck?.checked && timeChanged) {
        lastMbTime = currentTime;
        if (typeof triggerAutoTransfer === "function") {
            triggerAutoTransfer();
        }
    }
}, 1000);

drawMessageBoardFrame();

mbClockFontsReady.then(() => {
    drawMessageBoardFrame();
});

function resizeMessageBoardLED() {
    const canvas = messageBoardLedPreview;
    const main = canvas?.closest("#messageBoard main");

    if (!canvas || !main) return;
    if (main.clientWidth <= 0) return;

    const rect = main.getBoundingClientRect();
    const style = getComputedStyle(main);

    const paddingX =
        parseFloat(style.paddingLeft) +
        parseFloat(style.paddingRight);

    const maxWidth = Math.max(
        1,
        main.clientWidth - paddingX - 24
    );

    const maxHeight = Math.max(
        1,
        window.innerHeight - Math.max(0, rect.top) - 24
    );

    const scale = Math.min(
        1,
        maxWidth / canvas.width,
        maxHeight / canvas.height
    );

    const displayWidth = Math.max(
        1,
        Math.floor(canvas.width * scale)
    );

    const displayHeight = Math.max(
        1,
        Math.floor(canvas.height * scale)
    );

    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
}

window.addEventListener("resize", resizeMessageBoardLED);

let mbMessageBoardResizeObserver = null;
let mbResizeFrameId = null;

const mbPreviewMain =
    messageBoardLedPreview?.closest("#messageBoard main");

if (mbPreviewMain && "ResizeObserver" in window) {
    mbMessageBoardResizeObserver = new ResizeObserver(() => {
        if (mbResizeFrameId !== null) {
            cancelAnimationFrame(mbResizeFrameId);
        }

        mbResizeFrameId = requestAnimationFrame(() => {
            mbResizeFrameId = null;
            resizeMessageBoardLED();
        });
    });

    mbMessageBoardResizeObserver.observe(mbPreviewMain);
}

requestAnimationFrame(resizeMessageBoardLED);
