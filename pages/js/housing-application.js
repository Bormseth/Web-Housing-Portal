/* 2026-2027 Housing Application (was housing_application_2026_page) */
(async function () {
  const { h, btn, iconBtn, icon, go, notify, reload, APIError, sessionRequest, formatTime,
          Stepper, step, stepNav, textInput, textArea, select, radioGroup, hasData, separator } = Portal;

  const SELECTION_ROUTE = "room-select.html";
  const YEAR_SLUG = "2026-2027";

  // Keep these in sync with the option lists in housing_api.py.
  const CLASS_YEARS = ["First-year", "Sophomore", "Junior", "Senior"];
  const HOUSING_STYLES = ["Traditional Residence Hall", "Suite-Style Housing", "Apartment-Style Housing", "No Preference"];
  const ROOM_PREFERENCES = ["Single", "Double", "Triple", "No Preference"];
  const ROOMMATE_PREFERENCES = ["I have a preferred roommate", "I would like a roommate assigned", "I prefer a single room"];

  const housingRequest = (method, data) => sessionRequest(method, `/housing-applications/${YEAR_SLUG}`, data);

  const app = document.getElementById("app");
  app.classList.add("page--narrow");

  // Load any previously submitted application so the student can see and change it.
  let existing = null;
  try { existing = await housingRequest("GET"); }
  catch (error) { notify(error.message, "negative"); }
  if (!hasData(existing)) existing = null;
  const saved = existing ? existing.data || {} : {};

  /* ---------- existing-application banner ---------- */
  function existingBanner(rec) {
    async function cancel() {
      try { await housingRequest("DELETE"); reload(); }
      catch (error) { notify(error.message, "negative"); }
    }
    return h("div", { class: "card" },
      h("p", { class: "semibold", text: `You submitted this application on ${formatTime(rec.submitted_at)}.` }),
      h("p", { class: "text-sm muted", text: `Confirmation ${rec.confirmation}. Submitting again below replaces your saved application.` }),
      btn("Cancel application", { icon: "close", variant: "flat", dense: true, onClick: cancel }));
  }

  /* ---------- Step 1: student information ---------- */
  const studentName = textInput("Full Name", { value: saved.full_name || "", placeholder: "Enter your full name" });
  const studentEmail = textInput("University Email", { value: saved.email || "", placeholder: "you@unh.edu" });
  const studentId = textInput("Student ID", { value: saved.student_id || "", placeholder: "Enter your student ID" });
  const classYear = select("Class Year", CLASS_YEARS, { value: saved.class_year || "", placeholder: "Select class year" });

  /* ---------- Step 2: housing preferences ---------- */
  const housingStyle = select("Preferred Housing Style", HOUSING_STYLES, { value: saved.housing_style || "No Preference" });
  const roomPreference = select("Preferred Room Type", ROOM_PREFERENCES, { value: saved.room_preference || "No Preference" });
  const accessibility = textArea("Additional Housing Considerations", {
    value: saved.additional_considerations || "",
    placeholder: "Enter any additional information you would like considered.",
  });

  /* ---------- Step 3: roommate preferences ---------- */
  const roommatePreference = radioGroup("roommate_preference", ROOMMATE_PREFERENCES,
    saved.roommate_preference || "I would like a roommate assigned");
  const roommateName = textInput("Preferred Roommate Name (Optional)", { value: saved.roommate_name || "", placeholder: "Enter roommate name" });

  /* ---------- Step 4: review ---------- */
  const review = h("div", { class: "col" });
  function updateReview() {
    review.replaceChildren(
      h("p", { text: `Name: ${studentName.value || "Not entered"}` }),
      h("p", { text: `Email: ${studentEmail.value || "Not entered"}` }),
      h("p", { text: `Student ID: ${studentId.value || "Not entered"}` }),
      h("p", { text: `Class Year: ${classYear.value || "Not selected"}` }),
      h("p", { text: `Housing: ${housingStyle.value}` }),
      h("p", { text: `Room: ${roomPreference.value}` }),
      h("p", { text: `Roommate Preference: ${roommatePreference.value}` }),
      h("p", { text: `Preferred Roommate: ${roommateName.value || "None specified"}` }));
  }
  function collect() {
    return {
      full_name: studentName.value || "",
      email: studentEmail.value || "",
      student_id: studentId.value || "",
      class_year: classYear.value || "",
      housing_style: housingStyle.value || "",
      room_preference: roomPreference.value || "",
      additional_considerations: accessibility.value || "",
      roommate_preference: roommatePreference.value || "",
      roommate_name: roommateName.value || "",
    };
  }

  /* ---------- Step 5: confirmation ---------- */
  const confirmationContent = h("div", { class: "col" });
  function showConfirmation(record) {
    const data = record.data;
    confirmationContent.replaceChildren(
      h("div", { class: "card card--pad" },
        h("div", { class: "row" },
          h("span", { class: "material-icons", style: "color: var(--positive)", "aria-hidden": "true", text: "check_circle" }),
          h("h2", { class: "text-2xl bold", text: "Application submitted" })),
        h("p", { class: "semibold", text: `Confirmation: ${record.confirmation}` }),
        h("p", { class: "muted", text: `Submitted ${formatTime(record.submitted_at)}` }),
        h("p", { text: `${data.full_name} · ${data.class_year} · ${data.housing_style} · ${data.room_preference}` }),
        h("p", { class: "text-sm muted-2", text: "This is a prototype. Nothing is sent to UNH." }),
        separator(),
        h("h3", { class: "text-lg semibold", text: "Next Step: Housing Selection" }),
        h("p", { class: "muted", text: "Browse the residence halls and apartments and choose a room type." }),
        h("div", { class: "row mt-2" },
          btn("Go to Housing Selection", { icon: "arrow_forward", onClick: () => go(SELECTION_ROUTE) }),
          btn("Back to Housing Applications", { icon: "arrow_back", variant: "flat", onClick: () => go("housing-applications.html") }))));
  }

  async function submitApplication(payload, button) {
    if (!(payload.full_name && payload.email && payload.student_id && payload.class_year)) {
      notify("Please complete all student information fields.", "warning");
      return;
    }
    button.disabled = true; // prevent double submits while the request is in flight
    try {
      const record = await housingRequest("POST", payload);
      showConfirmation(record);
      stepper.next();
    } catch (error) {
      if (!(error instanceof APIError)) throw error;
      const details = Object.values(error.errors).join(" ");
      notify(`${error.message} ${details}`.trim(), "negative");
    } finally {
      button.disabled = false;
    }
  }

  /* ---------- Assemble the stepper ---------- */
  const next = () => stepper.next();
  const mkBack = () => btn("Back", { variant: "flat", onClick: () => stepper.previous() });

  const submitButton = btn("Submit Application", { icon: "check", onClick: () => submitApplication(collect(), submitButton) });

  const stepperEl = h("div", { class: "stepper" },
    step("Student Information",
      h("h2", { class: "text-lg semibold", text: "Enter your student information." }),
      studentName.el, studentEmail.el, studentId.el, classYear.el,
      stepNav(btn("Next", { onClick: next }))),
    step("Housing Preferences",
      h("h2", { class: "text-lg semibold", text: "Tell us about your housing preferences." }),
      housingStyle.el, roomPreference.el, accessibility.el,
      stepNav(btn("Next", { onClick: next }), mkBack())),
    step("Roommate Preferences",
      h("h2", { class: "text-lg semibold", text: "Provide your roommate preferences." }),
      roommatePreference.el, roommateName.el,
      stepNav(btn("Next", { onClick: () => { updateReview(); stepper.next(); } }), mkBack())),
    step("Review and Submit",
      h("h2", { class: "text-lg semibold", text: "Review Your Application" }),
      h("p", { text: "Review your information before submitting." }),
      review,
      stepNav(submitButton, mkBack())),
    step("Confirmation", confirmationContent));

  app.replaceChildren(
    h("div", { class: "row" },
      iconBtn("arrow_back", "Back to Housing Applications", () => go("housing-applications.html")),
      h("span", { class: "muted-2", text: "Housing Applications" })),
    h("h1", { class: "text-3xl bold", text: "2026–2027 Housing Application" }),
    h("p", { class: "muted", text: "Complete the following information to begin your on-campus housing application." }),
    ...(existing ? [existingBanner(existing)] : []),
    stepperEl);

  const stepper = new Stepper(stepperEl, 1);
})();
