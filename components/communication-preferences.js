/* Shared contact fields for My Profile and maintenance requests. */
window.communicationPreferences = function (saved = {}) {
  const { h, select, textInput, textArea } = Portal;
  const method = select("Preferred contact method", ["Portal messages", "Email", "Phone call"], {
    value: saved.contact_method || "Portal messages",
  });
  const email = textInput("Email address", { type: "email", value: saved.email || "", maxLength: 200, placeholder: "you@unh.edu" });
  const phone = textInput("Phone number", { type: "tel", value: saved.phone || "", maxLength: 40, placeholder: "Enter a contact number" });
  const notes = textArea("Communication instructions (optional)", {
    value: saved.communication_notes || "", maxLength: 1000, rows: 3,
    placeholder: "For example: Please use written messages and contact me before arriving.",
    "aria-describedby": "communication-help",
  });
  function update() {
    email.el.hidden = method.value !== "Email";
    email.input.required = method.value === "Email";
    email.input.disabled = email.el.hidden;
    phone.el.hidden = method.value !== "Phone call";
    phone.input.required = method.value === "Phone call";
    phone.input.disabled = phone.el.hidden;
  }
  method.input.addEventListener("change", update);
  update();
  return {
    el: h("div", { class: "col communication-fields" }, method.el, email.el, phone.el, notes.el,
      h("p", { id: "communication-help", class: "text-sm muted", text: "Choose how you prefer to communicate. You do not need to share a disability or diagnosis." })),
    get value() {
      return { contact_method: method.value, email: email.value.trim(), phone: phone.value.trim(), communication_notes: notes.value.trim() };
    },
    setErrors(errors = {}) {
      email.setError(errors.email);
      phone.setError(errors.phone);
    },
  };
};
