"use strict";

var BIP39Converter = (function () {

  function detectLanguage(words) {
    if (!words || words.length === 0) return "unknown";
    var sample = words[0];
    if (/[\u4e00-\u9fa5]/.test(sample)) {
      return "chinese";
    }
    if (/[a-zA-Z]/.test(sample)) {
      return "english";
    }
    return "unknown";
  }

  function parseInput(text) {
    if (!text) return [];
    var cleaned = text.trim();
    var tokens = cleaned.split(/[\s,，\n]+/);
    return tokens.filter(function (t) { return t.length > 0; });
  }

  function convertToChinese(englishWords) {
    var result = [];
    var errors = [];
    for (var i = 0; i < englishWords.length; i++) {
      var word = englishWords[i].toLowerCase();
      var idx = englishWords.indexOf(word);
      if (idx >= 0 && idx < chineseWords.length) {
        result.push(chineseWords[idx]);
      } else {
        errors.push({ position: i + 1, word: englishWords[i] });
        result.push("[?]");
      }
    }
    return { result: result, errors: errors };
  }

  function convertToEnglish(chineseWordsInput) {
    var result = [];
    var errors = [];
    for (var i = 0; i < chineseWordsInput.length; i++) {
      var word = chineseWordsInput[i];
      var idx = chineseWords.indexOf(word);
      if (idx >= 0 && idx < englishWords.length) {
        result.push(englishWords[idx]);
      } else {
        errors.push({ position: i + 1, word: word });
        result.push("[?]");
      }
    }
    return { result: result, errors: errors };
  }

  function convert(text) {
    var words = parseInput(text);
    if (words.length === 0) {
      return { output: "", errors: [], lang: "unknown", wordCount: 0 };
    }
    var lang = detectLanguage(words);
    var conversion;
    if (lang === "english") {
      conversion = convertToChinese(words);
    } else if (lang === "chinese") {
      conversion = convertToEnglish(words);
    } else {
      return { output: "", errors: [{ position: 0, word: words[0] }], lang: "unknown", wordCount: 0 };
    }
    var separator = lang === "english" ? "" : " ";
    return {
      output: conversion.result.join(separator),
      errors: conversion.errors,
      lang: lang,
      wordCount: words.length
    };
  }

  return {
    convert: convert,
    parseInput: parseInput,
    detectLanguage: detectLanguage
  };
})();
