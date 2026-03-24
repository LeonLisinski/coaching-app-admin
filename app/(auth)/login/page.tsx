'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, ShieldCheck, Smartphone } from 'lucide-react'
import { toast } from 'sonner'

type Step = 'credentials' | 'mfa'

function LoginForm() {
  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaData, setMfaData] = useState<{ factorId: string; challengeId: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('error') === 'unauthorized') {
      toast.error('Pristup odbijen.')
    }
  }, [searchParams])

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error ?? 'Neispravni podaci.')
      setLoading(false)
      return
    }

    if (data.mfaRequired) {
      setMfaData({ factorId: data.factorId, challengeId: data.challengeId })
      setStep('mfa')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault()
    if (!mfaCode || !mfaData) return
    setLoading(true)

    const res = await fetch('/api/auth/verify-mfa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...mfaData, code: mfaCode }),
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error ?? 'Neispravan kod.')
      setMfaCode('')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(1_0_0/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/3%)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="relative w-full max-w-xs px-4 space-y-8">
        <div className="flex flex-col items-center gap-3">
          <Image src="/logo-unitlift.svg" alt="UnitLift" width={120} height={75} className="h-10 w-auto" priority />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Restricted — Admin only</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/20 space-y-5">
          {step === 'credentials' ? (
            <>
              <div className="text-center">
                <p className="text-sm font-medium">Admin prijava</p>
                <p className="text-xs text-muted-foreground mt-0.5">Unesi email i lozinku</p>
              </div>
              <form onSubmit={handleCredentials} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@domena.com"
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-medium text-muted-foreground">Lozinka</label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
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
                <Button type="submit" className="w-full" disabled={loading || !email || !password}>
                  {loading ? <Spinner /> : 'Prijavi se'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center space-y-1">
                <div className="flex justify-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
                <p className="text-sm font-medium">Dvofaktorska provjera</p>
                <p className="text-xs text-muted-foreground">Unesi 6-znamenkasti kod iz Google Authenticatora</p>
              </div>
              <form onSubmit={handleMfa} className="space-y-4">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9 ]*"
                  maxLength={7}
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="000000"
                  required
                  autoFocus
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                />
                <Button type="submit" className="w-full" disabled={loading || mfaCode.length < 6}>
                  {loading ? <Spinner /> : 'Potvrdi'}
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setMfaCode('') }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Natrag
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground/50">
          admin.unitlift.com · interni alat
        </p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span className="flex items-center gap-2">
      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      Učitavanje...
    </span>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
