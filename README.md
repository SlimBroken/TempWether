# TempWether

An Israel-first weather desk with a wider view of the eastern Mediterranean.

**Forecast · Mediterranean watch · Scan history · Accuracy lab**

## Run

Requires Node.js 22 or newer. There are no dependencies to install.

```sh
npm start
```

Open **http://localhost:4173**. The browser retrieves forecasts from Open-Meteo. An internet connection to its APIs is required. If forecasts cannot load, the app shows an error, preserves cached data, and offers an explicitly labelled synthetic preview. Sample weather is never recorded as a real scan.

```sh
npm test       # Calculation, timestamps, partial failure and benchmark tests
npm run build # Static site in dist/
npm run collect # Fetch all 14 locations and append a shared forecast scan
```

## What is included

- Seven-day forecasts for eight Israeli locations, plus Athens, Heraklion, Rhodes, Paphos, Larnaca and Nicosia.
- ECMWF IFS 0.25°, NOAA GFS and DWD ICON comparison, with equal-weight hourly blending of available values.
- Temperature, rainfall, wind, gusts and pressure; feels-like temperature, humidity and precipitation probability from Open-Meteo Best Match.
- Model spread, per-day charts, three-hourly tables and explicit missing-data states.
- A geographic Mediterranean watch map with a seven-day timeline and rain/gust layers. Point forecasts and thresholds are **not storm tracks or official warnings**.
- Shared storm-naming context and direct links to IMS, HNMS and the Cyprus Department of Meteorology.
- Local scan persistence, shared repository history, forecast revision charts and CSV export.
- An on-demand historical temperature benchmark for 1-, 3- and 7-day lead times, including MAE, bias and RMSE on matched timestamps.
- Responsive layout, keyboard controls, visible focus, reduced-motion support and accessible chart/table descriptions.

## Data and methodology

All app dates and times use `Asia/Jerusalem`, including the regional view. API timestamps are Unix seconds, so comparisons remain aligned across timezones and daylight-saving changes. The app averages each weather variable independently across available values. Missing values never become zero. A provider failure does not discard other models.

“Current hour” is a forecast model estimate, **not a station observation**. Rain probabilities come from Best Match and are not calculated from the three-model vote. Daily rain is the sum of available blended hourly amounts; partial coverage is indicated. Temperature spread is the mean hourly difference between the warmest and coldest available models, not a confidence percentage.

The accuracy lab compares a 14-day historical window ending seven days ago against ERA5 reanalysis. ERA5 is gridded model-derived historical weather, not station truth, and is not fully independent of ECMWF. At each lead time all available models are evaluated on their common valid hours. No claim of “most accurate” or automatic learned weights is made. Station verification and independent seasonal holdout testing are future work.

The regional screen marks a point as worth watching at ≥15 mm/day or ≥60 km/h gusts, and a strong signal at ≥40 mm/day or ≥80 km/h. These are transparent app screening thresholds, not official warning criteria. A storm west of Israel is not necessarily travelling toward Israel. The app does not infer an arrival time from point forecasts, and does not issue background phone notifications.

## Scheduled history

`.github/workflows/weather.yml` collects forecasts every six hours, on pushes to `main`, and on manual dispatch. It validates calculations, archives `public/latest.json` and daily summaries in `public/history.json`, commits successful scans, and uploads a deployable `tempwether-site` artifact. It retains 240 scans (about 60 days at four scans a day). GitHub scheduled runs can be delayed, and inactive public repositories can have scheduled workflows disabled by GitHub. This is not a real-time alerting system.

The workflow needs GitHub Actions enabled and a repository policy allowing `contents: write`; no weather API key is needed for the non-commercial Open-Meteo service. A failed collection preserves the existing archive and makes the workflow visibly fail after uploading the build. Local browsing also saves scans in this browser. Clearing site storage removes local-only history; CSV export keeps a copy.

## Official named storms

Greece, Cyprus and Israel share an official storm naming scheme. **A live official naming/warning feed is not connected in this version.** The app explicitly shows “Named storm status not connected” and never treats an empty list as an all-clear.

`public/storms.json` accepts editorially verified events, each with `name`, `summary`, `validFrom`, `validUntil` (ISO UTC timestamps) and an official `sourceUrl`. Only currently valid events with HTTPS sources are displayed. Record `checkedAt` when reviewing. Never manufacture an official name from model output or pick the next name from a seasonal list. Automated official-source ingestion still needs a stable, verified feed and expiry handling before it can be enabled.

## Hosting

This is a static app with relative paths. Deploy the contents of `dist/` to a static hosting service, or use GitHub Pages:

1. In **Settings → Pages**, choose **Deploy from a branch**.
2. Select **main**, folder **/(root)**, and save.
3. GitHub will provide the public URL, normally `https://slimbroken.github.io/TempWether/`.

The checked-in root is already the runnable static site. No build command is needed for branch-based Pages. Enabling Pages is a separate repository setting; merely committing this project does not enable public hosting. Once enabled, the scheduled weather commits also refresh the published shared archive.

No secrets are embedded. Browser requests go directly to Open-Meteo. The only optional external visual dependency is Google Fonts, with local system-font fallbacks. Fixed preset coordinates are used; the app does not ask for device geolocation.

## Sources

- [Open-Meteo forecast API](https://open-meteo.com/en/docs)
- [Previous model runs](https://open-meteo.com/en/docs/previous-runs-api)
- [Historical weather / ERA5](https://open-meteo.com/en/docs/historical-weather-api)
- [Open-Meteo usage terms](https://open-meteo.com/en/terms) — review limits and licensing before commercial deployment.
- [IMS: Israel joins storm naming](https://ims.gov.il/en/node/1415)
- [HNMS: 2025–2026 shared naming list](https://www.emy.gr/en/meteorological-news/830)
- [Natural Earth geographic data](https://www.naturalearthdata.com/about/terms-of-use/) via [world.geo.json](https://github.com/johan/world.geo.json)

See `THIRD_PARTY_NOTICES.md` for bundled icon and map attribution.
