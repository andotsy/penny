# Project Penny presentation

Page-based HTML presentation with the final Penny v10 enclosure in an interactive Three.js STL viewer.

## Run

```sh
cd presentation
npm install
npm run dev
```

Open the local URL printed by Vite. Use left/right arrows, Page Up/Page Down, Space, Home/End, the on-screen controls, or horizontal swipe. Press `F` for fullscreen.

For a production build:

```sh
npm run build
npm run preview
```

`npm run dev` and `npm run build` first copy the final generated `v10_chassis.stl`, `v10_cover.stl`, and `v10_clip.stl` from `../cad/v10_out/` into `public/models/`. Run `../scripts/01_cad_build.sh` only if those source exports are missing.

## Replace media placeholders

Replace the empty files in `public/media/` without changing their names. The presentation detects valid media and automatically replaces its designed placeholder.

| slide | file | suggested content |
|---|---|---|
| 01 | `01-opening-meme.jpg` | opening meme (included; swap if you have a better one) |
| 03 | `03-early-unboxed.jpg` | XIAO ESP32-S3 and both camera modules after unboxing |
| 03 | `03-early-transparent.jpg` | early transparent-resin enclosure in hand |
| 04 | `04-oled-boot.jpg` | first OLED boot message |
| 04 | `04-oled-cyrillic.jpg` | OLED showing Cyrillic text |
| 05 | `05-pcb-cut.mp4` | cutting down the donor display PCB |
| 06 | `06-display-broken.jpg` | OLED torn off its flex during assembly |
| 06 | `06-display-stacked.jpg` | replacement panel in the tighter stacked arrangement |
| 07 | `07-soldered-internals.jpg` | XIAO, display, USB-C, switch, camera, and battery wiring |
| 10 | `10-print-supports.jpeg` | Lychee Slicer view of the enclosure with supports |
| 10 | `10-printer-loaded.jpg` | enclosure job loaded on the resin printer |
| 10 | `10-printer-start.mp4` | resin printer beginning the print |
| 10 | `10-printer-work.jpg` | working beside the printer mid-print |
| 10 | `10-wash-cure-rotation.mp4` | pen parts rotating in the wash/UV cure machine |
| 11 | `11-stack-ready.jpg` | completed electronics stack before install |
| 11 | `11-in-body.jpg` | electronics laid into the bottom half |
| 11 | `11-installed-closeup.jpg` | close-up of board, switch, camera flex, battery below the seam |
| 12 | `12-penny-link-app.png` | Penny Link capture screen |
| 13 | `13-stealth-display.jpg` | pen display barely visible through the tint film (stealth) |
| 13 | `13-hotspot-app.jpg` | Penny Hotspot TrollStore app (keep-discoverable screen) |
| 15 | `15-autofocus-fail.jpg` | real-world capture showing the soft autofocus |
| 16 | `16-finished-pen.jpg` | clean photo of the finished pen |

Images work best at 1600 px or more on the long edge. Videos should be H.264 MP4 without relying on audio; the deck loops them muted while their slide is active.

After replacing media, Vite development mode shows it immediately. Re-run `npm run build` to copy replacements into `dist/`.

## Viewer controls

- Drag to orbit.
- Wheel or pinch to zoom.
- `Rotate clip` swings the removable clip around its pivot.
- `Assemble` lifts the clip clear before separating the shell halves, then reverses that sequence when closing.
- `Auto-spin` and `X-ray` reuse interaction patterns from the earlier Penny web viewer while loading the current STL exports.
- `Reset view` restores the initial camera.

Run `npm run check` to validate the slide count, media placeholders, generated model assets, and production build.
