# Frontend Production Deployment

BunnyCal Web is a **pure static** Vite/React SPA. It is built in CI and served
from **S3 behind CloudFront** with an ACM TLS certificate. There is no server,
no Docker, no SSH, and no runtime configuration — everything the browser needs
is baked into the bundle at build time.

```
GitHub (push to main)
   → GitHub Actions
       → npm ci
       → npm run build        (mode=production → .env.production)
       → aws s3 sync dist/     (assets: immutable cache)
       → aws s3 cp index.html  (no-cache)
       → CloudFront invalidation (/*)
   → https://bunnycal.io updated
```

| Layer    | Production            | Development            |
| -------- | --------------------- | ---------------------- |
| Frontend | https://bunnycal.io   | http://localhost:5173  |
| Backend  | https://api.bunnycal.io | http://localhost:8080 |

---

## 1. Runtime configuration

All production-sensitive config flows through **`VITE_*` environment
variables**, read centrally in [`src/config/api.ts`](../src/config/api.ts) as
`API_BASE_URL`. Every API call, OAuth start URL, integration connect URL, and
silent-refresh request derives from that single value — there are no hardcoded
backend hosts anywhere in `src/`.

Vite loads env files by mode automatically:

- `npm run dev`   → `.env.development` (`VITE_API_BASE_URL=http://localhost:8080`)
- `npm run build` → `.env.production`  (`VITE_API_BASE_URL=https://api.bunnycal.io`)

`.env.example` documents every variable. See it for the authoritative list.

> **Security:** `VITE_*` values are inlined into the browser bundle and are
> therefore **public**. Never place secrets in any `.env.*` file or in the
> workflow `env:` block. Secrets live only in the backend and in GitHub Actions
> secrets (AWS credentials), which are never shipped to the client.

---

## 2. Required GitHub Actions secrets

Set these under **Settings → Secrets and variables → Actions**:

| Secret                            | Purpose                                  |
| --------------------------------- | ---------------------------------------- |
| `AWS_ACCESS_KEY_ID`               | IAM user/role key for deploy             |
| `AWS_SECRET_ACCESS_KEY`           | IAM secret                               |
| `AWS_REGION`                      | Region of the S3 bucket (e.g. us-east-1) |
| `S3_BUCKET`                   | Target bucket name (no `s3://`)          |
| `CLOUDFRONT_DISTRIBUTION_ID`  | Distribution to invalidate after upload  |

The deploy IAM principal needs `s3:PutObject`, `s3:DeleteObject`,
`s3:ListBucket` on the bucket and `cloudfront:CreateInvalidation` on the
distribution. Nothing more.

---

## 3. AWS infrastructure (one-time setup)

The workflow assumes the bucket, distribution, and certificate already exist.

### S3 bucket
- Create a bucket (name = `S3_BUCKET`).
- Keep **Block Public Access ON**. CloudFront reads the bucket via an Origin
  Access Control (OAC); the bucket itself stays private.
- Do **not** enable S3 "static website hosting" — we use CloudFront + OAC and
  S3's REST origin, which is the modern, more secure pattern.

### ACM certificate
- Request a public certificate for `bunnycal.io` (and `www.bunnycal.io` if
  used) in **us-east-1** — CloudFront only accepts certs from us-east-1.
- Validate via DNS.

### CloudFront distribution
- Origin: the S3 bucket via **Origin Access Control (OAC)**; attach the
  generated bucket policy so only this distribution can read the bucket.
- Alternate domain name (CNAME): `bunnycal.io`.
- Attach the ACM certificate; redirect HTTP → HTTPS.
- **Default root object:** `index.html`.
- **Compression:** enabled.

### SPA fallback (critical)
React Router uses client-side routing, so deep links like
`https://bunnycal.io/onboarding`, `/settings`, or `/bookings/abc` must serve
`index.html` instead of returning 404. Configure **two custom error responses**
on the distribution:

| HTTP error code | Response page path | Response code |
| --------------- | ------------------ | ------------- |
| 403             | `/index.html`      | 200           |
| 404             | `/index.html`      | 200           |

(With a private-bucket + OAC origin, S3 returns 403 for missing keys, so the
403 mapping is the one that actually fires; 404 is included for completeness.)

### DNS
- Route 53 (or your DNS provider): `bunnycal.io` → A/ALIAS to the CloudFront
  distribution.

---

## 4. Caching strategy

Handled by the workflow, no manual steps:

- **`dist/assets/*` (hashed JS/CSS):** `Cache-Control: public,max-age=31536000,immutable`.
  Filenames are content-hashed, so they can be cached forever and safely.
- **`index.html`:** `Cache-Control: no-cache,no-store,must-revalidate`.
  Always re-fetched so a release is picked up immediately.
- **CloudFront invalidation `/*`** runs after every deploy as a belt-and-braces
  measure so edge caches drop stale objects.

Assets are uploaded **before** `index.html`, so the new HTML never references a
bundle that hasn't landed yet.

---

## 5. Build artifacts

Only `dist/` is ever uploaded (`aws s3 sync dist/ … --delete`). Source files,
`node_modules`, and `.env.*` never reach S3. `--delete` prunes objects removed
between releases, keeping the bucket an exact mirror of the latest build.

---

## 6. Backend CORS / cookies

Because the SPA (`bunnycal.io`) and API (`api.bunnycal.io`) are different
origins and all clients send `credentials: "include"`, the **backend** must:

- set `Access-Control-Allow-Origin: https://bunnycal.io` (not `*`),
- set `Access-Control-Allow-Credentials: true`,
- issue auth cookies with `SameSite=None; Secure` (and ideally
  `Domain=.bunnycal.io`).

This is a backend configuration concern but is required for login, silent
refresh, and OAuth/integration connect flows to work in production.

---

## 7. Local verification

```bash
npm run build      # production build (uses .env.production)
npm run preview    # serve dist/ locally to sanity-check
```

A manual deploy (if ever needed) mirrors the workflow:

```bash
aws s3 sync dist/ "s3://$S3_BUCKET/" --delete \
  --exclude index.html --cache-control "public,max-age=31536000,immutable"
aws s3 cp dist/index.html "s3://$S3_BUCKET/index.html" \
  --cache-control "no-cache,no-store,must-revalidate" --content-type text/html
aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths "/*"
```
