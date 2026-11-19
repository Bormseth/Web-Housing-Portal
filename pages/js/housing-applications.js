/* Housing Applications - academic year picker (was housing_applications_page) */
(function () {
  const { h, badge, btn, go } = Portal;

  const HOUSING_YEARS = [
    { year: "2026–2027", route: "housing-application.html", available: true, description: "Apply for campus housing for the 2026–2027 academic year." },
    { year: "2025–2026", route: null, available: false, description: "Applications are closed." },
    { year: "2027–2028", route: null, available: false, description: "Applications are not yet available." },
    { year: "2028–2029", route: null, available: false, description: "Applications are not yet available." },
  ];

  function yearCard(a) {
    return h("div", { class: "card card--pad" },
      h("div", { class: "row row--between" },
        h("h2", { class: "text-xl bold", text: a.year }),
        a.available ? badge("Available", "positive") : badge("Unavailable", "grey")),
      h("p", { class: "muted", text: a.description }),
      a.available
        ? btn("Start Application", { icon: "arrow_forward", class: "mt-4", onClick: () => go(a.route) })
        : btn("Unavailable", { class: "mt-4", disabled: true }));
  }

  document.getElementById("app").replaceChildren(
    h("h1", { class: "text-3xl bold", text: "Housing Applications" }),
    h("p", { class: "muted", text: "Choose an academic year to view its housing application." }),
    h("div", { class: "grid grid--2" }, HOUSING_YEARS.map(yearCard)));
})();
