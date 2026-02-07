# ollama.erek.app — Debug checklist

---

## Option A: Quick tunnel (DNS ki zaroorat nahi, turant URL)

Agar `ollama.erek.app` abhi nahi chal raha aur tumhe jaldi test karna hai:

1. **Ek terminal kholo**, ye chalao (config file use nahi hoga):
   ```powershell
   & "C:\tools\cloudflared\cloudflared.exe" tunnel --url http://localhost:11434
   ```
2. Output me ek line aayegi: **`https://something-random.trycloudflare.com`** — ye copy karo.
3. Test:
   ```powershell
   curl.exe -v https://PASTE-YOUR-URL-HERE/api/tags
   ```
4. Vercel me **OLLAMA_URL** = wohi URL (e.g. `https://xyz.trycloudflare.com`) set karo, redeploy.

**Note:** Har baar tunnel restart karoge to naya random URL milega; Vercel env phir se update karna padega. Permanent URL ke liye Option B (ollama.erek.app) fix karo.

---

## Option B: ollama.erek.app fix karo (permanent URL)

Agar `curl.exe https://ollama.erek.app/api/tags` nahi chal raha:

---

## 1. Local Ollama chal raha hai?

```powershell
curl.exe http://localhost:11434/api/tags
```

- **Agar JSON aaye** → Ollama theek hai. Step 2 pe jao.
- **Agar error** → Ollama start karo (Windows pe usually service se chal jata hai; ya `ollama serve`).

---

## 2. Tunnel (cloudflared) chal raha hai?

Task Manager me **cloudflared.exe** dikhna chahiye, ya ek terminal me ye command chal raha hona chahiye:

```powershell
& "C:\tools\cloudflared\cloudflared.exe" tunnel run f132c74e-0c11-40c9-8d84-d1c75535f0ee
```

- **Nahi chal raha** → Upar wala command run karo. Terminal band mat karo; tunnel tab tak chalega.
- **Chal raha hai** → Step 3.

---

## 3. DNS resolve ho raha hai?

```powershell
nslookup ollama.erek.app
```

- **Address dikhe (e.g. 104.x.x.x)** → DNS theek. Step 4.
- **"Could not resolve"** → Cloudflare me **ollama.erek.app** ka record add karna padega:
  - Cloudflare Dashboard → Domain (erek.app) → **DNS** → Add record:
  - Type: **CNAME**
  - Name: **ollama**
  - Target: **f132c74e-0c11-40c9-8d84-d1c75535f0ee.cfargotunnel.com**
  - Proxy: Proxied (orange cloud)
  - Save. 1–2 min wait karke dubara `nslookup ollama.erek.app` chalao.

---

## 4. Tunnel me hostname add hai?

Cloudflare Zero Trust / Dashboard → **Networks** → **Tunnels** → tunnel **f132c74e-...** → **Public Hostname**:

- **Subdomain:** ollama  
- **Domain:** erek.app  
- **Service:** http://localhost:11434  

Agar ye entry nahi hai to Add karo. Isse hi `ollama.erek.app` → tumhara tunnel → localhost:11434 jata hai.

---

## 5. Config file sahi hai?

Check karo: `C:\Users\Sera\.cloudflared\config.yml`

- `tunnel: f132c74e-0c11-40c9-8d84-d1c75535f0ee`
- `hostname: ollama.erek.app`
- `service: http://localhost:11434`

Agar galat ho to fix karke tunnel **restart** karo (cloudflared band karo, phir dubara `tunnel run`).

---

## Quick test order

| Step | Command / Check |
|------|------------------|
| A | `curl.exe http://localhost:11434/api/tags` → local Ollama |
| B | Tunnel process chal raha hai? (Task Manager / terminal) |
| C | `nslookup ollama.erek.app` → DNS |
| D | Cloudflare Tunnel → Public Hostname ollama.erek.app → localhost:11434 |

Jis step pe fail ho, wahi pe fix karo; phir `curl.exe https://ollama.erek.app/api/tags` dubara chalao.
