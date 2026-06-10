// ==UserScript==
// @name         学习通作业题目答案打印整理
// @namespace    https://chaoxing-print-helper.local/
// @version      1.4.0
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
// @match        https://mooc2-ans.chaoxing.com/mooc2-ans/mycourse/stu*
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @connect      chaoxing.com
// @connect      *.chaoxing.com
// @connect      mooc1.chaoxing.com
// @connect      mooc1-1.chaoxing.com
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  "use strict";

  if (window.top !== window.self) return;
  if (window.__CHAOXING_PRINT_HELPER_LOADED__) return;
  window.__CHAOXING_PRINT_HELPER_LOADED__ = true;

  const STYLE_ID = "cx-print-helper-style";
  const PANEL_ID = "cx-print-helper-panel";
  const NO_ANSWER_MARK = "无答案";
  const BATCH_CATEGORY_LABELS = {
    answered: "有答案",
    reviewing: "待批阅",
    unfinished: "未完成",
    overdue: "超时/过期",
    unknown: "其他",
  };

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        right: 18px;
        bottom: 22px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 248px;
        max-width: 360px;
        padding: 12px;
        background: rgba(255, 255, 255, .96);
        border: 1px solid #d7dde8;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(20, 35, 60, .16);
        font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      #${PANEL_ID} .cx-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      #${PANEL_ID} button {
        border: 1px solid #2563eb;
        border-radius: 6px;
        background: #2563eb;
        color: #fff;
        padding: 7px 10px;
        cursor: pointer;
      }
      #${PANEL_ID} button.secondary {
        background: #fff;
        color: #2563eb;
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
        padding: 10px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 7px;
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
        width: 32px;
        height: 32px;
        padding: 0;
        border-color: #cbd5e1;
        background: #fff;
        color: #334155;
        font-size: 17px;
        line-height: 1;
      }
      #${PANEL_ID} .cx-list-tools {
        display: flex;
        align-items: center;
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
        max-height: 220px;
        overflow: auto;
        padding: 6px;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 7px;
      }
      #${PANEL_ID} .cx-work-item {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 7px;
        align-items: center;
        padding: 5px 4px;
        border-radius: 5px;
        cursor: pointer;
      }
      #${PANEL_ID} .cx-work-item:hover {
        background: #f8fafc;
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
    `;
    document.head.appendChild(style);
  }

  function cleanText(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t\r\n]+/g, " ")
      .trim();
  }

  function absolutizeUrl(url) {
    if (!url) return "";
    try {
      return new URL(url, location.href).href;
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
      <div class="meta">共 ${items.length} 个作业 · ${questionCount} 题 · 生成时间：${escapeHtml(generatedAt)}${options.printFriendly ? " · 已启用打印友好空白页" : ""}</div>
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
      q.options.forEach((opt) => lines.push(`${opt.letter}. ${opt.text}`));
      if (includeAnswers && (q.rightAnswer || q.rightAnswerHtml)) lines.push(`答案：${compactAnswer(q)}`);
      if (includeAnswers && includeAnalysis && q.analysis) lines.push(`解析：${q.analysis}`);
      lines.push("");
    });
    return lines.join("\n");
  }

  function normalizeWorkUrl(rawUrl) {
    const url = new URL(absolutizeUrl(rawUrl), location.href);
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

  function parseWorkList(root = document) {
    return [...root.querySelectorAll('li[onclick*="goTask"][data]')].map((item) => {
      const rawUrl = item.getAttribute("data") || "";
      const url = normalizeWorkUrl(rawUrl);
      const label = textFromNode({ innerText: item.getAttribute("aria-label") || "" });
      const params = new URL(url).searchParams;
      const workId = params.get("workId") || "";
      const answerId = params.get("answerId") || "";
      const status = detectWorkStatus(label);
      const title = cleanText(label.split(";")[0]) || textFromNode(item.querySelector(".workTit, .overHidden2, h3, p")) || "未命名作业";
      return { title, url, rawUrl: absolutizeUrl(rawUrl), workId, answerId, status };
    }).filter((work) => work.url && work.workId);
  }

  function uniqueWorks(works) {
    const seen = new Set();
    return works.filter((work) => {
      const key = work.workId || work.url;
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
    url.searchParams.set("topicId", url.searchParams.get("topicId") || "0");
    url.searchParams.set("pageNum", String(pageNum));
    return url.href;
  }

  function getCourseValue(id) {
    const node = document.getElementById(id);
    return node ? node.value || "" : "";
  }

  function getCourseWorkListUrl() {
    if (/\/work\/list/.test(location.pathname)) {
      return location.href;
    }

    const courseId = getCourseValue("courseid") || getCourseValue("courseId");
    const classId = getCourseValue("clazzid") || getCourseValue("classId");
    const cpi = getCourseValue("cpi");
    const stuenc = getCourseValue("enc");
    const enc = getCourseValue("workEnc");
    const t = getCourseValue("t") || Date.now();
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

  async function collectWorksForBatch() {
    const domWorks = parseWorkList();

    const listUrl = getCourseWorkListUrl();
    if (!listUrl && domWorks.length) return uniqueWorks(domWorks);
    if (!listUrl) return [];

    const allWorks = [...domWorks];
    const firstHtml = await requestText(buildListPageUrl(listUrl, 1));
    const firstDoc = new DOMParser().parseFromString(firstHtml, "text/html");
    allWorks.push(...parseWorkList(firstDoc));

    const totalPages = parseTotalListPages(firstDoc);
    for (let pageNum = 2; pageNum <= totalPages; pageNum += 1) {
      const pageHtml = await requestText(buildListPageUrl(listUrl, pageNum));
      const pageDoc = new DOMParser().parseFromString(pageHtml, "text/html");
      allWorks.push(...parseWorkList(pageDoc));
    }

    return uniqueWorks(allWorks);
  }

  async function fetchWorkDetail(work) {
    let lastTitle = work.title;
    let lastError = "";
    const urls = workDetailUrlCandidates(work);
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
          return {
            ...work,
            url,
            title: lastTitle,
            questions,
          };
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
    return work.workId || work.url || work.title;
  }

  function rememberBatchSelection(panel) {
    const items = [...panel.querySelectorAll('[data-work-key]')];
    if (!items.length) return;
    panel.__cxSelectedWorkKeys = new Set(items.filter((item) => item.getAttribute("aria-checked") === "true").map((item) => item.dataset.workKey));
  }

  function defaultSelectedWorkKeys(panel, works, options) {
    if (panel.__cxSelectedWorkKeys) return panel.__cxSelectedWorkKeys;
    const { filtered } = filterWorksForBatch(works, { ...options, selectedWorkKeys: null });
    panel.__cxSelectedWorkKeys = new Set(filtered.map(workKey));
    return panel.__cxSelectedWorkKeys;
  }

  function readBatchOptions(panel) {
    const selectedCategories = new Set(
      [...panel.querySelectorAll('[data-batch-category][aria-checked="true"]')].map((input) => input.dataset.batchCategory)
    );
    const selectedInputs = [...panel.querySelectorAll('[data-work-key]')];
    const selectedWorkKeys = selectedInputs.length
      ? new Set(selectedInputs.filter((input) => input.getAttribute("aria-checked") === "true").map((input) => input.dataset.workKey))
      : null;
    return {
      selectedCategories,
      selectedWorkKeys,
      skipDuplicateTitles: panel.querySelector('[data-batch-option="skip-duplicate-titles"]')?.getAttribute("aria-checked") === "true",
      markNoAnswer: panel.querySelector('[data-batch-option="mark-no-answer"]')?.getAttribute("aria-checked") === "true",
      addSummary: panel.querySelector('[data-batch-option="add-summary"]')?.getAttribute("aria-checked") === "true",
      includeAnalysis: panel.querySelector('[data-batch-option="include-analysis"]')?.getAttribute("aria-checked") === "true",
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
      const category = workCategory(work);
      if (!options.selectedCategories.has(category)) {
        skipped.push({ work, reason: `未选择分类：${BATCH_CATEGORY_LABELS[category] || "其他"}` });
        return;
      }
      const titleKey = normalizedTitleKey(work.title);
      if (options.skipDuplicateTitles && titleKey && seenTitles.has(titleKey)) {
        skipped.push({ work, reason: "同名作业已跳过" });
        return;
      }
      if (titleKey) seenTitles.add(titleKey);
      filtered.push(work);
    });
    return { filtered, skipped };
  }

  function renderBatchWorkList(panel, works) {
    const list = panel.querySelector("[data-batch-list]");
    const listCount = panel.querySelector("[data-batch-list-count]");
    if (!list) return;
    list.textContent = "";
    if (listCount) listCount.textContent = `共 ${works.length} 个`;
    if (!works.length) {
      list.textContent = "没有识别到作业";
      return;
    }
    const options = readBatchOptions(panel);
    const { filtered, skipped } = filterWorksForBatch(works, { ...options, selectedWorkKeys: null });
    const skippedKeys = new Map(skipped.map((item) => [workKey(item.work), item.reason]));
    const filteredKeys = new Set(filtered.map(workKey));
    const selectedKeys = defaultSelectedWorkKeys(panel, works, options);
    works.forEach((work) => {
      const item = document.createElement("div");
      item.className = "cx-work-item";
      item.dataset.workKey = workKey(work);
      item.setAttribute("role", "checkbox");
      item.setAttribute("tabindex", "0");
      item.setAttribute("aria-checked", selectedKeys.has(workKey(work)) && filteredKeys.has(workKey(work)) ? "true" : "false");
      item.title = skippedKeys.get(workKey(work)) || "";

      const box = document.createElement("span");
      box.className = "cx-box";
      box.setAttribute("aria-hidden", "true");

      const title = document.createElement("span");
      title.className = "cx-work-title";
      title.textContent = workCategory(work) === "answered" ? work.title : `${work.title}（${NO_ANSWER_MARK}）`;
      title.title = title.textContent;

      const badge = document.createElement("span");
      badge.className = "cx-badge";
      badge.textContent = displayWorkStatus(work);

      item.addEventListener("click", () => {
        item.setAttribute("aria-checked", item.getAttribute("aria-checked") === "true" ? "false" : "true");
        rememberBatchSelection(panel);
      });
      item.addEventListener("keydown", (event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        item.click();
      });
      item.append(box, title, badge);
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
    if (button) {
      button.disabled = true;
      button.textContent = "读取中";
    }
    if (list) list.textContent = "正在读取全部页作业...";
    if (listCount) listCount.textContent = "";
    try {
      if (button) window.__CX_PRINT_BATCH_WORKS_CACHE__ = null;
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

  function buildBatchSummary(exported, skipped, failures) {
    const lines = [
      "学习通作业批量导出清单",
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
    if (button) {
      button.disabled = true;
      button.textContent = "检测作业中";
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
      if (!filtered.length) throw new Error("没有符合当前筛选条件的作业。");
      return { works: filtered, skipped, options, oldText };
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
    const { works, skipped, options, oldText } = prepared;

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
        const html = buildPrintableHtml(result.questions, title, { includeAnswers, includeAnalysis: options.includeAnalysis });
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
          questionCount: result.questions.length,
        });
      } catch (error) {
        failures.push(`${work.title}: ${error.message || String(error)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (options.addSummary) {
      zipFiles.push({
        name: "导出清单.txt",
        content: buildBatchSummary(exported, skipped, failures),
      });
    } else if (failures.length) {
      zipFiles.push({
        name: "导出失败列表.txt",
        content: failures.join("\n"),
      });
    }

    if (zipFiles.length) {
      button.textContent = "生成ZIP中";
      downloadBlob(`${safeFileName(document.title || "学习通作业答案")}.zip`, createZipBlob(zipFiles));
    }

    restoreBatchButton(button, oldText);

    if (failures.length) {
      alert(`已打包 ${exported.length} 个作业，跳过 ${skipped.length} 个，失败 ${failures.length} 个。`);
    } else {
      alert(`已打包 ${exported.length} 个作业，跳过 ${skipped.length} 个。`);
    }
  }

  async function batchExportPdf(button) {
    const panel = button.closest(`#${PANEL_ID}`) || document;
    let prepared;
    try {
      prepared = await prepareBatchWorks(panel, button);
    } catch (error) {
      alert(error.message || String(error));
      return;
    }
    const { works, options, oldText } = prepared;
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
        items.push({
          title,
          questions: result.questions,
          options: { includeAnswers, includeAnalysis: options.includeAnalysis },
        });
      } catch (error) {
        failures.push(`${work.title}: ${error.message || String(error)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    restoreBatchButton(button, oldText);
    if (!items.length) {
      alert("没有成功生成 PDF 内容。" + (failures.length ? "\n" + failures.join("\n") : ""));
      return;
    }
    const html = buildBatchPrintableHtml(items, document.title || "学习通作业批量导出", {
      printFriendly: options.printFriendly,
    });
    const win = window.open("", "_blank");
    if (!win) {
      alert("浏览器拦截了弹窗，请允许此页面打开新窗口。");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
    if (failures.length) {
      alert(`PDF 页面已生成，${failures.length} 个作业失败，未加入 PDF。`);
    }
  }

  function openPrintPage(autoPrint = false) {
    const questions = collectQuestions();
    if (!questions.length) {
      alert("没有识别到题目。请确认当前是学习通作业详情页，并且题目已经加载完成。");
      return;
    }
    const win = window.open("", "_blank");
    if (!win) {
      alert("浏览器拦截了弹窗，请允许此页面打开新窗口。");
      return;
    }
    win.document.open();
    win.document.write(buildPrintableHtml(questions));
    win.document.close();
    if (autoPrint) setTimeout(() => win.print(), 500);
  }

  function copyPlainText() {
    const questions = collectQuestions();
    if (!questions.length) {
      alert("没有识别到题目。");
      return;
    }
    const text = buildPlainText(questions);
    if (typeof GM_setClipboard === "function") {
      GM_setClipboard(text, "text");
      alert("已复制整理后的题目和答案。");
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => alert("已复制整理后的题目和答案。"),
      () => alert("复制失败，请使用“下载HTML”或“打印版”。")
    );
  }

  function downloadHtml() {
    const questions = collectQuestions();
    if (!questions.length) {
      alert("没有识别到题目。");
      return;
    }
    const blob = new Blob([buildPrintableHtml(questions)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${getPageTitle().replace(/[\\/:*?"<>|]/g, "_")}-打印版.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function renderPanel() {
    const oldPanel = document.getElementById(PANEL_ID);
    if (oldPanel) oldPanel.remove();

    const isCourseHome = /\/mooc2-ans\/mycourse\/stu/.test(location.pathname);
    const isWorkList = /\/work\/list/.test(location.pathname) || isCourseHome || document.querySelector('li[onclick*="goTask"][data]');
    const questions = collectQuestions();
    const works = isWorkList ? parseWorkList() : [];
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

    if (isWorkList) {
      const row = document.createElement("div");
      row.className = "cx-row";
      count.textContent = `批量导出作业${works.length ? `（当前页${works.length}个）` : ""}`;
      row.appendChild(count);
      row.appendChild(addButton("导出全部页", "batch", false));
      row.appendChild(addButton("导出PDF", "batch-pdf", true));
      const settingsButton = addButton("⚙", "settings", true);
      settingsButton.className = "cx-icon";
      settingsButton.title = "导出设置";
      row.appendChild(settingsButton);
      panel.appendChild(row);

      const options = document.createElement("div");
      options.className = "cx-options";
      const categoryOptions = addOptionSection(options, "导出范围");
      addCheckbox(categoryOptions, "有答案", { batchCategory: "answered" }, true);
      addCheckbox(categoryOptions, "待批阅", { batchCategory: "reviewing" }, true);
      addCheckbox(categoryOptions, "未完成", { batchCategory: "unfinished" }, true);
      addCheckbox(categoryOptions, "超时/过期", { batchCategory: "overdue" }, true);
      addCheckbox(categoryOptions, "其他状态", { batchCategory: "unknown" }, false);
      const exportOptions = addOptionSection(options, "导出选项");
      addCheckbox(exportOptions, "跳过同名", { batchOption: "skip-duplicate-titles" }, true);
      addCheckbox(exportOptions, "无答案标注", { batchOption: "mark-no-answer" }, true);
      addCheckbox(exportOptions, "导出清单", { batchOption: "add-summary" }, true);
      addCheckbox(exportOptions, "显示解析", { batchOption: "include-analysis" }, true);
      addCheckbox(exportOptions, "打印友好", { batchOption: "print-friendly" }, false);
      panel.appendChild(options);

      const tools = document.createElement("div");
      tools.className = "cx-list-tools";
      const listCount = document.createElement("span");
      listCount.dataset.batchListCount = "true";
      listCount.textContent = works.length ? `当前页 ${works.length} 个` : "读取作业列表";
      tools.appendChild(listCount);
      tools.appendChild(addButton("刷新", "refresh-list", true)).className = "cx-link";
      tools.appendChild(addButton("全选", "select-all", true)).className = "cx-link";
      tools.appendChild(addButton("全不选", "select-none", true)).className = "cx-link";
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
      row.appendChild(addButton("打印版", "print", false));
      row.appendChild(addButton("导出PDF", "pdf", true));
      row.appendChild(addButton("复制文本", "copy", true));
      row.appendChild(addButton("下载HTML", "download", true));
      panel.appendChild(row);
    }
    panel.addEventListener("click", (event) => {
      const check = event.target.closest(".cx-check");
      if (check) {
        check.setAttribute("aria-checked", check.getAttribute("aria-checked") === "true" ? "false" : "true");
        if ((check.dataset.batchCategory || check.dataset.batchOption === "skip-duplicate-titles") && panel.__cxBatchWorks) {
          resetBatchAutoSelection(panel);
        }
        return;
      }
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      if (action === "print") openPrintPage();
      if (action === "pdf") openPrintPage(true);
      if (action === "copy") copyPlainText();
      if (action === "download") downloadHtml();
      if (action === "batch") batchExportAnswers(button);
      if (action === "batch-pdf") batchExportPdf(button);
      if (action === "settings") panel.classList.toggle("show-settings");
      if (action === "refresh-list") refreshBatchPreview(panel, button);
      if (action === "select-all") setBatchListSelection(panel, true);
      if (action === "select-none") setBatchListSelection(panel, false);
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
