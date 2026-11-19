/* 2026-2027 Meal Plan Application (was meal_plan_application_2026 in meal_plan.py) */
(async function () {
  const { h, btn, go, notify, reload, APIError, sessionRequest, formatTime, money, hasData,
          Stepper, step, stepNav, checkbox, separator } = Portal;

  const YEAR_SLUG = "2026-2027";

  // Sample prototype data. Replace with official UNH meal plan details.
  const DINING_HALLS = [
    { name: "Holloway Commons", description: "A residential dining location with a variety of meals and dining options." },
    { name: "Philbrook Dining", description: "A campus dining location offering meals and options for students." },
    { name: "Stillings Dining Hall", description: "A residential dining location for everyday campus dining." },
  ];
  const MEAL_PLANS = [
    { name: "Unlimited", price: 3200.0, swipes: "Unlimited meal swipes", description: "For students who want frequent access to residential dining." },
    { name: "14 Meals Per Week", price: 2800.0, swipes: "14 meal swipes per week", description: "A flexible option for students who eat most meals on campus." },
    { name: "10 Meals Per Week", price: 2400.0, swipes: "10 meal swipes per week", description: "For students who want a smaller weekly meal allowance." },
    { name: "7 Meals Per Week", price: 2000.0, swipes: "7 meal swipes per week", description: "For students who plan to eat on campus once a day on average." },
  ];
  const DINING_DOLLAR_OPTIONS = [
    { amount: 0, price: 0.0, description: "No additional Dining Dollars." },
    { amount: 100, price: 100.0, description: "$100 to spend at eligible campus dining locations." },
    { amount: 250, price: 250.0, description: "$250 for additional dining flexibility." },
    { amount: 500, price: 500.0, description: "$500 for frequent purchases at eligible locations." },
  ];

  const mealRequest = (method, data) => sessionRequest(method, `/meal-plans/${YEAR_SLUG}/selection`, data);

  const application = { terms_accepted: false, meal_plan: null, dining_dollars: DINING_DOLLAR_OPTIONS[0] };

  // Load any previously confirmed selection so the student can see and change it.
  let existing = null;
  try { existing = await mealRequest("GET"); }
  catch (error) { notify(error.message, "negative"); }
  if (!hasData(existing)) existing = null;
  if (existing) {
    application.terms_accepted = true;
    application.meal_plan = MEAL_PLANS.find((p) => p.name === existing.meal_plan) || null;
    application.dining_dollars = DINING_DOLLAR_OPTIONS.find((o) => o.amount === existing.dining_dollars) || DINING_DOLLAR_OPTIONS[0];
  }

  /* ---------- banner for an existing selection ---------- */
  function existingBanner(rec) {
    async function cancel() {
      try { await mealRequest("DELETE"); reload(); }
      catch (error) { notify(error.message, "negative"); }
    }
    return h("div", { class: "card" },
      h("p", { class: "semibold", text: `You confirmed ${rec.meal_plan} with ${money(rec.dining_dollars, 0)} Dining Dollars on ${formatTime(rec.confirmed_at)}.` }),
      h("p", { class: "text-sm muted", text: `Confirmation ${rec.confirmation}. Confirming again below replaces this selection.` }),
      btn("Cancel selection", { icon: "close", variant: "flat", dense: true, onClick: cancel }));
  }

  /* ---------- Step 1: introduction ---------- */
  const terms = checkbox("I have read and agree to the meal plan terms.", application.terms_accepted);
  function continueFromIntro() {
    if (!terms.value) { notify("Please agree to the meal plan terms before continuing.", "warning"); return; }
    application.terms_accepted = true;
    stepper.next();
  }

  /* ---------- Step 2: select plan ---------- */
  const planStatus = h("p", { class: "muted" });
  const planCards = [];
  function paintPlanStatus() {
    planStatus.textContent = application.meal_plan
      ? `Selected: ${application.meal_plan.name} — ${money(application.meal_plan.price)}`
      : "No meal plan selected.";
    planCards.forEach(({ plan, card }) => card.classList.toggle("card--selected", application.meal_plan === plan));
  }
  function selectMealPlan(plan) {
    application.meal_plan = plan;
    paintPlanStatus();
    notify(`${plan.name} selected.`, "positive");
  }
  function continueToDiningDollars() {
    if (!application.meal_plan) { notify("Please select a meal plan before continuing.", "warning"); return; }
    stepper.next();
  }

  /* ---------- Step 3: dining dollars ---------- */
  const dollarsStatus = h("p", { class: "muted" });
  const dollarCards = [];
  function paintDollarsStatus() {
    dollarsStatus.textContent = `Selected amount: ${money(application.dining_dollars.amount)}`;
    dollarCards.forEach(({ option, card }) => card.classList.toggle("card--selected", application.dining_dollars === option));
  }
  function selectDiningDollars(option) {
    application.dining_dollars = option;
    paintDollarsStatus();
    notify(`$${option.amount} in Dining Dollars selected.`, "positive");
  }

  /* ---------- Step 4: summary ---------- */
  const summaryContent = h("div", { class: "col" });
  function showSummary() {
    if (!application.meal_plan) { notify("Please select a meal plan first.", "warning"); return; }
    const plan = application.meal_plan;
    const dollars = application.dining_dollars;
    const total = plan.price + dollars.price;

    summaryContent.replaceChildren(
      h("div", { class: "card card--pad" },
        h("h3", { class: "text-lg semibold", text: "Selected Meal Plan" }),
        h("p", { class: "text-2xl bold", text: plan.name }),
        h("p", { class: "muted", text: plan.swipes }),
        separator(),
        h("h3", { class: "text-lg semibold", text: "Additional Dining Dollars" }),
        h("p", { class: "text-xl bold", text: money(dollars.amount) }),
        separator(),
        h("h3", { class: "text-lg semibold", text: "Cost Breakdown" }),
        h("div", { class: "cost-row" }, h("span", { text: "Meal Plan" }), h("span", { text: money(plan.price) })),
        h("div", { class: "cost-row" }, h("span", { text: "Dining Dollars" }), h("span", { text: money(dollars.price) })),
        separator(),
        h("div", { class: "cost-row" },
          h("span", { class: "text-xl bold", text: "Total Sample Cost" }),
          h("span", { class: "text-2xl bold", text: money(total) })),
        h("p", { class: "text-sm muted-2", text: "This is a prototype estimate, not an official university bill." })));
    stepper.next();
  }

  /* ---------- Step 5: confirmation ---------- */
  const confirmationContent = h("div", { class: "col" });
  function showConfirmation(record) {
    confirmationContent.replaceChildren(
      h("div", { class: "card card--pad" },
        h("div", { class: "row" },
          h("span", { class: "material-icons", style: "color: var(--positive)", "aria-hidden": "true", text: "check_circle" }),
          h("h2", { class: "text-2xl bold", text: "Selection confirmed" })),
        h("p", { class: "semibold", text: `Confirmation: ${record.confirmation}` }),
        h("p", { class: "muted", text: `Confirmed ${formatTime(record.confirmed_at)}` }),
        h("p", { text: `${record.meal_plan} with ${money(record.dining_dollars, 0)} Dining Dollars` }),
        h("p", { class: "text-xl bold", text: `Total sample cost: ${money(record.total)}` }),
        h("p", { class: "text-sm muted-2", text: "This is a prototype. Nothing is billed or sent to UNH." }),
        btn("Back to Meal Plans", { icon: "arrow_back", class: "mt-2", onClick: () => go("meal-plans.html") })));
  }

  async function confirmMealPlan(button) {
    if (!application.terms_accepted) { notify("Please accept the meal plan terms.", "warning"); return; }
    if (!application.meal_plan) { notify("Please select a meal plan.", "warning"); return; }
    button.disabled = true; // prevent double submits while the request is in flight
    try {
      const record = await mealRequest("POST", {
        meal_plan: application.meal_plan.name,
        dining_dollars: application.dining_dollars.amount,
        terms_accepted: application.terms_accepted,
      });
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

  /* ---------- Assemble ---------- */
  const confirmButton = btn("Confirm Selection", { onClick: () => confirmMealPlan(confirmButton) });
  const back = () => btn("Back", { variant: "flat", onClick: () => stepper.previous() });

  const planGrid = h("div", { class: "grid grid--2 grid--tight" }, MEAL_PLANS.map((plan) => {
    const card = h("div", { class: "card" },
      h("h3", { class: "text-xl bold", text: plan.name }),
      h("p", { class: "text-lg", text: `${money(plan.price)} (sample price)` }),
      h("p", { class: "semibold", text: plan.swipes }),
      h("p", { text: plan.description }),
      btn("Select Plan", { class: "mt-2", onClick: () => selectMealPlan(plan) }));
    planCards.push({ plan, card });
    return card;
  }));

  const dollarGrid = h("div", { class: "grid grid--2 grid--tight" }, DINING_DOLLAR_OPTIONS.map((option) => {
    const card = h("div", { class: "card" },
      h("h3", { class: "text-lg bold", text: `$${option.amount.toLocaleString("en-US")} Dining Dollars` }),
      h("p", { text: `Cost: ${money(option.price)}` }),
      h("p", { text: option.description }),
      btn("Select", { onClick: () => selectDiningDollars(option) }));
    dollarCards.push({ option, card });
    return card;
  }));

  const stepperEl = h("div", { class: "stepper" },
    step("Introduction",
      h("h2", { class: "text-2xl bold", text: "Explore Campus Dining" }),
      h("div", { class: "grid grid--3 grid--tight" }, DINING_HALLS.map((hall) =>
        h("div", { class: "card" }, h("h3", { class: "text-lg semibold", text: hall.name }), h("p", { text: hall.description })))),
      separator(),
      h("h2", { class: "text-xl bold", text: "Meal Plan Terms" }),
      h("p", { class: "muted", text: "This is a prototype application. Meal plan prices and options are examples and are not official UNH pricing. Review your selection before submitting." }),
      terms.el,
      stepNav(btn("Continue", { onClick: continueFromIntro }))),
    step("Select Meal Plan",
      h("h2", { class: "text-2xl bold", text: "Choose Your Meal Plan" }),
      planStatus, planGrid,
      h("div", { class: "row row--between" }, back(), btn("Continue", { onClick: continueToDiningDollars }))),
    step("Dining Dollars",
      h("h2", { class: "text-2xl bold", text: "Add Dining Dollars" }),
      h("p", { class: "muted", text: "Choose an optional amount to add to your account." }),
      dollarsStatus, dollarGrid,
      h("div", { class: "row row--between" }, back(), btn("Review Summary", { onClick: showSummary }))),
    step("Summary",
      h("h2", { class: "text-2xl bold", text: "Review Your Selections" }),
      summaryContent,
      h("div", { class: "row row--between" }, back(), confirmButton)),
    step("Confirmation", confirmationContent));

  const app = document.getElementById("app");
  app.replaceChildren(
    h("div", { class: "row" }, btn("Back to Academic Years", { icon: "arrow_back", variant: "flat", onClick: () => go("meal-plans.html") })),
    h("h1", { class: "text-3xl bold", text: "2026–2027 Meal Plan Application" }),
    h("p", { class: "muted", text: "Review the dining information, select your meal plan, choose any additional Dining Dollars, and review your choices." }),
    ...(existing ? [existingBanner(existing)] : []),
    stepperEl);

  const stepper = new Stepper(stepperEl, 1);
  paintPlanStatus();
  paintDollarsStatus();
})();
