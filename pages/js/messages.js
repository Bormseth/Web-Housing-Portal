(async function () {
  const { h, btn, linkBtn, select, textInput, textArea, notify, sessionRequest, formatTime } = Portal;
  const app = document.getElementById("app");
  app.classList.add("page--narrow");
  let threads = [];
  const history = h("div", { class: "col message-history" });
  const selectedId = new URLSearchParams(location.search).get("thread");

  function conversation(thread, expanded) {
    const contact = thread.contact;
    const entries = h("div", { class: "col" }, thread.messages.map((message) =>
      h("article", { class: "message-entry" },
        h("p", { class: "text-sm muted", text: `You · ${formatTime(message.created_at)}` }),
        h("p", { class: "pre-wrap", text: message.body }))));
    const reply = textArea("Add a written follow-up", { required: true, maxLength: 4000, rows: 3, placeholder: "Type any additional information here." });
    const save = btn("Save follow-up", { variant: "outline" });
    save.type = "submit";
    const errorBox = h("p", { class: "text-danger", role: "alert", hidden: true });
    const form = h("form", { class: "col" }, reply.el, errorBox, h("div", {}, save));
    const card = h("details", { class: "expansion", open: expanded },
      h("summary", {}, h("span", { class: "text-lg semibold", text: thread.subject }),
        h("span", { class: "message-meta text-sm muted", text: `${thread.topic} · ${formatTime(thread.created_at)}` })),
      h("div", { class: "expansion-body" },
        h("p", { class: "text-sm", text: `Contact preference: ${contact.contact_method}${contact.contact_method === "Email" ? ` (${contact.email})` : contact.contact_method === "Phone call" ? ` (${contact.phone})` : ""}` }),
        contact.communication_notes ? h("p", { class: "text-sm pre-wrap", text: `Communication instructions: ${contact.communication_notes}` }) : null,
        entries, h("p", { class: "text-sm muted", text: "Saved in this demo. No messages are delivered to UNH staff." }), form));
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      save.disabled = true;
      errorBox.hidden = true;
      try {
        const updated = await sessionRequest("POST", `/messages/${encodeURIComponent(thread.id)}/reply`, { body: reply.value.trim() });
        threads = threads.map((item) => item.id === updated.id ? updated : item);
        const replacement = conversation(updated, true);
        card.replaceWith(replacement);
        replacement.querySelector("textarea").focus();
        notify("Written follow-up saved in this demo.", "positive");
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
      } finally { save.disabled = false; }
    });
    return card;
  }

  function renderHistory(openId = selectedId) {
    history.replaceChildren(...(threads.length ? threads.map((thread) => conversation(thread, thread.id === openId)) : [
      h("p", { class: "muted", text: "No messages yet. Write a message above or submit a maintenance request to start a written follow-up." }),
    ]));
  }

  async function load() {
    try {
      const [profile, saved] = await Promise.all([sessionRequest("GET", "/profile"), sessionRequest("GET", "/messages")]);
      threads = saved;
      const topic = select("Topic", ["Housing", "Maintenance", "Meal plans", "RA applications"], { value: "Housing" });
      const subject = textInput("Subject", { required: true, maxLength: 160, placeholder: "What do you need help with?" });
      const body = textArea("Message", { required: true, maxLength: 4000, rows: 5, placeholder: "Describe your question or request in writing." });
      const save = btn("Save message");
      save.type = "submit";
      const form = h("form", { class: "card card--pad col communication-fields" },
        h("h2", { class: "text-xl bold", text: "Write a message" }),
        h("p", { class: "text-sm", text: `Preferred contact: ${profile.contact_method}. Your current profile preferences will be included with this message.` }),
        h("div", {}, linkBtn("Edit communication preferences", "/pages/my-profile.html", { variant: "outline" })),
        topic.el, subject.el, body.el, h("div", {}, save));
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        save.disabled = true;
        try {
          const thread = await sessionRequest("POST", "/messages", { topic: topic.value, subject: subject.value.trim(), body: body.value.trim() });
          threads.unshift(thread);
          subject.value = "";
          body.value = "";
          renderHistory(thread.id);
          notify("Message saved in this demo. You can add a written follow-up below.", "positive");
          subject.input.focus();
        } catch (error) { notify(error.message, "negative"); }
        finally { save.disabled = false; }
      });
      app.replaceChildren(
        h("h1", { class: "text-3xl bold", text: "Messages" }),
        h("p", { class: "muted", text: "Use written messages for housing questions and maintenance follow-up." }),
        h("p", { class: "banner", role: "note", text: "Demo only: messages are saved here and are not sent to UNH staff. Do not use this page for urgent issues or emergencies." }),
        form,
        h("section", { class: "card card--pad col", "aria-labelledby": "history-heading" },
          h("h2", { id: "history-heading", class: "text-xl bold", text: "Message history" }), history));
      renderHistory();
      if (selectedId) history.querySelector("details[open] summary")?.focus();
    } catch (error) {
      app.replaceChildren(h("h1", { class: "text-3xl bold", text: "Messages" }), btn("Try again", { onClick: load }));
      notify(error.message, "negative");
    }
  }
  await load();
})();
