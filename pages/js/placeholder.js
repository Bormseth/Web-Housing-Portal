/* Placeholder pages (My Profile, Messages) - was render_placeholder_page in housing_ui.py */
(function () {
  const { h } = Portal;
  const app = document.getElementById("app");
  app.className = "site-shell";
  app.replaceChildren(
    h("div", { class: "home-content" },
      h("div", { class: "card welcome-card" },
        h("h1", { class: "welcome-title", text: document.title }),
        h("p", { class: "welcome-copy", text: "This section is not available in the current portal prototype." }))));
})();
