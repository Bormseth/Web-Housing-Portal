/* Building detail - pick a room type, then Continue -> Confirm Booking
   (was building_page / render_building_detail / render_room_card).
   URL: building.html?id=<building_id> */
(function () {
  const { h, apiGet, apiPost, hasData, iconBtn, btn, go, notify, formatRoomType } = Portal;
  const app = document.getElementById("app");
  const buildingId = new URLSearchParams(location.search).get("id");

  const STYLE_HEADINGS = {
    traditional: "Traditional Rooms",
    suite: "Suites",
    apartment: "Apartments",
  };

  async function selectRoom(building, room) {
    const body = { building_id: building.id, style: room.style, room_type: room.room_type };
    if (await apiPost("/housing/select", body)) {
      notify("Room type selected", "positive");
      render();
    }
  }

  function roomCard(building, room, myHousing) {
    const isSelected = hasData(myHousing) &&
      myHousing.building_id === building.id &&
      myHousing.style === room.style &&
      myHousing.room_type === room.room_type;
    return h("div", { class: "card" + (isSelected ? " card--selected" : "") },
      h("h3", { class: "text-lg", text: formatRoomType(room.room_type) }),
      h("p", { text: `Sleeps ${room.capacity}` }),
      h("p", { text: `${room.count} room${room.count !== 1 ? "s" : ""}` }),
      isSelected
        ? btn("Selected", { icon: "check", disabled: true })
        : btn("Select", { onClick: () => selectRoom(building, room) }));
  }

  async function render() {
    const [building, myHousing] = await Promise.all([
      buildingId ? apiGet(`/housing-options/${encodeURIComponent(buildingId)}`) : Promise.resolve([]),
      apiGet("/my-housing"),
    ]);
    const found = hasData(building);
    document.title = found ? building.name : "Building";

    const nodes = [
      h("div", { class: "row" },
        iconBtn("arrow_back", "Back to Housing Selection", () => go("room-select.html")),
        h("h1", { class: "text-2xl", text: found ? building.name : "Building not found" })),
    ];

    if (found) {
      nodes.push(h("div", { class: "row" },
        h("span", { text: building.type }),
        btn("More Info", { variant: "flat", onClick: () => window.open(building.url, "_blank", "noopener") })));

      if (hasData(myHousing)) nodes.push(MyHousingCard(myHousing, render));

      if (!(building.rooms && building.rooms.length)) {
        nodes.push(h("p", { text: "Room details aren't published for this building. Use More Info to learn more." }));
      } else {
        for (const [style, heading] of Object.entries(STYLE_HEADINGS)) {
          const rooms = building.rooms.filter((r) => r.style === style);
          if (!rooms.length) continue;
          nodes.push(
            h("h2", { class: "text-lg mt-4", text: heading }),
            h("div", { class: "grid grid--3" }, rooms.map((r) => roomCard(building, r, myHousing))));
        }
      }
    }
    app.replaceChildren(...nodes);
  }
  render();
})();
