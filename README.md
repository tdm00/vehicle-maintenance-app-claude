# Garage

A vehicle maintenance tracker that runs entirely in the browser. Track service history and fuel
economy for each vehicle, and see what needs attention across your whole garage.

## Use it

Download `garage.html` from the [latest release](../../releases/latest) and open it, or put it on
any static web host. There is no server and no account, and the app makes no network requests.

**Your data stays in your browser.** Use **Settings → Download backup** to keep a copy or to move
it to another browser or device.

**On a phone,** host the file. Opening a local HTML file on a phone generally previews it rather
than running it as an app, and data may not persist.

Supported browsers: Chrome 111+, Firefox 128+, and Safari 16.4+.

## How the numbers work

- **Mileage** is the highest reading anywhere: the vehicle, a service, or a fill-up.
- **MPG** is measured between full tanks. Gallons from a partial fill roll into the next full fill.
- **Overall MPG** is distance divided by fuel, and it excludes the first tank, which was burned
  before tracking began. A fill-up you forget to log will make MPG read high.
- **Maintenance suggestions** are general guidance, not manufacturer schedules. They start from
  the service list and adjust for powertrain, age, a few makes, and high mileage. A service is due
  by miles or months, whichever comes first. Intervals you set in Settings always win.
- **Units** are miles, gallons, and US dollars.

## Develop

Requires Node 24.

```bash
npm install
```

```bash
npm run dev
```

| Command            | What it does                                      |
| ------------------ | ------------------------------------------------- |
| `npm run check`    | Typecheck, lint, and unit and integration tests   |
| `npm run build`    | Builds the single file to `dist/garage.html`      |
| `npm run test:e2e` | Runs Playwright against the build, so build first |
| `npm run format`   | Applies formatting and safe lint fixes            |

Built with React, TypeScript, Vite, Tailwind CSS, Zustand, Zod, and wouter. Business rules live in
`src/domain` as pure functions.

## Releases

- Every pull request runs the full test suite (`ci`).
- Every merge to `main` that changes more than docs builds the file, tests that exact build, and
  publishes it as the next release: `v1`, `v2`, and so on.

To stop failing pull requests from merging, add a branch protection rule on `main` that requires
the `ci` check. Without it, a failing change can merge, though it won't be released.

See [docs/file-storage.md](docs/file-storage.md) for how browsers store data for local files.
