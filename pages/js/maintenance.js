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
    // 1. Create the dialog element with a wider forced width
    const dlg = document.createElement("dialog");
    dlg.setAttribute("aria-labelledby", "add-request-title");
    dlg.style.cssText = "width: 90%; max-width: 900px; padding: 24px; border: none; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);";
    dlg.addEventListener("close", () => dlg.remove());

    // --- Room Section ---
    const roomSection = document.createElement("section");
    roomSection.style.cssText = "background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px;";
    roomSection.innerHTML = `
      <h3 id="room-heading" style="font-size: 1.25rem; font-weight: bold; margin-bottom: 12px;">Select a Room</h3>
      <div style="display: flex; gap: 16px; margin-bottom: 12px;">
        <label><input type="radio" name="room_category" value="My Room" checked> My Room</label>
        <label><input type="radio" name="room_category" value="Public Rooms"> Public Rooms</label>
      </div>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 8px;">Select</th>
              <th style="padding: 8px;">Room Description</th>
              <th style="padding: 8px;">Room Space</th>
              <th style="padding: 8px;">Room Type</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px;"><input type="radio" name="selected_room" value="Test 100" checked></td>
              <td style="padding: 8px;">Test Room</td>
              <td style="padding: 8px;">Test 100</td>
              <td style="padding: 8px;">Double</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    // --- General Section (Side-by-Side Layout via Flexbox) ---
    const generalSection = document.createElement("section");
    generalSection.style.cssText = "background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px;";
    
    // Row 1: Category & Item stacked on the left, Description on the right
    const row1 = document.createElement("div");
    row1.style.cssText = "display: flex; gap: 20px; margin-bottom: 16px; flex-wrap: wrap;";
    
    const leftCol1 = document.createElement("div");
    leftCol1.style.cssText = "flex: 1; min-width: 250px; display: flex; flex-direction: column; gap: 12px;";
    leftCol1.innerHTML = `
      <label style="display: flex; flex-direction: column; font-size: 0.9rem; font-weight: 500;">
        Category
        <select id="maint-category" style="margin-top: 4px; padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1;">
          <option>Furniture</option><option>Plumbing</option><option>Electrical</option><option>HVAC</option>
        </select>
      </label>
      <label style="display: flex; flex-direction: column; font-size: 0.9rem; font-weight: 500;">
        Item
        <select id="maint-item" style="margin-top: 4px; padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1;">
          <option>(Please Select Item)</option><option>Desk Chair</option><option>Bed Frame</option><option>Bookshelf</option><option>Whiteboard</option>
        </select>
      </label>
    `;

    const rightCol1 = document.createElement("div");
    rightCol1.style.cssText = "flex: 1; min-width: 250px; display: flex; flex-direction: column;";
    rightCol1.innerHTML = `
      <label style="display: flex; flex-direction: column; font-size: 0.9rem; font-weight: 500; height: 100%;">
        Description:
        <textarea id="maint-desc" rows="5" placeholder="Describe the issue you are having..." style="margin-top: 4px; padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1; resize: vertical; flex-grow: 1;"></textarea>
      </label>
    `;
    row1.append(leftCol1, rightCol1);

    const hr = document.createElement("hr");
    hr.style.cssText = "border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;";

    const row2 = document.createElement("div");
    row2.style.cssText = "display: flex; gap: 20px; flex-wrap: wrap;";

    const leftCol2 = document.createElement("div");
    leftCol2.style.cssText = "flex: 1; min-width: 250px; display: flex; flex-direction: column;";
    leftCol2.innerHTML = `
      <label style="display: flex; flex-direction: column; font-size: 0.9rem; font-weight: 500;">
        Comments (e.g. phone number, requested time):
        <textarea id="maint-comments" rows="4" placeholder="Any addition information we should know..." style="margin-top: 4px; padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1; resize: vertical;"></textarea>
      </label>
    `;

    const rightCol2 = document.createElement("div");
    rightCol2.style.cssText = "flex: 1; min-width: 250px; background-color: #ecfdf5; border: 1px solid #10b981; color: #065f46; padding: 12px; border-radius: 6px; font-size: 0.85rem; line-height: 1.4; display: flex; align-items: center;";
    rightCol2.innerHTML = `
      <span>Per the Room & Board Agreement, staff may enter your space without you being present to complete maintenance. Staff will always knock, wait for a response, and announce themselves before entering a room.</span>
    `;
    row2.append(leftCol2, rightCol2);

    generalSection.append(
      document.createElement("h3"), // title placeholder or header text
      row1, hr, row2
    );
    // Fix general header text
    const genHeading = document.createElement("h3");
    genHeading.textContent = "General";
    genHeading.style.cssText = "font-size: 1.25rem; font-weight: bold; margin-bottom: 12px;";
    generalSection.prepend(genHeading);

    // --- Buttons Footer ---
    const footerRow = document.createElement("div");
    footerRow.style.cssText = "display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px;";
    
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.type = "button";
    cancelBtn.style.cssText = "padding: 8px 16px; background: transparent; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer;";
    cancelBtn.onclick = () => dlg.close();

    const submitBtn = document.createElement("button");
    submitBtn.textContent = "Submit Request";
    submitBtn.type = "button";
    submitBtn.style.cssText = "padding: 8px 16px; background: #002D62; color: white; border: none; border-radius: 4px; cursor: pointer;";
    submitBtn.onclick = async () => {
      // Handle submit action here
      dlg.close();
    };

    footerRow.append(cancelBtn, submitBtn);

    // Assemble main dialog container
    const dialogTitle = document.createElement("h2");
    dialogTitle.textContent = "Add maintenance request";
    dialogTitle.style.cssText = "font-size: 1.5rem; font-weight: bold; margin-bottom: 16px;";

    dlg.append(dialogTitle, roomSection, generalSection, footerRow);
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
