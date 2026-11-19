/* Become an RA - overview (was ra_overview) */
(async function () {
  const { h, btn, badge, icon, go } = Portal;
  const app = document.getElementById("app");
  app.classList.add("page");

  const result = await RA.loadApplication(app);
  if (!result) return;
  const { cycle, record } = result;
  const status = record.status;

  function statusCard() {
    const nodes = [
      h("div", { class: "row row--between w-full" },
        h("h2", { class: "text-xl bold", text: cycle.term }),
        status === "submitted" ? badge("Submitted", "positive")
          : status === "draft" ? badge("Draft saved", "primary")
          : badge(cycle.open ? "Available" : "Closed", cycle.open ? "positive" : "grey")),
      h("p", { class: "muted", text: "Resident Assistant application" }),
      h("p", { class: "text-sm muted", text: "Sample deadline: " + cycle.deadline }),
    ];
    if (status === "submitted") {
      nodes.push(
        h("p", { class: "semibold", text: record.confirmation }),
        h("p", { class: "text-sm muted", text: "Submitted " + RA.timestamp(record.submitted_at) }),
        btn("View Application", { icon: "description", class: "mt-4", onClick: () => go(RA.FORM) }));
    } else if (status === "draft") {
      nodes.push(h("p", { class: "text-sm muted", text: "Last saved " + RA.timestamp(record.saved_at) }));
      if (!cycle.open) nodes.push(h("p", { class: "text-sm muted", text: "Applications are closed. Your saved draft is still available." }));
      nodes.push(btn(cycle.open ? "Resume Application" : "View Saved Draft", { icon: "arrow_forward", class: "mt-4", onClick: () => go(RA.FORM) }));
    } else if (cycle.open) {
      nodes.push(
        h("p", { class: "text-sm muted", text: "3 steps · " + cycle.estimate }),
        btn("Start Application", { icon: "arrow_forward", class: "mt-4", onClick: () => go(RA.FORM) }));
    } else {
      nodes.push(
        h("p", { class: "muted", text: "There is no active application for this sample cycle." }),
        btn("Applications Closed", { class: "mt-4", disabled: true }));
    }
    return h("div", { class: "card card--pad" }, nodes);
  }

  app.replaceChildren(
    h("h1", { class: "text-3xl bold", text: "Become an RA" }),
    h("div", { class: "banner" }, icon("people_outline"),
      h("span", { class: "text-sm", text: "Help make campus feel like home. Support your community as a Resident Assistant." })),
    RA.prototypeNote(),
    h("div", { class: "grid grid--2" },
      statusCard(),
      h("div", { class: "card card--pad" },
        h("h2", { class: "text-xl bold", text: "Before you apply" }),
        h("p", { class: "muted", text: "Confirm enrollment and review the training, meeting, and on-call commitments." }),
        h("p", { class: "muted", text: "Prepare two short responses: why you want to be an RA, and how you would help a resident who feels left out." }),
        h("p", { class: "text-sm muted", text: `Each response: ${cycle.min_words}–${cycle.max_words} words.` }),
        h("p", { class: "text-sm muted", text: "Use Save & exit to finish later in the same browser." }))),
    h("div", {}, RA.resetDemo()));
})();
