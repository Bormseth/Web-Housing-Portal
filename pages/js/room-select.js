/* Housing Selection - browse all buildings (was housing_selection_page / render_housing_select)
   Uses components/myHousingCard.js for the "current selection" card. */
(async function () {
  const { h, clear, apiGet, hasData, iconBtn, go, linkBtn } = Portal;
  const app = document.getElementById("app");

  const TABS = [
    { id: "res", label: "Residence Hall", type: "Residence Hall" },
    { id: "apt", label: "Apartments", type: "Apartment" },
    { id: "grad", label: "Graduate", type: "Graduate" },
  ];
  let activeTab = TABS[0].id;

  function buildingCard(building) {
    return h("div", { class: "card" },
      h("div", { class: "row" }, h("span", { text: building.name })),
      h("div", { class: "row" },
        linkBtn("More Info", building.url, { newTab: true }),
        linkBtn("Choose Room", `building.html?id=${encodeURIComponent(building.id)}`)));
  }

  async function render() {
    const [buildings, myHousing] = await Promise.all([apiGet("/housing-options"), apiGet("/my-housing")]);
    const list = Array.isArray(buildings) ? buildings : [];

    const panel = h("div", { class: "tab-panel", role: "tabpanel" });
    function showTab(id) {
      activeTab = id;
      tabButtons.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === id)));
      const type = TABS.find((t) => t.id === id).type;
      panel.replaceChildren(h("div", { class: "grid grid--3" },
        list.filter((b) => b.type === type).map(buildingCard)));
    }
    const tabButtons = TABS.map((t) => h("button", {
      type: "button", class: "tab", role: "tab", "data-tab": t.id, text: t.label, onclick: () => showTab(t.id),
    }));

    app.replaceChildren(
      h("div", { class: "row" },
        iconBtn("arrow_back", "Back to Housing Applications", () => go("housing-applications.html")),
        h("h1", { class: "text-2xl", text: "Housing Selection" })),
      ...(hasData(myHousing) ? [MyHousingCard(myHousing, render)] : []),
      h("div", { class: "tabs", role: "tablist" }, tabButtons),
      panel);
    showTab(activeTab);
  }
  render();
})();
