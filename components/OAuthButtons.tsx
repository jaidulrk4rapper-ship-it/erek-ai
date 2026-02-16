"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { FcGoogle } from "react-icons/fc"
import { FaGithub } from "react-icons/fa"

export default function OAuthButtons() {
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null)

  const handleGoogleSignIn = () => {
    setOauthLoading("google")
    signIn("google", { callbackUrl: "/chat" })
  }

  const handleGitHubSignIn = () => {
    setOauthLoading("github")
    signIn("github", { callbackUrl: "/chat" })
  }

  return (
    <div className="space-y-3 mb-6">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={!!oauthLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-[#1e1e1e] hover:bg-white/10 disabled:opacity-70 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
      >
        <FcGoogle className="w-5 h-5 shrink-0" />
        {oauthLoading === "google" ? "Redirecting to Google\u2026" : "Continue with Google"}
      </button>
      <button
        type="button"
        onClick={handleGitHubSignIn}
        disabled={!!oauthLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-[#1e1e1e] hover:bg-white/10 disabled:opacity-70 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
      >
        <FaGithub className="w-5 h-5 shrink-0" />
        {oauthLoading === "github" ? "Redirecting to GitHub\u2026" : "Continue with GitHub"}
      </button>
    </div>
  )
}
