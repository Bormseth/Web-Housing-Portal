/* RA application form (was ra_application) - 3-step stepper with server-side validation,
   optimistic-locking via expected_version, and per-field error display. */
(async function () {
  const { h, btn, icon, go, APIError, Stepper, step, stepNav, textInput, textArea, select, checkbox, badge } = Portal;
  const app = document.getElementById("app");
  app.classList.add("page", "page--narrow");

  const result = await RA.loadApplication(app);
  if (!result) return;
  const { request, cycle, record } = result;

  const backButton = btn("Become an RA", { icon: "arrow_back", variant: "flat", onClick: () => go(RA.ROOT) });
  const title = h("h1", { class: "text-3xl bold", text: cycle.term + " RA Application" });
  document.title = cycle.term + " RA Application";
  const header = [h("div", {}, backButton), title, RA.prototypeNote()];

  /* ---- already submitted: read-only ---- */
  if (record.status === "submitted") {
    app.replaceChildren(...header,
      h("div", { class: "card card--pad", style: "gap:16px" },
        h("div", { class: "row" },
          h("span", { class: "material-icons", style: "color: var(--positive)", "aria-hidden": "true", text: "check_circle" }),
          h("h2", { class: "text-xl bold", text: "Application submitted" })),
        h("p", { class: "semibold", text: "Confirmation: " + record.confirmation }),
        h("p", { class: "muted", text: "Submitted " + RA.timestamp(record.submitted_at) }),
        h("p", { class: "muted", text: "Your submitted answers are saved below. Nothing is sent to UNH." }),
        h("details", { class: "expansion" },
          h("summary", {}, icon("description"), "View submitted application"),
          h("div", { class: "expansion-body" }, RA.reviewAnswers(record.data, cycle.prompts))),
        h("div", {}, btn("Return to RA overview", { icon: "arrow_back", onClick: () => go(RA.ROOT) }))),
      h("div", {}, RA.resetDemo()));
    return;
  }

  /* ---- cycle closed: view-only draft ---- */
  if (!cycle.open) {
    app.replaceChildren(...header,
      h("div", { class: "card card--pad" },
        h("h2", { class: "text-xl bold", text: "Applications are closed" }),
        h("p", { class: "muted", text: "You can view your saved draft, but submission is unavailable." }),
        RA.reviewAnswers(record.data, cycle.prompts)),
      h("div", {}, RA.resetDemo()));
    return;
  }

  /* ---- editable form ---- */
  const data = { ...record.data };
  const state = { record, step: record.step, busy: false };
  const fields = {};       // key -> {el, input, setError?, value}
  const errors = {};       // key -> message from the API
  const errorBoxes = {};   // step number -> element
  const counters = {};     // prompt key -> element
  const actions = [];      // buttons disabled while saving

  const saved = h("p", { class: "text-sm muted", "aria-live": "polite",
    text: record.saved_at ? "Last saved " + RA.timestamp(record.saved_at) : "Use Next or Save & exit to save your progress." });

  const wordCount = (s) => (s || "").trim().split(/\s+/).filter(Boolean).length;

  function paintFieldError(key) {
    const f = fields[key];
    if (f && f.setError) f.setError(errors[key] || "");
  }

  function change(key, value) {
    data[key] = value === null || value === undefined ? "" : value;
    if (key !== "certify") {
      data.certify = false;
      if (fields.certify) fields.certify.value = false;
    }
    saved.textContent = "Unsaved changes · Use Next or Save & exit to keep them.";
    delete errors[key];
    paintFieldError(key);
    if (counters[key]) {
      const count = wordCount(value);
      counters[key].textContent = `${count}/${cycle.max_words} words · ${cycle.min_words} minimum`;
      counters[key].style.color = count > cycle.max_words ? "#b3261e" : "";
    }
  }

  /** Text input/textarea bound to data[key]. */
  function bound(factory, key, label, attrs = {}) {
    const f = factory(label, { value: data[key] || "", ...attrs });
    f.input.addEventListener("input", () => change(key, f.input.value));
    fields[key] = f;
    return f;
  }
  function boundCheckbox(key, label) {
    const f = checkbox(label, !!data[key], (checked) => change(key, checked));
    fields[key] = f;
    return f;
  }

  function showError(number, error) {
    Object.keys(errors).forEach((k) => delete errors[k]);
    Object.assign(errors, error.errors);
    const box = errorBoxes[number];
    box.hidden = false;
    box.replaceChildren(
      h("p", { class: "semibold", text: error.message }),
      Object.values(error.errors).map((m) => h("p", { class: "text-sm", text: m })));
    Object.keys(fields).forEach(paintFieldError);
    const first = Object.keys(error.errors).find((k) => fields[k]);
    if (first && fields[first].input) setTimeout(() => fields[first].input.focus(), 0);
  }

  function setBusy(busy) {
    state.busy = busy;
    [...actions, ...Object.values(fields).map((f) => f.input)].forEach((el) => { if (el) el.disabled = busy; });
  }

  function goTo(number) {
    if (state.busy) return;
    state.step = number;
    stepper.goTo(number);
  }

  async function act(action, number) {
    if (state.busy) return;
    setBusy(true);
    const target = action === "next" ? Math.min(number + 1, 3) : number;
    const payload = { data: { ...data }, step: target, expected_version: state.record.version };
    if (action !== "exit") payload.validate_step = number;
    try {
      const saved_ = await request("PUT", "/application", payload);
      state.record = saved_;
      saved.textContent = "Last saved " + RA.timestamp(saved_.saved_at);
      Object.keys(errors).forEach((k) => delete errors[k]);
      Object.values(errorBoxes).forEach((b) => (b.hidden = true));
      Object.keys(fields).forEach(paintFieldError);
      if (action === "submit") {
        await request("POST", "/application/submit", { expected_version: saved_.version });
        go(RA.FORM);            // reload into the read-only "submitted" view
      } else if (action === "exit") {
        go(RA.ROOT);
      } else {
        state.step = target;
        stepper.goTo(target);
      }
    } catch (error) {
      if (!(error instanceof APIError)) throw error;
      showError(number, error);
    } finally {
      setBusy(false);
    }
  }

  /* ---- review step (re-rendered whenever the step changes) ---- */
  const reviewHost = h("div", {});
  const renderReview = () => reviewHost.replaceChildren(RA.reviewAnswers(data, cycle.prompts, goTo));

  /* ---- step bodies ---- */
  function stepBody(number) {
    if (number === 1) {
      const classYear = select("Class year *", cycle.class_years, { value: data.class_year || "", placeholder: "Select class year" });
      classYear.input.addEventListener("change", () => change("class_year", classYear.input.value));
      fields.class_year = classYear;
      return [
        h("p", { class: "muted", text: "Enter your information and review the sample role expectations." }),
        bound(textInput, "full_name", "Full name *", { autocomplete: "name", maxLength: 120 }).el,
        bound(textInput, "email", "University email *", { type: "email", placeholder: "name@unh.edu", autocomplete: "email", maxLength: 200 }).el,
        classYear.el,
        bound(textInput, "major", "Major (optional)", { maxLength: 160 }).el,
        h("h3", { class: "text-lg semibold", text: "Sample role expectations" }),
        h("p", { class: "muted", text: "The role includes training, meetings, community events, and scheduled on-call responsibilities." }),
        boundCheckbox("enrolled", "I expect to be enrolled throughout the appointment term. *").el,
        boundCheckbox("expectations", "I have read and understand the sample role expectations above. *").el,
      ];
    }
    if (number === 2) {
      return [
        h("p", { class: "muted", text: `Write ${cycle.min_words}–${cycle.max_words} words for each required response.` }),
        Object.entries(cycle.prompts).map(([key, prompt]) => {
          const f = bound(textArea, key, prompt + " *", { maxLength: 8000, rows: 6 });
          counters[key] = h("p", { class: "text-xs muted self-end", "aria-live": "polite",
            text: `${wordCount(data[key])}/${cycle.max_words} words · ${cycle.min_words} minimum` });
          return [f.el, counters[key]];
        }),
        bound(textArea, "experience", "Relevant experience (optional)", { maxLength: 2000, rows: 4 }).el,
      ];
    }
    renderReview();
    return [
      reviewHost,
      boundCheckbox("certify", "I have reviewed my answers and confirm this sample application is ready to submit. *").el,
      h("p", { class: "text-sm muted", text: "Your submitted application will be read-only." }),
    ];
  }

  const stepEls = RA.STEPS.map((stepTitle, i) => {
    const number = i + 1;
    errorBoxes[number] = h("div", { class: "errors", role: "alert", hidden: true });
    const nav = [
      btn(number === 3 ? "Submit Application" : "Next", { icon: number === 3 ? "check" : "arrow_forward",
        onClick: () => act(number === 3 ? "submit" : "next", number) }),
    ];
    if (number > 1) nav.push(btn("Back", { variant: "flat", onClick: () => goTo(number - 1) }));
    nav.push(btn("Save & exit", { icon: "save", variant: "outline", onClick: () => act("exit", number) }));
    actions.push(...nav);
    return step(stepTitle, errorBoxes[number], stepBody(number), stepNav(nav));
  });

  const stepperEl = h("div", { class: "stepper" }, stepEls);

  app.replaceChildren(...header,
    h("p", { class: "muted", text: "Complete the three steps below. Fields marked * are required." }),
    saved,
    stepperEl);

  const stepper = new Stepper(stepperEl, record.step || 1);
  stepper.onchange = (n) => { if (n === 3) renderReview(); window.scrollTo({ top: 0 }); };
})();
