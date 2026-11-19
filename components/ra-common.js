/* Shared RA helpers (top half of become_an_ra.py).
   Exposes window.RA = { ROOT, FORM, STEPS, loadApplication, reviewAnswers, resetDemo, prototypeNote, timestamp } */
(function () {
  const { h, btn, separator, notify, go, reload, APIError, sessionRequest, formatTime, dialog } = Portal;

  const ROOT = "become-an-ra.html";
  const FORM = "become-an-ra-apply.html";
  const STEPS = ["Student Information", "Short Responses", "Review and Submit"];

  const timestamp = (value) => (value ? formatTime(value) : "Not saved yet");

  const prototypeNote = () =>
    h("p", { class: "text-xs muted-2", text: "Class prototype. Dates and expectations are examples; nothing is sent to UNH." });

  /** All RA endpoints live under /ra and carry the session header. */
  const request = (method, path, data) => sessionRequest(method, "/ra" + path, data);

  /** Returns {request, cycle, record} or null (after drawing an error card). */
  async function loadApplication(container) {
    try {
      const [cycle, record] = await Promise.all([request("GET", "/cycle"), request("GET", "/application")]);
      return { request, cycle, record };
    } catch (error) {
      if (!(error instanceof APIError)) throw error;
      container.replaceChildren(
        h("div", { class: "card card--pad" },
          h("h2", { class: "text-xl bold", text: "Application service unavailable" }),
          h("p", { class: "muted", text: "Your saved application has not been deleted. Start the API and try again." }),
          btn("Try again", { icon: "refresh", onClick: reload })));
      return null;
    }
  }

  /** Read-only summary. If `edit` is passed, shows "Edit" buttons that call edit(stepNumber). */
  function reviewAnswers(data, prompts, edit) {
    const answer = (text) => h("p", { class: "pre-wrap", text });
    return h("div", { class: "col", style: "gap:12px" },
      h("div", { class: "row row--between w-full" },
        h("h3", { class: "text-lg semibold", text: "Student information" }),
        edit ? btn("Edit information", { icon: "edit", variant: "flat", dense: true, onClick: () => edit(1) }) : null),
      [["Name", "full_name"], ["Email", "email"], ["Class year", "class_year"], ["Major", "major"]]
        .map(([label, key]) => answer(`${label}: ${data[key] || "Not provided"}`)),
      separator(),
      h("div", { class: "row row--between w-full" },
        h("h3", { class: "text-lg semibold", text: "Short responses" }),
        edit ? btn("Edit responses", { icon: "edit", variant: "flat", dense: true, onClick: () => edit(2) }) : null),
      Object.entries(prompts).map(([key, prompt]) => [h("p", { class: "semibold", text: prompt }), answer(data[key] || "Not provided")]),
      data.experience ? [h("p", { class: "semibold", text: "Relevant experience" }), answer(data.experience)] : null);
  }

  /** "Reset demo" button + confirmation dialog. */
  function resetDemo() {
    const dlg = dialog(
      h("h2", { class: "text-xl bold", text: "Reset this sample application?" }),
      h("p", { text: "Your saved answers and confirmation will be cleared for this browser." }),
      h("div", { class: "row" },
        btn("Keep application", { variant: "flat", onClick: () => dlg.close() }),
        btn("Reset application", { onClick: async () => {
          try { await request("DELETE", "/application"); go(ROOT); }
          catch (error) { notify(error.message, "negative"); }
        } })));
    return btn("Reset demo", { icon: "restart_alt", variant: "flat", dense: true, onClick: () => dlg.open() });
  }

  window.RA = { ROOT, FORM, STEPS, request, loadApplication, reviewAnswers, resetDemo, prototypeNote, timestamp };
})();
