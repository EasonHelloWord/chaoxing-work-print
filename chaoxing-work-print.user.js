// ==UserScript==
// @name         学习通作业题目答案打印整理
// @namespace    https://chaoxing-print-helper.local/
// @version      1.5.8
// @description  在学习通作业详情页整理题目、选项、正确答案和解析，生成适合打印的页面。
// @author       Eason Jan
// @license      MIT
// @homepageURL  https://github.com/EasonHelloWord/chaoxing-work-print
// @supportURL   https://github.com/EasonHelloWord/chaoxing-work-print/issues
// @updateURL    https://raw.githubusercontent.com/EasonHelloWord/chaoxing-work-print/main/chaoxing-work-print.user.js
// @downloadURL  https://raw.githubusercontent.com/EasonHelloWord/chaoxing-work-print/main/chaoxing-work-print.user.js
// @match        https://mooc1.chaoxing.com/mooc-ans/mooc2/work/view*
// @match        https://mooc1.chaoxing.com/mooc-ans/mooc2/work/dowork*
// @match        https://mooc1.chaoxing.com/mooc-ans/mooc2/work/list*
// @match        https://mooc1.chaoxing.com/mooc2/work/list*
// @match        https://mooc1-1.chaoxing.com/mooc-ans/mooc2/work/view*
// @match        https://mooc1-1.chaoxing.com/mooc-ans/mooc2/work/dowork*
// @match        https://mooc1-1.chaoxing.com/mooc-ans/mooc2/work/list*
// @match        https://mooc1-1.chaoxing.com/mooc2/work/list*
// @match        https://*.chaoxing.com/mooc-ans/mooc2/work/view*
// @match        https://*.chaoxing.com/mooc-ans/mooc2/work/dowork*
// @match        https://*.chaoxing.com/mooc-ans/mooc2/work/list*
// @match        https://*.chaoxing.com/mooc2/work/list*
// @match        https://*.chaoxing.com/exam-ans/mooc2/exam/exam-list*
// @match        https://*.chaoxing.com/exam-ans/exam/test/look*
// @match        https://*.chaoxing.com/exam-ans/exam/test/reVersionPaperMarkContentNew*
// @match        https://mooc2-ans.chaoxing.com/mooc2-ans/mycourse/stu*
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @connect      chaoxing.com
// @connect      *.chaoxing.com
// @connect      p.ananas.chaoxing.com
// @connect      *.ananas.chaoxing.com
// @connect      mooc1.chaoxing.com
// @connect      mooc1-1.chaoxing.com
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  if (window.__CHAOXING_PRINT_HELPER_LOADED__) return;
  window.__CHAOXING_PRINT_HELPER_LOADED__ = true;

  const STYLE_ID = "cx-print-helper-style";
  const PANEL_ID = "cx-print-helper-panel";
  const NO_ANSWER_MARK = "无答案";
  const DETAIL_CACHE_VERSION = "v1";
  const DETAIL_CACHE_TTL = 2 * 60 * 60 * 1000;
  const BATCH_CATEGORY_LABELS = {
    answered: "有答案",
    reviewing: "待批阅",
    unfinished: "未完成",
    overdue: "超时/过期",
    unknown: "其他",
  };
  const QUESTION_TYPE_FILTERS = [
    { key: "single", label: "单选题", pattern: /单选/ },
    { key: "multiple", label: "多选题", pattern: /多选/ },
    { key: "judgement", label: "判断题", pattern: /判断|正误|对错/ },
    { key: "blank", label: "填空题", pattern: /填空/ },
    { key: "short", label: "简答题", pattern: /简答|问答/ },
    { key: "essay", label: "论述题", pattern: /论述|作文|写作/ },
    { key: "calculation", label: "计算题", pattern: /计算/ },
    { key: "other", label: "其他题型", pattern: null },
  ];

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: min(430px, calc(100vw - 28px));
        max-height: calc(100vh - 72px);
        overflow: hidden;
        padding: 12px;
        background: rgba(255, 255, 255, .98);
        border: 1px solid #d7dde8;
        border-radius: 10px;
        box-shadow: 0 14px 38px rgba(20, 35, 60, .18);
        font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      #${PANEL_ID} .cx-row {
        display: grid;
        grid-template-columns: 1fr repeat(2, auto);
        align-items: center;
        gap: 8px;
      }
      #${PANEL_ID} .cx-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      #${PANEL_ID} .cx-actions button {
        min-width: 0;
        min-height: 38px;
        padding: 8px 10px;
      }
      #${PANEL_ID} .cx-primary-action {
        min-height: 42px;
        font-size: 15px;
      }
      #${PANEL_ID} .cx-secondary-action {
        width: 100%;
      }
      #${PANEL_ID} .cx-format-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 104px;
        gap: 8px;
      }
      #${PANEL_ID} .cx-single-main-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 8px;
      }
      #${PANEL_ID} .cx-single-file-row {
        grid-template-columns: minmax(0, 1fr) 104px;
      }
      #${PANEL_ID} .cx-format-row .cx-format-select {
        width: 100%;
      }
      #${PANEL_ID} .cx-format-row button {
        white-space: nowrap;
      }
      #${PANEL_ID} button {
        border: 1px solid #2563eb;
        border-radius: 8px;
        background: #2563eb;
        color: #fff;
        padding: 7px 10px;
        cursor: pointer;
        font: inherit;
        font-weight: 600;
      }
      #${PANEL_ID} button.secondary {
        background: #fff;
        color: #2563eb;
      }
      #${PANEL_ID} select {
        min-width: 0;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #fff;
        color: #334155;
        padding: 7px 9px;
        font: inherit;
        font-size: 12px;
      }
      #${PANEL_ID} button:disabled {
        cursor: not-allowed;
        opacity: .65;
      }
      #${PANEL_ID} .cx-count {
        display: inline-flex;
        align-items: center;
        color: #334155;
        padding: 0 2px;
        font-weight: 600;
      }
      #${PANEL_ID} .cx-options {
        display: none;
        gap: 10px;
        max-height: min(52vh, 420px);
        overflow: auto;
        padding: 10px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 9px;
      }
      #${PANEL_ID}.show-settings .cx-options {
        display: flex;
        flex-direction: column;
      }
      #${PANEL_ID} .cx-option-title {
        color: #0f172a;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 6px;
      }
      #${PANEL_ID} .cx-option-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px 12px;
      }
      #${PANEL_ID} .cx-icon {
        width: 34px;
        height: 34px;
        padding: 0;
        border-color: #cbd5e1;
        background: #fff;
        color: #334155;
        font-size: 17px;
        line-height: 1;
      }
      #${PANEL_ID}.is-collapsed {
        width: auto;
        height: auto;
        max-height: none;
        overflow: visible;
        padding: 8px;
      }
      #${PANEL_ID}.is-collapsed .cx-options,
      #${PANEL_ID}.is-collapsed .cx-actions,
      #${PANEL_ID}.is-collapsed .cx-list-tools,
      #${PANEL_ID}.is-collapsed .cx-work-list,
      #${PANEL_ID}.is-collapsed .cx-row > :not(.cx-collapse) {
        display: none;
      }
      #${PANEL_ID} .cx-collapse {
        margin-left: auto;
      }
      #${PANEL_ID} .cx-list-tools {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        color: #64748b;
        font-size: 12px;
      }
      #${PANEL_ID} .cx-link {
        border: 0;
        background: transparent;
        color: #2563eb;
        padding: 2px 4px;
        font-size: 12px;
      }
      #${PANEL_ID} .cx-inline-check {
        padding: 2px 4px;
        white-space: nowrap;
      }
      #${PANEL_ID} .cx-inline-check .cx-box {
        width: 13px;
        height: 13px;
      }
      #${PANEL_ID} .cx-check {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        border: 0;
        background: transparent;
        color: #475569;
        padding: 2px;
        font-size: 12px;
        line-height: 1.3;
        text-align: left;
        cursor: pointer;
      }
      #${PANEL_ID} .cx-box {
        width: 14px;
        height: 14px;
        box-sizing: border-box;
        border: 1px solid #94a3b8;
        border-radius: 3px;
        background: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 11px;
        line-height: 1;
        flex: 0 0 auto;
      }
      #${PANEL_ID} .cx-check[aria-checked="true"] .cx-box,
      #${PANEL_ID} .cx-work-item[aria-checked="true"] .cx-box {
        background: #2563eb;
        border-color: #2563eb;
      }
      #${PANEL_ID} .cx-check[aria-checked="true"] .cx-box::after,
      #${PANEL_ID} .cx-work-item[aria-checked="true"] .cx-box::after {
        content: "✓";
      }
      #${PANEL_ID} .cx-work-list {
        max-height: min(32vh, 240px);
        overflow: auto;
        padding: 6px;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 9px;
      }
      #${PANEL_ID} .cx-work-item {
        display: grid;
        grid-template-columns: auto auto minmax(0, 1fr) auto;
        gap: 7px;
        align-items: center;
        padding: 7px 6px;
        border-radius: 7px;
        cursor: pointer;
      }
      #${PANEL_ID} .cx-work-item:hover {
        background: #f8fafc;
      }
      #${PANEL_ID} .cx-work-item[draggable="true"] {
        cursor: grab;
      }
      #${PANEL_ID} .cx-work-item.is-dragging {
        opacity: .45;
      }
      #${PANEL_ID} .cx-drag {
        color: #94a3b8;
        cursor: grab;
        font-size: 13px;
        line-height: 1;
        user-select: none;
      }
      #${PANEL_ID} .cx-work-title {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #334155;
        font-size: 12px;
      }
      #${PANEL_ID} .cx-badge {
        color: #64748b;
        background: #f1f5f9;
        border-radius: 999px;
        padding: 1px 6px;
        font-size: 11px;
        white-space: nowrap;
      }
      #${PANEL_ID} label:not(.cx-work-item) {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        color: #475569;
        font-size: 12px;
        white-space: nowrap;
      }
      #${PANEL_ID} input[type="checkbox"] {
        width: 14px;
        height: 14px;
        margin: 0;
        accent-color: #2563eb;
        cursor: pointer;
      }
      @media print {
        #${PANEL_ID} {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function cleanText(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t\r\n]+/g, " ")
      .trim();
  }

  function storageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {}
  }

  function sessionGet(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function sessionSet(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {}
  }

  function sessionRemove(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {}
  }

  function writeWindowMessage(win, title, message) {
    if (!win) return;
    win.document.open();
    win.document.write(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 32px; color: #1f2937; font: 14px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    h1 { margin: 0 0 10px; font-size: 20px; }
    p { margin: 0; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(message)}</p>
</body>
</html>`);
    win.document.close();
  }

  function openExportWindow(title, message) {
    const win = window.open("", "_blank");
    if (win) writeWindowMessage(win, title, message || "正在整理作业内容，请稍候...");
    return win;
  }

  function absolutizeUrl(url, baseUrl = location.href) {
    if (!url) return "";
    try {
      return new URL(url, baseUrl).href;
    } catch (error) {
      return url;
    }
  }

  function cleanHtmlFromNode(node) {
    if (!node) return "";
    const clone = node.cloneNode(true);
    clone.querySelectorAll("script, style, iframe, button, input, textarea, .aiAssistant, .popClose").forEach((el) => el.remove());
    clone.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("data-original") || img.getAttribute("src");
      if (src) img.setAttribute("src", absolutizeUrl(src));
      img.removeAttribute("onclick");
      img.removeAttribute("onerror");
      img.removeAttribute("onload");
      img.style.maxWidth = "100%";
      img.style.height = "auto";
    });
    clone.querySelectorAll("*").forEach((el) => {
      [...el.attributes].forEach((attr) => {
        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      });
    });
    return clone.innerHTML.trim();
  }

  function imageSourcesFromHtml(html) {
    if (!html || !/<img\b/i.test(html)) return [];
    const template = document.createElement("template");
    template.innerHTML = html;
    return [...template.content.querySelectorAll("img")]
      .map((img) => img.getAttribute("src") || img.getAttribute("data-original") || "")
      .filter(Boolean);
  }

  function questionImages(question) {
    const sources = [
      ...imageSourcesFromHtml(question.stemHtml),
      ...imageSourcesFromHtml(question.rightAnswerHtml),
      ...question.options.flatMap((option) => imageSourcesFromHtml(option.html)),
    ];
    return [...new Set(sources)];
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result || "");
      reader.onerror = () => reject(reader.error || new Error("图片读取失败"));
      reader.readAsDataURL(blob);
    });
  }

  async function imageUrlToDataUrl(url, cache) {
    if (!url || /^data:/i.test(url)) return url;
    if (cache.has(url)) return cache.get(url);
    try {
      const blob = await requestBlob(url);
      const dataUrl = await blobToDataUrl(blob);
      cache.set(url, dataUrl);
      return dataUrl;
    } catch (error) {
      cache.set(url, url);
      return url;
    }
  }

  async function transformHtmlImages(html, imageMode, cache) {
    if (!html || imageMode !== "base64" || !/<img\b/i.test(html)) return html || "";
    const template = document.createElement("template");
    template.innerHTML = html;
    const images = [...template.content.querySelectorAll("img")];
    for (const img of images) {
      const src = img.getAttribute("src") || img.getAttribute("data-original") || "";
      if (src) img.setAttribute("src", await imageUrlToDataUrl(src, cache));
    }
    return template.innerHTML;
  }

  function questionTypeKey(question) {
    const type = cleanText(question.type);
    const matched = QUESTION_TYPE_FILTERS.find((filter) => filter.pattern && filter.pattern.test(type));
    return matched ? matched.key : "other";
  }

  function filterQuestionsByType(questions, selectedTypes) {
    if (!selectedTypes) return questions;
    if (!selectedTypes.size) return [];
    return questions.filter((question) => selectedTypes.has(questionTypeKey(question)));
  }

  async function prepareQuestionsForExport(questions, options = {}) {
    const imageCache = new Map();
    const filtered = filterQuestionsByType(questions, options.selectedQuestionTypes);
    const prepared = [];
    for (const question of filtered) {
      prepared.push({
        ...question,
        stemHtml: await transformHtmlImages(question.stemHtml, options.imageMode, imageCache),
        rightAnswerHtml: await transformHtmlImages(question.rightAnswerHtml, options.imageMode, imageCache),
        options: await Promise.all(question.options.map(async (option) => ({
          ...option,
          html: await transformHtmlImages(option.html, options.imageMode, imageCache),
        }))),
      });
    }
    return prepared.map((question, index) => ({ ...question, number: String(index + 1) }));
  }

  function textFromNode(node) {
    if (!node) return "";
    return cleanText(node.innerText || node.textContent || "");
  }

  function stripLeadingQuestionNumber(node) {
    if (!node) return;
    const nodeFilter = node.ownerDocument.defaultView ? node.ownerDocument.defaultView.NodeFilter : NodeFilter;
    const walker = node.ownerDocument.createTreeWalker(node, nodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode && !cleanText(textNode.nodeValue)) {
      textNode = walker.nextNode();
    }
    if (textNode) {
      textNode.nodeValue = textNode.nodeValue.replace(/^\s*\d+\s*[.．、]\s*/, "");
    }
  }

  function headingStemNode(heading) {
    if (!heading) return null;
    const clone = heading.cloneNode(true);
    clone.querySelectorAll(".colorShallow").forEach((el) => el.remove());
    stripLeadingQuestionNumber(clone);
    return clone;
  }

  function parseQuestion(item, fallbackIndex) {
    const heading = item.querySelector(".mark_name");
    const stemNode = item.querySelector(".qtContent") || headingStemNode(heading);
    const typeNode = heading ? heading.querySelector(".colorShallow") : null;
    const answerNode = item.querySelector(".rightAnswerContent");
    const myAnswerNode = item.querySelector(".stuAnswerContent");
    const analysisNode = item.querySelector(".qtAnalysis");

    const headingText = textFromNode(heading);
    const numberMatch = headingText.match(/^\s*(\d+)[.．、]/);
    const number = numberMatch ? numberMatch[1] : String(fallbackIndex + 1);
    const type = cleanText((typeNode ? textFromNode(typeNode) : "").replace(/[()（）]/g, ""));
    const stemHtml = cleanHtmlFromNode(stemNode);
    const stemText = textFromNode(stemNode);

    let options = [...item.querySelectorAll(".qtDetail > li")].map((li, index) => {
      const raw = textFromNode(li);
      const letterMatch = raw.match(/^([A-Z])\s*[.．、]/i);
      return {
        letter: letterMatch ? letterMatch[1].toUpperCase() : String.fromCharCode(65 + index),
        text: raw.replace(/^[A-Z]\s*[.．、]\s*/i, ""),
        html: cleanHtmlFromNode(li),
      };
    });
    if (!options.length) {
      options = [...item.querySelectorAll(".stem_answer .answerBg")].map((option, index) => {
        const letterNode = option.querySelector(".num_option");
        const textNode = option.querySelector(".answer_p") || option;
        const letter = (letterNode ? textFromNode(letterNode) : String.fromCharCode(65 + index)).toUpperCase();
        return {
          letter,
          text: textFromNode(textNode),
          html: `<span class="option-letter">${escapeHtml(letter)}.</span> ${cleanHtmlFromNode(textNode)}`,
        };
      });
    }

    const rightAnswer = textFromNode(answerNode);
    const rightAnswerHtml = cleanHtmlFromNode(answerNode);
    const myAnswer = textFromNode(myAnswerNode);
    const analysis = textFromNode(analysisNode);

    return {
      number,
      type,
      stemHtml,
      stemText,
      options,
      rightAnswer,
      rightAnswerHtml,
      myAnswer,
      analysis,
    };
  }

  function collectQuestions() {
    const nodes = [...document.querySelectorAll(".questionLi")];
    return nodes.map(parseQuestion).filter((q) => q.stemText || q.options.length || q.rightAnswer || q.rightAnswerHtml);
  }

  function collectQuestionsFromRoot(root) {
    const nodes = [...root.querySelectorAll(".questionLi")];
    return nodes.map(parseQuestion).filter((q) => q.stemText || q.options.length || q.rightAnswer || q.rightAnswerHtml);
  }

  function getPageTitle(root = document) {
    return textFromNode(root.querySelector(".mark_title")) || root.title || document.title || "学习通作业";
  }

  function optionTextByAnswer(question) {
    const letters = answerLetters(question);
    const matched = question.options.filter((opt) => letters.includes(opt.letter));
    if (!matched.length) return "";
    return matched.map((opt) => `${opt.letter}. ${opt.text}`).join("；");
  }

  function answerLetters(question) {
    return String(question.rightAnswer || "")
      .toUpperCase()
      .split("")
      .filter((letter) => /[A-Z]/.test(letter));
  }

  function formatRightAnswer(question) {
    const answerText = optionTextByAnswer(question);
    return answerText || question.rightAnswer || "未显示";
  }

  function compactAnswer(question) {
    return optionTextByAnswer(question) ? question.rightAnswer || "未显示" : formatRightAnswer(question);
  }

  function hasRichAnswer(question) {
    return Boolean(question.rightAnswerHtml && /<(img|svg|math|table|p|br|span|div)\b/i.test(question.rightAnswerHtml));
  }

  function buildAnswerHtml(question, includeAnswers = true) {
    if (!includeAnswers || (!question.rightAnswer && !question.rightAnswerHtml)) return "";
    if (optionTextByAnswer(question)) {
      return `<div class="answer">[答案：${escapeHtml(question.rightAnswer || "未显示")}]</div>`;
    }
    if (hasRichAnswer(question)) {
      return `<div class="answer answer-rich"><strong>答案：</strong>${question.rightAnswerHtml}</div>`;
    }
    return `<div class="answer">[答案：${escapeHtml(compactAnswer(question))}]</div>`;
  }

  function optionLayoutClass(question) {
    if (question.options.length < 2) return "opts-1";
    const lengths = question.options.map((opt) => cleanText(opt.text).length);
    const max = Math.max(...lengths);
    const avg = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    if (question.options.length >= 4 && max <= 18 && avg <= 12) return "opts-4";
    if (max <= 34 && avg <= 24) return "opts-2";
    return "opts-1";
  }

  function buildOptionHtml(question, includeAnswers = true) {
    const letters = includeAnswers ? answerLetters(question) : [];
    return question.options.map((opt) => {
      const className = letters.includes(opt.letter) ? ' class="correct-option"' : "";
      return `<li${className}>${opt.html}</li>`;
    }).join("");
  }

  function buildQuestionArticlesHtml(questions, options = {}) {
    const includeAnswers = options.includeAnswers !== false;
    const includeAnalysis = options.includeAnalysis !== false;
    let lastType = "";
    return questions.map((q) => {
      const options = buildOptionHtml(q, includeAnswers);
      const typeDivider = q.type && q.type !== lastType ? `<div class="type-divider">${escapeHtml(q.type)}</div>` : "";
      if (q.type) lastType = q.type;
      return `
        ${typeDivider}
        <article class="question">
          <div class="stem"><span class="qno">${q.number}.</span>${q.stemHtml || escapeHtml(q.stemText)}</div>
          ${options ? `<ol class="options ${optionLayoutClass(q)}">${options}</ol>` : ""}
          ${buildAnswerHtml(q, includeAnswers)}
          ${includeAnswers && includeAnalysis && q.analysis ? `<div class="analysis"><strong>解析：</strong>${escapeHtml(q.analysis)}</div>` : ""}
        </article>
      `;
    }).join("");
  }

  function printableStyle() {
    return `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #fff;
      color: #000;
      font: 13px/1.45 "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif;
    }
    .page {
      max-width: 960px;
      margin: 0 auto;
      padding: 18px 22px 28px;
      background: #fff;
      min-height: 100vh;
    }
    header {
      border-bottom: 1px solid #111827;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    h1 {
      margin: 0 0 2px;
      font-size: 18px;
      line-height: 1.3;
    }
    .meta { color: #444; font-size: 11px; }
    .toolbar {
      position: sticky;
      top: 0;
      display: flex;
      gap: 8px;
      padding: 6px 0;
      background: #fff;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 8px;
    }
    .toolbar button {
      border: 1px solid #111827;
      border-radius: 5px;
      background: #111827;
      color: #fff;
      padding: 7px 12px;
      cursor: pointer;
    }
    .work-section {
      break-before: page;
      padding-top: 8px;
    }
    .work-section:first-of-type {
      break-before: auto;
    }
    .work-title {
      margin: 8px 0 6px;
      padding: 5px 0;
      border-bottom: 1px solid #111827;
      font-size: 16px;
      line-height: 1.35;
    }
    .work-meta {
      margin: -2px 0 6px;
      color: #444;
      font-size: 11px;
    }
    .blank-page {
      break-before: page;
      break-after: page;
      page-break-before: always;
      page-break-after: always;
      min-height: 100vh;
    }
    .question {
      break-inside: avoid;
      border-bottom: 1px solid #d0d0d0;
      padding: 7px 0 6px;
    }
    .type-divider {
      margin: 10px 0 2px;
      padding: 1px 0;
      border-top: 1px solid #000;
      border-bottom: 1px solid #999;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.35;
    }
    .stem p, .options p { display: inline; margin: 0; }
    .stem {
      margin: 0;
      line-height: 1.45;
    }
    .qno {
      display: inline-block;
      min-width: 2.2em;
      font-weight: 700;
      color: #000;
    }
    .options {
      display: grid;
      gap: 2px 12px;
      margin: 4px 0 3px 2.2em;
      padding-left: 0;
      list-style: none;
    }
    .options.opts-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .options.opts-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .options.opts-1 { grid-template-columns: 1fr; }
    .options li {
      margin: 0;
      padding-left: 1.2em;
      text-indent: -1.2em;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .correct-option {
      font-weight: 700;
      text-decoration: underline;
      text-decoration-thickness: 1px;
    }
    .correct-option::before {
      content: "✓ ";
      text-indent: 0;
    }
    .answer {
      display: inline-block;
      margin: 1px 0 0 2.2em;
      padding: 0;
      color: #000;
      font-size: 12px;
      line-height: 1.35;
      font-weight: 700;
    }
    .answer-rich {
      display: block;
      font-weight: 400;
      border-left: 2px solid #000;
      padding-left: 6px;
    }
    .answer-rich p {
      display: inline;
      margin: 0;
    }
    .answer img, .answer-rich img {
      max-width: 100%;
      object-fit: contain;
      vertical-align: middle;
    }
    .analysis {
      margin: 2px 0 0 2.2em;
      color: #333;
      font-size: 12px;
      line-height: 1.4;
    }
    .hide-analysis .analysis, body:not(.show-analysis) .analysis { display: none; }
    img { max-width: 100%; height: auto; vertical-align: middle; }
    @media print {
      body { background: #fff; }
      .page { max-width: none; padding: 0; }
      .toolbar { display: none; }
      #${PANEL_ID} { display: none !important; }
      .batch-cover { display: none; }
      .batch-print .work-section { page-break-before: always; break-before: page; }
      .batch-print .work-section:first-of-type { page-break-before: auto; break-before: auto; }
      .blank-page { height: 100vh; min-height: 100vh; }
      .question { page-break-inside: avoid; }
      a { color: inherit; text-decoration: none; }
      @page { margin: 10mm 9mm; }
    }`;
  }

  function buildPrintableHtml(questions, customTitle, options = {}) {
    const title = customTitle || getPageTitle();
    const generatedAt = new Date().toLocaleString();
    const questionHtml = buildQuestionArticlesHtml(questions, options);
    const bodyClass = options.includeAnalysis === false ? "" : "show-analysis";

    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)} - 打印版</title>
  <style>${printableStyle()}</style>
</head>
<body class="${bodyClass}">
  <main class="page">
    <header>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">共 ${questions.length} 题 · 生成时间：${escapeHtml(generatedAt)}</div>
    </header>
    <div class="toolbar">
      <button onclick="window.print()">打印</button>
      <button onclick="document.body.classList.toggle('show-analysis')">显示/隐藏解析</button>
    </div>
    ${questionHtml}
  </main>
</body>
</html>`;
  }

  function buildBatchPrintFriendlyScript(enabled) {
    if (!enabled) return "";
    return `<script>
(function () {
  var PAGE_HEIGHT_PX = 1046;
  function clearBlankPages() {
    document.querySelectorAll(".blank-page").forEach(function (node) { node.remove(); });
  }
  function fillDuplexBlankPages() {
    clearBlankPages();
    if (!document.body.classList.contains("print-friendly")) return;
    var sections = Array.prototype.slice.call(document.querySelectorAll(".work-section"));
    sections.forEach(function (section, index) {
      if (index >= sections.length - 1) return;
      var pages = Math.max(1, Math.ceil(section.scrollHeight / PAGE_HEIGHT_PX));
      if (pages % 2 !== 1) return;
      var blank = document.createElement("section");
      blank.className = "blank-page";
      blank.setAttribute("aria-hidden", "true");
      section.after(blank);
    });
  }
  window.cxRefreshPrintBlanks = fillDuplexBlankPages;
  window.addEventListener("load", function () { setTimeout(fillDuplexBlankPages, 120); });
  window.addEventListener("beforeprint", fillDuplexBlankPages);
}());
<\/script>`;
  }

  function buildBatchPrintableHtml(items, title, options = {}) {
    const generatedAt = new Date().toLocaleString();
    const itemLabel = options.itemLabel || "作业";
    const sections = items.map((item) => `
      <section class="work-section">
        <h2 class="work-title">${escapeHtml(item.title)}</h2>
        <div class="work-meta">共 ${item.questions.length} 题 · 生成时间：${escapeHtml(generatedAt)}</div>
        ${buildQuestionArticlesHtml(item.questions, item.options)}
      </section>
    `).join("");
    const questionCount = items.reduce((sum, item) => sum + item.questions.length, 0);
    const showAnalysis = items.some((item) => item.options.includeAnalysis !== false);
    const bodyClasses = [
      showAnalysis ? "show-analysis" : "",
      "batch-print",
      options.printFriendly ? "print-friendly" : "",
    ].filter(Boolean).join(" ");
    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)} - PDF</title>
  <style>${printableStyle()}</style>
</head>
<body class="${bodyClasses}">
  <main class="page">
    <header class="batch-cover">
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">共 ${items.length} 个${escapeHtml(itemLabel)} · ${questionCount} 题 · 生成时间：${escapeHtml(generatedAt)}${options.printFriendly ? " · 已启用打印友好空白页" : ""}</div>
    </header>
    <div class="toolbar">
      <button onclick="window.print()">打印/保存 PDF</button>
      <button onclick="document.body.classList.toggle('show-analysis')">显示/隐藏解析</button>
      ${options.printFriendly ? `<button onclick="window.cxRefreshPrintBlanks && window.cxRefreshPrintBlanks()">刷新双面空白页</button>` : ""}
    </div>
    ${sections}
  </main>
  ${buildBatchPrintFriendlyScript(options.printFriendly)}
</body>
</html>`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildPlainText(questions, options = {}) {
    const includeAnswers = options.includeAnswers !== false;
    const includeAnalysis = options.includeAnalysis !== false;
    const lines = [getPageTitle(), `共 ${questions.length} 题`, ""];
    questions.forEach((q) => {
      lines.push(`${q.number}. ${q.stemText}`);
      questionImages(q).forEach((src) => lines.push(`图片：${src}`));
      q.options.forEach((opt) => lines.push(`${opt.letter}. ${opt.text}`));
      if (includeAnswers && (q.rightAnswer || q.rightAnswerHtml)) lines.push(`答案：${compactAnswer(q)}`);
      if (includeAnswers && includeAnalysis && q.analysis) lines.push(`解析：${q.analysis}`);
      lines.push("");
    });
    return lines.join("\n");
  }

  function buildMarkdownText(questions, title, options = {}) {
    const includeAnswers = options.includeAnswers !== false;
    const includeAnalysis = options.includeAnalysis !== false;
    const lines = [`# ${title}`, "", `共 ${questions.length} 题`, ""];
    questions.forEach((q) => {
      const type = q.type ? ` [${q.type}]` : "";
      lines.push(`## ${q.number}.${type} ${q.stemText}`);
      questionImages(q).forEach((src) => lines.push(`![图片](${src})`));
      q.options.forEach((opt) => {
        lines.push(`- ${opt.letter}. ${opt.text}`);
        imageSourcesFromHtml(opt.html).forEach((src) => lines.push(`  - 图片：${src}`));
      });
      if (includeAnswers && (q.rightAnswer || q.rightAnswerHtml)) lines.push(`答案：${compactAnswer(q)}`);
      if (includeAnswers && includeAnalysis && q.analysis) lines.push(`解析：${q.analysis}`);
      lines.push("");
    });
    return lines.join("\n");
  }

  function tomlString(value) {
    return `"""${String(value || "").replace(/"""/g, '\\"\\"\\"')}"""`;
  }

  function tomlArray(values) {
    return `[${values.map((value) => JSON.stringify(value)).join(", ")}]`;
  }

  function buildTomlText(questions, title, options = {}) {
    const includeAnswers = options.includeAnswers !== false;
    const includeAnalysis = options.includeAnalysis !== false;
    const lines = [
      `title = ${JSON.stringify(title)}`,
      `question_count = ${questions.length}`,
      `generated_at = ${JSON.stringify(new Date().toLocaleString())}`,
      "",
    ];
    questions.forEach((q) => {
      lines.push("[[questions]]");
      lines.push(`number = ${JSON.stringify(q.number)}`);
      lines.push(`type = ${JSON.stringify(q.type || "")}`);
      lines.push(`stem = ${tomlString(q.stemText)}`);
      lines.push(`images = ${tomlArray(questionImages(q))}`);
      if (includeAnswers && (q.rightAnswer || q.rightAnswerHtml)) lines.push(`answer = ${tomlString(compactAnswer(q))}`);
      if (includeAnswers && includeAnalysis && q.analysis) lines.push(`analysis = ${tomlString(q.analysis)}`);
      q.options.forEach((opt) => {
        lines.push("[[questions.options]]");
        lines.push(`letter = ${JSON.stringify(opt.letter)}`);
        lines.push(`text = ${tomlString(opt.text)}`);
        lines.push(`images = ${tomlArray(imageSourcesFromHtml(opt.html))}`);
      });
      lines.push("");
    });
    return lines.join("\n");
  }

  function buildExportContent(format, questions, title, options = {}) {
    if (format === "md") return buildMarkdownText(questions, title, options);
    if (format === "toml") return buildTomlText(questions, title, options);
    if (format === "txt") return buildPlainText(questions, options);
    return buildPrintableHtml(questions, title, options);
  }

  function exportMimeType(format) {
    if (format === "md") return "text/markdown;charset=utf-8";
    if (format === "toml") return "application/toml;charset=utf-8";
    if (format === "txt") return "text/plain;charset=utf-8";
    return "text/html;charset=utf-8";
  }

  function normalizeWorkUrl(rawUrl, baseUrl = location.href) {
    const url = new URL(absolutizeUrl(rawUrl, baseUrl), baseUrl);
    const answerId = url.searchParams.get("answerId") || "";
    if (url.pathname === "/mooc-ans/mooc2/work/task") {
      url.pathname = answerId && answerId !== "0" ? "/mooc-ans/mooc2/work/view" : "/mooc-ans/mooc2/work/dowork";
    } else if (url.pathname === "/mooc2/work/task") {
      url.pathname = answerId && answerId !== "0" ? "/mooc-ans/mooc2/work/view" : "/mooc-ans/mooc2/work/dowork";
    }
    return url.href;
  }

  function workDetailUrlCandidates(work) {
    const urls = [];
    const push = (url) => {
      if (!url) return;
      try {
        const href = new URL(url, location.href).href;
        if (!urls.includes(href)) urls.push(href);
      } catch (error) {
        if (!urls.includes(url)) urls.push(url);
      }
    };
    push(work.url);
    push(work.rawUrl);
    [work.url, work.rawUrl].forEach((source) => {
      if (!source) return;
      const url = new URL(source, location.href);
      if (/\/mooc-ans\/mooc2\/work\/(task|view|dowork)$/.test(url.pathname) || /\/mooc2\/work\/task$/.test(url.pathname)) {
        url.pathname = "/mooc-ans/mooc2/work/dowork";
        push(url.href);
        url.pathname = "/mooc-ans/mooc2/work/task";
        push(url.href);
        if (url.searchParams.get("answerId") && url.searchParams.get("answerId") !== "0") {
          url.pathname = "/mooc-ans/mooc2/work/view";
          push(url.href);
        }
      }
    });
    return urls;
  }

  function examDetailUrlCandidates(exam) {
    const urls = [];
    const push = (url) => {
      if (!url) return;
      try {
        const href = new URL(url, location.href).href;
        if (!urls.includes(href)) urls.push(href);
      } catch (error) {
        if (!urls.includes(url)) urls.push(url);
      }
    };
    push(buildExamDetailUrl(exam));
    push(exam.url);
    push(exam.rawUrl);
    push(buildExamLookUrl(exam));
    [exam.url, exam.rawUrl].forEach((source) => {
      if (!source) return;
      const url = new URL(source, location.href);
      const ctx = {
        ...exam,
        courseId: exam.courseId || url.searchParams.get("courseId") || url.searchParams.get("courseid") || "",
        classId: exam.classId || url.searchParams.get("classId") || url.searchParams.get("clazzid") || "",
        cpi: exam.cpi || url.searchParams.get("cpi") || "",
        openc: exam.openc || url.searchParams.get("openc") || "",
        examId: exam.examId || url.searchParams.get("examId") || "",
        answerId: exam.answerId || url.searchParams.get("examAnswerId") || url.searchParams.get("id") || "",
      };
      push(buildExamDetailUrl(ctx));
      push(buildExamLookUrl(ctx));
    });
    return urls;
  }

  function extractWorkRedirectUrls(html, baseUrl) {
    const urls = [];
    const push = (url) => {
      if (!url) return;
      const cleanUrl = url
        .replace(/&amp;/g, "&")
        .replace(/\\\//g, "/")
        .replace(/^['"]|['"]$/g, "");
      try {
        const href = new URL(cleanUrl, baseUrl).href;
        if (!urls.includes(href)) urls.push(href);
      } catch (error) {}
    };
    const patterns = [
      /https?:\/\/[^"'<>\\\s]+\/mooc-ans\/mooc2\/work\/(?:dowork|view|task)\?[^"'<>\\\s]+/g,
      /\/\/[^"'<>\\\s]+\/mooc-ans\/mooc2\/work\/(?:dowork|view|task)\?[^"'<>\\\s]+/g,
      /\/mooc-ans\/mooc2\/work\/(?:dowork|view|task)\?[^"'<>\\\s]+/g,
      /\/mooc2\/work\/(?:dowork|view|task)\?[^"'<>\\\s]+/g,
      /\/exam-ans\/exam\/test\/(?:look|reVersionPaperMarkContentNew)\?[^"'<>\\\s]+/g,
    ];
    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(html))) {
        push(match[0].startsWith("//") ? `${location.protocol}${match[0]}` : match[0]);
      }
    });
    return urls;
  }

  function detectWorkStatus(label) {
    const text = cleanText(label);
    const match = text.match(/超时|逾期|已过期|已截止|已结束|已关闭|已完成|待批阅|未批阅|已提交|未交|未做|未完成/);
    return match ? match[0] : "";
  }

  function workCategory(work) {
    const status = work.status || "";
    if (status === "已完成" && work.answerId && work.answerId !== "0") return "answered";
    if (/待批阅|未批阅|已提交/.test(status)) return "reviewing";
    if (/未交|未做|未完成/.test(status)) return "unfinished";
    if (/超时|逾期|已过期|已截止|已结束|已关闭/.test(status)) return "overdue";
    return "unknown";
  }

  function displayWorkStatus(work) {
    const category = workCategory(work);
    return work.status || BATCH_CATEGORY_LABELS[category] || "其他";
  }

  function normalizedTitleKey(title) {
    return cleanText(title)
      .replace(/[（(]\s*无答案\s*[）)]/g, "")
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function parseWorkList(root = document, baseUrl = location.href) {
    return [...root.querySelectorAll('li[onclick*="goTask"][data]')].map((item) => {
      const rawUrl = item.getAttribute("data") || "";
      const url = normalizeWorkUrl(rawUrl, baseUrl);
      const label = textFromNode({ innerText: item.getAttribute("aria-label") || "" });
      const params = new URL(url).searchParams;
      const workId = params.get("workId") || "";
      const answerId = params.get("answerId") || "";
      const status = detectWorkStatus(label);
      const title = cleanText(label.split(";")[0]) || textFromNode(item.querySelector(".workTit, .overHidden2, h3, p")) || "未命名作业";
      return { kind: "work", title, url, rawUrl: absolutizeUrl(rawUrl, baseUrl), workId, answerId, status };
    }).filter((work) => work.url && work.workId);
  }

  function isExamListPage(root = document) {
    return /\/exam-ans\/mooc2\/exam\/exam-list/.test(location.pathname) || Boolean(root.querySelector('[onclick*="viewExamAnswer"]'));
  }

  function isCourseHomePage() {
    return /\/mooc2-ans\/mycourse\/stu/.test(location.pathname);
  }

  function isContentPagePath(pathname = location.pathname) {
    return /\/(?:mooc-ans\/mooc2\/work|mooc2\/work|exam-ans\/(?:mooc2\/exam|exam\/test))\//.test(pathname);
  }

  function shouldSuppressFramePanel() {
    return window.top !== window.self;
  }

  function accessibleBatchSources() {
    const sources = [{ root: document, href: location.href }];
    if (window.top !== window.self) return sources;
    [...document.querySelectorAll("iframe")].forEach((frame) => {
      const src = frame.getAttribute("src") || "";
      try {
        const doc = frame.contentDocument;
        if (!doc) return;
        const href = doc.location?.href || absolutizeUrl(src);
        if (!href || href === "about:blank") return;
        if (!isContentPagePath(new URL(href, location.href).pathname) && !doc.querySelector(".questionLi, li[onclick*='goTask'][data], [onclick*='viewExamAnswer']")) return;
        sources.push({ root: doc, href });
      } catch (error) {}
    });
    return sources;
  }

  function getRootValue(root, id) {
    const node = root.getElementById ? root.getElementById(id) : root.querySelector(`#${id}`);
    return node ? node.value || "" : "";
  }

  function pageSearchParam(name, href = location.href) {
    try {
      return new URL(href, location.href).searchParams.get(name) || "";
    } catch (error) {
      return "";
    }
  }

  function examContext(root = document, href = location.href) {
    return {
      courseId: getRootValue(root, "courseId") || getRootValue(root, "courseid") || pageSearchParam("courseId", href) || pageSearchParam("courseid", href),
      classId: getRootValue(root, "classId") || getRootValue(root, "clazzid") || pageSearchParam("classId", href) || pageSearchParam("clazzid", href),
      cpi: getRootValue(root, "cpi") || pageSearchParam("cpi", href),
      openc: getRootValue(root, "openc") || pageSearchParam("openc", href),
      examId: getRootValue(root, "examId") || pageSearchParam("examId", href),
      answerId: getRootValue(root, "answerId") || pageSearchParam("examAnswerId", href) || pageSearchParam("id", href),
    };
  }

  function buildExamDetailUrl(exam) {
    if (!exam.answerId) return "";
    const params = new URLSearchParams({
      courseId: exam.courseId || "",
      classId: exam.classId || "",
      p: "1",
      id: exam.answerId,
      ut: "s",
      cpi: exam.cpi || "",
      newMooc: "true",
    });
    if (exam.openc) params.set("openc", exam.openc);
    return `https://mooc1.chaoxing.com/exam-ans/exam/test/reVersionPaperMarkContentNew?${params.toString()}`;
  }

  function buildExamLookUrl(exam) {
    if (!exam.examId || !exam.answerId) return "";
    const params = new URLSearchParams({
      courseId: exam.courseId || "",
      classId: exam.classId || "",
      examId: exam.examId,
      examAnswerId: exam.answerId,
      cpi: exam.cpi || "",
    });
    return `https://mooc1.chaoxing.com/exam-ans/exam/test/look?${params.toString()}`;
  }

  function parseExamList(root = document, baseUrl = location.href) {
    const ctx = examContext(root, baseUrl);
    return [...root.querySelectorAll('[onclick*="viewExamAnswer"]')].map((item) => {
      const onclick = item.getAttribute("onclick") || "";
      const match = onclick.match(/viewExamAnswer\(\s*['"]?(\d+)['"]?\s*,\s*['"]?(\d+)['"]?\s*\)/);
      if (!match) return null;
      const examId = match[1];
      const answerId = match[2];
      const title = textFromNode(item.querySelector(".overHidden2, .right-content p, p")) || "未命名考试";
      const status = detectWorkStatus(textFromNode(item.querySelector(".status")) || textFromNode(item)) || "已完成";
      const exam = {
        kind: "exam",
        title,
        status,
        examId,
        answerId,
        examAnswerId: answerId,
        courseId: ctx.courseId,
        classId: ctx.classId,
        cpi: ctx.cpi,
        openc: ctx.openc,
      };
      return {
        ...exam,
        url: buildExamDetailUrl(exam),
        rawUrl: buildExamLookUrl(exam),
      };
    }).filter((exam) => exam && exam.answerId);
  }

  function uniqueWorks(works) {
    const seen = new Set();
    return works.filter((work) => {
      const key = workKey(work);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function parseTotalListPages(root = document) {
    const scripts = [...root.querySelectorAll("script")].map((script) => script.textContent || "").join("\n");
    const pageNumMatch = scripts.match(/pageNum\s*:\s*(\d+)/);
    if (pageNumMatch) return Math.max(1, Number(pageNumMatch[1]));

    const pageText = textFromNode(root.querySelector("#page, .pageDiv, .pagePosition"));
    const pageNumbers = (pageText.match(/\d+/g) || []).map(Number);
    return pageNumbers.length ? Math.max(...pageNumbers) : 1;
  }

  function buildListPageUrl(firstListUrl, pageNum) {
    const url = new URL(firstListUrl, location.href);
    if (url.pathname === "/mooc2/work/list") {
      url.pathname = "/mooc-ans/mooc2/work/list";
      url.searchParams.delete("stuenc");
    }
    url.searchParams.set("status", url.searchParams.get("status") || "0");
    if (/\/work\/list/.test(url.pathname)) url.searchParams.set("topicId", url.searchParams.get("topicId") || "0");
    url.searchParams.set("pageNum", String(pageNum));
    return url.href;
  }

  function getCourseExamListUrl(root = document, href = location.href) {
    let url;
    try {
      url = new URL(href, location.href);
    } catch (error) {
      url = new URL(location.href);
    }
    if (/\/exam-ans\/mooc2\/exam\/exam-list/.test(url.pathname)) {
      return url.href;
    }
    const courseId = getRootValue(root, "courseid") || getRootValue(root, "courseId") || url.searchParams.get("courseid") || url.searchParams.get("courseId") || "";
    const classId = getRootValue(root, "clazzid") || getRootValue(root, "classId") || url.searchParams.get("clazzid") || url.searchParams.get("classId") || "";
    const cpi = getRootValue(root, "cpi") || url.searchParams.get("cpi") || "";
    const stuenc = getRootValue(root, "enc") || url.searchParams.get("enc") || url.searchParams.get("stuenc") || "";
    const enc = getRootValue(root, "examEnc") || "";
    const openc = getRootValue(root, "openc") || url.searchParams.get("openc") || "";
    const t = getRootValue(root, "t") || url.searchParams.get("t") || Date.now();
    if (!courseId || !classId || !cpi || !stuenc || !enc) return "";
    const params = new URLSearchParams({
      courseid: courseId,
      clazzid: classId,
      cpi,
      ut: "s",
      t,
      stuenc,
      enc,
    });
    if (openc) params.set("openc", openc);
    return "https://mooc1.chaoxing.com/exam-ans/mooc2/exam/exam-list?" + params.toString();
  }

  function currentBatchKind() {
    if (isCourseHomePage()) return "mixed";
    return isExamListPage() ? "exam" : "work";
  }

  function getCourseValue(id) {
    const node = document.getElementById(id);
    return node ? node.value || "" : "";
  }

  function getCourseWorkListUrl(root = document, href = location.href) {
    let currentUrl;
    try {
      currentUrl = new URL(href, location.href);
    } catch (error) {
      currentUrl = new URL(location.href);
    }
    if (/\/work\/list/.test(currentUrl.pathname)) {
      return currentUrl.href;
    }

    const courseId = getRootValue(root, "courseid") || getRootValue(root, "courseId") || currentUrl.searchParams.get("courseid") || currentUrl.searchParams.get("courseId") || "";
    const classId = getRootValue(root, "clazzid") || getRootValue(root, "classId") || currentUrl.searchParams.get("clazzid") || currentUrl.searchParams.get("classId") || "";
    const cpi = getRootValue(root, "cpi") || currentUrl.searchParams.get("cpi") || "";
    const stuenc = getRootValue(root, "enc") || currentUrl.searchParams.get("enc") || currentUrl.searchParams.get("stuenc") || "";
    const enc = getRootValue(root, "workEnc");
    const t = getRootValue(root, "t") || currentUrl.searchParams.get("t") || Date.now();
    if (!courseId || !classId || !cpi || !stuenc || !enc) return "";
    const params = new URLSearchParams({
      courseId,
      classId,
      cpi,
      ut: "s",
      t,
      stuenc,
      enc,
    });
    return "https://mooc1.chaoxing.com/mooc2/work/list?" + params.toString();
  }

  function requestText(url) {
    const sameOrigin = new URL(url, location.href).origin === location.origin;
    if (sameOrigin || typeof GM_xmlhttpRequest !== "function") {
      return fetch(url, {
        credentials: "include",
        redirect: "follow",
      }).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      });
    }

    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url,
        anonymous: false,
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {
            resolve(response.responseText || "");
          } else {
            reject(new Error(`HTTP ${response.status}`));
          }
        },
        onerror: () => reject(new Error("网络请求失败")),
        ontimeout: () => reject(new Error("网络请求超时")),
      });
    });
  }

  function requestBlob(url) {
    const href = absolutizeUrl(url);
    const sameOrigin = new URL(href, location.href).origin === location.origin;
    if (sameOrigin || typeof GM_xmlhttpRequest !== "function") {
      return fetch(href, {
        credentials: "include",
        redirect: "follow",
      }).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.blob();
      });
    }

    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: href,
        anonymous: false,
        responseType: "blob",
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {
            resolve(response.response);
          } else {
            reject(new Error(`HTTP ${response.status}`));
          }
        },
        onerror: () => reject(new Error("图片请求失败")),
        ontimeout: () => reject(new Error("图片请求超时")),
      });
    });
  }

  async function collectWorksForBatch() {
    const cached = readCachedWorkList();
    if (cached) return cached;

    const sources = accessibleBatchSources();
    const allWorks = [];
    const listSources = [];
    const addListSource = (kind, url) => {
      if (!url) return;
      const href = absolutizeUrl(url);
      if (!listSources.some((item) => item.kind === kind && item.url === href)) {
        listSources.push({ kind, url: href });
      }
    };

    sources.forEach((source) => {
      const href = source.href || location.href;
      allWorks.push(...parseWorkList(source.root, href));
      allWorks.push(...parseExamList(source.root, href));
      addListSource("work", getCourseWorkListUrl(source.root, href));
      addListSource("exam", getCourseExamListUrl(source.root, href));
    });

    for (const source of listSources) {
      const firstHtml = await requestText(buildListPageUrl(source.url, 1));
      const firstDoc = new DOMParser().parseFromString(firstHtml, "text/html");
      allWorks.push(...(source.kind === "exam" ? parseExamList(firstDoc, source.url) : parseWorkList(firstDoc, source.url)));

      const totalPages = parseTotalListPages(firstDoc);
      for (let pageNum = 2; pageNum <= totalPages; pageNum += 1) {
        const pageUrl = buildListPageUrl(source.url, pageNum);
        const pageHtml = await requestText(pageUrl);
        const pageDoc = new DOMParser().parseFromString(pageHtml, "text/html");
        allWorks.push(...(source.kind === "exam" ? parseExamList(pageDoc, pageUrl) : parseWorkList(pageDoc, pageUrl)));
      }
    }

    const works = uniqueWorks(allWorks);
    writeCachedWorkList(works);
    return works;
  }

  async function fetchWorkDetail(work) {
    const cached = readCachedWorkDetail(work);
    if (cached) return cached;

    let lastTitle = work.title;
    let lastError = "";
    const urls = work.kind === "exam" ? examDetailUrlCandidates(work) : workDetailUrlCandidates(work);
    const tried = new Set();
    for (let index = 0; index < urls.length; index += 1) {
      const url = urls[index];
      if (tried.has(url)) continue;
      tried.add(url);
      try {
        const html = await requestText(url);
        const doc = new DOMParser().parseFromString(html, "text/html");
        const questions = collectQuestionsFromRoot(doc);
        lastTitle = getPageTitle(doc) || lastTitle;
        if (questions.length) {
          const result = {
            ...work,
            url,
            title: lastTitle,
            questions,
          };
          writeCachedWorkDetail(work, result);
          return result;
        }
        extractWorkRedirectUrls(html, url).forEach((nextUrl) => {
          if (!tried.has(nextUrl) && !urls.includes(nextUrl)) urls.push(nextUrl);
        });
        lastError = `未识别到题目（页面标题：${lastTitle}）`;
      } catch (error) {
        lastError = error.message || String(error);
      }
    }
    throw new Error(lastError || "未识别到题目");
  }

  function safeFileName(value) {
    return cleanText(value)
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, " ")
      .slice(0, 120) || "学习通作业";
  }

  function downloadBlob(fileName, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function makeCrcTable() {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c >>> 0;
    }
    return table;
  }

  const CRC_TABLE = makeCrcTable();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) {
      crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function dosDateTime(date) {
    const year = Math.max(1980, date.getFullYear());
    const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { dosTime, dosDate };
  }

  function pushU16(target, value) {
    target.push(value & 0xff, (value >>> 8) & 0xff);
  }

  function pushU32(target, value) {
    target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
  }

  function createZipBlob(files) {
    const encoder = new TextEncoder();
    const chunks = [];
    const centralDirectory = [];
    let offset = 0;
    const now = dosDateTime(new Date());

    files.forEach((file) => {
      const nameBytes = encoder.encode(file.name);
      const dataBytes = encoder.encode(file.content);
      const crc = crc32(dataBytes);

      const local = [];
      pushU32(local, 0x04034b50);
      pushU16(local, 20);
      pushU16(local, 0x0800);
      pushU16(local, 0);
      pushU16(local, now.dosTime);
      pushU16(local, now.dosDate);
      pushU32(local, crc);
      pushU32(local, dataBytes.length);
      pushU32(local, dataBytes.length);
      pushU16(local, nameBytes.length);
      pushU16(local, 0);
      chunks.push(new Uint8Array(local), nameBytes, dataBytes);

      const central = [];
      pushU32(central, 0x02014b50);
      pushU16(central, 20);
      pushU16(central, 20);
      pushU16(central, 0x0800);
      pushU16(central, 0);
      pushU16(central, now.dosTime);
      pushU16(central, now.dosDate);
      pushU32(central, crc);
      pushU32(central, dataBytes.length);
      pushU32(central, dataBytes.length);
      pushU16(central, nameBytes.length);
      pushU16(central, 0);
      pushU16(central, 0);
      pushU16(central, 0);
      pushU16(central, 0);
      pushU32(central, 0);
      pushU32(central, offset);
      centralDirectory.push(new Uint8Array(central), nameBytes);

      offset += local.length + nameBytes.length + dataBytes.length;
    });

    const centralOffset = offset;
    const centralSize = centralDirectory.reduce((sum, chunk) => sum + chunk.length, 0);
    const end = [];
    pushU32(end, 0x06054b50);
    pushU16(end, 0);
    pushU16(end, 0);
    pushU16(end, files.length);
    pushU16(end, files.length);
    pushU32(end, centralSize);
    pushU32(end, centralOffset);
    pushU16(end, 0);

    return new Blob([...chunks, ...centralDirectory, new Uint8Array(end)], { type: "application/zip" });
  }

  function workKey(work) {
    const key = work.workId || work.examAnswerId || work.answerId || work.examId || work.url || work.title;
    return `${work.kind || "work"}:${key}`;
  }

  function courseStorageId() {
    const params = new URLSearchParams(location.search);
    const courseId = getCourseValue("courseid") || getCourseValue("courseId") || params.get("courseid") || params.get("courseId") || "";
    const classId = getCourseValue("clazzid") || getCourseValue("classId") || params.get("clazzid") || params.get("classId") || "";
    const cpi = getCourseValue("cpi") || params.get("cpi") || "";
    const examId = getCourseValue("examId") || params.get("examId") || "";
    return [courseId, classId, cpi, examId].filter(Boolean).join(":") || location.origin + location.pathname;
  }

  function courseStorageKey(name) {
    return `cx-work-print:${name}:${courseStorageId()}`;
  }

  function workDetailCacheKey(work) {
    return `cx-work-print:detail:${DETAIL_CACHE_VERSION}:${courseStorageId()}:${workKey(work)}:${work.answerId || ""}`;
  }

  function workListCacheKey(kind = currentBatchKind()) {
    return `cx-work-print:${kind}-list:${DETAIL_CACHE_VERSION}:${courseStorageId()}`;
  }

  function readCachedWorkList() {
    const raw = sessionGet(workListCacheKey());
    if (!raw) return null;
    try {
      const cached = JSON.parse(raw);
      if (!cached || !Array.isArray(cached.works) || Date.now() - cached.cachedAt > DETAIL_CACHE_TTL) return null;
      return cached.works;
    } catch (error) {
      return null;
    }
  }

  function writeCachedWorkList(works) {
    sessionSet(workListCacheKey(), JSON.stringify({ cachedAt: Date.now(), works }));
  }

  function clearCachedWorkList() {
    sessionRemove(workListCacheKey());
  }

  function readCachedWorkDetail(work) {
    const raw = sessionGet(workDetailCacheKey(work));
    if (!raw) return null;
    try {
      const cached = JSON.parse(raw);
      if (!cached || !cached.questions || Date.now() - cached.cachedAt > DETAIL_CACHE_TTL) return null;
      return {
        ...work,
        url: cached.url || work.url,
        title: cached.title || work.title,
        questions: cached.questions,
      };
    } catch (error) {
      return null;
    }
  }

  function writeCachedWorkDetail(work, result) {
    sessionSet(workDetailCacheKey(work), JSON.stringify({
      cachedAt: Date.now(),
      url: result.url,
      title: result.title,
      questions: result.questions,
    }));
  }

  function readBatchSortState() {
    const raw = storageGet(courseStorageKey("batch-sort"));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function saveBatchSortState(panel) {
    const order = [...panel.querySelectorAll("[data-work-key]")].map((item) => item.dataset.workKey);
    const sortMode = panel.querySelector("[data-work-sort-mode]")?.value || "original";
    storageSet(courseStorageKey("batch-sort"), JSON.stringify({ sortMode, order }));
  }

  function applyBatchSortState(panel) {
    const state = readBatchSortState();
    if (!state) return;
    const select = panel.querySelector("[data-work-sort-mode]");
    if (select && state.sortMode) select.value = state.sortMode;
    if (Array.isArray(state.order)) panel.__cxManualWorkOrder = state.order;
  }

  function rememberBatchSelection(panel) {
    const items = [...panel.querySelectorAll('[data-work-key]')];
    if (!items.length) return;
    panel.__cxSelectedWorkKeys = new Set(items.filter((item) => item.getAttribute("aria-checked") === "true").map((item) => item.dataset.workKey));
    panel.__cxManualWorkOrder = items.map((item) => item.dataset.workKey);
    saveBatchSortState(panel);
  }

  function orderWorksByKeys(works, keys) {
    if (!keys || !keys.length) return works;
    const byKey = new Map(works.map((work) => [workKey(work), work]));
    const ordered = keys.map((key) => byKey.get(key)).filter(Boolean);
    const orderedKeys = new Set(ordered.map(workKey));
    return [...ordered, ...works.filter((work) => !orderedKeys.has(workKey(work)))];
  }

  function workNameSortKey(work) {
    return normalizedTitleKey(work.title) || work.title || "";
  }

  function workTimeSortKey(work) {
    const text = `${work.title || ""} ${work.status || ""}`;
    const dateMatch = text.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
    if (dateMatch) {
      return Number(dateMatch[1]) * 10000 + Number(dateMatch[2]) * 100 + Number(dateMatch[3]);
    }
    const weekMatch = text.match(/第\s*(\d+)\s*[周週]/);
    if (weekMatch) return Number(weekMatch[1]);
    const numbers = (text.match(/\d+/g) || []).map(Number);
    if (numbers.length) return numbers.reduce((sum, value) => sum * 1000 + value, 0);
    return Number.NaN;
  }

  function sortWorksForBatch(works, sortMode) {
    if (!sortMode || sortMode === "original") return works;
    const sorted = [...works];
    const desc = sortMode.endsWith("-desc");
    if (sortMode.startsWith("name-")) {
      sorted.sort((a, b) => workNameSortKey(a).localeCompare(workNameSortKey(b), "zh-Hans-CN", { numeric: true }));
    } else if (sortMode.startsWith("time-")) {
      sorted.sort((a, b) => {
        const aTime = workTimeSortKey(a);
        const bTime = workTimeSortKey(b);
        if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) return aTime - bTime;
        if (Number.isFinite(aTime) !== Number.isFinite(bTime)) return Number.isFinite(aTime) ? -1 : 1;
        return workNameSortKey(a).localeCompare(workNameSortKey(b), "zh-Hans-CN", { numeric: true });
      });
    }
    return desc ? sorted.reverse() : sorted;
  }

  function defaultSelectedWorkKeys(panel, works, options) {
    if (panel.__cxSelectedWorkKeys) return panel.__cxSelectedWorkKeys;
    const { filtered } = filterWorksForBatch(works, { ...options, selectedWorkKeys: null });
    panel.__cxSelectedWorkKeys = new Set(filtered.map(workKey));
    return panel.__cxSelectedWorkKeys;
  }

  function readSelectedQuestionTypes(panel) {
    const items = [...panel.querySelectorAll('[data-question-type]')];
    if (!items.length) return null;
    return new Set(items.filter((item) => item.getAttribute("aria-checked") === "true").map((item) => item.dataset.questionType));
  }

  function readCommonExportOptions(panel) {
    return {
      includeAnalysis: panel.querySelector('[data-export-option="include-analysis"], [data-batch-option="include-analysis"]')?.getAttribute("aria-checked") !== "false",
      imageMode: panel.querySelector("[data-image-mode]")?.value || "online",
      selectedQuestionTypes: readSelectedQuestionTypes(panel),
    };
  }

  function readBatchOptions(panel) {
    const selectedCategories = new Set(
      [...panel.querySelectorAll('[data-batch-category][aria-checked="true"]')].map((input) => input.dataset.batchCategory)
    );
    const selectedKinds = new Set(
      [...panel.querySelectorAll('[data-batch-kind][aria-checked="true"]')].map((input) => input.dataset.batchKind)
    );
    const selectedInputs = [...panel.querySelectorAll('[data-work-key]')];
    const selectedWorkKeys = selectedInputs.length
      ? new Set(selectedInputs.filter((input) => input.getAttribute("aria-checked") === "true").map((input) => input.dataset.workKey))
      : null;
    const selectedWorkOrder = selectedInputs.map((input) => input.dataset.workKey);
    return {
      ...readCommonExportOptions(panel),
      selectedCategories,
      selectedKinds,
      selectedWorkKeys,
      selectedWorkOrder,
      workSortMode: panel.querySelector("[data-work-sort-mode]")?.value || "original",
      skipDuplicateTitles: panel.querySelector('[data-batch-option="skip-duplicate-titles"]')?.getAttribute("aria-checked") === "true",
      markNoAnswer: panel.querySelector('[data-batch-option="mark-no-answer"]')?.getAttribute("aria-checked") === "true",
      addSummary: panel.querySelector('[data-batch-option="add-summary"]')?.getAttribute("aria-checked") === "true",
      printFriendly: panel.querySelector('[data-batch-option="print-friendly"]')?.getAttribute("aria-checked") === "true",
    };
  }

  function filterWorksForBatch(works, options) {
    const skipped = [];
    const seenTitles = new Set();
    const filtered = [];
    works.forEach((work) => {
      if (options.selectedWorkKeys && !options.selectedWorkKeys.has(workKey(work))) {
        skipped.push({ work, reason: "用户未勾选" });
        return;
      }
      if (options.selectedKinds && options.selectedKinds.size && !options.selectedKinds.has(work.kind || "work")) {
        skipped.push({ work, reason: `未显示${work.kind === "exam" ? "考试" : "作业"}` });
        return;
      }
      const category = workCategory(work);
      if (!options.selectedCategories.has(category)) {
        skipped.push({ work, reason: `未选择分类：${BATCH_CATEGORY_LABELS[category] || "其他"}` });
        return;
      }
      const titleKey = `${work.kind || "work"}:${normalizedTitleKey(work.title)}`;
      if (options.skipDuplicateTitles && titleKey && seenTitles.has(titleKey)) {
        skipped.push({ work, reason: "同名作业已跳过" });
        return;
      }
      if (titleKey) seenTitles.add(titleKey);
      filtered.push(work);
    });
    if (options.selectedWorkOrder && options.selectedWorkOrder.length) {
      const order = new Map(options.selectedWorkOrder.map((key, index) => [key, index]));
      filtered.sort((a, b) => (order.get(workKey(a)) ?? 99999) - (order.get(workKey(b)) ?? 99999));
    }
    return { filtered, skipped };
  }

  function renderBatchWorkList(panel, works) {
    const list = panel.querySelector("[data-batch-list]");
    const listCount = panel.querySelector("[data-batch-list-count]");
    if (!list) return;
    list.textContent = "";
    if (listCount) listCount.textContent = `共 ${works.length} 个`;
    if (!works.length) {
      list.textContent = `没有识别到${panel.__cxBatchLabel || "作业"}`;
      return;
    }
    const options = readBatchOptions(panel);
    const { filtered, skipped } = filterWorksForBatch(works, { ...options, selectedWorkKeys: null });
    const skippedKeys = new Map(skipped.map((item) => [workKey(item.work), item.reason]));
    const filteredKeys = new Set(filtered.map(workKey));
    const selectedKeys = defaultSelectedWorkKeys(panel, works, options);
    const orderedWorks = orderWorksByKeys(sortWorksForBatch(works, options.workSortMode), panel.__cxManualWorkOrder);
    orderedWorks.forEach((work) => {
      const item = document.createElement("div");
      item.className = "cx-work-item";
      item.dataset.workKey = workKey(work);
      item.setAttribute("role", "checkbox");
      item.setAttribute("tabindex", "0");
      item.draggable = true;
      item.setAttribute("aria-checked", selectedKeys.has(workKey(work)) && filteredKeys.has(workKey(work)) ? "true" : "false");
      item.title = skippedKeys.get(workKey(work)) || "";

      const box = document.createElement("span");
      box.className = "cx-box";
      box.setAttribute("aria-hidden", "true");

      const drag = document.createElement("span");
      drag.className = "cx-drag";
      drag.textContent = "↕";
      drag.title = "拖拽排序";

      const title = document.createElement("span");
      title.className = "cx-work-title";
      const kindLabel = work.kind === "exam" ? "考试" : "作业";
      const displayTitle = workCategory(work) === "answered" ? work.title : `${work.title}（${NO_ANSWER_MARK}）`;
      title.textContent = `[${kindLabel}] ${displayTitle}`;
      title.title = title.textContent;

      const badge = document.createElement("span");
      badge.className = "cx-badge";
      badge.textContent = displayWorkStatus(work);

      item.addEventListener("click", () => {
        if (item.__cxDragged) {
          item.__cxDragged = false;
          return;
        }
        item.setAttribute("aria-checked", item.getAttribute("aria-checked") === "true" ? "false" : "true");
        rememberBatchSelection(panel);
      });
      item.addEventListener("dragstart", (event) => {
        item.__cxDragged = true;
        item.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.dataset.workKey);
      });
      item.addEventListener("dragend", () => {
        item.classList.remove("is-dragging");
        rememberBatchSelection(panel);
        setTimeout(() => {
          item.__cxDragged = false;
        }, 150);
      });
      item.addEventListener("dragover", (event) => {
        event.preventDefault();
        const dragging = list.querySelector(".is-dragging");
        if (!dragging || dragging === item) return;
        const rect = item.getBoundingClientRect();
        const after = event.clientY > rect.top + rect.height / 2;
        list.insertBefore(dragging, after ? item.nextSibling : item);
      });
      item.addEventListener("keydown", (event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        item.click();
      });
      item.append(box, drag, title, badge);
      list.appendChild(item);
    });
  }

  function setBatchListSelection(panel, checked) {
    panel.querySelectorAll('[data-work-key]').forEach((input) => {
      input.setAttribute("aria-checked", checked ? "true" : "false");
    });
    rememberBatchSelection(panel);
  }

  function resetBatchAutoSelection(panel) {
    panel.__cxSelectedWorkKeys = null;
    if (panel.__cxBatchWorks) renderBatchWorkList(panel, panel.__cxBatchWorks);
  }

  async function refreshBatchPreview(panel, button) {
    const list = panel.querySelector("[data-batch-list]");
    const listCount = panel.querySelector("[data-batch-list-count]");
    const oldText = button ? button.textContent : "";
    const itemLabel = panel.__cxBatchLabel || "作业";
    if (button) {
      button.disabled = true;
      button.textContent = "读取中";
    }
    if (list) list.textContent = `正在读取全部页${itemLabel}...`;
    if (listCount) listCount.textContent = "";
    try {
      if (button) {
        window.__CX_PRINT_BATCH_WORKS_CACHE__ = null;
        clearCachedWorkList();
      }
      if (!window.__CX_PRINT_BATCH_WORKS_CACHE__ && !window.__CX_PRINT_BATCH_WORKS_PROMISE__) {
        window.__CX_PRINT_BATCH_WORKS_PROMISE__ = collectWorksForBatch().then((works) => {
          window.__CX_PRINT_BATCH_WORKS_CACHE__ = works;
          return works;
        }).finally(() => {
          window.__CX_PRINT_BATCH_WORKS_PROMISE__ = null;
        });
      }
      const works = window.__CX_PRINT_BATCH_WORKS_CACHE__ || await window.__CX_PRINT_BATCH_WORKS_PROMISE__;
      panel.__cxBatchWorks = works;
      panel.__cxSelectedWorkKeys = null;
      renderBatchWorkList(panel, works);
    } catch (error) {
      if (list) list.textContent = "读取失败：" + (error.message || String(error));
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = oldText;
      }
    }
  }

  function buildBatchSummary(exported, skipped, failures, itemLabel = "作业") {
    const lines = [
      `学习通${itemLabel}批量导出清单`,
      `生成时间：${new Date().toLocaleString()}`,
      `导出成功：${exported.length}`,
      `跳过：${skipped.length}`,
      `失败：${failures.length}`,
      "",
      "== 已导出 ==",
    ];
    exported.forEach((item, index) => {
      lines.push(`${index + 1}. [${item.status}] ${item.title} - ${item.questionCount}题 - ${item.fileName}`);
    });
    if (skipped.length) {
      lines.push("", "== 已跳过 ==");
      skipped.forEach((item, index) => {
        lines.push(`${index + 1}. [${displayWorkStatus(item.work)}] ${item.work.title} - ${item.reason}`);
      });
    }
    if (failures.length) {
      lines.push("", "== 失败 ==");
      failures.forEach((failure, index) => lines.push(`${index + 1}. ${failure}`));
    }
    return lines.join("\n");
  }

  async function prepareBatchWorks(panel, button) {
    const oldText = button ? button.textContent : "";
    const itemLabel = panel.__cxBatchLabel || "作业";
    if (button) {
      button.disabled = true;
      button.textContent = `检测${itemLabel}中`;
    }
    try {
      let works = [];
      if (window.__CX_PRINT_BATCH_WORKS_CACHE__) {
        works = window.__CX_PRINT_BATCH_WORKS_CACHE__;
      } else if (window.__CX_PRINT_BATCH_WORKS_PROMISE__) {
        works = await window.__CX_PRINT_BATCH_WORKS_PROMISE__;
      } else {
        works = await collectWorksForBatch();
        window.__CX_PRINT_BATCH_WORKS_CACHE__ = works;
      }
      panel.__cxBatchWorks = works;
      if (panel.querySelectorAll("[data-work-key]").length !== works.length) {
        panel.__cxSelectedWorkKeys = null;
        renderBatchWorkList(panel, works);
      }
      const options = readBatchOptions(panel);
      const { filtered, skipped } = filterWorksForBatch(works, options);
      if (!filtered.length) throw new Error(`没有符合当前筛选条件的${itemLabel}。`);
      return { works: filtered, skipped, options, oldText, itemLabel };
    } catch (error) {
      if (button) {
        button.disabled = false;
        button.textContent = oldText;
      }
      throw error;
    }
  }

  function restoreBatchButton(button, oldText) {
    if (!button) return;
    button.disabled = false;
    button.textContent = oldText;
  }

  async function batchExportAnswers(button) {
    const panel = button.closest(`#${PANEL_ID}`) || document;
    let prepared;
    try {
      prepared = await prepareBatchWorks(panel, button);
    } catch (error) {
      alert(error.message || String(error));
      return;
    }
    const { works, skipped, options, oldText, itemLabel } = prepared;

    const zipFiles = [];
    const failures = [];
    const exported = [];
    for (let index = 0; index < works.length; index += 1) {
      const work = works[index];
      button.textContent = `打包中 ${index + 1}/${works.length}`;
      try {
        const result = await fetchWorkDetail(work);
        if (!result.questions.length) throw new Error("未识别到题目");
        const rawTitle = result.title || work.title;
        const includeAnswers = workCategory(work) === "answered";
        const title = includeAnswers || !options.markNoAnswer ? rawTitle : `${rawTitle}（${NO_ANSWER_MARK}）`;
        const questions = await prepareQuestionsForExport(result.questions, options);
        if (!questions.length) throw new Error("当前题型筛选后没有题目");
        const html = buildPrintableHtml(questions, title, { includeAnswers, includeAnalysis: options.includeAnalysis });
        const prefix = String(index + 1).padStart(2, "0");
        const fileName = `${prefix}. ${safeFileName(title)}.html`;
        zipFiles.push({
          name: fileName,
          content: html,
        });
        exported.push({
          title,
          fileName,
          status: displayWorkStatus(work),
          questionCount: questions.length,
        });
      } catch (error) {
        failures.push(`${work.title}: ${error.message || String(error)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (options.addSummary) {
      zipFiles.push({
        name: "导出清单.txt",
        content: buildBatchSummary(exported, skipped, failures, itemLabel),
      });
    } else if (failures.length) {
      zipFiles.push({
        name: "导出失败列表.txt",
        content: failures.join("\n"),
      });
    }

    if (zipFiles.length) {
      button.textContent = "生成ZIP中";
      downloadBlob(`${safeFileName(document.title || `学习通${itemLabel}答案`)}.zip`, createZipBlob(zipFiles));
    }

    restoreBatchButton(button, oldText);

    if (failures.length) {
      alert(`已打包 ${exported.length} 个${itemLabel}，跳过 ${skipped.length} 个，失败 ${failures.length} 个。`);
    } else {
      alert(`已打包 ${exported.length} 个${itemLabel}，跳过 ${skipped.length} 个。`);
    }
  }

  async function batchExportTextFormat(button, format) {
    const panel = button.closest(`#${PANEL_ID}`) || document;
    let prepared;
    try {
      prepared = await prepareBatchWorks(panel, button);
    } catch (error) {
      alert(error.message || String(error));
      return;
    }
    const { works, skipped, options, oldText, itemLabel } = prepared;
    const zipFiles = [];
    const failures = [];
    const exported = [];
    for (let index = 0; index < works.length; index += 1) {
      const work = works[index];
      button.textContent = `导出${format.toUpperCase()} ${index + 1}/${works.length}`;
      try {
        const result = await fetchWorkDetail(work);
        if (!result.questions.length) throw new Error("未识别到题目");
        const includeAnswers = workCategory(work) === "answered";
        const rawTitle = result.title || work.title;
        const title = includeAnswers || !options.markNoAnswer ? rawTitle : `${rawTitle}（${NO_ANSWER_MARK}）`;
        const questions = await prepareQuestionsForExport(result.questions, options);
        if (!questions.length) throw new Error("当前题型筛选后没有题目");
        const prefix = String(index + 1).padStart(2, "0");
        const fileName = `${prefix}. ${safeFileName(title)}.${format}`;
        zipFiles.push({
          name: fileName,
          content: buildExportContent(format, questions, title, { includeAnswers, includeAnalysis: options.includeAnalysis }),
        });
        exported.push({
          title,
          fileName,
          status: displayWorkStatus(work),
          questionCount: questions.length,
        });
      } catch (error) {
        failures.push(`${work.title}: ${error.message || String(error)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (options.addSummary) {
      zipFiles.push({
        name: "导出清单.txt",
        content: buildBatchSummary(exported, skipped, failures, itemLabel),
      });
    } else if (failures.length) {
      zipFiles.push({
        name: "导出失败列表.txt",
        content: failures.join("\n"),
      });
    }
    if (zipFiles.length) {
      button.textContent = "生成ZIP中";
      downloadBlob(`${safeFileName(document.title || `学习通${itemLabel}答案`)}-${format}.zip`, createZipBlob(zipFiles));
    }
    restoreBatchButton(button, oldText);
    alert(`已导出 ${exported.length} 个${itemLabel}，跳过 ${skipped.length} 个，失败 ${failures.length} 个。`);
  }

  async function batchExportPdf(button) {
    const panel = button.closest(`#${PANEL_ID}`) || document;
    const win = openExportWindow("正在生成 PDF", "正在读取内容并生成打印页面，请稍候...");
    if (!win) {
      alert("浏览器拦截了弹窗，请允许此页面打开新窗口后再试。");
      return;
    }
    let prepared;
    try {
      prepared = await prepareBatchWorks(panel, button);
    } catch (error) {
      writeWindowMessage(win, "生成失败", error.message || String(error));
      alert(error.message || String(error));
      return;
    }
    const { works, options, oldText, itemLabel } = prepared;
    const items = [];
    const failures = [];
    for (let index = 0; index < works.length; index += 1) {
      const work = works[index];
      button.textContent = `生成PDF ${index + 1}/${works.length}`;
      try {
        const result = await fetchWorkDetail(work);
        if (!result.questions.length) throw new Error("未识别到题目");
        const includeAnswers = workCategory(work) === "answered";
        const rawTitle = result.title || work.title;
        const title = includeAnswers || !options.markNoAnswer ? rawTitle : `${rawTitle}（${NO_ANSWER_MARK}）`;
        const questions = await prepareQuestionsForExport(result.questions, options);
        if (!questions.length) throw new Error("当前题型筛选后没有题目");
        items.push({
          title,
          questions,
          options: { includeAnswers, includeAnalysis: options.includeAnalysis },
        });
      } catch (error) {
        failures.push(`${work.title}: ${error.message || String(error)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    restoreBatchButton(button, oldText);
    if (!items.length) {
      writeWindowMessage(win, "没有成功生成 PDF 内容", failures.length ? failures.join("\n") : `没有符合当前条件的${itemLabel}。`);
      alert("没有成功生成 PDF 内容。" + (failures.length ? "\n" + failures.join("\n") : ""));
      return;
    }
    const html = buildBatchPrintableHtml(items, document.title || `学习通${itemLabel}批量导出`, {
      printFriendly: options.printFriendly,
      itemLabel,
    });
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
    if (failures.length) {
      alert(`PDF 页面已生成，${failures.length} 个${itemLabel}失败，未加入 PDF。`);
    }
  }

  async function currentQuestionsForExport(panel) {
    const questions = collectQuestions();
    if (!questions.length) {
      alert("没有识别到题目。请确认当前是学习通作业详情页，并且题目已经加载完成。");
      return [];
    }
    const prepared = await prepareQuestionsForExport(questions, readCommonExportOptions(panel));
    if (!prepared.length) alert("当前题型筛选后没有题目。");
    return prepared;
  }

  async function openPrintPage(autoPrint = false, panel = document) {
    const win = openExportWindow("正在生成 PDF", "正在整理当前作业，请稍候...");
    if (!win) {
      alert("浏览器拦截了弹窗，请允许此页面打开新窗口后再试。");
      return;
    }
    const questions = await currentQuestionsForExport(panel);
    if (!questions.length) {
      writeWindowMessage(win, "没有识别到题目", "请确认当前是学习通作业详情页，并且题目已经加载完成。");
      return;
    }
    const options = readCommonExportOptions(panel);
    win.document.open();
    win.document.write(buildPrintableHtml(questions, getPageTitle(), { includeAnalysis: options.includeAnalysis }));
    win.document.close();
    if (autoPrint) setTimeout(() => win.print(), 500);
  }

  async function copyPlainText(panel = document) {
    const questions = await currentQuestionsForExport(panel);
    if (!questions.length) return;
    const text = buildPlainText(questions, readCommonExportOptions(panel));
    if (typeof GM_setClipboard === "function") {
      GM_setClipboard(text, "text");
      alert("已复制整理后的题目和答案。");
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => alert("已复制整理后的题目和答案。"),
      () => alert("复制失败，请使用格式下拉导出 HTML/Markdown/TOML。")
    );
  }

  async function downloadFormat(format, panel = document) {
    const questions = await currentQuestionsForExport(panel);
    if (!questions.length) return;
    const title = getPageTitle();
    const options = readCommonExportOptions(panel);
    const blob = new Blob([buildExportContent(format, questions, title, { includeAnalysis: options.includeAnalysis })], {
      type: exportMimeType(format),
    });
    downloadBlob(`${safeFileName(title)}-打印版.${format === "html" ? "html" : format}`, blob);
  }

  function downloadHtml(panel = document) {
    return downloadFormat("html", panel);
  }

  function renderPanel() {
    const oldPanel = document.getElementById(PANEL_ID);
    if (oldPanel) oldPanel.remove();

    if (shouldSuppressFramePanel()) return;

    const isCourseHome = isCourseHomePage();
    const isExamList = isExamListPage();
    const isExamDetail = /\/exam-ans\/exam\/test\/(?:look|reVersionPaperMarkContentNew)/.test(location.pathname);
    const batchSources = accessibleBatchSources();
    const hasDirectWorkList = Boolean(document.querySelector('li[onclick*="goTask"][data]'));
    const isWorkList = isExamList || /\/work\/list/.test(location.pathname) || hasDirectWorkList || isCourseHome;
    const questions = collectQuestions();
    const works = isWorkList ? uniqueWorks(batchSources.flatMap((source) => [
      ...parseWorkList(source.root, source.href),
      ...parseExamList(source.root, source.href),
    ])) : [];
    if (!isWorkList && !isExamDetail && !questions.length) return;
    const panel = document.createElement("div");
    panel.id = PANEL_ID;

    const count = document.createElement("span");
    count.className = "cx-count";

    const addButton = (label, action, secondary) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.action = action;
      button.textContent = label;
      if (secondary) button.className = "secondary";
      return button;
    };

    const addCheckbox = (parent, label, attrs, checked = true) => {
      const wrapper = document.createElement("button");
      wrapper.type = "button";
      wrapper.className = "cx-check";
      wrapper.setAttribute("role", "checkbox");
      wrapper.setAttribute("aria-checked", checked ? "true" : "false");
      Object.entries(attrs).forEach(([key, value]) => {
        wrapper.dataset[key] = value;
      });
      const box = document.createElement("span");
      box.className = "cx-box";
      box.setAttribute("aria-hidden", "true");
      const text = document.createElement("span");
      text.textContent = label;
      wrapper.append(box, text);
      parent.appendChild(wrapper);
      return wrapper;
    };

    const addOptionSection = (parent, title) => {
      const section = document.createElement("div");
      const heading = document.createElement("div");
      heading.className = "cx-option-title";
      heading.textContent = title;
      const grid = document.createElement("div");
      grid.className = "cx-option-grid";
      section.append(heading, grid);
      parent.appendChild(section);
      return grid;
    };

    const addSelect = (parent, attrs, choices) => {
      const select = document.createElement("select");
      Object.entries(attrs).forEach(([key, value]) => {
        select.dataset[key] = value;
      });
      choices.forEach((choice) => {
        const option = document.createElement("option");
        option.value = choice.value;
        option.textContent = choice.label;
        select.appendChild(option);
      });
      parent.appendChild(select);
      return select;
    };

    const addFormatExportControls = (parent, attrs) => {
      const row = document.createElement("div");
      row.className = attrs.className || "cx-format-row";
      addSelect(row, attrs.select, [
        { value: "html", label: "HTML" },
        { value: "md", label: "Markdown" },
        { value: "toml", label: "TOML" },
      ]).className = "cx-format-select";
      row.appendChild(addButton(attrs.label || "导出", attrs.action, true));
      parent.appendChild(row);
    };

    const addCommonExportSettings = (parent, batchMode) => {
      const exportOptions = addOptionSection(parent, "导出选项");
      addCheckbox(exportOptions, "显示解析", batchMode ? { batchOption: "include-analysis" } : { exportOption: "include-analysis" }, true);
      addSelect(exportOptions, { imageMode: "true" }, [
        { value: "online", label: "图片：在线链接" },
        { value: "base64", label: "图片：base64" },
      ]);
      const typeOptions = addOptionSection(parent, "题型筛选");
      QUESTION_TYPE_FILTERS.forEach((filter) => addCheckbox(typeOptions, filter.label, { questionType: filter.key }, true));
      return exportOptions;
    };

    if (isWorkList) {
      const row = document.createElement("div");
      row.className = "cx-row";
      const hasWorks = works.some((work) => work.kind === "work") || isCourseHome || (!works.length && !isExamList);
      const hasExams = works.some((work) => work.kind === "exam") || isCourseHome || isExamList;
      const batchLabel = hasWorks && hasExams ? "作业+考试" : hasExams ? "考试" : "作业";
      panel.__cxBatchLabel = batchLabel;
      count.textContent = `批量导出${batchLabel}${works.length ? `（当前页${works.length}个）` : ""}`;
      row.appendChild(count);
      const settingsButton = addButton("⚙", "settings", true);
      settingsButton.className = "cx-icon";
      settingsButton.title = "导出设置";
      row.appendChild(settingsButton);
      const collapseButton = addButton("－", "collapse", true);
      collapseButton.className = "cx-icon cx-collapse";
      collapseButton.title = "收起/展开";
      row.appendChild(collapseButton);
      panel.appendChild(row);

      const actions = document.createElement("div");
      actions.className = "cx-actions";
      const pdfButton = addButton("导出PDF", "batch-pdf", false);
      pdfButton.className = "cx-primary-action";
      actions.appendChild(pdfButton);
      addFormatExportControls(actions, { select: { batchFormat: "true" }, action: "batch-format" });
      panel.appendChild(actions);

      const options = document.createElement("div");
      options.className = "cx-options";
      const categoryOptions = addOptionSection(options, "导出范围");
      addCheckbox(categoryOptions, "有答案", { batchCategory: "answered" }, true);
      addCheckbox(categoryOptions, "待批阅", { batchCategory: "reviewing" }, true);
      addCheckbox(categoryOptions, "未完成", { batchCategory: "unfinished" }, true);
      addCheckbox(categoryOptions, "超时/过期", { batchCategory: "overdue" }, true);
      addCheckbox(categoryOptions, "其他状态", { batchCategory: "unknown" }, false);
      const exportOptions = addCommonExportSettings(options, true);
      addCheckbox(exportOptions, "跳过同名", { batchOption: "skip-duplicate-titles" }, true);
      addCheckbox(exportOptions, "无答案标注", { batchOption: "mark-no-answer" }, true);
      addCheckbox(exportOptions, "导出清单", { batchOption: "add-summary" }, true);
      addCheckbox(exportOptions, "打印友好", { batchOption: "print-friendly" }, false);
      addSelect(exportOptions, { workSortMode: "true" }, [
        { value: "original", label: "排序：自动" },
        { value: "time-asc", label: "时间：正序" },
        { value: "time-desc", label: "时间：倒序" },
        { value: "name-asc", label: "名称：正序" },
        { value: "name-desc", label: "名称：倒序" },
      ]);
      panel.appendChild(options);
      applyBatchSortState(panel);

      const tools = document.createElement("div");
      tools.className = "cx-list-tools";
      const listCount = document.createElement("span");
      listCount.dataset.batchListCount = "true";
      listCount.textContent = works.length ? `当前页 ${works.length} 个` : `读取${batchLabel}列表`;
      tools.appendChild(listCount);
      tools.appendChild(addButton("刷新", "refresh-list", true)).className = "cx-link";
      tools.appendChild(addButton("全选", "select-all", true)).className = "cx-link";
      tools.appendChild(addButton("全不选", "select-none", true)).className = "cx-link";
      addCheckbox(tools, "显示考试", { batchKind: "exam" }, true).classList.add("cx-inline-check");
      addCheckbox(tools, "显示作业", { batchKind: "work" }, true).classList.add("cx-inline-check");
      panel.appendChild(tools);

      const list = document.createElement("div");
      list.className = "cx-work-list";
      list.dataset.batchList = "true";
      panel.appendChild(list);
      panel.__cxBatchWorks = works;
      renderBatchWorkList(panel, works);
      setTimeout(() => refreshBatchPreview(panel), 100);
    } else {
      const row = document.createElement("div");
      row.className = "cx-row";
      count.textContent = "已识别 " + questions.length + " 题";
      row.appendChild(count);
      const settingsButton = addButton("⚙", "settings", true);
      settingsButton.className = "cx-icon";
      settingsButton.title = "导出设置";
      row.appendChild(settingsButton);
      const collapseButton = addButton("－", "collapse", true);
      collapseButton.className = "cx-icon cx-collapse";
      collapseButton.title = "收起/展开";
      row.appendChild(collapseButton);
      panel.appendChild(row);
      const actions = document.createElement("div");
      actions.className = "cx-actions";
      const mainRow = document.createElement("div");
      mainRow.className = "cx-single-main-row";
      const pdfButton = addButton("导出PDF", "pdf", false);
      mainRow.appendChild(pdfButton);
      mainRow.appendChild(addButton("复制文本", "copy", true));
      actions.appendChild(mainRow);
      const fileRow = document.createElement("div");
      fileRow.className = "cx-format-row cx-single-file-row";
      addSelect(fileRow, { singleFormat: "true" }, [
        { value: "html", label: "HTML" },
        { value: "md", label: "Markdown" },
        { value: "toml", label: "TOML" },
      ]).className = "cx-format-select";
      fileRow.appendChild(addButton("导出文件", "download-format", true));
      actions.appendChild(fileRow);
      panel.appendChild(actions);
      const options = document.createElement("div");
      options.className = "cx-options";
      addCommonExportSettings(options, false);
      panel.appendChild(options);
    }
    panel.addEventListener("click", (event) => {
      const check = event.target.closest(".cx-check");
      if (check) {
        check.setAttribute("aria-checked", check.getAttribute("aria-checked") === "true" ? "false" : "true");
        if ((check.dataset.batchCategory || check.dataset.batchKind || check.dataset.batchOption === "skip-duplicate-titles") && panel.__cxBatchWorks) {
          resetBatchAutoSelection(panel);
        }
        return;
      }
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      if (action === "print") openPrintPage(false, panel);
      if (action === "pdf") openPrintPage(true, panel);
      if (action === "copy") copyPlainText(panel);
      if (action === "download") downloadHtml(panel);
      if (action === "download-format") downloadFormat(panel.querySelector("[data-single-format]")?.value || "html", panel);
      if (action === "download-md") downloadFormat("md", panel);
      if (action === "download-toml") downloadFormat("toml", panel);
      if (action === "batch") batchExportAnswers(button);
      if (action === "batch-pdf") batchExportPdf(button);
      if (action === "batch-format") {
        const format = panel.querySelector("[data-batch-format]")?.value || "html";
        if (format === "html") batchExportAnswers(button);
        else batchExportTextFormat(button, format);
      }
      if (action === "batch-md") batchExportTextFormat(button, "md");
      if (action === "batch-toml") batchExportTextFormat(button, "toml");
      if (action === "settings") panel.classList.toggle("show-settings");
      if (action === "collapse") {
        panel.classList.toggle("is-collapsed");
        button.textContent = panel.classList.contains("is-collapsed") ? "＋" : "－";
      }
      if (action === "refresh-list") refreshBatchPreview(panel, button);
      if (action === "select-all") setBatchListSelection(panel, true);
      if (action === "select-none") setBatchListSelection(panel, false);
    });
    panel.addEventListener("change", (event) => {
      if (!event.target.matches("[data-work-sort-mode]") || !panel.__cxBatchWorks) return;
      panel.__cxManualWorkOrder = null;
      renderBatchWorkList(panel, panel.__cxBatchWorks);
      rememberBatchSelection(panel);
    });
    document.body.appendChild(panel);
  }

  function init() {
    injectStyle();
    try {
      renderPanel();
    } catch (error) {
      console.error("[学习通作业题目答案打印整理] 悬浮框初始化失败", error);
    }
  }

  init();
  window.addEventListener("load", renderPanel);
  setTimeout(renderPanel, 1500);
})();
