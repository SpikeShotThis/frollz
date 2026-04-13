# Release Checklist

Steps to take when you're ready to ship a new build. See [gitflow.md](./gitflow.md) for the full branching strategy.

---

## 1. Cut the Release Branch

- [ ] Check out `develop` and pull latest
- [ ] Create `release/x.y.z` off `develop`
- [ ] Bump version numbers if needed (package.json)
- [ ] Push and open a PR: `release/x.y.z → main`

---

## 2. Merge to Main (fast-forward only)

After the release PR is reviewed and approved:

```bash
git checkout main && git pull origin main
git merge --ff-only release/x.y.z
git push origin main
```

> **Must be fast-forward.** A merge commit breaks auto-generated release notes.

---

## 3. Tag the Release

```bash
git tag -a vx.y.z -m "Release vx.y.z"
git push origin vx.y.z
```

Pushing the tag triggers the CI/CD pipeline automatically.

---

## 4. Watch the CI/CD Pipeline

- [ ] Open **Actions** tab: `https://github.com/joshholl/frollz/actions`
- [ ] Confirm `CI / CD` triggered on the tag push
- [ ] Wait for **API — Lint & Test** and **UI — Lint, Type-check & Test** to go green
- [ ] Wait for **Build & Push Images** to complete
- [ ] If any job fails — fix on the release branch, re-merge, re-tag

---

## 5. Merge Release Branch Back to Develop

```bash
git checkout develop && git pull origin develop
git merge --no-ff release/x.y.z
git push origin develop
git push origin --delete release/x.y.z
git branch -d release/x.y.z
```

---

## 6. Publish the Draft Release

- [ ] Go to **Releases** on GitHub
- [ ] Open the draft release created by the tag push
- [ ] Review and edit the auto-generated notes
- [ ] Publish

---

## 7. Deploy on Production Host

- [ ] SSH into the production server
- [ ] Pull the new images and restart:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

---

## 8. Smoke Test

- [ ] Open the app in a browser and confirm it loads
- [ ] Log an entry and verify it saves (exercises API and DB end-to-end)
- [ ] Check logs for errors:

```bash
docker compose logs -f
```

---

## Rollback

If something's wrong, roll back using the previous image SHA tag:

```bash
# Find recent SHA tags in GitHub → Packages → frollz → versions
# Edit docker-compose.yml to pin the image tag to the previous SHA, then:
docker compose up -d
```
