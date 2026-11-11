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

    // 赤いエラー画面に表示する関数
    function showError(message) {
        attachErrorBox();
        errorBox.style.display = "block";
        errorBox.textContent += message + "\n\n";
        errorBox.scrollTop = errorBox.scrollHeight;
    }

    // モバイルログ（debugLog）に表示する関数
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

    // 通常のJavaScriptエラー
    window.addEventListener("error", event => {
        if (event instanceof ErrorEvent) {
            const message =
                `[JavaScriptエラー]\n` +
                `メッセージ: ${event.message}\n` +
                `ファイル: ${event.filename || "(不明)"}\n` +
                `行: ${event.lineno || "(不明)"}, ` +
                `列: ${event.colno || "(不明)"}\n` +
                `スタック:\n${event.error?.stack || "(取得できません)"}`;

            // 従来の赤いエラー画面
            showError(message);

            // モバイルログにも記録
            mobileLog(message);
        } else {
            const message =
                `[リソース読み込みエラー]\n` +
                `対象: ${event.target?.src || event.target?.href || "(不明)"}`;
            showError(message);
            mobileLog(message);
        }
    }, true);

    // async関数などの未処理エラー
    window.addEventListener("unhandledrejection", event => {
        const reason = event.reason;
        const message =
            `[未処理の非同期エラー]\n` +
            `メッセージ: ${reason?.message || String(reason)}\n` +
            `スタック:\n${reason?.stack || "(取得できません)"}`;

        // 赤いエラー画面
        showError(message);

        // モバイルログにも記録
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

            // すでに行先が選択されている場合、種別の幅が変わったので行先スクロールも再計算
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
                if (selectedVehicle.id != "keio1000") {
                    carNumberLabel.textContent = "号車:" + carNumberName;
                } else {
                    carNumberLabel.textContent = "案内3:" + carNumberName;
                }
            } else {
                if (selectedVehicle.id != "keio1000") {
                    carNumberLabel.textContent = "号車:なし";
                } else {
                    carNumberLabel.textContent = "案内3:なし";
                }
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
        // 車両ごとの設定に応じて、表示切替時間のUIを初期化する。
        if (config.setSwitchingTime && typeof setTimeSetting === "function") {
            setTimeSetting();
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
    if (config.hasAnimation) {
        document.getElementById("animation").hidden = false;
    } else {
        document.getElementById("animation").hidden = true;
    }

    // ===== 縦スライド切り替えUI（チェックボックス）の動的表示制御 =====
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
                } else {
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
    render();
    frame++;