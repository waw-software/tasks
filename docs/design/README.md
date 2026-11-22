# Design sources

These folders hold the screen mockups for WAW Tasks.

- [mobile/](mobile/): 19 phone screens, drawn at 390 x 844.
- [desktop/](desktop/): 9 desktop screens, drawn at 1440 wide. They stretch to fill the window.
- [screens/](screens/): PNG exports of the same screens, one per mockup source.

[../DESIGN.md](../DESIGN.md) lists every screen, what it shows, and which desktop screen covers which mobile screens.

## How to read a `.dc.html` file

Each file is one screen. It is plain HTML with inline styles, plus a small template layer:

- Everything inside `<x-dc>` is the screen's markup. Read it for structure, spacing, colours, sizes and copy.
- `<helmet>` holds the fonts and a few global styles.
- `{{name}}` is a placeholder filled from the script at the bottom of the file.
- `<sc-for list="{{items}}" as="item">` repeats its content for each entry of a list.
- The `<script type="text/x-dc">` block at the bottom returns the sample data for the placeholders: task lists, tab definitions, colours. It shows the shape of the data a screen needs.
- Links between screens (`href="Task.dc.html"`) show the navigation.
- `canvas.json` records each screen's title, size and position on the design canvas. Its group titles show how the screens are organised.

The files reference `./support.js`, the runtime of the design tool. It is not included, so the files do not render when opened in a browser. Read them as source. For the rendered look, use the PNGs.

## Using them

- Use the mockups for layout, spacing, colour, wording and states.
- Do not copy the markup. Build real components from the tokens in [../DESIGN.md](../DESIGN.md).
- The sample data is illustrative.
- Some mockups are older than the rest. The differences are listed in [../DESIGN.md](../DESIGN.md) section 9.

## PNG exports

The PNGs are in [screens/mobile/](screens/mobile/) and [screens/desktop/](screens/desktop/), as `screens/<platform>/<Name>.png`. `<Name>` is the name of the mockup source without `.dc.html`: the export of `Main.dc.html` is `Main.png`. Each screen table in [../DESIGN.md](../DESIGN.md) links both the source and its PNG.

They are 2x exports: mobile 780 x 1688, desktop 2880 px wide.

To add or refresh one, export the board from the design canvas as PNG and save it under that name in the folder of its platform.
