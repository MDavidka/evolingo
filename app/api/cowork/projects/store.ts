import fs from "fs"
import path from "path"

const DATA_FILE = path.join(process.cwd(), "data", "cowork-projects.json")

export interface ProjectRecord {
  id: string
  name: string
  machineId: string
  machineName: string
  branch: string
  folderName: string
  folderPath: string
  section: "Today" | "Yesterday" | "Previous 7 days" | "Older"
  statusText: string
  isConnected: boolean
  lastActiveText: string
  createdAt: string
  updatedAt: string
  conversationId?: string
  isArchived?: boolean
}

const DEFAULT_PROJECTS: ProjectRecord[] = [
  {
    id: "task-today-1",
    name: "Add Google to Redisghn popup",
    machineId: "ubuntu-vps",
    machineName: "Ubuntu VPS",
    branch: "main",
    folderName: "root",
    folderPath: "/root/evolingo",
    section: "Today",
    statusText: "Ubuntu VPS · main",
    isConnected: true,
    lastActiveText: "Today",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-yesterday-1",
    name: "Recreate this library Ui",
    machineId: "ubuntu-vps",
    machineName: "Ubuntu VPS",
    branch: "main",
    folderName: "root",
    folderPath: "/root/evolingo",
    section: "Yesterday",
    statusText: "Ubuntu VPS · main",
    isConnected: true,
    lastActiveText: "Yesterday",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "task-prev7-1",
    name: "Complete this",
    machineId: "ubuntu-vps",
    machineName: "Ubuntu VPS",
    branch: "main",
    folderName: "root",
    folderPath: "/root/evolingo",
    section: "Previous 7 days",
    statusText: "Ubuntu VPS · main",
    isConnected: true,
    lastActiveText: "Previous 7 days",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "task-prev7-2",
    name: "Ideiglenes fájlmegosztó készítése",
    machineId: "ubuntu-vps",
    machineName: "Ubuntu VPS",
    branch: "main",
    folderName: "root",
    folderPath: "/root/evolingo",
    section: "Previous 7 days",
    statusText: "Ubuntu VPS · main",
    isConnected: true,
    lastActiveText: "Previous 7 days",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "task-prev7-3",
    name: "Download Antigravity and Guide Login",
    machineId: "ubuntu-vps",
    machineName: "Ubuntu VPS",
    branch: "main",
    folderName: "root",
    folderPath: "/root/evolingo",
    section: "Previous 7 days",
    statusText: "Ubuntu VPS · main",
    isConnected: true,
    lastActiveText: "Previous 7 days",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
]

export function readProjects(): ProjectRecord[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_PROJECTS, null, 2), "utf8")
      return DEFAULT_PROJECTS
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8")
    return JSON.parse(raw)
  } catch (err) {
    console.error("Failed to read projects data file:", err)
    return DEFAULT_PROJECTS
  }
}

export function writeProjects(projects: ProjectRecord[]): void {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
    fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2), "utf8")
  } catch (err) {
    console.error("Failed to write projects data file:", err)
  }
}
