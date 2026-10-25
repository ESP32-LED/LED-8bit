function createTypeButtons() {
    const container = document.getElementById("typeButtons");
    container.innerHTML = "";
    const typeCategory = getCategory("type");
    if (!typeCategory) return;
    const normalBtn = document.createElement("button");
    container.classList.remove("groupedButtons", "normalButtons");
    if (config.typeDistinction) {
        container.classList.add("groupedButtons");
    } else {
        container.classList.add("normalButtons");
    }
    normalBtn.textContent = "種別なし";
    normalBtn.addEventListener("click", () => {
        setSelected(container, normalBtn);
        if (typeId === null) {
            normalBtn.classList.add("selected");
        }
        typeId = null;
        typeScroll = null;
        const typeLabel = document.getElementById("type");
        typeLabel.textContent = "種別:なし"
        frame = 0;
        if (config.setSwitchingTime) {
            setTimeSetting();
        }
        startRenderLoop();
    });
    container.appendChild(normalBtn);
    if (config.typeDistinction) {
        typeCategory.groups.forEach(group => {
            // ===== 無表示グループ =====
            if (group.name === "無表示" || group.id === "__ungrouped__") {
                group.items.forEach(item => {
                    const btn = document.createElement("button");
                    if (item.id === typeId) {
                        btn.classList.add("selected");
                    }
                    const label =
                        item.view?.normal?.ja?.name ??
                        item.view?.normal?.en?.name ??
                        item.view?.full?.ja?.name ??
                        item.view?.full?.en?.name ??
                        item.view?.normal2?.ja?.name ??
                        item.view?.normal2?.en?.name ??
                        item.view?.normal3?.ja?.name ??
                        item.view?.normal3?.en?.name ??
                        item.name ??
                        "no-name";
                    btn.textContent = label;
                    btn.addEventListener("click", () => {
                        setSelected(container, btn);
                        typeId = item.id;
                        typeScrollId = null;
                        clickTypeBtn = true;
                        if (config.hasTypeScroll) {
                            const typeData = getItem("type", typeId);
                            const nullType = getItem("type", "null_type");
                            let view;
                            if (isTypeFullScreen(typeData)) {
                                view = "full";
                            } else {
                                view = "normal"
                            }
                            const typeJaWidth = typeData.view?.[view]?.ja?.width;
                            const typeEnWidth = typeData.view?.[view]?.en?.width;
                            const nullTypeJaWidth = nullType.view?.[view]?.ja?.width;
                            const nullTypeEnWidth = nullType.view?.[view]?.en?.width ?? nullType.view?.[view]?.ja?.width;
                            typeScroll =
                                typeJaWidth !== nullTypeJaWidth ||
                                typeEnWidth !== nullTypeEnWidth;
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
                        // すでに行先が選択されている場合、
                        // 種別の幅が変わったので行先スクロールも再計算
                        if (config.hasDestinationScroll) {
                            if (destinationId != null) {
                                const destinationData = getItem("destination", destinationId);
                                const nullDestination = getItem("destination", "null_destination");
                                let view;
                                if (isDestinationFullScreen(destinationData)) {
                                    view = "full";
                                } else {
                                    view = "normal"
                                }
                                const destinationJaWidth =
                                    destinationData.view?.[view]?.ja?.width;
                                const destinationEnWidth =
                                    destinationData.view?.[view]?.en?.width;
                                const nullDestinationJaWidth =
                                    nullDestination.view?.[view]?.ja?.width;
                                const nullDestinationEnWidth =
                                    nullDestination.view?.[view]?.en?.width ?? nullDestination.view?.[view]?.ja?.width;
                                destinationScroll =
                                    destinationJaWidth !== nullDestinationJaWidth ||
                                    destinationEnWidth !== nullDestinationEnWidth;
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
                        }
                        const typeLabel = document.getElementById("type");
                        const typeName = getName("type", typeId);
                        typeLabel.textContent = "種別:" + typeName;
                        frame = 0;
                        if (config.setSwitchingTime) {
                            setTimeSetting();
                        }
                        startRenderLoop();
                    });
                    container.appendChild(btn);
                });
                return;
            }
            // ===== 路線グループ =====
            const header = document.createElement("div");
            header.className = "groupHeader";
            header.textContent = "▸ " + group.name;
            const groupContainer = document.createElement("div");
            groupContainer.className = "groupButtons";
            groupContainer.hidden = true;
            header.addEventListener("click", () => {
                groupContainer.hidden = !groupContainer.hidden;
                header.textContent =
                    (groupContainer.hidden ? "▸ " : "▾ ") + group.name;
            });
            container.appendChild(header);
            container.appendChild(groupContainer);
            group.items.forEach(item => {
                const btn = document.createElement("button");
                if (item.id === typeId) {
                    btn.classList.add("selected");
                }
                const label =
                    item.view?.normal?.ja?.name ??
                    item.view?.normal?.en?.name ??
                    item.view?.full?.ja?.name ??
                    item.view?.full?.en?.name ??
                    item.view?.normal2?.ja?.name ??
                    item.view?.normal2?.en?.name ??
                    item.view?.normal3?.ja?.name ??
                    item.view?.normal3?.en?.name ??
                    item.name ??
                    "no-name";
                btn.textContent = label;
                if (label.length > 6) {
                    btn.style.fontSize = "10px";
                }
                btn.addEventListener("click", () => {
                    setSelected(container, btn);
                    typeId = item.id;
                    typeScrollId = null;
                    clickTypeBtn = true;
                    if (config.hasTypeScroll) {
                        const typeData = getItem("type", typeId);
                        const nullType = getItem("type", "null_type");
                        let view;
                        if (isTypeFullScreen(typeData)) {
                            view = "full";
                        } else {
                            view = "normal"
                        }
                        const typeJaWidth = typeData.view?.[view]?.ja?.width;
                        const typeEnWidth = typeData.view?.[view]?.en?.width;
                        const nullTypeJaWidth = nullType.view?.[view]?.ja?.width;
                        const nullTypeEnWidth = nullType.view?.[view]?.en?.width ?? nullType.view?.[view]?.ja?.width;
                        typeScroll =
                            typeJaWidth !== nullTypeJaWidth ||
                            typeEnWidth !== nullTypeEnWidth;
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
                    // すでに行先が選択されている場合、
                    // 種別の幅が変わったので行先スクロールも再計算
                    if (config.hasDestinationScroll) {
                        if (destinationId != null) {
                            const destinationData = getItem("destination", destinationId);
                            const nullDestination = getItem("destination", "null_destination");
                            let view;
                            if (isDestinationFullScreen(destinationData)) {
                                view = "full";
                            } else {
                                view = "normal"
                            }
                            const destinationJaWidth =
                                destinationData.view?.[view]?.ja?.width;
                            const destinationEnWidth =
                                destinationData.view?.[view]?.en?.width;
                            const nullDestinationJaWidth =
                                nullDestination.view?.[view]?.ja?.width;
                            const nullDestinationEnWidth =
                                nullDestination.view?.[view]?.en?.width ?? nullDestination.view?.[view]?.ja?.width;
                            destinationScroll =
                                destinationJaWidth !== nullDestinationJaWidth ||
                                destinationEnWidth !== nullDestinationEnWidth;
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
                    }
                    const typeLabel = document.getElementById("type");
                    const typeName = getName("type", typeId);
                    typeLabel.textContent = "種別:" + typeName;
                    frame = 0;
                    if (config.setSwitchingTime) {
                        setTimeSetting();
                    }
                    startRenderLoop();
                });
                groupContainer.appendChild(btn);
            });
        });
    } else {
        const container = document.getElementById("typeButtons");
        const category = getCategory("type");
        category?.items.forEach(item => {
            const btn = document.createElement("button");
            if (item.id === typeId) {
                btn.classList.add("selected");
            }
            const label =
                item.view?.normal?.ja?.name ??
                item.view?.normal?.en?.name ??
                item.view?.full?.ja?.name ??
                item.view?.full?.en?.name ??
                item.view?.normal2?.ja?.name ??
                item.view?.normal2?.en?.name ??
                item.view?.normal3?.ja?.name ??
                item.view?.normal3?.en?.name ??
                item.name ??
                "no-name";
            btn.textContent = label;
            if (label.length > 6) {
                btn.style.fontSize = "10px";
            }
            btn.addEventListener("click", () => {
                setSelected(container, btn);
                typeId = item.id;
                typeScrollId = null;
                clickTypeBtn = true;
                if (config.hasTypeScroll) {
                    const typeData = getItem("type", typeId);
                    const nullType = getItem("type", "null_type");
                    let view;
                    if (isTypeFullScreen(typeData)) {
                        view = "full";
                    } else {
                        view = "normal"
                    }
                    const typeJaWidth = typeData.view?.[view]?.ja?.width;
                    const typeEnWidth = typeData.view?.[view]?.en?.width;
                    const nullTypeJaWidth = nullType.view?.[view]?.ja?.width;
                    const nullTypeEnWidth = nullType.view?.[view]?.en?.width ?? nullType.view?.[view]?.ja?.width;
                    typeScroll =
                        typeJaWidth !== nullTypeJaWidth ||
                        typeEnWidth !== nullTypeEnWidth;
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
                // すでに行先が選択されている場合、
                // 種別の幅が変わったので行先スクロールも再計算
                if (config.hasDestinationScroll) {
                    if (destinationId != null) {
                        const destinationData = getItem("destination", destinationId);
                        const nullDestination = getItem("destination", "null_destination");
                        let view;
                        if (isDestinationFullScreen(destinationData)) {
                            view = "full";
                        } else {
                            view = "normal"
                        }
                        const destinationJaWidth =
                            destinationData.view?.[view]?.ja?.width;
                        const destinationEnWidth =
                            destinationData.view?.[view]?.en?.width;
                        const nullDestinationJaWidth =
                            nullDestination.view?.[view]?.ja?.width;
                        const nullDestinationEnWidth =
                            nullDestination.view?.[view]?.en?.width ??
                            nullDestination.view?.[view]?.ja?.width;
                        destinationScroll =
                            destinationJaWidth !== nullDestinationJaWidth ||
                            destinationEnWidth !== nullDestinationEnWidth;
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
                }
                const typeLabel = document.getElementById("type");
                const typeName = getName("type", typeId);
                typeLabel.textContent = "種別:" + typeName;
                frame = 0;
                if (config.setSwitchingTime) {
                    setTimeSetting();
                }
                startRenderLoop();
            });
            container.appendChild(btn);
        });
    }
}
function createCarNumberButtons() {
    const container = document.getElementById("carNumberButtons");
    container.innerHTML = "";
    const carNumberCategory = getCategory("carNumber");
    if (!carNumberCategory) return;
    const normalBtn = document.createElement("button");
    container.classList.remove("groupedButtons", "normalButtons");
    if (config.carNumberDistinction) {
        container.classList.add("groupedButtons");
    } else {
        container.classList.add("normalButtons");
    }
    normalBtn.textContent = "号車なし";
    normalBtn.addEventListener ("click", () => {
        setSelected(container, normalBtn);
        if (carNumberId === null) {
            normalBtn.classList.add("selected");
        }
        carNumberId = null;
        clickTypeBtn = false;
        const carNumberLabel = document.getElementById("carNumber");
        carNumberLabel.textContent = "号車:なし"
        frame = 0;
        if (config.setSwitchingTime) {
            setTimeSetting();
        }
        startRenderLoop();
    });
    container.appendChild(normalBtn);
    if (config.carNumberDistinction) {
        carNumberCategory.groups.forEach(group => {
            // ===== 無表示グループ =====
            if (group.name === "無表示" || group.id === "__ungrouped__") {
                group.items.forEach(item => {
                    const btn = document.createElement("button");
                    if (item.id === carNumberId) {
                        btn.classList.add("selected");
                    }
                    const label =
                        item.view?.normal?.ja?.name ??
                        item.view?.normal?.en?.name ??
                        item.view?.full?.ja?.name ??
                        item.view?.full?.en?.name ??
                        item.name ??
                        "no-name";
                    btn.textContent = label;
                    btn.addEventListener("click", () => {
                        setSelected(container, btn);
                        carNumberId = item.id;
                        clickTypeBtn = false;
                        const carNumberLabel = document.getElementById("carNumber");
                        const carNumberName = getName("carNumber", carNumberId)
                        carNumberLabel.textContent = "号車:" + carNumberName
                        frame = 0;
                        if (config.setSwitchingTime) {
                            setTimeSetting();
                        }
                        startRenderLoop();
                    });
                    container.appendChild(btn);
                });
                return;
            }
            // ===== 路線グループ =====
            const header = document.createElement("div");
            header.className = "groupHeader";
            header.textContent = "▸ " + group.name;
            const groupContainer = document.createElement("div");
            groupContainer.className = "groupButtons";
            groupContainer.hidden = true;
            header.addEventListener("click", () => {
                groupContainer.hidden = !groupContainer.hidden;
                header.textContent =
                    (groupContainer.hidden ? "▸ " : "▾ ") + group.name;
            });
            container.appendChild(header);
            container.appendChild(groupContainer);
            group.items.forEach(item => {
                const btn = document.createElement("button");
                if (item.id === carNumberId) {
                    btn.classList.add("selected");
                }
                const label =
                    item.view?.normal?.ja?.name ??
                    item.view?.normal?.en?.name ??
                    item.view?.full?.ja?.name ??
                    item.view?.full?.en?.name ??
                    item.name ??
                    "no-name";
                btn.textContent = label;
                btn.addEventListener("click", () => {
                    setSelected(container, btn);
                    carNumberId = item.id;
                    clickTypeBtn = false;
                    const carNumberLabel = document.getElementById("carNumber");
                    const carNumberName = getName("carNumber", carNumberId)
                    carNumberLabel.textContent = "号車:" + carNumberName
                    frame = 0;
                    if (config.setSwitchingTime) {
                        setTimeSetting();
                    }
                    startRenderLoop();
                });
            groupContainer.appendChild(btn);
            });
        });
    } else {
        const container = document.getElementById("carNumberButtons");
        const category = getCategory("carNumber");
        category?.items.forEach(item => {
            const btn = document.createElement("button");
            if (item.id === carNumberId) {
                btn.classList.add("selected");
            }
            const label =
                item.view?.normal?.ja?.name ??
                item.view?.normal?.en?.name ??
                item.view?.full?.ja?.name ??
                item.view?.full?.en?.name ??
                item.name ??
                "no-name";
            btn.textContent = label;
            btn.addEventListener ("click", () => {
                setSelected(container, btn);
                carNumberId = item.id;
                clickTypeBtn = false;
                const carNumberLabel = document.getElementById("carNumber");
                const carNumberName = getName("carNumber", carNumberId)
                carNumberLabel.textContent = "号車:" + carNumberName
                frame = 0;
                if (config.setSwitchingTime) {
                    setTimeSetting();
                }
                startRenderLoop();
            });
            container.appendChild(btn);
        });
    }
}
function createDestinationButtons() {
    const container = document.getElementById("destinationButtons");
    container.innerHTML = "";
    const destinationCategory = getCategory("destination");
    if (!destinationCategory) return;
    const normalBtn = document.createElement("button");
    container.classList.remove("groupedButtons", "normalButtons");
    if (config.destinationDistinction) {
        container.classList.add("groupedButtons");
    } else {
        container.classList.add("normalButtons");
    }
    normalBtn.textContent = "行先なし";
    normalBtn.addEventListener ("click", () => {
        setSelected(container, normalBtn);
        if (destinationId === null) {
            normalBtn.classList.add("selected");
        }
        destinationId = null;
        destinationScroll = null;
        clickTypeBtn = false;
        const destinationLabel = document.getElementById("destination");
        destinationLabel.textContent = "行先:なし"
        frame = 0;
        if (config.setSwitchingTime) {
            setTimeSetting();
        }
        startRenderLoop();
    });
    container.appendChild(normalBtn);
    if (config.destinationDistinction) {
        destinationCategory.groups.forEach(group => {
            // ===== 無表示グループ =====
            if (group.name === "無表示" || group.id === "__ungrouped__") {
                group.items.forEach(dest => {
                    const btn = document.createElement("button");
                    if (dest.id === destinationId) {
                        btn.classList.add("selected");
                    }
                    const label =
                        dest.view?.normal?.ja?.name ??
                        dest.view?.normal?.en?.name ??
                        dest.view?.small?.ja?.name ??
                        dest.view?.small?.en?.name ??
                        dest.view?.full?.ja?.name ??
                        dest.view?.full?.en?.name ??
                        dest.view?.normal2?.ja?.name ??
                        dest.view?.normal2?.en?.name ??
                        dest.view?.normal3?.ja?.name ??
                        dest.view?.normal3?.en?.name ??
                        dest.name ??
                        "no-name";
                    btn.textContent = label;
                    btn.addEventListener("click", () => {
                        setSelected(container, btn);
                        destinationId = dest.id;
                        destinationScrollId = null;
                        clickTypeBtn = false;
                        if (config.hasDestinationScroll) {
                            const typeData = getItem("type", typeId);
                            const destinationData = getItem("destination", destinationId);
                            const nullDestination = getItem("destination", "null_destination");
                            let view;
                            if (isDestinationFullScreen(destinationData)) {
                                view = "full";
                            } else {
                                view = "normal"
                            }
                            const destinationJaWidth = destinationData.view?.[view]?.ja?.width;
                            const destinationEnWidth = destinationData.view?.[view]?.en?.width;
                            const nullDestinationJaWidth =
                                nullDestination.view?.[view]?.ja?.width;
                            const nullDestinationEnWidth =
                                nullDestination.view?.[view]?.en?.width ??
                                nullDestination.view?.[view]?.ja?.width;
                            destinationScroll =
                                destinationJaWidth !== nullDestinationJaWidth ||
                                destinationEnWidth !== nullDestinationEnWidth;
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
                        if (config.hasTypeScroll) {
                            if (typeId != null) {
                                const typeData = getItem("type", typeId);
                                const nullType = getItem("type", "null_type");
                                let view;
                                if (isTypeFullScreen(typeData)) {
                                    view = "full";
                                } else {
                                    view = "normal"
                                }
                                const typeJaWidth =
                                    typeData.view?.[view]?.ja?.width;
                                const typeEnWidth =
                                    typeData.view?.[view]?.en?.width;
                                const nullTypeJaWidth =
                                    nullType.view?.[view]?.ja?.width;
                                const nullTypeEnWidth =
                                    nullType.view?.[view]?.en?.width ??
                                    nullType.view?.[view]?.ja?.width;
                                typeScroll =
                                    typeJaWidth !== nullTypeJaWidth ||
                                    typeEnWidth !== nullTypeEnWidth;
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
                        }
                        const destinationLabel = document.getElementById("destination");
                        const destinationName = getName("destination", destinationId);
                        destinationLabel.textContent = "行先:" + destinationName;
                        frame = 0;
                        if (config.setSwitchingTime) {
                            setTimeSetting();
                        }
                        startRenderLoop();
                    });
                    container.appendChild(btn);
                });
                return;
            }
            // ===== 路線グループ =====
            const header = document.createElement("div");
            header.className = "groupHeader";
            header.textContent = "▸  " + group.name;
            const groupContainer = document.createElement("div");
            groupContainer.className = "groupButtons";
            groupContainer.hidden = true;
            header.addEventListener("click", () => {
                groupContainer.hidden = !groupContainer.hidden;
                header.textContent =
                    (groupContainer.hidden ? "▸  " : "▾  ") + group.name;
            });
            container.appendChild(header);
            container.appendChild(groupContainer);
            group.items.forEach(dest => {
                const btn = document.createElement("button");
                if (dest.id === destinationId) {
                    btn.classList.add("selected");
                }
                const label =
                    dest.view?.normal?.ja?.name ??
                    dest.view?.normal?.en?.name ??
                    dest.view?.small?.ja?.name ??
                    dest.view?.small?.en?.name ??
                    dest.view?.full?.ja?.name ??
                    dest.view?.full?.en?.name ??
                    dest.view?.normal2?.ja?.name ??
                    dest.view?.normal2?.en?.name ??
                    dest.view?.normal3?.ja?.name ??
                    dest.view?.normal3?.en?.name ??
                    dest.name ??
                    "no-name";
                btn.textContent = label;
                if (label.length > 6) {
                    btn.style.fontSize = "10px";
                }
                btn.addEventListener("click", () => {
                    setSelected(container, btn);
                    destinationId = dest.id;
                    destinationScrollId = null;
                    clickTypeBtn = false;
                    if (config.hasDestinationScroll) {
                        const typeData = getItem("type", typeId);
                        const destinationData = getItem("destination", destinationId);
                        const nullDestination = getItem("destination", "null_destination");
                        let view;
                        if (isDestinationFullScreen(destinationData)) {
                            view = "full";
                        } else {
                            view = "normal"
                        }
                        const destinationJaWidth = destinationData.view?.[view]?.ja?.width;
                        const destinationEnWidth = destinationData.view?.[view]?.en?.width;
                        const nullDestinationJaWidth =
                            nullDestination.view?.[view]?.ja?.width;
                        const nullDestinationEnWidth =
                            nullDestination.view?.[view]?.en?.width ??
                            nullDestination.view?.[view]?.ja?.width;
                        destinationScroll =
                            destinationJaWidth !== nullDestinationJaWidth ||
                            destinationEnWidth !== nullDestinationEnWidth;
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
                    if (config.hasTypeScroll) {
                        if (typeId != null) {
                            const typeData = getItem("type", typeId);
                            const nullType = getItem("type", "null_type");
                            let view;
                            if (isTypeFullScreen(typeData)) {
                                view = "full";
                            } else {
                                view = "normal"
                            }
                            const typeJaWidth =
                                typeData.view?.[view]?.ja?.width;
                            const typeEnWidth =
                                typeData.view?.[view]?.en?.width;
                            const nullTypeJaWidth =
                                nullType.view?.[view]?.ja?.width;
                            const nullTypeEnWidth =
                                nullType.view?.[view]?.en?.width ??
                                nullType.view?.[view]?.ja?.width;
                            typeScroll =
                                typeJaWidth !== nullTypeJaWidth ||
                                typeEnWidth !== nullTypeEnWidth;
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
                    }
                    const destinationLabel = document.getElementById("destination");
                    const destinationName = getName("destination", destinationId);
                    destinationLabel.textContent = "行先:" + destinationName;
                    frame = 0;
                    if (config.setSwitchingTime) {
                        setTimeSetting();
                    }
                    startRenderLoop();
                });
            groupContainer.appendChild(btn);
            });
        });
    } else {
        const container = document.getElementById("destinationButtons");
        const category = getCategory("destination");
        category?.items.forEach(dest => {
            const btn = document.createElement("button");
            if (dest.id === destinationId) {
                btn.classList.add("selected");
            }
            const label =
                dest.view?.normal?.ja?.name ??
                dest.view?.normal?.en?.name ??
                dest.view?.small?.ja?.name ??
                dest.view?.small?.en?.name ??
                dest.view?.full?.ja?.name ??
                dest.view?.full?.en?.name ??
                dest.view?.normal2?.ja?.name ??
                dest.view?.normal2?.en?.name ??
                dest.view?.normal3?.ja?.name ??
                dest.view?.normal3?.en?.name ??
                dest.name ??
                "no-name";
            btn.textContent = label;
            if (label.length > 6) {
                btn.style.fontSize = "10px";
            }
            btn.addEventListener("click", () => {
                setSelected(container, btn);
                destinationId = dest.id;
                destinationScrollId = null;
                clickTypeBtn = false;
                if (config.hasDestinationScroll) {
                    const typeData = getItem("type", typeId);
                    const destinationData = getItem("destination", destinationId);
                    const nullDestination = getItem("destination", "null_destination");
                    let view;
                    if (isDestinationFullScreen(destinationData)) {
                        view = "full";
                    } else {
                        view = "normal"
                    }
                    const destinationJaWidth = destinationData.view?.[view]?.ja?.width;
                    const destinationEnWidth = destinationData.view?.[view]?.en?.width;
                    const nullDestinationJaWidth =
                        nullDestination.view?.[view]?.ja?.width;
                    const nullDestinationEnWidth =
                        nullDestination.view?.[view]?.en?.width ??
                        nullDestination.view?.[view]?.ja?.width;
                    destinationScroll =
                        destinationJaWidth !== nullDestinationJaWidth ||
                        destinationEnWidth !== nullDestinationEnWidth;
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
                if (config.hasTypeScroll) {
                    if (typeId != null) {
                        const typeData = getItem("type", typeId);
                        const nullType = getItem("type", "null_type");
                        let view;
                        if (isTypeFullScreen(typeData)) {
                            view = "full";
                        } else {
                            view = "normal"
                        }
                        const typeJaWidth =
                            typeData.view?.[view]?.ja?.width;
                        const typeEnWidth =
                            typeData.view?.[view]?.en?.width;
                        const nullTypeJaWidth =
                            nullType.view?.[view]?.ja?.width;
                        const nullTypeEnWidth =
                            nullType.view?.[view]?.en?.width ??
                            nullType.view?.[view]?.ja?.width;
                        typeScroll =
                            typeJaWidth !== nullTypeJaWidth ||
                            typeEnWidth !== nullTypeEnWidth;
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
                }
                const destinationLabel = document.getElementById("destination");
                const destinationName = getName("destination", destinationId);
                destinationLabel.textContent = "行先:" + destinationName;
                frame = 0;
                if (config.setSwitchingTime) {
                    setTimeSetting();
                }
                startRenderLoop();
            });
            container.appendChild(btn);
        });
    }
}
function createNextModeButtons() {
    const container = document.getElementById("nextModeButtons");
    container.innerHTML = "";
    const nextModeCategory = getCategory("next");
    if (!nextModeCategory) return;
    const normalBtn = document.createElement("button");
    container.classList.remove("groupedButtons", "normalButtons");
    if (config.nextModeDistinction) {
        container.classList.add("groupedButtons");
    } else {
        container.classList.add("normalButtons");
    }
    normalBtn.textContent = "次駅なし";
    normalBtn.addEventListener ("click", () => {
        setSelected(container, normalBtn);
        if (nextId === null) {
            normalBtn.classList.add("selected");
        }
        displayMode = "normal";
        langIndex = 0;
        nextId = null;
        clickTypeBtn = false;
        const nextModeLabel = document.getElementById("nextMode");
        nextModeLabel.textContent = "次駅:なし"
        frame = 0;
        if (config.setSwitchingTime) {
            setTimeSetting();
        }
        startRenderLoop();
    });
    container.appendChild(normalBtn);
    if (config.nextModeDistinction) {
        nextModeCategory.groups.forEach(group => {
            // ===== 無表示グループ =====
            if (group.name === "無表示" || group.id === "__ungrouped__") {
                group.items.forEach(item => {
                    const btn = document.createElement("button");
                    if (item.id === nextId) {
                        btn.classList.add("selected");
                    }
                    const label =
                        item.view?.normal?.ja?.name ??
                        item.view?.normal?.en?.name ??
                        item.name ??
                        "no-name";
                    btn.textContent = label;
                    btn.addEventListener("click", () => {
                        setSelected(container, btn);
                        nextId = item.id;
                        clickTypeBtn = false;
                        const nextModeLabel = document.getElementById("nextMode");
                        const nextModeName = getName("next", nextId)
                        nextModeLabel.textContent = "次駅:" + nextModeName
                        frame = 0;
                        if (config.setSwitchingTime) {
                            setTimeSetting();
                        }
                        startRenderLoop();
                    });
                    container.appendChild(btn);
                });
                return;
            }
            // ===== 路線グループ =====
            const header = document.createElement("div");
            header.className = "groupHeader";
            header.textContent = "▸ " + group.name;
            const groupContainer = document.createElement("div");
            groupContainer.className = "groupButtons";
            groupContainer.hidden = true;
            header.addEventListener("click", () => {
                groupContainer.hidden = !groupContainer.hidden;
                header.textContent =
                    (groupContainer.hidden ? "▸ " : "▾ ") + group.name;
            });
            container.appendChild(header);
            container.appendChild(groupContainer);
            group.items.forEach(item => {
                const btn = document.createElement("button");
                if (item.id === nextId) {
                    btn.classList.add("selected");
                }
                const label =
                    item.view?.normal?.ja?.name ??
                    item.view?.normal?.en?.name ??
                    item.name ??
                    "no-name";
                btn.textContent = label;
                if (label.length > 6) {
                    btn.style.fontSize = "10px";
                }
                btn.addEventListener("click", () => {
                    setSelected(container, btn);
                    displayMode = "next";
                    langIndex = 0;
                    nextId = item.id;
                    clickTypeBtn = false;
                    const nextModeLabel = document.getElementById("nextMode");
                    const nextModeName = getName("next", nextId)
                    nextModeLabel.textContent = "次駅:" + nextModeName
                    frame = 0;
                    if (config.setSwitchingTime) {
                        setTimeSetting();
                    }
                    startRenderLoop();
                });
            groupContainer.appendChild(btn);
            });
        });
    } else {
        const container = document.getElementById("nextModeButtons");
        const category = getCategory("next");
        category?.items.forEach(item => {
            const btn = document.createElement("button");
            if (item.id === nextId) {
                btn.classList.add("selected");
            }
            const label =
                item.view?.normal?.ja?.name ??
                item.view?.normal?.en?.name ??
                item.view?.full?.ja?.name ??
                item.view?.full?.en?.name ??
                item.name ??
                "no-name";
            btn.textContent = label;
            if (label.length > 6) {
                btn.style.fontSize = "10px";
            }
            btn.addEventListener ("click", () => {
                setSelected(container, btn);
                displayMode = "next";
                langIndex = 0;
                nextId = item.id;
                clickTypeBtn = false;
                const nextModeLabel = document.getElementById("nextMode");
                const nextModeName = getName("next", nextId)
                nextModeLabel.textContent = "次駅:" + nextModeName
                frame = 0;
                if (config.setSwitchingTime) {
                    setTimeSetting();
                }
                startRenderLoop();
            });
            container.appendChild(btn);
        });
    }
}
function createInformationButtons() {
    const container = document.getElementById("informationButtons");
    container.innerHTML = "";
    const informationCategory = getCategory("information");
    if (!informationCategory) return;
    const normalBtn = document.createElement("button");
    container.classList.remove("groupedButtons", "normalButtons");
    if (config.informationDistinction) {
        container.classList.add("groupedButtons");
    } else {
        container.classList.add("normalButtons");
    }
    normalBtn.textContent = "案内なし";
    normalBtn.addEventListener ("click", () => {
        setSelected(container, normalBtn);
        if (informationId === null) {
            normalBtn.classList.add("selected");
        }
        informationId = null;
        clickTypeBtn = false;
        const informationLabel = document.getElementById("information");
        informationLabel.textContent = "案内:なし"
        frame = 0;
        if (config.setSwitchingTime) {
            setTimeSetting();
        }
        startRenderLoop();
    });
    container.appendChild(normalBtn);
    if (config.informationDistinction) {
        informationCategory.groups.forEach(group => {
            // ===== 無表示グループ =====
            if (group.name === "無表示" || group.id === "__ungrouped__") {
                group.items.forEach(info => {
                    const btn = document.createElement("button");
                    if (info.id === informationId) {
                        btn.classList.add("selected");
                    }
                    const label =
                        info.view?.full?.ja?.name ??
                        info.view?.full?.en?.name ??
                        info.view?.normal?.ja?.name ??
                        info.view?.normal?.en?.name ??
                        info.view?.small?.ja?.name ??
                        info.view?.small?.en?.name ??
                        info.name ??
                        "no-name";
                    btn.textContent = label;
                    btn.addEventListener("click", () => {
                        setSelected(container, btn);
                        informationId = info.id;
                        clickTypeBtn = false;
                        const informationLabel = document.getElementById("information");
                        const informationName = getName("information", informationId)
                        informationLabel.textContent = "案内:" + informationName
                        frame = 0;
                        if (config.setSwitchingTime) {
                            setTimeSetting();
                        }
                        startRenderLoop();
                    });
                    container.appendChild(btn);
                });
                return;
            }
            // ===== 路線グループ =====
            const header = document.createElement("div");
            header.className = "groupHeader";
            header.textContent = "▸ " + group.name;
            const groupContainer = document.createElement("div");
            groupContainer.className = "groupButtons";
            groupContainer.hidden = true;
            header.addEventListener("click", () => {
                groupContainer.hidden = !groupContainer.hidden;
                header.textContent =
                    (groupContainer.hidden ? "▸ " : "▾ ") + group.name;
            });
            container.appendChild(header);
            container.appendChild(groupContainer);
            group.items.forEach(info => {
                const btn = document.createElement("button");
                if (info.id === informationId) {
                    btn.classList.add("selected");
                }
                const label =
                    info.view?.full?.ja?.name ??
                    info.view?.full?.en?.name ??
                    info.view?.normal?.ja?.name ??
                    info.view?.normal?.en?.name ??
                    info.view?.small?.ja?.name ??
                    info.view?.small?.en?.name ??
                    info.view?.small1?.ja?.name ??
                    info.view?.small1?.en?.name ??
                    info.view?.small2?.ja?.name ??
                    info.view?.small2?.en?.name ??
                    info.view?.full_small1?.ja?.name ??
                    info.view?.full_small1?.en?.name ??
                    info.view?.full_small2?.ja?.name ??
                    info.view?.full_small2?.en?.name ??
                    info.name ??
                    "no-name";
                btn.textContent = label;
                if (label.length > 6) {
                    btn.style.fontSize = "10px";
                }
                btn.addEventListener("click", () => {
                    setSelected(container, btn);
                    informationId = info.id;
                    clickTypeBtn = false;
                    const informationLabel = document.getElementById("information");
                    const informationName = getName("information", informationId)
                    informationLabel.textContent = "案内:" + informationName
                    frame = 0;
                    if (config.setSwitchingTime) {
                        setTimeSetting();
                    }
                    startRenderLoop();
                });
            groupContainer.appendChild(btn);
            });
        });
    } else {
        const container = document.getElementById("informationButtons");
        const category = getCategory("information");
        category?.items.forEach(info => {
            const btn = document.createElement("button");
            if (info.id === informationId) {
                btn.classList.add("selected");
            }
            const label =
                info.view?.full?.ja?.name ??
                info.view?.full?.en?.name ??
                info.view?.normal?.ja?.name ??
                info.view?.normal?.en?.name ??
                info.view?.small?.ja?.name ??
                info.view?.small?.en?.name ??
                info.view?.small1?.ja?.name ??
                info.view?.small1?.en?.name ??
                info.view?.small2?.ja?.name ??
                info.view?.small2?.en?.name ??
                info.view?.full_small1?.ja?.name ??
                info.view?.full_small1?.en?.name ??
                info.view?.full_small2?.ja?.name ??
                info.view?.full_small2?.en?.name ??
                info.name ??
                "no-name";
                btn.textContent = label;
            if (label.length > 6) {
                btn.style.fontSize = "10px";
            }
            btn.addEventListener ("click", () => {
                setSelected(container, btn);
                informationId = info.id;
                clickTypeBtn = false;
                const informationLabel = document.getElementById("information");
                const informationName = getName("information", informationId)
                informationLabel.textContent = "案内:" + informationName
                frame = 0;
                if (config.setSwitchingTime) {
                    setTimeSetting();
                }
                startRenderLoop();
            });
            container.appendChild(btn);
        });
    }
}
function createInformation2Buttons() {
    const container = document.getElementById("information2Buttons");
    container.innerHTML = "";
    const information2Category = getCategory("information2");
    if (!information2Category) return;
    const normalBtn = document.createElement("button");
    container.classList.remove("groupedButtons", "normalButtons");
    if (config.information2Distinction) {
        container.classList.add("groupedButtons");
    } else {
        container.classList.add("normalButtons");
    }
    normalBtn.textContent = "案内2なし";
    normalBtn.addEventListener ("click", () => {
        setSelected(container, normalBtn);
        if (information2Id === null) {
            normalBtn.classList.add("selected");
        }
        information2Id = null;
        clickTypeBtn = false;
        const information2Label = document.getElementById("information2");
        information2Label.textContent = "案内2:なし"
        frame = 0;
        if (config.setSwitchingTime) {
            setTimeSetting();
        }
        startRenderLoop();
    });
    container.appendChild(normalBtn);
    if (config.information2Distinction) {
        information2Category.groups.forEach(group => {
            // ===== 無表示グループ =====
            if (group.name === "無表示" || group.id === "__ungrouped__") {
                group.items.forEach(info => {
                    const btn = document.createElement("button");
                    if (info.id === information2Id) {
                        btn.classList.add("selected");
                    }
                    const label =
                        info.view?.full?.ja?.name ??
                        info.view?.full?.en?.name ??
                        info.view?.normal?.ja?.name ??
                        info.view?.normal?.en?.name ??
                        info.view?.small?.ja?.name ??
                        info.view?.small?.en?.name ??
                        info.name ??
                        "no-name";
                    btn.textContent = label;
                    btn.addEventListener("click", () => {
                        setSelected(container, btn);
                        information2Id = info.id;
                        clickTypeBtn = false;
                        const information2Label = document.getElementById("information2");
                        const information2Name = getName("information2", information2Id)
                        information2Label.textContent = "案内2:" + information2Name
                        frame = 0;
                        if (config.setSwitchingTime) {
                            setTimeSetting();
                        }
                        startRenderLoop();
                    });
                    container.appendChild(btn);
                });
                return;
            }
            // ===== 路線グループ =====
            const header = document.createElement("div");
            header.className = "groupHeader";
            header.textContent = "▸ " + group.name;
            const groupContainer = document.createElement("div");
            groupContainer.className = "groupButtons";
            groupContainer.hidden = true;
            header.addEventListener("click", () => {
                groupContainer.hidden = !groupContainer.hidden;
                header.textContent =
                    (groupContainer.hidden ? "▸ " : "▾ ") + group.name;
            });
            container.appendChild(header);
            container.appendChild(groupContainer);
            group.items.forEach(info => {
                const btn = document.createElement("button");
                if (info.id === information2Id) {
                    btn.classList.add("selected");
                }
                const label =
                    info.view?.full?.ja?.name ??
                    info.view?.full?.en?.name ??
                    info.view?.normal?.ja?.name ??
                    info.view?.normal?.en?.name ??
                    info.view?.small?.ja?.name ??
                    info.view?.small?.en?.name ??
                    info.name ??
                    "no-name";
                btn.textContent = label;
                if (label.length > 6) {
                    btn.style.fontSize = "10px";
                }
                btn.addEventListener("click", () => {
                    setSelected(container, btn);
                    information2Id = info.id;
                    clickTypeBtn = false;
                    const information2Label = document.getElementById("information2");
                    const information2Name = getName("information2", information2Id)
                    information2Label.textContent = "案内2:" + information2Name
                    frame = 0;
                    if (config.setSwitchingTime) {
                        setTimeSetting();
                    }
                    startRenderLoop();
                });
            groupContainer.appendChild(btn);
            });
        });
    } else {
        const container = document.getElementById("information2Buttons");
        const category = getCategory("information2");
        category?.items.forEach(info => {
            const btn = document.createElement("button");
            if (info.id === information2Id) {
                btn.classList.add("selected");
            }
            const label =
                info.view?.full?.ja?.name ??
                info.view?.full?.en?.name ??
                info.view?.normal?.ja?.name ??
                info.view?.normal?.en?.name ??
                info.view?.small?.ja?.name ??
                info.view?.small?.en?.name ??
                info.name ??
                "no-name";
                btn.textContent = label;
            if (label.length > 6) {
                btn.style.fontSize = "10px";
            }
            btn.addEventListener ("click", () => {
                setSelected(container, btn);
                information2Id = info.id;
                clickTypeBtn = false;
                const information2Label = document.getElementById("information2");
                const information2Name = getName("information2", information2Id)
                information2Label.textContent = "案内2:" + information2Name
                frame = 0;
                if (config.setSwitchingTime) {
                    setTimeSetting();
                }
                startRenderLoop();
            });
            container.appendChild(btn);
        });
    }
}
function createLineButtons() {
    const container = document.getElementById("lineButtons");
    container.innerHTML = "";
    const informationCategory = getCategory("line");
    if (!informationCategory) return;
    const normalBtn = document.createElement("button");
    container.classList.remove("groupedButtons", "normalButtons");
    if (config.lineDistinction) {
        container.classList.add("groupedButtons");
    } else {
        container.classList.add("normalButtons");
    }
    normalBtn.textContent = "路線名なし";
    normalBtn.addEventListener ("click", () => {
        setSelected(container, normalBtn);
        if (lineId === null) {
            btn.classList.add("selected");
        }
        lineId = null;
        clickTypeBtn = false;
        const lineLabel = document.getElementById("line");
        lineLabel.textContent = "路線名:なし"
        frame = 0;
        if (config.setSwitchingTime) {
            setTimeSetting();
        }
        startRenderLoop();
    });
    container.appendChild(normalBtn);
    if (config.lineDistinction) {
        informationCategory.groups.forEach(group => {
            // ===== 無表示グループ =====
            if (group.name === "無表示" || group.id === "__ungrouped__") {
                group.items.forEach(info => {
                    const btn = document.createElement("button");
                    if (info.id === lineId) {
                        btn.classList.add("selected");
                    }
                    const label =
                        info.view?.full?.ja?.name ??
                        info.view?.full?.en?.name ??
                        info.view?.normal?.ja?.name ??
                        info.view?.normal?.en?.name ??
                        info.view?.small?.ja?.name ??
                        info.view?.small?.en?.name ??
                        info.name ??
                        "no-name";
                    btn.textContent = label;
                    btn.addEventListener("click", () => {
                        setSelected(container, btn);
                        lineId = info.id;
                        clickTypeBtn = false;
                        const lineLabel = document.getElementById("line");
                        const lineName = getName("line", lineId)
                        lineLabel.textContent = "路線名:" + lineName
                        frame = 0;
                        if (config.setSwitchingTime) {
                            setTimeSetting();
                        }
                        startRenderLoop();
                    });
                    container.appendChild(btn);
                });
                return;
            }
            // ===== 路線グループ =====
            const header = document.createElement("div");
            header.className = "groupHeader";
            header.textContent = "▸ " + group.name;
            const groupContainer = document.createElement("div");
            groupContainer.className = "groupButtons";
            groupContainer.hidden = true;
            header.addEventListener("click", () => {
                groupContainer.hidden = !groupContainer.hidden;
                header.textContent =
                    (groupContainer.hidden ? "▸ " : "▾ ") + group.name;
            });
            container.appendChild(header);
            container.appendChild(groupContainer);
            group.items.forEach(info => {
                const btn = document.createElement("button");
                if (info.id === lineId) {
                    btn.classList.add("selected");
                }
                const label =
                    info.view?.full?.ja?.name ??
                    info.view?.full?.en?.name ??
                    info.view?.normal?.ja?.name ??
                    info.view?.normal?.en?.name ??
                    info.view?.small?.ja?.name ??
                    info.view?.small?.en?.name ??
                    info.name ??
                    "no-name";
                if (label.length > 6) {
                    btn.style.fontSize = "10px";
                }
                btn.textContent = label;
                btn.addEventListener("click", () => {
                    setSelected(container, btn);
                    lineId = info.id;
                    clickTypeBtn = false;
                    const lineLabel = document.getElementById("line");
                    const lineName = getName("line", lineId)
                    lineLabel.textContent = "路線名:" + lineName
                    frame = 0;
                    if (config.setSwitchingTime) {
                        setTimeSetting();
                    }
                    startRenderLoop();
                });
            groupContainer.appendChild(btn);
            });
        });
    } else {
        const container = document.getElementById("lineButtons");
        const category = getCategory("line");
        category?.items.forEach(info => {
            const btn = document.createElement("button");
            if (info.id === lineId) {
                btn.classList.add("selected");
            }
            const label =
                info.view?.full?.ja?.name ??
                info.view?.full?.en?.name ??
                info.view?.normal?.ja?.name ??
                info.view?.normal?.en?.name ??
                info.view?.small?.ja?.name ??
                info.view?.small?.en?.name ??
                info.name ??
                "no-name";
            btn.textContent = label;
            if (label.length > 6) {
                btn.style.fontSize = "10px";
            }
            btn.addEventListener ("click", () => {
                setSelected(container, btn);
                lineId = info.id;
                clickTypeBtn = false;
                const lineLabel = document.getElementById("line");
                const lineName = getName("line", lineId)
                lineLabel.textContent = "路線名:" + lineName
                frame = 0;
                if (config.setSwitchingTime) {
                    setTimeSetting();
                }
                startRenderLoop();
            });
            container.appendChild(btn);
        });
    }
}
function setSelected(container, button) {
    container.querySelectorAll("button")
        .forEach(b => b.classList.remove("selected"));
    button.classList.add("selected");
}
function setVehicleSelectButton() {
    document.querySelectorAll(".backVehicleSelector").forEach(button => {
        button.onclick = returnToVehicleSelector;
    });
}

function getName(items, itemId) {
    const item = getItem(items, itemId);
    return (
        item.view?.normal?.ja?.name ??
        item.view?.normal2?.ja?.name ??
        item.view?.normal3?.ja?.name ??
        item.view?.small?.ja?.name ??
        item.view?.full?.ja?.name ??
        item.view?.small1?.ja?.name ??
        item.view?.small2?.ja?.name ??
        item.view?.full_small?.ja?.name ??
        item.view?.full_small1?.ja?.name ??
        item.view?.full_small2?.ja?.name ??
        ""
    );
}
const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        if (mutation.attributeName === "hidden") {
            const element = mutation.target;
            if (!element.hidden) {
                resizeButtonText();
                break;
            }
        }
    }
});
observer.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["hidden"]
});
function resizeButtonText() {
    const buttons = document.querySelectorAll("#buttonGroup button");
    buttons.forEach(button => {
        if (button.getBoundingClientRect().width === 0) return;
        const text = button.textContent.trim();
        const buttonWidth = button.getBoundingClientRect().width;
        const maxTextLength = Math.floor((buttonWidth - 12) / 12);
        if (text.length >= maxTextLength) {
            const fontSize = 16 * maxTextLength / text.length;
            button.style.fontSize = Math.max(10, fontSize) + "px";
        } else {
            button.style.fontSize = "16px";
        }
    });
}
function setTimeSetting() {
    if (typeId === null && destinationId === null) {
        document.getElementById("jaTime").hidden = true;
        document.getElementById("enTime").hidden = true;
    } else {
        if (typeId != null) {
            if (config.languageSwitching) {
                document.getElementById("jaTime").hidden = false;
                document.getElementById("enTime").hidden = false;
            } else {
                document.getElementById("jaTime").hidden = false;
            }
        }
        if (destinationId != null) {
            if(config.destinationLanguageSwitching) {
                document.getElementById("jaTime").hidden = false;
                document.getElementById("enTime").hidden = false;
            } else {
                document.getElementById("jaTime").hidden = false;
            }
        }
        if (nextId != null) {
            document.getElementById("jaTime").hidden = false;
            document.getElementById("enTime").hidden = false;
        }
    }
    if (informationId === null) {
        document.getElementById("infoTime").hidden = true;
    } else {
        document.getElementById("infoTime").hidden = false;
    }
    if (carNumberId === null) {
        document.getElementById("carNumberTime").hidden = true;
    } else {
        document.getElementById("carNumberTime").hidden = false;
    }
}
startScrollBtn.addEventListener("click", () => {
    if (!typeId && !destinationId) {
        return;
    }
    if (config.scrollSpeed) {
        scrollSpeed = config.scrollSpeed;
    }
    if (!config.scroll_normal) {
        const type = getItem ("type", typeId);
        if (!isTypeFullScreen(type)) {
            if (renderTimer !== null) {
                clearTimeout(renderTimer);
                renderTimer = null;
            }
            startRenderLoop();
            clickStartScrollBtn = true;
            startScroll();
        } else {
            return;
        }
    } else {
        startDestinationDisplayCycle();
    }
});