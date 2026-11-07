"use client"
import { useEffect, type ReactNode } from "react"
import dynamic from "next/dynamic"

const Brainstorm = dynamic(() => import("./brainstorm"), { ssr: false })
const LibrarySpace = dynamic(() => import("./library-space"), { ssr: false })
const ToolsHub = dynamic(() => import("./tools-hub"), { ssr: false })
const Schedule = dynamic(() => import("./schedule"), { ssr: false })
const ChatInterface = dynamic(() => import("./chat-interface"), { ssr: true })
const Cowork = dynamic(() => import("./cowork"), { ssr: true })
const Profile = dynamic(() => import("./profile-screen"), { ssr: false })
const AuthScreen = dynamic(() => import("./auth-screen"), { ssr: false })

export type ReferenceView = "cowork" | "chat" | "brainstorm" | "schedule" | "space" | "utility" | "profile" | "auth"
type Props = {
  view: ReferenceView
  onUploadFile: () => void
  registerAuth: boolean
  onAuthModeChange: (register: boolean) => void
  userName: string
  avatarImage: string
  avatarFallback: string
  onView: (view: ReferenceView) => void
  onAppBack: () => void
  onEditProfile: (name: string) => void
  onEditAvatar: (file: File) => void
  onLogout: () => void
  notifications: boolean
  onChangeNotifications: (enabled: boolean) => void
}
export default function ReferenceScreens(props: Props) {
  const { view, onView, userName, avatarImage, avatarFallback } = props
  useEffect(() => { if (view !== "chat") window.scrollTo(0, 0) }, [view])
  let content: ReactNode
  if (view === "cowork") content = <Cowork />
  else if (view === "chat") content = <ChatInterface />
  else if (view === "brainstorm") content = <Brainstorm />
  else if (view === "schedule") content = <Schedule />
  else if (view === "space") content = <LibrarySpace />
  else if (view === "utility") content = <ToolsHub onUpload={props.onUploadFile} onOpenLibrary={() => onView("space")} />
  else if (view === "auth") content = <AuthScreen onBack={props.onAppBack} initialRegister={props.registerAuth} onModeChange={props.onAuthModeChange} />
  else content = <Profile name={userName} avatarImage={avatarImage} avatarFallback={avatarFallback} onEdit={props.onEditProfile} onEditAvatar={props.onEditAvatar} onLogin={() => onView("auth")}
    onView={onView} notifications={props.notifications} onChangeNotifications={props.onChangeNotifications} onLogout={props.onLogout} />
  return <main className={"ref-app ref-view-" + view}>{content}</main>
}
