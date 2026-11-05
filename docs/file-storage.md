# Browser storage when opened from `file://`

Measured with Playwright 1.64 on 2026-11-04. A value was written from one file, then read from
others. Each row shows whether that value was visible.

| Read from                                     | Chromium | WebKit | Firefox |
| --------------------------------------------- | -------- | ------ | ------- |
| Same file                                     | Yes      | Yes    | Yes     |
| Renamed file, same folder (`garage (1).html`) | Yes      | Yes    | Yes     |
| Same name, different folder                   | Yes      | Yes    | Yes     |

Chromium and WebKit were measured on macOS, and Firefox on Linux in CI, because Playwright's
Firefox would not launch on the development Mac. All three ran under Playwright, which may relax
browser defaults. Firefox in particular has a stricter file-origin setting that an everyday
install may apply, so treat this table as a guide and not a guarantee.

**Consequences**

- A newly downloaded release should keep its data, wherever it is saved.
- All local files may share one storage area, so the app uses a namespaced key.
- That sharing is also a privacy limit. A different local HTML file read a saved policy number in
  testing, so any local file opened in the same browser can read this app's data.
- Do not rely on this across browsers or devices. JSON export/import is the supported way to move
  data.
