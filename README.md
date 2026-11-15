# CampusFind

CampusFind lets visitors choose a campus and explore its OpenStreetMap street tiles and mapped building footprints. It includes campus selection, building outlines with OpenStreetMap record links, and optional foreground GPS location. Shiv Nadar University has a dedicated interactive campus explorer with an in-app campus and facilities overview, estimated zone pins, in-site walking directions, academic floor notes, food details, and optional local ratings. Ratings are saved only in the visitor's browser; there is no shared review service.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

## Map data

Street tiles and building footprints come from OpenStreetMap. The app requests building ways for the visible map area at zoom level 15 and closer. Building names and shapes are shown only when mapped in OpenStreetMap; coverage varies by campus and can be incomplete. No campus buildings are fabricated. Configure `VITE_OVERPASS_URL` to use an Overpass endpoint you operate or contract with if needed. Keep visible attribution and follow the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/). OSM data is available under the Open Database License.

GPS reads device location only after browser permission and works over HTTPS. For an in-site walking route, the selected start and destination coordinates are sent to the public OpenStreetMap-based Valhalla routing service; route lines and directions are rendered in CampusFind. Routes rely on mapped outdoor paths and do not provide indoor navigation or guarantee campus access. Device location is not stored by CampusFind.

## Build and deploy

```sh
npm run check
npm run preview
```

The production files are written to `dist/`. For Vercel or Netlify, use `npm run build` and publish `dist/`.

