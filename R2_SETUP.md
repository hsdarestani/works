# A+ Works — R2 asset storage setup

The project asset manager stores file metadata in D1 and file contents in Cloudflare R2.

## 1. Create the bucket

In Cloudflare Dashboard:

1. Go to **Storage & Databases → R2 Object Storage**.
2. Create a bucket named `a-plus-works-assets`.

## 2. Bind it to the Worker

Open **Workers & Pages → works → Bindings** and add:

- Binding type: **R2 bucket**
- Variable name: `FILES`
- Bucket: `a-plus-works-assets`

Save and deploy.

## 3. Verify

Open:

`https://works.hsdf7rb.workers.dev/api/health`

Expected result:

```json
{"ok":true,"storage":true}
```

The `project_assets` D1 table is created automatically by the Worker. A backup migration is available at `migrations/0004_project_assets.sql`.

## Limits

- Maximum file size: 25 MB per asset.
- Upload, rename, download and delete are available inside each project drawer.
