# Mosen — AI Change Partner Prototype

## Deploy to Vercel (5 minutes)

### Step 1: Push to GitHub
1. Create a new repo on GitHub (can be private)
2. Push this folder to it:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/mosen.git
   git push -u origin main
   ```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in (free account works)
2. Click **Add New → Project**
3. Import your GitHub repo
4. Under **Environment Variables**, add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your actual API key (starts with `sk-ant-...`)
5. Click **Deploy**

That's it. Your app will be live at `https://mosen-xxx.vercel.app`

### Run Locally
```bash
npm install
cp .env.example .env.local
# Edit .env.local and paste your API key
npm run dev
```
Open http://localhost:3000

## How it works
The frontend calls `/api/chat` (a Next.js Route Handler) instead of Anthropic directly.
That route handler adds the API key from the environment and proxies the request.
This means your API key is **never exposed** to the browser.
