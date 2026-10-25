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
        // 現在画面（キャプチャ用）の生成
        const fromCanvas = document.createElement("canvas");
        fromCanvas.width = cacheCanvas.width;
        fromCanvas.height = cacheCanvas.height;
        fromCanvas.getContext("2d").drawImage(cacheCanvas, 0, 0);

        // 新シーンのレンダリング
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

    // ボタン押下などの手動更新時：アニメーションを即座にリセットしてノイズを防止
    if (verticalSlideAnimationId !== null) {
        cancelAnimationFrame(verticalSlideAnimationId);
        verticalSlideAnimationId = null;
        isVerticalSliding = false;
    }

    if (typeof isVerticalSlideEnabled === "function" && isVerticalSlideEnabled() && cacheCanvas.width > 0) {
        // 退避用キャンバスの複製
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
    if (!isMessageBoard) {
        const simulator = document.getElementById("simulator");
        const vehicleSelector = document.getElementById("vehicleSelector");

        if (!simulator || !vehicleSelector) return;

        // 二重実行を防ぐ
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
                    // 画面切り替え完了後に初期化
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

                    // タイトルの表示状態を更新
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

        // 二重実行を防ぐ
        if (messageBoard.dataset.returning === "true") return;
        messageBoard.dataset.returning = "true";

        const hideIds = [
            "messageBoardScrollText",
            "startMessageBoardScrollBtn"
        ];

        try {
            await showScreenSmoothly(
                vehicleSelector,
                messageBoard,
                () => {
                    isMessageBoard = false;
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

// ===== LED設定の開閉トグル処理 =====
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

(() => {
    const initTitleFade = () => {
        const title = document.querySelector(
            "#tittle .scroll-fade-title"
        );

        if (!title) return;

        const fadeDistance = 250;
        let ticking = false;
        let currentScroll = 0;

        function updateTitle() {
            const progress = Math.min(
                Math.max(currentScroll / fadeDistance, 0),
                1
            );

            title.style.opacity = String(1 - progress);
            title.style.transform =
                `translate3d(0, ${-20 * progress}px, 0)`;

            ticking = false;
        }

        function requestUpdate(scrollTop) {
            const pageScroll = Math.max(
                window.scrollY || 0,
                document.documentElement.scrollTop || 0,
                document.body.scrollTop || 0
            );

            currentScroll = Math.max(
                pageScroll,
                scrollTop || 0
            );

            if (!ticking) {
                ticking = true;
                requestAnimationFrame(updateTitle);
            }
        }

        // ページ全体のスクロール
        window.addEventListener("scroll", () => {
            requestUpdate(0);
        }, { passive: true });

        // サイドバーなど、内部スクロールにも対応
        document.addEventListener("scroll", event => {
            const target = event.target;

            if (
                target instanceof Element &&
                target.scrollHeight > target.clientHeight
            ) {
                requestUpdate(target.scrollTop);
            }
        }, { passive: true, capture: true });

        requestUpdate(0);
    };

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initTitleFade,
            { once: true }
        );
    } else {
        initTitleFade();
    }
})();

// タイトルのスクロール連動アニメーション
function setupTitleScrollAnimation() {
    const title = document.getElementById("tittle");
    if (!title) return;

    // 二重登録を防止
    if (title.dataset.scrollAnimationReady === "true") return;
    title.dataset.scrollAnimationReady = "true";

    title.classList.add("scroll-fade-title");

    const mobileQuery = window.matchMedia("(max-width: 768px)");
    let frameId = 0;
    let latestTarget = null;

    function getScrollTop(target) {
        // ページ内のスクロール領域
        if (
            target instanceof Element &&
            target !== document.documentElement &&
            target !== document.body &&
            target.scrollHeight > target.clientHeight + 1
        ) {
            return target.scrollTop;
        }

        // ページ全体のスクロール
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

        // スマホのシミュレーター画面では常に濃く表示
        if (isMobileSimulator) {
            title.style.opacity = "1";
            title.style.transform = "none";
            title.style.pointerEvents = "auto";
            return;
        }

        // 車両選択画面ではスマホでもスクロール連動
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

    // ページ全体と内部のスクロール領域を監視
    window.addEventListener("scroll", onScroll, {
        passive: true
    });

    document.addEventListener("scroll", onScroll, {
        passive: true,
        capture: true
    });

    // 画面サイズ変更にも対応
    window.addEventListener("resize", () => {
        updateTitle(latestTarget);
    }, { passive: true });

    // simulatorModeの切り替えを検知
    const observer = new MutationObserver(() => {
        updateTitle();

        // 画面切り替え時にも1フレーム後に再確認
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
messageBoardBtn.addEventListener("click", () => {
    isMessageBoard = true;
    await startMessageBoard();
})

async function startMessageBoard() {
    const vehicleSelector = document.getElementById("vehicleSelector");
    const messageBoard = document.getElementById("messageBoard");

    if (!vehicleSelector || !messageBoard) return;

    // 二重実行を防ぐ
    if (messageBoard.dataset.transitioning === "true") return;
    messageBoard.dataset.transitioning = "true";

    try {
        await showScreenSmoothly(
            messageBoard,
            vehicleSelector,
            () => {
                setVehicleSelectButton();
            }
        );
    } finally {
        delete messageBoard.dataset.transitioning;
    }
}

const timeCheck = document.getElementById("timeCheck");
timeCheck.addEventListener("change", () => {
    if (timeCheck.checked) {
        if (messageBoardScroll) {
            drawTimeSmall();
        } else {
            drawTime();
        }
    }
});

const messageBoardScrollCheck = document.getElementById("messageBoardScrollCheck");
const messageBoardScrollText = document.getElementById("messageBoardScrollText");
const startMessageBoardScrollBtn = document.getElementById("startMessageBoardScrollBtn");
messageBoardScrollCheck.addEventListener("change", () => {
    if (messageBoardScrollCheck.checked) {
        messageBoardScrollText.hidden = false;
        startMessageBoardScrollBtn.hidden = false;
    } else {
        messageBoardScrollText.hidden = true;
        startMessageBoardScrollBtn.hidden = true;
        messageBoardScroll = false;
    }
});