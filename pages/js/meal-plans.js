/* Meal Plans - academic year picker (was meal_plans_page) */
(function () {
  const { h, badge, btn, go } = Portal;

  const MEAL_PLAN_YEARS = [
    { year: "2026–2027", route: "meal-plan-application.html", available: true, description: "Choose your meal plan for 2026–2027." },
    { year: "2025–2026", route: null, available: false, description: "Meal plan selection is closed." },
    { year: "2027–2028", route: null, available: false, description: "Applications are not yet available." },
    { year: "2028–2029", route: null, available: false, description: "Applications are not yet available." },
  ];

  function yearCard(y) {
    return h("div", { class: "card card--pad" },
      h("div", { class: "row row--between" },
        h("h2", { class: "text-xl bold", text: y.year }),
        y.available ? badge("Available", "positive") : badge("Unavailable", "grey")),
      h("p", { class: "muted", text: y.description }),
      y.available
        ? btn("Choose Meal Plan", { icon: "arrow_forward", class: "mt-4", onClick: () => go(y.route) })
        : btn("Unavailable", { class: "mt-4", disabled: true }));
  }

  document.getElementById("app").replaceChildren(
    h("h1", { class: "text-3xl bold", text: "Meal Plans" }),
    h("p", { class: "muted", text: "Choose an academic year to view its available meal plans." }),
    h("div", { class: "grid grid--2" }, MEAL_PLAN_YEARS.map(yearCard)));
})();
