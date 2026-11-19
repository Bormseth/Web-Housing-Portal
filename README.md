# UNH Housing Portal – static frontend (HTML / CSS / JS)

Plain HTML/CSS/JS port of the NiceGUI app. No build step, no framework.

## Run it
1. Copy `Media/UNH-CREST.png` from the old project to `assets/UNH-CREST.png` (the header falls back to text if it's missing).
2. Start the existing FastAPI backend (default `http://127.0.0.1:8006`).
3. Serve this folder and open it:
   ```
   python -m http.server 8085
   # then visit http://localhost:8085/
   ```
4. Different API address? Add `<script>window.HOUSING_API_BASE = "http://host:port";</script>` before `portal.js`, or edit `API_BASE` at the top of `js/portal.js`.

## Backend change required: CORS
NiceGUI called the API server-side. Now the *browser* calls it, so the API must allow cross-origin requests
(including the custom `X-RA-Session` header). In the FastAPI app:
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8085", "http://127.0.0.1:8085"],
    allow_methods=["*"],
    allow_headers=["*"],   # must include X-RA-Session
)
```

## Layout
```
index.html, my-profile.html, messages.html      home + placeholder pages
housing-applications.html                       year picker
housing-application.html                        2026-27 application (5-step stepper)
room-select.html                                browse buildings (tabs)
building.html?id=N                              room types for one building
meal-plans.html / meal-plan-application.html
become-an-ra.html / become-an-ra-apply.html
css/styles.css                                  ALL styling; colors/radius are variables at the top
js/portal.js                                    shared: API client, header, toasts, stepper, form helpers, formatters
js/components/my-housing-card.js                "current selection" card + confirm dialog
js/components/ra-common.js                      shared RA helpers
js/pages/*.js                                   one script per page
```

## Python -> web mapping
| NiceGUI | Now |
|---|---|
| `services/api_client.py` | `Portal.request / apiGet / apiPost / sessionRequest` in `portal.js` |
| `components/header.py` | `renderHeader()` in `portal.js`; highlight set by `<body data-active="...">` |
| `app.storage.user["ra_session"]` | `localStorage["ra_session"]` (sent as `X-RA-Session`) |
| `ui.notify` | `Portal.notify` (toast) |
| `ui.stepper` / `ui.step` | `Portal.Stepper` + `.stepper` / `.step` CSS |
| `ui.dialog` | native `<dialog>` |
| `@ui.refreshable` | page `render()` function re-run after each action |
| routes (`/meal-plans/2026-2027`, `/housing-applications/room-select/{id}`) | `.html` files; building id is `?id=` |

## Notes
- Every page builds its DOM from JS with the `Portal.h()` helper (text goes in via `textContent`, so user input can't inject markup). To redesign a page, edit its `js/pages/*.js` render code, or move markup into the `.html` file.
- Not ported because nothing used them: `announcement_card.py`, `my_housing.py` (`render_no_housing_message`), and `render_housing_card` / `render_current_housing_card` in `housing_card.py`.
- Icons use the Material Icons web font (loaded in `portal.js`) to match Quasar. Swap `Portal.icon()` if you change icon sets.
- Small intentional additions: selected meal plan / dining dollar cards get a highlight outline; the room-select page remembers its active tab after confirm/cancel.
