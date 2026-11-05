# Browser storage when opened from `file://`

Measured with Playwright 1.64 on 2026-11-04. A value was written from one file, then read from
others. Each row shows whether that value was visible.

| Read from                                     | Chromium | WebKit | Firefox      |
| --------------------------------------------- | -------- | ------ | ------------ |
| Same file                                     | Yes      | Yes    | Not measured |
| Renamed file, same folder (`garage (1).html`) | Yes      | Yes    | Not measured |
| Same name, different folder                   | Yes      | Yes    | Not measured |

Playwright's Firefox would not launch on the development Mac, so its row is open. The
`firefox-file` E2E project still runs in CI. Automation contexts may not match every installed
browser, so treat this as a guide and not a guarantee.

**Consequences**

- In Chromium and WebKit, a newly downloaded release keeps its data, wherever it is saved.
- Every local file on those browsers shares one storage area, so the app uses a namespaced key.
- Do not rely on this across browsers or devices. JSON export/import is the supported way to move
  data.
