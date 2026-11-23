/* Maintenance requests with saved communication preferences and written follow-up. */
(function () {
  const { h, btn, linkBtn, textInput, textArea, select, notify, sessionRequest } = Portal;
  const app = document.getElementById("app");
  const list = h("div", { class: "col", "aria-live": "polite" });
  const filter = select("Filter requests by type", ["All", "Public", "Private"], { value: "All" });
  let requests = [];

  function renderRequests() {
    const shown = requests.filter((request) => filter.value === "All" || request.type === filter.value);
    list.replaceChildren(...(shown.length ? shown.map((request) =>
      h("article", { class: "card card--tint col" },
        h("h3", { class: "text-lg semibold", text: `Request #${request.id}: ${request.item}` }),
        h("p", { text: `Room: ${request.room} (${request.room_type}) · ${request.type}` }),
        h("p", { text: `Status: ${request.status}` }),
        h("p", { class: "pre-wrap", text: request.description }),
        request.comments ? h("p", { class: "pre-wrap", text: `Additional comments: ${request.comments}` }) : null,
        request.contact_method ? h("p", { text: `Preferred contact: ${request.contact_method}` }) : null,
        request.communication_notes ? h("p", { class: "pre-wrap", text: `Communication instructions: ${request.communication_notes}` }) : null,
        request.message_id ? h("div", {}, linkBtn("Written follow-up", `/pages/messages.html?thread=${encodeURIComponent(request.message_id)}`, { variant: "outline" })) : null
      )) : [h("p", { class: "muted", text: "No maintenance requests found." })]));
  }

  async function loadRequests() {
    try {
      requests = await sessionRequest("GET", "/maintenance-requests");
      renderRequests();
    } catch (error) {
      list.replaceChildren(btn("Try loading requests again", { onClick: loadRequests }));
      notify(error.message, "negative");
    }
  }
  filter.input.addEventListener("change", renderRequests);

  async function openRequest() {
    add.disabled = true;
    let profile;
    try { profile = await sessionRequest("GET", "/profile"); }
    catch (error) { notify(error.message, "negative"); return; }
    finally { add.disabled = false; }

    const type = select("Request type", ["Private", "Public"], { value: "Private" });
    const room = textInput("Room or location", { required: true, maxLength: 120, placeholder: "For example: Mills 237" });
    const roomType = select("Room type", ["Single", "Double", "Triple", "Suite common area", "Public lounge", "Public bathroom", "Other"], { value: "Double" });
    const category = select("Category", ["Furniture", "Plumbing", "Electrical", "HVAC"], { value: "Furniture" });
    const item = textInput("Item or fixture", { required: true, maxLength: 100, placeholder: "For example: Desk chair or sink" });
    const description = textArea("Describe the issue", { required: true, maxLength: 2000, rows: 4, placeholder: "Describe what needs to be repaired." });
    const comments = textArea("Additional comments (optional)", { maxLength: 2000, rows: 3, placeholder: "For example: A preferred time for maintenance." });
    const contact = communicationPreferences(profile);
    const errorBox = h("div", { class: "errors", role: "alert", hidden: true });
    const cancel = btn("Cancel", { variant: "outline", onClick: () => dlg.close() });
    const submit = btn("Submit request");
    submit.type = "submit";
    const form = h("form", { class: "col communication-fields" },
      h("h2", { id: "request-title", class: "text-2xl bold", text: "Add maintenance request" }),
      h("p", { class: "muted", text: "Nonurgent requests only. Demo requests are saved here and are not sent to UNH staff." }),
      errorBox,
      h("div", { class: "grid grid--2 grid--tight" }, type.el, room.el, roomType.el, category.el),
      item.el, description.el, comments.el,
      h("p", { class: "banner text-sm", text: "Per the Room & Board Agreement, staff may enter your space without you being present to complete maintenance. Staff will always knock, wait for a response, and announce themselves before entering a room." }),
      h("h3", { class: "text-lg semibold", text: "How should staff contact you?" }),
      h("p", { class: "text-sm muted", text: "Filled in from My Profile. Changes here apply only to this request." }),
      contact.el,
      h("div", { class: "row row--end" }, cancel, submit));
    const dlg = h("dialog", { class: "dialog dialog--wide", "aria-labelledby": "request-title" }, form);
    dlg.addEventListener("close", () => { dlg.remove(); add.focus(); });
    dlg.addEventListener("cancel", (event) => { if (submit.disabled) event.preventDefault(); });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      submit.disabled = cancel.disabled = true;
      errorBox.hidden = true;
      contact.setErrors();
      try {
        const result = await sessionRequest("POST", "/add-maintenance-request", {
          type: type.value, room: room.value.trim(), room_type: roomType.value,
          category: category.value, item: item.value.trim(), description: description.value.trim(),
          comments: comments.value.trim(), ...contact.value,
        });
        requests.unshift(result.request);
        filter.value = "All";
        renderRequests();
        dlg.close();
        notify(`Request #${result.request.id} saved in this demo. Use Written follow-up to add a message.`, "positive");
      } catch (error) {
        contact.setErrors(error.errors);
        errorBox.textContent = error.message;
        errorBox.hidden = false;
      } finally { submit.disabled = cancel.disabled = false; }
    });
    document.body.append(dlg);
    dlg.showModal();
  }

  const add = btn("Add Maintenance Request", { onClick: openRequest });
  app.replaceChildren(
    h("h1", { class: "text-3xl bold", text: "Maintenance" }),
    h("p", { class: "muted", text: "Report a maintenance issue in writing and choose how you prefer to be contacted." }),
    h("section", { class: "card card--pad col", "aria-labelledby": "submit-heading" },
      h("h2", { id: "submit-heading", class: "text-xl bold", text: "Submit a New Request" }),
      h("p", { text: "Use this form for nonurgent issues in your room or a public space." }),
      h("div", { class: "errors", role: "note" },
        h("p", {}, h("strong", { text: "Emergencies: " }), "Smoke, fire and other life-threatening emergencies should be reported to 911 immediately.")),
      h("div", { class: "banner", role: "note" },
        h("p", {}, h("strong", { text: "Urgent issues: " }),
        "Urgent issues should be reported directly to the UNH Facilities Control Center at ",
        h("a", { href: "tel:+16038621437", text: "603-862-1437" }),
        ". These include leaking water, water or heat outages, electrical outages, and broken or plugged toilets in single-use bathrooms. Portal messages are not monitored for urgent help.")),
      h("div", {}, add)),
    h("section", { class: "card card--pad col", "aria-labelledby": "existing-heading" },
      h("h2", { id: "existing-heading", class: "text-xl bold", text: "Existing Requests" }),
      h("p", { class: "muted", text: "View requests" }), filter.el, list));
  loadRequests();
})();
