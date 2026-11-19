/* "Current selection / Booking confirmed" card with its confirm dialog.
   Was my_housing_card() + confirm_booking() + cancel_room_selection() in housing_selection.py.
   Used on both room-select.html and building.html.

   MyHousingCard(myHousing, onChange) -> HTMLElement
   onChange is called after a successful confirm/cancel so the page can re-render. */
(function () {
  const { h, btn, apiPost, notify, formatRoomType } = Portal;

  async function confirmBooking(dialogEl, onChange) {
    if (await apiPost("/housing/confirm")) {
      dialogEl.close();
      notify("Booking confirmed", "positive");
      onChange();
    }
  }
  async function cancelSelection(onChange) {
    if (await apiPost("/housing/cancel")) {
      notify("Selection cancelled", "warning");
      onChange();
    }
  }

  window.MyHousingCard = function (myHousing, onChange) {
    const confirmed = !!myHousing.confirmed;
    const summary = `${myHousing.building_name} - ${formatRoomType(myHousing.room_type)}`;

    // Native <dialog>: hidden until Continue opens it.
    const dialogEl = h("dialog", { class: "dialog" },
      h("div", { class: "col" },
        h("h2", { class: "text-xl", text: "Confirm Booking" }),
        h("p", { class: "text-lg", text: myHousing.building_name }),
        h("p", { text: formatRoomType(myHousing.room_type) }),
        h("p", { text: `Sleeps ${myHousing.capacity}` }),
        h("div", { class: "row row--end" },
          btn("Go Back", { variant: "flat", onClick: () => dialogEl.close() }),
          btn("Confirm Booking", { onClick: () => confirmBooking(dialogEl, onChange) }))));

    return h("div", { class: "card w-full" },
      dialogEl,
      h("p", { class: "bold", text: (confirmed ? "Booking confirmed: " : "Current selection: ") + summary }),
      h("div", { class: "row" },
        confirmed ? null : btn("Continue", { onClick: () => dialogEl.showModal() }),
        btn(confirmed ? "Cancel Booking" : "Cancel Selection", { variant: ["flat", "negative"], onClick: () => cancelSelection(onChange) })));
  };
})();
