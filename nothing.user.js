// ==UserScript==
// @name         GeoFS增強版 - 地圖切換與3D Tiles控制
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  按下D鍵切換Google Earth和Bing Maps，按下單引號(')切換3D Tiles開關
// @author       Modified
// @match        https://www.geo-fs.com/geofs.php*
// @match        http://www.geo-fs.com/geofs.php*
// @match        https://geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @icon         https://www.geo-fs.com/favicon.ico
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    let currentProvider = "bing"; // 預設為Bing
    let tiles3DEnabled = false; // 3D Tiles狀態
    let tileset3D = null; // 儲存3D Tileset物件
    window.geofsNewHDState = true;

    function ensureTerrainProvider() {
        if (!window.geofs.api.viewer.terrainProvider || window.geofs.api.viewer.terrainProvider.constructor.name === 'EllipsoidTerrainProvider') {
            window.geofs.api.viewer.terrainProvider = new window.geofs.api.FlatRunwayTerrainProvider({
                baseProvider: new window.Cesium.CesiumTerrainProvider({
                    url: "https://data2.geo-fs.com/srtm/",
                    requestWaterMask: false,
                    requestVertexNormals: true
                }),
                bypass: false,
                maximumLevel: 12
            });
        }
    }

    function setGoogleProvider() {
        window.geofs.api.imageryProvider = new window.Cesium.UrlTemplateImageryProvider({
            maximumLevel: 21,
            hasAlphaChannel: true,
            subdomains: ["mt0", "mt1", "mt2", "mt3"],
            url: "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
        });
        window.geofs.api.setImageryProvider(window.geofs.api.imageryProvider, false);
        ensureTerrainProvider();
        currentProvider = "google";
        console.log("切換到 Google Earth HD");
        showNotification("切換到 Google Earth HD");
    }

    function setBingProvider() {
        window.Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4MGYwZGY2Yy04MjhjLTRiZGYtYWI2MS00ZTdiYjdjYjZiNTAiLCJpZCI6MjE5Mzk5LCJpYXQiOjE3MTczMTcxMDV9.TlcOjfjsc7-hIIiy7ReCyM_2mJ5gyMGIAN77g3qE-Kg';
        window.geofs.api.imageryProvider = new window.Cesium.IonImageryProvider({assetId: 2});
        window.geofs.api.setImageryProvider(window.geofs.api.imageryProvider, false, null, null, null, 'bing');
        ensureTerrainProvider();
        currentProvider = "bing";
        console.log("切換到 Bing Maps HD");
        showNotification("切換到 Bing Maps HD");
    }

    function toggle3DTiles() {
        try {
            if (!window.geofs.api.viewer.scene.primitives) {
                console.error("Scene primitives not available");
                return;
            }

            if (tiles3DEnabled) {
                // 關閉3D Tiles
                if (tileset3D) {
                    window.geofs.api.viewer.scene.primitives.remove(tileset3D);
                    tileset3D = null;
                }
                tiles3DEnabled = false;
                console.log("3D Tiles 已關閉");
                showNotification("3D Tiles 已關閉");
            } else {
                // 開啟3D Tiles
                tileset3D = new window.Cesium.Cesium3DTileset({
                    url: window.Cesium.IonResource.fromAssetId(2275207)
                });
                window.geofs.api.viewer.scene.primitives.add(tileset3D);
                tiles3DEnabled = true;
                console.log("3D Tiles 已開啟");
                showNotification("3D Tiles 已開啟");
            }
        } catch (error) {
            console.error("切換3D Tiles時發生錯誤:", error);
            showNotification("3D Tiles 切換失敗");
        }
    }

    function toggleProvider() {
        const currentTerrain = window.geofs.api.viewer.terrainProvider;

        if (currentProvider === "google") {
            setBingProvider();
        } else {
            setGoogleProvider();
        }

        if (!window.geofs.api.viewer.terrainProvider ||
            window.geofs.api.viewer.terrainProvider.constructor.name === 'EllipsoidTerrainProvider') {
            window.geofs.api.viewer.terrainProvider = currentTerrain;
        }
    }

    function showNotification(message) {
        // 創建通知元素
        const notification = document.createElement('div');
        notification.innerHTML = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10000;
            transition: opacity 0.3s;
        `;

        document.body.appendChild(notification);

        // 3秒後淡出並移除
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    window.geofs.geoIpUpdate = function() {
        document.body.classList.add("geofs-hd");

        if (!window.geofs.api.viewer.terrainProvider ||
            window.geofs.api.viewer.terrainProvider.constructor.name === 'EllipsoidTerrainProvider') {
            window.geofs.api.viewer.terrainProvider = window.geofs.api.flatRunwayTerrainProviderInstance = new window.geofs.api.FlatRunwayTerrainProvider({
                baseProvider: new window.Cesium.CesiumTerrainProvider({
                    url: "https://data2.geo-fs.com/srtm/",
                    requestWaterMask: false,
                    requestVertexNormals: true
                }),
                bypass: false,
                maximumLevel: 12
            });
        }

        if (currentProvider === "google") {
            setGoogleProvider();
        } else {
            setBingProvider();
        }
    };

    window.executeOnEventDone("geofsStarted", function() {
        if (window.geofs.api.hdOn === window.geofsNewHDState) return;
        window.jQuery("body").trigger("terrainProviderWillUpdate");
        window.geofs.geoIpUpdate();
        window.geofs.api.hdOn = window.geofsNewHDState;
        window.geofs.api.renderingQuality();
        window.jQuery("body").trigger("terrainProviderUpdate");
    });

    // 移除廣告
    setTimeout(() => {
        const adBanner = document.querySelector("body > div.geofs-adbanner.geofs-adsense-container");
        if (adBanner) {
            adBanner.remove();
        }
    }, 2000);

    // 鍵盤事件監聽
    document.addEventListener('keydown', function(event) {
        // 確保不在輸入框中
        if (document.activeElement.tagName !== 'INPUT' &&
            document.activeElement.tagName !== 'TEXTAREA' &&
            !document.activeElement.isContentEditable) {

            // D鍵：切換地圖提供商
            if (event.key.toLowerCase() === 'd' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
                toggleProvider();
                window.geofs.api.viewer.scene.requestRender();
            }

            // 單引號鍵：切換3D Tiles
            if (event.key === "'" && !event.ctrlKey && !event.altKey && !event.shiftKey) {
                toggle3DTiles();
                window.geofs.api.viewer.scene.requestRender();
            }
        }
    });

    function main() {
        try {
            setBingProvider(); // 預設改為Bing
            window.geofs.api.analytics.event('geofs', 'mode', 'hd', 1);
            console.log("GeoFS增強版已載入");
            console.log("快捷鍵：D = 切換地圖, ' = 切換3D建築");
            showNotification("GeoFS增強版已載入<br>D = 切換地圖 | ' = 切換3D建築");
        } catch (error) {
            console.error("初始化錯誤:", error);
        }
    }

    function executeFunctionUntilSuccess(func) {
        let intervalId;
        let attempts = 0;
        const maxAttempts = 20;

        function tryExecute() {
            attempts++;
            try {
                if (window.geofs && window.geofs.api && window.Cesium) {
                    func();
                    clearInterval(intervalId);
                    console.log("GeoFS增強版初始化成功");
                } else if (attempts >= maxAttempts) {
                    clearInterval(intervalId);
                    console.error("GeoFS增強版初始化失敗 - 超過最大嘗試次數");
                }
            } catch (error) {
                console.error("初始化嘗試失敗:", error);
                if (attempts >= maxAttempts) {
                    clearInterval(intervalId);
                }
            }
        }
        intervalId = setInterval(tryExecute, 3000);
    }

    executeFunctionUntilSuccess(main);

    // 全域函數
    window.toggleGeoFSProvider = toggleProvider;
    window.setGoogleProvider = setGoogleProvider;
    window.setBingProvider = setBingProvider;
    window.toggle3DTiles = toggle3DTiles;

})();
