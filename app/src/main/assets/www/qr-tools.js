"use strict";

var QRTools = (function () {

  function attachAutocomplete(textarea, wordList) {
    if (!textarea || !wordList || !wordList.length) return null;

    var sorted = wordList.slice().sort();

    var container = document.createElement("div");
    container.className = "autocomplete-box";
    container.style.display = "none";
    textarea.parentNode.insertBefore(container, textarea.nextSibling);

    var selectedIndex = -1;
    var currentMatches = [];
    var currentWordInfo = null;

    function getCurrentWord() {
      var text = textarea.value;
      var pos = textarea.selectionStart;
      var start = pos;
      while (start > 0 && /[a-zA-Z]/.test(text[start - 1])) {
        start--;
      }
      return { start: start, end: pos, partial: text.substring(start, pos) };
    }

    function hideSuggestions() {
      container.style.display = "none";
      container.innerHTML = "";
      currentMatches = [];
      currentWordInfo = null;
      selectedIndex = -1;
    }

    function updateHighlight() {
      var items = container.querySelectorAll(".autocomplete-item");
      for (var i = 0; i < items.length; i++) {
        if (i === selectedIndex) {
          items[i].classList.add("active");
        } else {
          items[i].classList.remove("active");
        }
      }
    }

    function selectWord(index) {
      if (!currentWordInfo || index < 0 || index >= currentMatches.length) return;
      var word = currentMatches[index];
      var before = textarea.value.substring(0, currentWordInfo.start);
      var after = textarea.value.substring(currentWordInfo.end);
      textarea.value = before + word + " " + after;
      var newCursor = currentWordInfo.start + word.length + 1;
      textarea.focus();
      try { textarea.setSelectionRange(newCursor, newCursor); } catch (e) {}
      hideSuggestions();
    }

    function showSuggestions(matches, wordInfo) {
      currentMatches = matches;
      currentWordInfo = wordInfo;
      selectedIndex = -1;
      container.innerHTML = "";

      var list = document.createElement("div");
      list.className = "autocomplete-list";
      for (var i = 0; i < matches.length; i++) {
        (function (idx, word) {
          var item = document.createElement("div");
          item.className = "autocomplete-item";
          item.textContent = word;
          item.addEventListener("mousedown", function (e) {
            e.preventDefault();
            selectWord(idx);
          });
          list.appendChild(item);
        })(i, matches[i]);
      }
      container.appendChild(list);
      container.style.display = "block";
    }

    function update() {
      var info = getCurrentWord();
      if (info.partial.length === 0) {
        hideSuggestions();
        return;
      }
      var lower = info.partial.toLowerCase();
      var matches = [];
      for (var i = 0; i < sorted.length && matches.length < 8; i++) {
        if (sorted[i].length >= lower.length &&
            sorted[i].substring(0, lower.length) === lower) {
          matches.push(sorted[i]);
        }
      }
      if (matches.length > 0) {
        showSuggestions(matches, info);
      } else {
        hideSuggestions();
      }
    }

    textarea.addEventListener("input", update);

    textarea.addEventListener("keydown", function (e) {
      if (container.style.display === "none" || currentMatches.length === 0) return;
      var key = e.key;
      if (key === "ArrowDown") {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % currentMatches.length;
        updateHighlight();
      } else if (key === "ArrowUp") {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + currentMatches.length) % currentMatches.length;
        updateHighlight();
      } else if (key === "Tab") {
        e.preventDefault();
        selectWord(selectedIndex >= 0 ? selectedIndex : 0);
      } else if (key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        selectWord(selectedIndex);
      } else if (key === "Escape") {
        e.preventDefault();
        hideSuggestions();
      }
    });

    textarea.addEventListener("blur", function () {
      setTimeout(hideSuggestions, 200);
    });

    return { hide: hideSuggestions };
  }

  var scanModal = null;
  var scanVideo = null;
  var scanStream = null;
  var scanCanvas = document.createElement("canvas");
  var scanCallback = null;
  var scanAnimationId = null;

  function ensureScanModal() {
    if (scanModal) return;
    scanModal = document.createElement("div");
    scanModal.className = "qr-modal";
    scanModal.style.display = "none";
    scanModal.innerHTML =
      '<div class="qr-modal-content">' +
      '<h3>扫码识别</h3>' +
      '<div class="qr-video-wrap"><video id="qr-video" autoplay playsinline muted></video></div>' +
      '<p id="qr-scan-status" class="alert-info">正在打开摄像头…</p>' +
      '<div class="qr-modal-buttons">' +
      '<input type="file" id="qr-image-input" accept="image/*" style="display:none;">' +
      '<button id="qr-scan-pick-btn" type="button">从图片选择</button>' +
      '<button id="qr-scan-close-btn" type="button" class="qr-btn-danger">关闭</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(scanModal);

    scanVideo = scanModal.querySelector("#qr-video");
    var imageInput = scanModal.querySelector("#qr-image-input");

    scanModal.querySelector("#qr-scan-close-btn").addEventListener("click", closeScanner);
    scanModal.querySelector("#qr-scan-pick-btn").addEventListener("click", function () {
      imageInput.click();
    });

    imageInput.addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (file) decodeImageFile(file);
      e.target.value = "";
    });
  }

  function setScanStatus(msg, isDanger) {
    if (!scanModal) return;
    var el = scanModal.querySelector("#qr-scan-status");
    el.textContent = msg;
    el.className = isDanger ? "alert-danger" : "alert-info";
  }

  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScanStatus("本设备不支持摄像头扫码，请点「从图片选择」。", true);
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(function (stream) {
        scanStream = stream;
        scanVideo.srcObject = stream;
        setScanStatus("将二维码对准摄像头…", false);
        scanLoop();
      })
      .catch(function (err) {
        setScanStatus("无法打开摄像头：" + (err && err.message ? err.message : err) +
          "，可改用「从图片选择」。", true);
      });
  }

  function scanLoop() {
    if (!scanStream || !scanModal || scanModal.style.display === "none") return;
    if (scanVideo.readyState === scanVideo.HAVE_ENOUGH_DATA) {
      var w = scanVideo.videoWidth;
      var h = scanVideo.videoHeight;
      if (w > 0 && h > 0) {
        scanCanvas.width = w;
        scanCanvas.height = h;
        var ctx = scanCanvas.getContext("2d");
        ctx.drawImage(scanVideo, 0, 0, w, h);
        try {
          var imageData = ctx.getImageData(0, 0, w, h);
          var code = jsQR(imageData.data, w, h, { inversionAttempts: "attemptBoth" });
          if (code && code.data) {
            onScanSuccess(code.data);
            return;
          }
          var minSide = Math.min(w, h);
          var cropSize = Math.floor(minSide * 0.6);
          if (cropSize > 200) {
            var cx = Math.floor((w - cropSize) / 2);
            var cy = Math.floor((h - cropSize) / 2);
            var cropData = ctx.getImageData(cx, cy, cropSize, cropSize);
            var code2 = jsQR(cropData.data, cropSize, cropSize, { inversionAttempts: "attemptBoth" });
            if (code2 && code2.data) {
              onScanSuccess(code2.data);
              return;
            }
          }
        } catch (e) {}
      }
    }
    scanAnimationId = requestAnimationFrame(scanLoop);
  }

  function decodeImageFile(file) {
    setScanStatus("正在识别图片…", false);
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var maxSide = 1200;
        var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        var dw = Math.round(img.width * scale);
        var dh = Math.round(img.height * scale);
        scanCanvas.width = dw;
        scanCanvas.height = dh;
        var ctx = scanCanvas.getContext("2d");
        ctx.drawImage(img, 0, 0, dw, dh);
        try {
          var imageData = ctx.getImageData(0, 0, dw, dh);
          var code = jsQR(imageData.data, dw, dh, { inversionAttempts: "attemptBoth" });
          if (code && code.data) {
            onScanSuccess(code.data);
          } else {
            setScanStatus("未能在图片中识别到二维码。", true);
          }
        } catch (e) {
          setScanStatus("图片识别失败：" + e.message, true);
        }
      };
      img.onerror = function () {
        setScanStatus("无法加载该图片。", true);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function onScanSuccess(text) {
    closeScanner();
    if (scanCallback) {
      var cb = scanCallback;
      scanCallback = null;
      var cleaned = text.replace(/^\uFEFF/, "");
      cb(cleaned);
    }
  }

  function closeScanner() {
    if (scanAnimationId) {
      cancelAnimationFrame(scanAnimationId);
      scanAnimationId = null;
    }
    if (scanStream) {
      scanStream.getTracks().forEach(function (t) { t.stop(); });
      scanStream = null;
    }
    if (scanVideo) scanVideo.srcObject = null;
    if (scanModal) scanModal.style.display = "none";
  }

  function openScanner(onSuccess) {
    ensureScanModal();
    scanCallback = onSuccess;
    scanModal.style.display = "flex";
    setScanStatus("正在打开摄像头…", false);
    startCamera();
  }

  var genModal = null;
  var genQrInstance = null;
  var genTarget = null;

  function ensureGenModal() {
    if (genModal) return;
    genModal = document.createElement("div");
    genModal.className = "qr-modal";
    genModal.style.display = "none";
    genModal.innerHTML =
      '<div class="qr-modal-content">' +
      '<h3>二维码</h3>' +
      '<div id="qr-gen-area" class="qr-gen-area"></div>' +
      '<p class="alert-info">请用其他设备扫码读取；关闭后二维码将立即清除。</p>' +
      '<div class="qr-modal-buttons">' +
      '<button id="qr-gen-close-btn" type="button" class="qr-btn-danger">关闭</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(genModal);
    genModal.querySelector("#qr-gen-close-btn").addEventListener("click", closeGenerator);
    genTarget = genModal.querySelector("#qr-gen-area");
  }

  function openGenerator(text) {
    ensureGenModal();
    if (genQrInstance) {
      try { genQrInstance.clear(); } catch (e) {}
      genQrInstance = null;
    }
    genTarget.innerHTML = "";

    if (!text || text.trim() === "") {
      genTarget.innerHTML = '<p class="alert-danger">没有可生成二维码的内容。</p>';
    } else {
      try {
        genQrInstance = new QRCode(genTarget, {
          text: text,
          width: 360,
          height: 360,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
      } catch (e) {
        genTarget.innerHTML = '<p class="alert-danger">生成二维码失败：' + e.message + "</p>";
      }
    }
    genModal.style.display = "flex";
  }

  function closeGenerator() {
    if (genQrInstance) {
      try { genQrInstance.clear(); } catch (e) {}
      genQrInstance = null;
    }
    if (genTarget) genTarget.innerHTML = "";
    if (genModal) genModal.style.display = "none";
  }

  function cleanup() {
    closeScanner();
    closeGenerator();
  }

  return {
    attachAutocomplete: attachAutocomplete,
    openScanner: openScanner,
    openGenerator: openGenerator,
    cleanup: cleanup
  };
})();
