# BillPay 146

Fast number-lookup and 146-person grid checklist to track and verify who has paid the bill.

## Deploy to Cloudflare Workers via GitHub

1. Push this repository to GitHub.
2. In the **Cloudflare Dashboard**, go to **Workers & Pages** → **Create** → **Import a repository** and select your GitHub repo.
3. Confirm the build settings:
   - **Build command**: `npm run build`
   - **Deploy command**: `npx wrangler deploy`
4. Click **Save and Deploy**. Every push to your main branch will automatically build and deploy to Cloudflare Workers using `wrangler.jsonc`.

## Local Development

```bash
npm install
npm run dev
```

## Manual Deploy via Wrangler

```bash
npm run deploy
```
