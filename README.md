# Voyage Budget Calculator

Static travel budget calculator prepared for Vercel deployment.

## Files

- `index.html`: app structure
- `styles.css`: visual design and responsive layout
- `script.js`: budget calculator logic and localStorage
- `vercel.json`: Vercel behavior

## Recommended flow

1. Create a GitHub repository.
2. Push this folder to GitHub.
3. Import the repository into Vercel.
4. Deploy and open the generated `vercel.app` URL on your phone.

## Push to GitHub

Run these commands in this folder after you create an empty GitHub repo:

```bash
git add .
git commit -m "Create portfolio site"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Deploy to Vercel

1. Open Vercel and create a new project.
2. Import your GitHub repository.
3. Use the `Other` framework preset.
4. Leave build and output settings empty for this static site.
5. Deploy.

## Open On Phone

After deployment:

1. Open the Vercel project.
2. Copy the `https://...vercel.app` URL.
3. Send the URL to yourself with Line, iMessage, email, or any chat app.
4. Open the link on your phone.
5. If you want the same budget data on both devices, use export/import.

## Notes

- This app saves budget data in the browser using localStorage.
- Data saved on your laptop browser will not automatically appear on your phone browser unless you export and import the JSON file.
- Use `匯出資料` on one device and `匯入資料` on the other device to move the same budget plan across devices.
