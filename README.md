# Barcodey

A fast, private wallet for loyalty cards, membership cards, and documents. Everything lives on your device — no account, no cloud, no tracking, fully offline.

## Features

- Scan or type in any barcode (EAN, Code 128, QR, Data Matrix, and more)
- Wallet-style card faces: brand logos and colors from a bundled catalog of 2,400+ brands, custom colors, cover photos
- List, grid, and swipeable card-deck views, folders, favorites
- Documents with expiry reminders
- Light and dark mode

## Feedback

- [Suggest a brand](../../issues/new?template=suggest-brand.yml) for the catalog
- [Report a bug](../../issues/new?template=bug-report.yml)
- [Request a feature](../../issues/new?template=feature-request.yml)

## Development

Built with React, Vite, Tailwind, and Capacitor.

```sh
pnpm install
pnpm dev          # web dev server
pnpm test         # unit tests
pnpm build:brands # rebuild the bundled brand catalog
```

## Brand catalog data

The bundled brand catalog is generated from open data:

- Brand names, aliases, and locations from [name-suggestion-index](https://github.com/osmlab/name-suggestion-index) (BSD-3-Clause, © name-suggestion-index contributors)
- Brand metadata from [Wikidata](https://www.wikidata.org) (CC0)
- Logo images from [Wikimedia Commons](https://commons.wikimedia.org) (public domain or below the threshold of originality)

All logos and brand names are trademarks of their respective owners and are used solely to identify the corresponding loyalty programs.

## License

[GPL-3.0](LICENSE) © Filip Vitas
