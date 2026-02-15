# Claude Code — Project analyse / fix kaise karwayein

## 1. Project Claude Code mein kholna

- **Claude Code** open karo (app ya Cursor ke andar Claude).
- **File → Open Folder** (ya **Open Project**) se apna project folder select karo:  
  `D:\erek_ai_v0` (ya jahan bhi repo hai).
- Ab Claude ko **poora project** dikh raha hai — yahi “project dena” hai.

## 2. Context dena (analyse / fix ke liye)

Claude ko ye batao:

- **“Is project ko analyse karo”** — repo structure, tech stack, main files.
- **“Vercel build error fix karo”** — error message ya file name batao (e.g. `lib/auth.ts`).
- **“MCP servers is project ke liye setup karo”** — already `.cursor/mcp.json` hai; agar change chahiye to batao.

**Tips:**

- **@ mention:** Koi file open karke `@filename` ya `@folder` mention karo — us file/folder ka context Claude ko mil jata hai.
- **Error paste karo:** Vercel logs / terminal error copy karke chat mein paste karo — Claude exact line/file bata sakta hai.
- **Task clear likho:**  
  - “lib/auth.ts mein NextAuth type error fix karo”  
  - “Build pass karo aur batao kya change kiya”

## 3. MCP use karna (optional)

- Project mein **`.cursor/mcp.json`** hai — isse Cursor/Claude **fetch** aur **filesystem** use kar sakta hai.
- Claude Code mein agar MCP support ho to same config use ho sakti hai; project open karke tools available honge (docs fetch, files read).

## 4. Fix ke baad verify karna

- **Local build:**  
  `npm run build`  
  (yahi error ab fix ho chuka hai.)
- **Vercel:**  
  `git add . && git commit -m "Fix auth and db types" && git push origin master`  
  Phir Vercel deployments page se naya deployment check karo.

---

**Short:** Project = folder open karo → Claude ko task batao (analyse / fix / MCP) → error ya file @ mention karo → fix ke baad `npm run build` aur push se verify karo.
