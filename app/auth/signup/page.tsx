"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi"
import { FcGoogle } from "react-icons/fc"
import { FaGithub } from "react-icons/fa"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null)
  const router = useRouter()

  const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}/chat` : "/chat"

  const handleGoogleSignIn = () => {
    setOauthLoading("google")
    signIn("google", { callbackUrl })
  }

  const handleGitHubSignIn = () => {
    setOauthLoading("github")
    signIn("github", { callbackUrl })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create account")
        return
      }

      // Auto login after signup
      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (loginRes?.error) {
        router.push("/auth/login")
      } else {
        router.push("/chat")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">EreK</h1>
          <p className="text-gray-400 text-sm">Create your account</p>
        </div>

        {/* Card */}
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-8 shadow-xl">
          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={!!oauthLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-[#1e1e1e] hover:bg-white/10 disabled:opacity-70 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              <FcGoogle className="w-5 h-5 shrink-0" />
              {oauthLoading === "google" ? "Redirecting to Google…" : "Continue with Google"}
            </button>
            <button
              type="button"
              onClick={handleGitHubSignIn}
              disabled={!!oauthLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-[#1e1e1e] hover:bg-white/10 disabled:opacity-70 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              <FaGithub className="w-5 h-5 shrink-0" />
              {oauthLoading === "github" ? "Redirecting to GitHub…" : "Continue with GitHub"}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500 uppercase">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-[#1e1e1e] text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              />
            </div>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-[#1e1e1e] text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              />
            </div>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                required
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-white/10 bg-[#1e1e1e] text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-[#1e1e1e] text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-medium transition-colors disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{" "}
            <a href="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
