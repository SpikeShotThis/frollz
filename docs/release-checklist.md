# Release Checklist

Steps to take when you're ready to ship a new build.

---

## 1. Get Code onto Main

- [ ] Merge your feature/fix branch into `main` via a PR
- [ ] Confirm the merge commit appears on the `main` branch

---

## 2. Watch the CI/CD Pipeline

- [ ] Open **Actions** tab on GitHub: `https://github.com/joshholl/frollz/actions`
- [ ] Confirm the `CI / CD` workflow triggered on the merge
- [ ] Wait for **API — Lint & Test** and **UI — Lint, Type-check & Test** to go green
- [ ] Wait for **Build & Push Images** to complete
- [ ] If any job fails — fix the issue, push to `main`, and the pipeline re-runs automatically

---

## 3. Confirm Images Were Published (first release only)

> After the very first successful push, GHCR packages are created as **private** by default.
> You only need to do this once per image.

- [ ] Go to your GitHub profile → **Packages**
- [ ] Find `frollz-api` and `frollz-ui`
- [ ] For each: **Package settings** → change visibility to **Public** (or leave private and ensure your server can authenticate)

---

## 4. Pull and Deploy on Your Production Host

- [ ] SSH into the production server
- [ ] Pull the new images:
  ```bash
  docker pull ghcr.io/joshholl/frollz-api:latest
  docker pull ghcr.io/joshholl/frollz-ui:latest
  ```
- [ ] Restart the stack:
  ```bash
  docker-compose pull   # refreshes to latest
  docker-compose up -d  # recreates containers with new images
  ```
- [ ] Confirm all containers are running:
  ```bash
  docker-compose ps
  ```

> **Tip:** To deploy a specific build instead of `latest`, use the commit SHA tag —
> e.g. `ghcr.io/joshholl/frollz-api:abc1234`. Every build is tagged with its SHA.

---

## 5. Smoke Test

- [ ] Open the app in a browser and confirm it loads
- [ ] Log an entry and verify it saves (exercises the API and DB end-to-end)
- [ ] Check logs for errors:
  ```bash
  docker-compose logs -f
  ```

---

## Rollback

If something's wrong, roll back to the previous build using its SHA tag:

```bash
# Find recent SHA tags in GitHub → Packages → frollz-api → versions
docker pull ghcr.io/joshholl/frollz-api:<previous-sha>
docker pull ghcr.io/joshholl/frollz-ui:<previous-sha>

# Update docker-compose.yml image tags to the previous SHA, then:
docker-compose up -d
```
