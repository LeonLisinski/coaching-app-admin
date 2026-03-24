'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? 'leon@unitlift.com'

function LoginForm() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('error') === 'unauthorized') {
      toast.error('Pristup odbijen — neautoriziran račun.')
    }
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password,
    })

    if (error) {
      toast.error('Neispravna lozinka.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(1_0_0/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/3%)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="relative w-full max-w-xs px-4 space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logo-unitlift.svg"
            alt="UnitLift"
            width={120}
            height={75}
            className="h-10 w-auto"
            priority
          />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Restricted — Admin only</span>
          </div>
        </div>

        {/* Login card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/20 space-y-5">
          {/* Who is logging in */}
          <div className="flex items-center gap-3 bg-muted/40 border border-border rounded-xl px-3.5 py-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-blue-400">L</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">Leon Lišinski</p>
              <p className="text-xs text-muted-foreground truncate">{ADMIN_EMAIL}</p>
            </div>
            <Lock className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 ml-auto" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                Lozinka
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full font-medium"
              disabled={loading || !password}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Prijava...
                </span>
              ) : 'Prijavi se'}
            </Button>
          </form>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/50">
          admin.unitlift.com · interni alat
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
