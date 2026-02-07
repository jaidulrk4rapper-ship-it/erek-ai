import fs from "fs"

const FILE = "./memory.json"

export function loadMemory() {
  if (!fs.existsSync(FILE)) return []
  return JSON.parse(fs.readFileSync(FILE, "utf8"))
}

export function saveMemory(history: any[]) {
  fs.writeFileSync(FILE, JSON.stringify(history, null, 2))
}
