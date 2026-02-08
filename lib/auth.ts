import NextAuth, { type Account, type AuthOptions, type DefaultSession } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { getDb } from "./db"
import crypto from "crypto"

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & { id?: string }
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex")
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const db = await getDb()
        const user = await db.get<{
          id: string
          email: string
          name: string
          password_hash: string
          salt: string
        }>("SELECT * FROM users WHERE email = ?", credentials.email.toLowerCase().trim())

        if (!user) return null

        const hash = hashPassword(credentials.password, user.salt)
        if (hash !== user.password_hash) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async signIn({ user, account }: { user: { email?: string | null; name?: string | null }; account: Account | null }) {
      if (account?.provider === "google" || account?.provider === "github") {
        const db = await getDb()
        const existing = await db.get<{ id: string }>(
          "SELECT id FROM users WHERE email = ?",
          user.email!.toLowerCase().trim()
        )
        if (!existing) {
          await db.run(
            "INSERT INTO users (id, email, name, provider, created_at) VALUES (?, ?, ?, ?, ?)",
            crypto.randomUUID(),
            user.email!.toLowerCase().trim(),
            user.name || "User",
            account.provider,
            Date.now()
          )
        }
      }
      return true
    },
    async session({ session, token }) {
      if (session?.user && token?.sub) {
        session.user.id = token.sub
      }
      if (session?.user && token?.email) {
        const db = await getDb()
        const dbUser = await db.get<{ id: string }>(
          "SELECT id FROM users WHERE email = ?",
          String(token.email).toLowerCase().trim()
        )
        if (dbUser) session.user.id = dbUser.id
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
