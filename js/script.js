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

    // config.json
    let response = await fetch(selectedVehicle.config);
    config = await response.json();

    // led.json
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
    const scrollText = document.getElementById("scrollText");
    scrollText.value = config.scrollLabel;

    setVehicleSelectButton();
    resizeButtonText();

}

let renderTimer = null;

function nextScene() {

    buildSceneList();
    buildTypeSceneList();

    if (sceneList.length === 0) return;

    const nextSceneIdx = frame % sceneList.length;
    const nextTypeSceneIdx = typeSceneList.length > 0 ? frame % typeSceneList.length : 0;

    // 縦スライドモード（verticalSlide = true）かつ複数シーンある場合のアニメーション制御
    if (config && config.verticalSlide && sceneList.length > 1 && currentMatrix) {
        const fromMatrix = currentMatrix;

        scene = nextSceneIdx;
        typeScene = nextTypeSceneIdx;
        applyScene();
        applyTypeScene();

        const toMatrix = createDisplayMatrix();

        animateVerticalSlide(fromMatrix, toMatrix, () => {
            frame++;
            renderTimer = setTimeout(nextScene, getSceneInterval());
        });
    } else {
        scene = nextSceneIdx;
        typeScene = nextTypeSceneIdx;

        applyScene();
        applyTypeScene();

        render();

        frame++;
        renderTimer = setTimeout(nextScene, getSceneInterval());
    }
}

function getSceneInterval() {
    if (sceneList.length === 0) return 1000;
    let sceneInterval = config.sceneInterval;
    const jaTime = Number(document.querySelector("#jaTime input").value);
    const enTime = Number(document.querySelector("#enTime input").value);
    const infoTime = Number(document.querySelector("#infoTime input").value);
    const carNumberTime = Number(document.querySelector("#carNumberTime input").value);
    if (config.setSwitchingTime) {
        const currentScene = sceneList[scene];
        if (currentScene.information === "carNumber" || currentScene.information === "carNumber_destination") {
            sceneInterval = carNumberTime * 1000;
        }
        if (currentScene.information === "information") {
            sceneInterval = infoTime * 1000;
        }
        if (currentScene.information === "destination") {
            if (currentScene.lang === "ja") {
                sceneInterval = jaTime * 1000;
            }
            if (currentScene.lang === "en") {
                sceneInterval = enTime * 1000;
            }
        }
    } else {
        sceneInterval = config.sceneInterval;
    }
    return sceneInterval;
}

// 表示変更（ボタン押下等）された時に呼ばれるエントリーポイント
function startRenderLoop() {
    if (renderTimer !== null) {
        clearTimeout(renderTimer);
        renderTimer = null;
    }

    // 表示変更（Web/BLE送信等）時に1画面目へ縦スライドさせる処理
    if (config && config.verticalSlide && currentMatrix) {
        const fromMatrix = currentMatrix;

        frame = 0;
        buildSceneList();
        buildTypeSceneList();

        scene = 0;
        typeScene = 0;
        applyScene();
        applyTypeScene();

        const toMatrix = createDisplayMatrix();

        animateVerticalSlide(fromMatrix, toMatrix, () => {
            frame = 1;
            renderTimer = setTimeout(nextScene, getSceneInterval());
        });
    } else {
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
                    sceneList.push({
                        lang: "en",
                        information: "destination",
                        next: true
                    });
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
                    sceneList.push({
                        lang: "en",
                        information: "destination",
                        next: true
                    });
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
                        sceneList.push({
                            lang: "en",
                            information: "destination",
                            next: true
                        });
                    }
                }
            }
        } else {
            if (nextId != null || scrollId != null) {
                sceneList.push({
                    lang: "en",
                    information: "destination",
                    next: true
                });
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
                                sceneList.push({
                                    lang: "en",
                                    information: "destination",
                                    next: false
                                });
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
                sceneList.push({
                    lang: "en",
                    information: "destination",
                    next: false
                });
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
    typeSceneList.push({
        typeInfo: null
    });
    if (hasTypeInformation()) {
        typeSceneList.push({
            typeInfo: "information"
        });
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
    const typeLabel = document.getElementById("type");
    typeLabel.textContent = "種別:なし"
    const destinationLabel = document.getElementById("destination");
    destinationLabel.textContent = "行先:なし"
    const informationLabel = document.getElementById("information");
    informationLabel.textContent = "案内:なし"
    const information2Label = document.getElementById("information2");
    information2Label.textContent = "案内2:なし"
    const lineLabel = document.getElementById("line");
    lineLabel.textContent = "路線名:なし"
    const nextLabel = document.getElementById("nextMode");
    nextLabel.textContent = "次駅:なし"
    const carNumberLabel = document.getElementById("carNumber");
    carNumberLabel.textContent = "号車:なし"

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
            ctx.clearRect(0,0,sizeLed.width,sizeLed.height);
            ctx.drawImage(cacheCanvas,0,0);
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
        ctx.clearRect(0,0,sizeLed.width,sizeLed.height);
        ctx.drawImage(cacheCanvas,0,0);
        lastRender = now;
    }
});

document.addEventListener("mouseup", () => {
    dragging = false;
});

document.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("touchstart", () => {
        btn.classList.add("tap");
    });

    btn.addEventListener("touchend", () => {
        btn.classList.remove("tap");
    });
});

document.querySelectorAll(".numberInput").forEach(container => {
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
})

function setExplanation() {
    document.getElementById("explanation").hidden = false;
    const explanationLabel = document.getElementById("explanationLabel");
    const label = document.createElement("label");
    label.textContent = config.explanation;
    explanationLabel.appendChild(label)
}

function clearExplanation() {
    const explanationLabel = document.getElementById("explanationLabel");

    explanationLabel.innerHTML = "";
}

function setReferenceSite() {
    document.getElementById("referenceSite").hidden = false;
    const referenceSiteLink = document.getElementById("referenceSiteLink");

    siteData.forEach(element => {
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
})

function showLoading() {
    document.getElementById("loading").hidden = false;
}

function hideLoading() {
    document.getElementById("loading").hidden = true;
}

const scrollCheck = document.getElementById("scrollCheck");
const scrollText = document.getElementById("scrollText");
const startScrollBtn = document.getElementById("startScrollBtn")

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
