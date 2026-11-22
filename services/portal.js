/* ==========================================================================
   Portal - shared helpers for every page.
   Replaces: services/api_client.py, components/header.py, and the small
   helpers (format_time, format_room_type) that were duplicated across pages.

   Loaded with a plain <script> tag (no build step, works from any static
   server). Everything is exposed on window.Portal.
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Config
   * Same env var idea as HOUSING_API_BASE in api_client.py. To override
   * without editing this file, define window.HOUSING_API_BASE in a
   * <script> tag before portal.js.
   * ------------------------------------------------------------------ */
  const API_BASE = (window.HOUSING_API_BASE || "http://127.0.0.1:8006").replace(/\/+$/, "");

  /* ------------------------------------------------------------------ *
   * DOM helper:  h("div", {class: "card", onclick: fn}, "text", childNode)
   * Text is always inserted with textContent (never innerHTML), so
   * user-entered values can't inject markup.
   * ------------------------------------------------------------------ */
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === undefined || value === null || value === false) continue;
      if (key === "class") el.className = value;
      else if (key === "text") el.textContent = value;
      else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2), value);
      else if (key in el && key !== "list" && typeof value !== "object") {
        try { el[key] = value; } catch { el.setAttribute(key, value); }
      } else el.setAttribute(key, value === true ? "" : value);
    }
    append(el, children);
    return el;
  }
  function append(el, children) {
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  }
  function clear(el) { el.replaceChildren(); return el; }

  function icon(name) { return h("span", { class: "material-icons", "aria-hidden": "true", text: name }); }

  /** btn("Save", {icon:"save", variant:"flat|outline|negative", dense:true, onClick:fn, class:"mt-4"}) */
  function btn(label, opts = {}) {
    const variants = [].concat(opts.variant || []).map((v) => "btn--" + v);
    if (opts.dense) variants.push("btn--dense");
    return h("button", {
      type: "button",
      class: ["btn", ...variants, opts.class].filter(Boolean).join(" "),
      disabled: !!opts.disabled,
      onclick: opts.onClick,
    }, opts.icon ? icon(opts.icon) : null, label);
  }
  function iconBtn(iconName, label, onClick) {
    return h("button", { type: "button", class: "btn btn--flat btn--icon", "aria-label": label, onclick: onClick }, icon(iconName));
  }
  /** Link styled as a button. */
  function linkBtn(label, href, opts = {}) {
    return h("a", {
      class: ["btn", ...[].concat(opts.variant || []).map((v) => "btn--" + v), opts.class].filter(Boolean).join(" "),
      href, target: opts.newTab ? "_blank" : null, rel: opts.newTab ? "noopener" : null,
    }, opts.icon ? icon(opts.icon) : null, label);
  }
  function badge(text, color) { return h("span", { class: "badge badge--" + color, text }); }
  function separator() { return h("hr", { class: "separator" }); }
  function go(url) { window.location.href = url; }
  function reload() { window.location.reload(); }

  /* ------------------------------------------------------------------ *
   * Notifications  (replaces ui.notify)   type: positive|negative|warning|info
   * ------------------------------------------------------------------ */
  function notify(message, type = "info", opts = {}) {
    let host = document.getElementById("toasts");
    if (!host) {
      host = h("div", { id: "toasts", "aria-live": "polite" });
      document.body.append(host);
    }
    const toast = h("div", { class: "toast toast--" + type, role: type === "negative" ? "alert" : "status" }, h("span", { text: message }));
    const remove = () => toast.remove();
    const sticky = opts.closeButton || type === "negative";
    if (sticky) toast.append(h("button", { type: "button", "aria-label": "Dismiss", onclick: remove, text: "×" }));
    host.append(toast);
    setTimeout(remove, sticky ? 8000 : 3000);
  }

  /* ------------------------------------------------------------------ *
   * API client  (replaces services/api_client.py)
   * ------------------------------------------------------------------ */
  class APIError extends Error {
    constructor(message, errors) {
      super(message);
      this.name = "APIError";
      this.errors = errors || {};
    }
  }

  async function request(method, path, json, { session } = {}) {
    const headers = {};
    if (json !== undefined && json !== null) headers["Content-Type"] = "application/json";
    if (session) headers["X-RA-Session"] = session;

    let response;
    try {
      response = await fetch(API_BASE + path, {
        method, headers,
        body: json !== undefined && json !== null ? JSON.stringify(json) : undefined,
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new APIError("The application service is unavailable. Your current edits are still on this page. Try again when the service is running.");
    }

    let result;
    try { result = await response.json(); }
    catch { throw new APIError("The application service returned an unexpected response. Please try again."); }

    if (response.status >= 400) {
      let detail = result && typeof result === "object" && !Array.isArray(result) ? result.detail : null;
      detail = detail || "The request could not be completed. Please try again.";
      if (typeof detail === "object") {
        throw new APIError(detail.message || "Check your information and try again.", detail.errors);
      }
      if (typeof detail !== "string") detail = "Some information could not be saved. Check the field lengths and try again.";
      throw new APIError(detail);
    }
    return result;
  }

  /** GET that toasts on failure and returns [] (same as the old api_get). */
  async function apiGet(path) {
    try { return await request("GET", path); }
    catch (error) { notify(error.message, "negative"); return []; }
  }
  /** POST that toasts on failure and returns true/false (same as the old api_post). */
  async function apiPost(path, json) {
    try { await request("POST", path, json); return true; }
    catch (error) { notify(error.message, "negative"); return false; }
  }

  /* ------------------------------------------------------------------ *
   * Per-browser session id  (replaces app.storage.user["ra_session"])
   * ------------------------------------------------------------------ */
  let memorySession = null;
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
  function getSession() {
    try {
      let session = localStorage.getItem("ra_session");
      if (!session) { session = uuid(); localStorage.setItem("ra_session", session); }
      return session;
    } catch {
      return (memorySession = memorySession || uuid());
    }
  }
  /** Request that carries the session header (housing application, meal plans, RA). */
  function sessionRequest(method, path, data) {
    return request(method, path, data, { session: getSession() });
  }

  /* ------------------------------------------------------------------ *
   * Formatting
   * ------------------------------------------------------------------ */
  /** "Nov 18, 2026 at 03:05 PM ET" */
  function formatTime(value) {
    if (!value) return "Not saved yet";
    const d = new Date(value);
    if (isNaN(d)) return String(value);
    const tz = "America/New_York";
    const date = d.toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "2-digit", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
    return `${date} at ${time} ET`;
  }
  /** 'super_single' -> 'Super Single'; '2_doubles_1_single' -> '2 Doubles + 1 Single' */
  function formatRoomType(slug) {
    const title = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    const parts = String(slug).split("_");
    if (!/^\d+$/.test(parts[0])) return parts.map(title).join(" ");
    const out = [];
    for (let i = 0; i < parts.length; i += 2) out.push(`${parts[i]} ${title(parts[i + 1] || "")}`);
    return out.join(" + ");
  }
  function money(n, digits = 2) {
    return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }
  /** The API can return null, [], or {} for "nothing" (api_get returns [] on error). */
  function hasData(v) {
    if (!v) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return true;
  }

  /* ------------------------------------------------------------------ *
   * Stepper  (replaces ui.stepper / ui.step / stepper.next() ...)
   * Markup:  <div class="stepper"> <div class="step" data-title="A">..</div> ... </div>
   * ------------------------------------------------------------------ */
  class Stepper {
    constructor(root, startAt = 1) {
      this.root = root;
      this.steps = [...root.querySelectorAll(":scope > .step")];
      this.header = h("div", { class: "stepper-header", role: "list" });
      this.tabs = this.steps.map((step, i) => {
        const tab = h("div", { class: "stepper-tab", role: "listitem" },
          h("span", { class: "stepper-dot", text: String(i + 1) }),
          h("span", { class: "stepper-title", text: step.dataset.title || `Step ${i + 1}` }));
        this.header.append(tab);
        return tab;
      });
      root.prepend(this.header);
      this.onchange = null;
      this.goTo(startAt);
    }
    get current() { return this.index + 1; }
    goTo(number) {
      this.index = Math.max(0, Math.min(this.steps.length - 1, number - 1));
      this.steps.forEach((s, i) => s.classList.toggle("is-active", i === this.index));
      this.tabs.forEach((t, i) => {
        t.classList.toggle("is-active", i === this.index);
        t.classList.toggle("is-done", i < this.index);
        if (i === this.index) t.setAttribute("aria-current", "step"); else t.removeAttribute("aria-current");
      });
      if (this.onchange) this.onchange(this.current);
    }
    next() { this.goTo(this.current + 1); }
    previous() { this.goTo(this.current - 1); }
  }

  /** Build a step panel: step("Title", child, child...) */
  function step(title, ...children) { return h("div", { class: "step", "data-title": title }, children); }
  function stepNav(...children) { return h("div", { class: "step-nav" }, children); }

  /* ------------------------------------------------------------------ *
   * Form field builders
   * Each returns {el, input, setError(msg), get value}
   * ------------------------------------------------------------------ */
  function field(label, control, extra) {
    const err = h("div", { class: "field-error", role: "alert", hidden: true });
    const wrap = h("label", { class: "field" }, h("span", { class: "field-label", text: label }), control, extra, err);
    return {
      el: wrap, input: control,
      get value() { return control.value; },
      set value(v) { control.value = v; },
      setError(msg) {
        wrap.classList.toggle("has-error", !!msg);
        err.hidden = !msg;
        err.textContent = msg || "";
      },
    };
  }
  function textInput(label, { value = "", placeholder = "", type = "text", ...attrs } = {}) {
    return field(label, h("input", { type, value, placeholder, ...attrs }));
  }
  function textArea(label, { value = "", placeholder = "", ...attrs } = {}) {
    return field(label, h("textarea", { value, placeholder, ...attrs }));
  }
  function select(label, options, { value = "", placeholder = "" } = {}) {
    const control = h("select", {},
      placeholder ? h("option", { value: "", text: placeholder }) : null,
      options.map((o) => h("option", { value: o, text: o })));
    control.value = value || "";
    return field(label, control);
  }
  function checkbox(label, checked = false, onChange) {
    const input = h("input", { type: "checkbox", checked: !!checked, onchange: onChange ? (e) => onChange(e.target.checked) : null });
    return { el: h("label", { class: "check" }, input, h("span", { text: label })), input,
      get value() { return input.checked; }, set value(v) { input.checked = !!v; } };
  }
  function radioGroup(name, options, value) {
    const inputs = options.map((o) => h("input", { type: "radio", name, value: o, checked: o === value }));
    const el = h("fieldset", { class: "radio-group" },
      inputs.map((input, i) => h("label", {}, input, h("span", { text: options[i] }))));
    return { el, get value() { const c = inputs.find((i) => i.checked); return c ? c.value : ""; } };
  }

  /* ------------------------------------------------------------------ *
   * Dialog (replaces ui.dialog)  - uses the native <dialog> element
   * ------------------------------------------------------------------ */
  function dialog(...children) {
    const d = h("dialog", { class: "dialog" }, h("div", { class: "col" }, children));
    document.body.append(d);
    return { el: d, open: () => d.showModal(), close: () => d.close(), remove: () => d.remove() };
  }

  /* ------------------------------------------------------------------ *
   * Site header  (replaces components/header.py)
   * Pages declare their nav highlight with <body data-active="become-an-ra.html">
   * ------------------------------------------------------------------ */
  const NAV_LEFT = [
    ["Home", "/index.html"],
    ["Housing Applications", "/pages/housing-applications.html"],
    ["Maintenance", "/pages/maintenance.html"],
    ["Meal Plans", "/pages/meal-plans.html"],
    ["Become an RA", "/pages/become-an-ra.html"],
  ];
  const NAV_RIGHT = [
    ["My Profile", "/pages/my-profile.html"],
    ["Messages", "/pages/messages.html"],
    ["Log out", "/index.html"],
  ];

  function renderHeader() {
    const host = document.getElementById("site-header");
    if (!host) return;
    const active = document.body.dataset.active || "";
    const link = ([label, href]) => h("a", { href, "aria-current": href === active ? "page" : null, text: label });

    const logo = h("img", {
      class: "brand-logo", src: "/assets/UNH-CREST.png", alt: "University of New Hampshire",
      onerror: (e) => e.target.replaceWith(h("span", { class: "text-2xl bold", text: "UNH Housing Portal" })),
    });
    host.className = "site-shell";
    host.append(
      h("div", { class: "brand-row" }, logo),
      h("nav", { class: "site-nav", "aria-label": "Main" },
        h("div", { class: "nav-group" }, NAV_LEFT.map(link)),
        h("div", { class: "nav-group" }, NAV_RIGHT.map(link))));
  }

  document.addEventListener("DOMContentLoaded", renderHeader);
  // Material Icons font (used by btn()/icon()). Remove if you switch icon sets.
  if (!document.querySelector('link[data-portal-icons]')) {
    document.head.append(h("link", { rel: "stylesheet", href: "https://fonts.googleapis.com/icon?family=Material+Icons", "data-portal-icons": "" }));
  }

  window.Portal = {
    API_BASE, h, clear, icon, btn, iconBtn, linkBtn, badge, separator, go, reload, notify,
    APIError, request, apiGet, apiPost, getSession, sessionRequest,
    formatTime, formatRoomType, money, hasData,
    Stepper, step, stepNav, field, textInput, textArea, select, checkbox, radioGroup, dialog,
  };
})();
