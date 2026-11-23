(async function () {
  const { h, btn, textInput, notify, sessionRequest } = Portal;
  const app = document.getElementById("app");
  app.classList.add("page--narrow");

  async function load() {
    try {
      const saved = await sessionRequest("GET", "/profile");
      const name = textInput("Full name (optional)", { value: saved.full_name, maxLength: 120, placeholder: "Enter your full name", autocomplete: "name" });
      const contact = communicationPreferences(saved);
      const save = btn("Save profile");
      save.type = "submit";
      const form = h("form", { class: "card card--pad col" },
        h("h2", { class: "text-xl bold", text: "Contact and communication preferences" }), name.el, contact.el,
        h("div", { class: "row" }, save));
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        save.disabled = true;
        contact.setErrors();
        try {
          await sessionRequest("PUT", "/profile", { full_name: name.value.trim(), ...contact.value });
          notify("Profile saved. Your preferences will fill in new maintenance requests and be included with new messages.", "positive");
        } catch (error) {
          contact.setErrors(error.errors);
          notify(error.message, "negative");
        } finally { save.disabled = false; }
      });
      app.replaceChildren(
        h("h1", { class: "text-3xl bold", text: "My Profile" }),
        h("p", { class: "muted", text: "Save your preferred way to communicate. You can change it for an individual maintenance request." }), form);
    } catch (error) {
      app.replaceChildren(h("h1", { class: "text-3xl bold", text: "My Profile" }), btn("Try again", { onClick: load }));
      notify(error.message, "negative");
    }
  }
  await load();
})();
