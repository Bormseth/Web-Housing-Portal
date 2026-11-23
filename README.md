# UNH Housing Portal

Plain HTML/CSS/JS port of the NiceGUI app.

## Run it
Requires Python 3.10 or newer. Run these commands from the folder containing `housing_api.py`.

1. Install dependencies and start the FastAPI backend:
   ```
   python -m pip install -r requirements.txt
   python housing_api.py
   ```
2. In a second terminal, serve this folder and open it:
   ```
   python -m http.server 8085
   # then visit http://localhost:8085/
   ```

To run the communication checks: install `requirements-dev.txt`, then run `python -m unittest discover -s tests -v`.

## Notes
- Every page builds its DOM from JS with the `Portal.h()` helper (text goes in via `textContent`, so user input can't inject markup). To redesign a page, edit its `js/pages/*.js` render code, or move markup into the `.html` file.
- Not ported because nothing used them: `announcement_card.py`, `my_housing.py` (`render_no_housing_message`), and `render_housing_card` / `render_current_housing_card` in `housing_card.py`.
- Icons use the Material Icons web font (loaded in `portal.js`) to match Quasar. Swap `Portal.icon()` if you change icon sets.
- Small intentional additions: selected meal plan / dining dollar cards get a highlight outline; the room-select page remembers its active tab after confirm/cancel.
