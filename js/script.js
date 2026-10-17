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

    document.addEventListener("DOMContentLoaded", () => {
        document.body.appendChild(errorBox);
    });

    function showError(message) {
        if (!errorBox.isConnected && document.body) {
            document.body.appendChild(errorBox);
        }

        errorBox.style.display = "block";
        errorBox.textContent += message + "\n\n";
    }

    // 通常のJavaScriptエラー
    window.addEventListener("error", event => {
        showError(
            `エラー: ${event.message}\n` +
            `ファイル: ${event.filename}\n` +
            `行: ${event.lineno}, 列: ${event.colno}`
        );
    });

    // async関数などで処理されなかったエラー
    window.addEventListener("unhandledrejection", event => {
        showError(
            "未処理の非同期エラー:\n" +
            String(event.reason?.stack || event.reason)
        );
    });
})();

function mobileLog(...args) {
    const log = document.getElementById("debugLog");
    if (!log) return;

    log.textContent += args.map(arg => {
        if (arg instanceof Error) return arg.stack || arg.message;
        if (typeof arg === "object" && arg !== null) {
            try {
                return JSON.stringify(arg, null, 2);
            } catch {
                return String(arg);
            }
        }
        return String(arg);
    }).join(" ") + "\n";

    log.parentElement.scrollTop = log.parentElement.scrollHeight;
}

window.addEventListener("error", event => {
    mobileLog("エラー:", event.message, event.filename, event.lineno);
});

window.addEventListener("unhandledrejection", event => {
    mobileLog("Promiseエラー:", event.reason);
});

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
        }, 500);
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
            sceneList.push({
                lang: "ja",
                information: "destination",
                next: true,
            });
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

        if (config.languageSwitching) {
            if (hasEnglishType()) {
                if (nextId != null) {
                    if (!config.nextJaOnly) {
                        sceneList.push({
                            lang: "en",
                            information: "destination",
                            next: true
                        });
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
                        sceneList.push({
                            lang: "en",
                            information: "destination",
                            next: true
                        });
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
                            sceneList.push({
                                lang: "en",
                                information: "destination",
                                next: true
                            });
                        }
                    }
                }
            }
        } else {
            if (nextId != null || scrollId != null) {
                if (!config.nextJaOnly) {
                    sceneList.push({
                        lang: "en",
                        information: "destination",
                        next: true
                    });
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

        if (informationId != null) {
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
        }
        if (destinationId != null) {
            sceneList.push({
                lang: "ja",
                information: "destination",
                next: false
            });
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

function returnToVehicleSelector() {
    document.body.classList.remove("simulatorMode");
    initSimulator();
    clearReferenceSite();
    clearExplanation();

    const hideIds = [
        "scrollText", "startScrollBtn", "referenceSite", "explanation",
        "jaTime", "enTime", "infoTime", "carNumberTime",
        "setLedAgingLebel", "verticalSlideCheckbox"
    ];

    hideIds.forEach(id => {
        document.getElementById(id).hidden = true;
    });

    document.getElementById("simulator").hidden = true;
    document.getElementById("vehicleSelector").hidden = false;

    document.getElementById("scrollCheck").checked = false;
    document.getElementById("choppyScrollCheck").checked = false;
    document.getElementById("ledAgingCheck").checked = false;
    document.getElementById("ledAgingLebel").value = 3;
    document.getElementById("ledAgingLebelValue").textContent = 3;
    document.getElementById("displayVerticalSlideBtn").textContent = "縦スライド設定を表示する";

    isDisplayVerticalSlide = false;
    isLedAging = false;
    choppyScroll = false;
    clickTypeBtn = false;
    typeScroll = false;
    destinationScroll = false;

    typeDestinationScrollAnimationId = null;

    stopTypeScroll("ja");
    stopTypeScroll("en");
    stopDestinationScroll("ja");
    stopDestinationScroll("en");

    resetDestinationCycle();
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