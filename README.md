# TempWether

An Israel-first weather desk with a wider view of the eastern Mediterranean.

**Forecast · Mediterranean watch · Scan history · Accuracy lab**

![TempWether desktop interface with explicitly labelled synthetic preview data](docs/preview.png)

The screenshot is an interface preview. Actual forecasts load from Open-Meteo.

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

- A **Storm & wind explorer** at the top of Mediterranean: animated wind particles, static direction arrows, storm-outlook (clouds + precipitation), wind-speed and rain/snow layers; 168-hour play/pause timeline; ECMWF/GFS/ICON switching; zoom, drag-to-pan, Israel/region presets, and click-to-inspect wind, direction, gusts, precipitation, clouds and pressure. Keyboard-accessible location selection offers the same numeric details. Reduced-motion preferences disable automatic wind animation.
- Seven-day forecasts for eight Israeli locations, plus Athens, Heraklion, Rhodes, Paphos, Larnaca and Nicosia.
- ECMWF IFS 0.25°, NOAA GFS and DWD ICON comparison, with equal-weight hourly blending of available values.
- Temperature, rainfall, wind, gusts and pressure; feels-like temperature, humidity and precipitation probability from Open-Meteo Best Match.
- Model-by-model daily cards with exact high/low temperature, rainfall and peak gusts, and shortcuts to each model’s map.
- Model spread, per-day charts, three-hourly tables and explicit missing-data states.
- An interactive forecast map with Mediterranean and Israel views, a seven-day timeline, individual ECMWF/GFS/ICON or combined forecasts, and daily high temperature / rainfall / gust layers. Select a city to compare all models in place. Colour legends follow the chosen variable. An unavailable selected model is never silently replaced with the blend. Point forecasts and thresholds are **not radar overlays, storm tracks or official warnings**.
- Shared storm-naming context and direct links to IMS, HNMS and the Cyprus Department of Meteorology.
- Local scan persistence, shared repository history, forecast revision charts and CSV export.
- An on-demand historical temperature benchmark for 1-, 3- and 7-day lead times, including MAE, bias and RMSE on matched timestamps.
- Responsive layout, keyboard controls, visible focus, reduced-motion support and accessible chart/table descriptions.

## Data and methodology

The animation panel fetches a separate **9 × 7 coarse display grid** spanning 20–38°E and 28–41°N on demand, for one selected model at a time. This is approximately 2° sampling, **not the native model resolution** and not suitable for resolving local storm cells or flash-flood hazards. Grid-cell selection is `nearest` to include marine areas. Values are bilinearly interpolated only where the required corners are available; missing data is never replaced by zero. Wind directions are converted to east/north vectors before interpolation, avoiding compass-angle wrap errors. Particles move in the forecast wind direction; their on-screen speed is illustrative, not a prediction of storm travel. Precipitation is the **preceding hour's** total (including snow water equivalent); clouds are forecast cloud cover, not satellite imagery. No storm tracks or lightning detections are inferred. Forecast-hour playback advances in discrete hours, not simulated weather between hours. Data is cached in memory for 30 minutes per model, with concurrent requests deduplicated. Graphics are not added to the scan archive; sample fields remain explicitly synthetic and separate from live fields. Model switching never falls back to a different model.

All app dates and times use `Asia/Jerusalem`, including the regional view. API timestamps are Unix seconds, so comparisons remain aligned across timezones and daylight-saving changes. The app averages each weather variable independently across available values. Missing values never become zero. A provider failure does not discard other models.

“Current hour” is a forecast model estimate, **not a station observation**. Rain probabilities come from Best Match and are not calculated from the three-model vote. Daily rain is the sum of available blended hourly amounts; partial coverage is indicated. Temperature spread is the mean hourly difference between the warmest and coldest available models, not a confidence percentage.

The accuracy lab compares a 14-day historical window ending seven days ago against ERA5 reanalysis. ERA5 is gridded model-derived historical weather, not station truth, and is not fully independent of ECMWF. At each lead time all available models are evaluated on their common valid hours. No claim of “most accurate” or automatic learned weights is made. Station verification and independent seasonal holdout testing are future work.

The regional screen marks a point as worth watching at ≥15 mm/day or ≥60 km/h gusts, and a strong signal at ≥40 mm/day or ≥80 km/h. These are transparent app screening thresholds, not official warning criteria. A storm west of Israel is not necessarily travelling toward Israel. The app does not infer an arrival time from point forecasts, and does not issue background phone notifications.

## Scheduled history

`.github/workflows/weather.yml` collects forecasts every six hours, on pushes to `main`, and on manual dispatch. It validates calculations, archives `public/latest.json` and daily summaries in `public/history.json`, commits successful scans, and uploads a deployable `tempwether-site` artifact. It retains 240 scans (about 60 days at four scans a day). GitHub scheduled runs can be delayed, and inactive public repositories can have scheduled workflows disabled by GitHub. This is not a real-time alerting system.

The workflow needs GitHub Actions enabled and a repository policy allowing `contents: write`; no weather API key is needed for the non-commercial Open-Meteo service. A failed collection preserves the existing archive and makes the workflow visibly fail after uploading the build. Local browsing saves the most recent 24 scans on this device to stay within browser storage limits; the shared repository archive retains 240. Clearing site storage removes local-only history; CSV export keeps a copy.

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
