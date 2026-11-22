/* Maintenance page (was pages/maintenance.py)
   - lists existing requests (GET /maintenance-requests) with a Public/Private filter
   - "Add Maintenance Request" opens a dialog that POSTs to /add-maintenance-request */
(function () {
  const { h, btn, apiGet, apiPost, notify, textArea, select, radioGroup, separator } = Portal;
  const app = document.getElementById("app");

  // Placeholder room list (was test_room_options). Replace with real data from the API when it exists.
  const TEST_ROOM_OPTIONS = [
    { description: "Test Room", space: "Test 100", type: "Double" },
  ];
  const CATEGORIES = ["Furniture", "Plumbing", "Electrical", "HVAC"];
  const ITEMS = ["(Please Select Item)", "Desk Chair", "Bed Frame", "Bookshelf", "Whiteboard"];

  // Form state (was maintence_form_data). Survives Cancel; cleared after a successful submit.
  const defaults = () => ({
    room_category: "My Room",
    selected_room: null,
    general_category: "Furniture",
    item: "(Please Select Item)",
    description: "",
    comments: "",
  });
  let formData = defaults();

  /* ---------------------------------------------------------------- *
   * Existing requests
   * ---------------------------------------------------------------- */
  let filter = "All";
  let seq = 0; // guards against out-of-order responses when the filter is toggled quickly
  const listHost = h("div", { class: "col", "aria-live": "polite" });

  function requestCard(req) {
    return h("div", { class: "card card--tint" },
      h("p", { class: "bold", text: `Room: ${req.room} (${req.room_type})` }),
      h("p", { text: `Item: ${req.item === undefined ? "N/A" : req.item}` }),
      h("p", { text: `Status: ${req.status}` }),
      h("p", { class: "pre-wrap", text: `Description: ${req.description}` }));
  }

  async function showRequests() {
    const mine = ++seq;
    let requests = await apiGet("/maintenance-requests");
    if (mine !== seq) return;
    if (!Array.isArray(requests)) requests = [];
    if (filter !== "All") requests = requests.filter((r) => r.type === filter);
    if (!requests.length) {
      listHost.replaceChildren(h("p", { class: "muted-2 italic", text: "No maintenance requests found." }));
      return;
    }
    listHost.replaceChildren(...requests.map(requestCard));
  }

  const filterRadio = radioGroup("request_filter", ["All", "Public", "Private"], "All", {
    legend: "Filter requests by type",
    onChange: (value) => { filter = value; showRequests(); },
  });

  /* ---------------------------------------------------------------- *
   * Add-request dialog
   * ---------------------------------------------------------------- */
  function openAddRequest() {
    const dlg = h("dialog", { class: "dialog dialog--wide", "aria-labelledby": "add-request-title" });
    dlg.addEventListener("close", () => dlg.remove());

    // --- Select a room ---
    const categoryRadio = radioGroup("room_category", ["My Room", "Public Rooms"], formData.room_category, {
      legend: "Room category",
      onChange: (value) => { formData.room_category = value; },
    });
    const roomRows = TEST_ROOM_OPTIONS.map((room) => {
      const radio = h("input", {
        type: "radio", name: "selected_room", value: room.space, checked: formData.selected_room === room.space,
        "aria-label": `Select ${room.space}`,
        onchange: () => { formData.selected_room = room.space; notify(`Selected room space: ${room.space}`); },
      });
      return h("tr", {}, h("td", {}, radio), h("td", { text: room.description }), h("td", { text: room.space }), h("td", { text: room.type }));
    });
    const roomSection = h("section", { class: "card card--tint", "aria-labelledby": "room-heading" },
      h("h3", { id: "room-heading", class: "text-xl bold", text: "Select a Room" }),
      categoryRadio.el,
      h("div", { class: "table-wrap" },
        h("table", { class: "table" },
          h("thead", {}, h("tr", {}, ["Select", "Room Description", "Room Space", "Room Type"].map((t) => h("th", { scope: "col", text: t })))),
          h("tbody", {}, roomRows))));

    // --- General ---
    const category = select("Category", CATEGORIES, { value: formData.general_category });
    category.input.addEventListener("change", () => { formData.general_category = category.input.value; });
    const item = select("Item", ITEMS, { value: formData.item });
    item.input.addEventListener("change", () => { formData.item = item.input.value; });
    const description = textArea("Description:", { value: formData.description, rows: 5 });
    description.input.addEventListener("input", () => { formData.description = description.input.value; });
    const comments = textArea("Comments (e.g. phone number, requested time):", { value: formData.comments, rows: 5 });
    comments.input.addEventListener("input", () => { formData.comments = comments.input.value; });

    const generalSection = h("section", { class: "card card--tint", "aria-labelledby": "general-heading" },
      h("h3", { id: "general-heading", class: "text-xl bold", text: "General" }),
      h("div", { class: "form-cols" },
        h("div", { class: "col" }, category.el, item.el),
        description.el),
      separator(),
      h("div", { class: "form-cols form-cols--even" },
        comments.el,
        h("div", { class: "notice notice--info text-sm" },
          "Per the Room & Board Agreement, staff may enter your space without you being present to complete maintenance. " +
          "Staff will always knock, wait for a response, and announce themselves before entering a room. " +
          "If you have any concerns, please include them, along with a phone number to reach you at, in the comments section above. " +
          "Please note that we may not be able to accommodate requests for staff to come by at a specific day/time.")));

    // --- Submit ---
    async function handleSubmit() {
      const reqType = formData.room_category === "My Room" ? "Private" : "Public";
      const selectedSpace = formData.selected_room;
      const matched = TEST_ROOM_OPTIONS.find((r) => r.space === selectedSpace) || {};
      const desc = formData.description.trim();
      const extra = formData.comments.trim();
      const body = {
        type: reqType,
        item: formData.item,
        room: selectedSpace || "Unspecified Room",
        room_type: matched.type || "Standard",
        status: "Pending",
        description: extra ? `${desc}\nComments: ${extra}` : desc,
      };

      submitButton.disabled = true; // prevent double submits while the request is in flight
      const ok = await apiPost("/add-maintenance-request", body);
      submitButton.disabled = false;
      if (ok) {
        notify("Request Sent", "positive");
        formData = defaults();
        showRequests();
        dlg.close();
      } else {
        notify("Failed to send request", "negative");
      }
    }
    const submitButton = btn("Submit Request", { variant: "positive", onClick: handleSubmit });

    dlg.append(h("div", { class: "col", style: "gap:16px" },
      h("h2", { id: "add-request-title", class: "sr-only", text: "Add maintenance request" }),
      roomSection, generalSection,
      h("div", { class: "row row--end" },
        btn("Cancel", { variant: "flat", onClick: () => dlg.close() }),
        submitButton)));
    document.body.append(dlg);
    dlg.showModal();
  }

  /* ---------------------------------------------------------------- *
   * Page
   * ---------------------------------------------------------------- */
  app.classList.add("page");
  app.replaceChildren(
    h("h1", { class: "text-3xl bold", text: "Maintenance" }),
    h("p", { class: "muted", text:
      "You can submit a maintenance request for your room, suite, or apartment, as well as for public areas of your building. " +
      "If you see an issue, please report it as soon as possible! Do not wait to report issues." }),

    h("section", { class: "card welcome-card", "aria-labelledby": "existing-heading", style: "padding:24px" },
      h("h2", { id: "existing-heading", class: "text-xl bold", text: "Existing Requests" }),
      h("p", { class: "semibold", style: "color:#374151", text:
        "Here you can see existing requests. Public requests are ones for public spaces like building lounges and public bathrooms. " +
        "Private requests are those inside your living space such as your room, suite common area/bathroom." }),
      filterRadio.el,
      listHost),

    h("section", { class: "card welcome-card", "aria-labelledby": "submit-heading", style: "padding:24px" },
      h("h2", { id: "submit-heading", class: "text-xl bold", text: "Submit a New Request" }),
      h("p", { class: "semibold", style: "color:#374151", text:
        "Submit a request for your room or a public space. Do not submit a maintenance request if your issue falls under one of the categories below:" }),
      h("div", { class: "notice notice--danger", role: "note" },
        h("strong", { text: "Do not submit a request — Emergencies: " }),
        "Smoke, fire and other life-threatening emergencies should be reported to 911 immediately."),
      h("div", { class: "notice notice--warning", role: "note" },
        h("strong", { text: "Do not submit a request — Urgent issues: " }),
        "Urgent issues should be reported directly to the UNH Facilities Control Center at ",
        h("a", { href: "tel:+16038621437", text: "603-862-1437" }),
        ". Urgent issues include leaking water, hot or cold water outages, heat outages, electrical outages, and broken/plugged toilets in single-use bathroom."),
      h("div", {}, btn("Add Maintenance Request", { class: "mt-2", onClick: openAddRequest }))));

  showRequests();
})();
