"use strict";

function $query(selectors) {
  return document.querySelector(selectors);
}

function $queryAll(selectors) {
  return document.querySelectorAll(selectors);
}

window._clearSensitiveData = function () {
  if (window.QRTools) QRTools.cleanup();
  var textareas = document.querySelectorAll("textarea");
  for (var i = 0; i < textareas.length; i++) {
    textareas[i].value = "";
  }
  var outputs = document.querySelectorAll("[data-clear-on-pause]");
  for (var j = 0; j < outputs.length; j++) {
    outputs[j].textContent = "";
  }
  document.activeElement && document.activeElement.blur();
};
