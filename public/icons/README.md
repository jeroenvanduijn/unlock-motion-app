# Icons

V1 gebruikt `icon.svg` als enige icon — moderne browsers (Chrome, Edge, Firefox, Safari 16+) ondersteunen SVG in webmanifest met `sizes: "any"`.

Voor scherpere iOS touch-icons:
1. Maak `icon-192.png` (192×192) en `icon-512.png` (512×512) op basis van `icon.svg`.
2. Voeg ze toe aan `manifest.webmanifest` als losse entries.
3. Update `index.html` `apple-touch-icon` naar `/icons/icon-192.png`.

Tooling: `npm run convert-icons` (nog niet ingesteld) of handmatig via Figma/Sketch.
