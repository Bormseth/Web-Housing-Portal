/* Home page  (was main_page in housing_ui.py) */
(function () {
  const { h } = Portal;
  const items = [
    ["Housing Applications", "Access the online applications for on-campus housing in our residence halls and apartments"],
    ["Meal Plans", "Select or change your campus meal plan options"],
    ["My Housing", "View and manage your current and future housing assignments, including room and roommate information, room combination (if applicable), and important housing forms."],
    ["Maintenance", "Submit a maintenance request"],
    ["Join Our Team", "Apply for leadership opportunities (such as RA) with Housing and Residential Life."],
    ["My Profile", "Update any relevant contact information"],
  ];
  const app = document.getElementById("app");
  app.className = "site-shell";
  app.replaceChildren(
    h("div", { class: "home-content" },
      h("div", { class: "card welcome-card" },
        h("h1", { class: "welcome-title", text: "Welcome!" }),
        h("p", { class: "welcome-copy", text:
          "Through the Housing Portal, you can access information and resources for your on-campus housing and dining needs. From the navigation menu, you can do the following:" }),
        h("ul", { class: "welcome-list" },
          items.map(([title, text]) => h("li", {}, h("strong", { text: title }), ": " + text))))));
})();
