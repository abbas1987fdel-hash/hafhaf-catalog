# متجر مجمع الهفهاف

Arabic RTL catalog and separate admin entry, built with React, TypeScript, Vite and Convex.

Store: https://abbas1987fdel-hash.github.io/hafhaf-catalog/

Admin: https://abbas1987fdel-hash.github.io/hafhaf-catalog/admin.html

Convex production project: `bs-fdl:hafhaf-catalog:production`.

- Customer storefront: `/`. No cart or checkout.
- Admin application: `/admin.html`. Category, product, banner and store-name management.
- Per-category WhatsApp support, IQD prices, optional quantity and stock status.
- Uploads are resized to at most 1600px and converted to WebP in the browser. Server enforces WebP and a 1.5 MB limit.
- Distinct installable customer/admin manifests. Installation requires browser support; iOS instructions are shown when the install prompt is unavailable.
- The service worker does not cache catalog data: availability and pricing require internet access.

## Local development

```
npm ci
npx convex dev
npm run dev
```

Configure `ADMIN_PIN` in the Convex deployment environment, never in client source. The PIN is checked server-side, with a global five-attempt/five-minute lockout and eight-hour revocable sessions. A short shared PIN provides limited security; keep the admin link and PIN with the shop owner. There are no payment or customer identity records in this catalog.

## Verification

```
npm run lint
npm test
npm run build
```

Tests cover unauthorized writes, failed-PIN limits, logout, expiration, category/product lifecycle, price/quantity validation, WebP restrictions and public catalog contents.

## Production deployment

Create a new project under the intended Convex account, deploy the backend with `npx convex deploy`, and set `ADMIN_PIN` on **production**. Set the GitHub repository variable `VITE_CONVEX_URL` to its production URL. Enable GitHub Pages with the GitHub Actions source and run the deployment workflow.

Production provisioning is intentionally separate from local test data. Never deploy local test categories or secrets. `.env` files are ignored. The Pages workflow refuses to build without a configured cloud endpoint.
