'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ShieldCheck, ShieldOff, Smartphone, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  hasVerifiedTotp: boolean
  isAal2: boolean
}

type SetupStep = 'idle' | 'scanning' | 'confirming' | 'done'

export function SetupMfaClient({ hasVerifiedTotp, isAal2 }: Props) {
  const [step, setStep] = useState<SetupStep>('idle')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function startSetup() {
    setLoading(true)
    const res = await fetch('/api/auth/setup-mfa')
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error ?? 'Greška pri pokretanju 2FA.')
      setLoading(false)
      return
    }

    setQrCode(data.qrCode)
    setSecret(data.secret)
    setFactorId(data.factorId)
    setStep('scanning')
    setLoading(false)
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId || code.length < 6) return
    setLoading(true)

    const res = await fetch('/api/auth/setup-mfa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factorId, code }),
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error ?? 'Neispravan kod.')
      setCode('')
      setLoading(false)
      return
    }

    toast.success('2FA je uspješno aktiviran!')
    setStep('done')
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Postavke</h1>
        <p className="text-muted-foreground text-sm mt-1">Sigurnost admin računa</p>
      </div>

      {/* Status card */}
      <Card className={hasVerifiedTotp || step === 'done'
        ? 'border-emerald-500/30 bg-emerald-500/5'
        : 'border-yellow-500/20 bg-yellow-500/5'}>
        <CardContent className="flex items-center gap-4 py-4">
          {hasVerifiedTotp || step === 'done' ? (
            <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
          ) : (
            <ShieldOff className="w-8 h-8 text-yellow-400 shrink-0" />
          )}
          <div>
            <p className="font-semibold text-sm">
              {hasVerifiedTotp || step === 'done' ? '2FA je aktivan ✓' : '2FA nije aktivan'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasVerifiedTotp || step === 'done'
                ? 'Svaki login zahtijeva kod iz Google Authenticatora.'
                : 'Preporučujemo aktivaciju za maksimalnu sigurnost.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sigurnosne razine */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sigurnosni slojevi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Email + lozinka', desc: 'Oba nepoznata napadaču — server validacija', ok: true },
            { label: 'Rate limiting', desc: 'Max 5 pokušaja / 15 minuta po IP adresi', ok: true },
            { label: 'Middleware provjera', desc: 'Svaki request provjerava identitet', ok: true },
            { label: '2FA (Google Authenticator)', desc: 'Kod s mobitela + lozinka + email', ok: hasVerifiedTotp || step === 'done' },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3">
              {item.ok
                ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                : <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />}
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Setup 2FA */}
      {!hasVerifiedTotp && step !== 'done' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Aktiviraj 2FA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 'idle' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Skeniraj QR kod s Google Authenticatorom. Nakon toga, svaki login zahtijeva
                  email + lozinka + 6-znamenkasti kod koji se mijenja svake 30 sekundi.
                </p>
                <Button onClick={startSetup} disabled={loading} className="w-full">
                  {loading ? 'Generiranje...' : 'Počni postavljanje 2FA'}
                </Button>
              </div>
            )}

            {step === 'scanning' && qrCode && (
              <div className="space-y-4">
                <p className="text-sm font-medium">1. Skeniraj QR kod u Google Authenticatoru:</p>
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-xl">
                    <Image src={qrCode} alt="2FA QR kod" width={180} height={180} unoptimized />
                  </div>
                </div>
                {secret && (
                  <div className="bg-muted/40 border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Ili unesi ručno (secret key):</p>
                    <p className="font-mono text-xs tracking-widest break-all select-all">{secret}</p>
                  </div>
                )}
                <p className="text-sm font-medium">2. Unesi kod koji pokazuje Authenticator:</p>
                <form onSubmit={confirmSetup} className="space-y-3">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="000000"
                    autoFocus
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                  />
                  <Button type="submit" className="w-full" disabled={loading || code.length < 6}>
                    {loading ? 'Provjera...' : 'Aktiviraj 2FA'}
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(hasVerifiedTotp || step === 'done') && (
        <Card className="border-emerald-500/20">
          <CardContent className="py-4 text-center text-sm text-emerald-400">
            ✓ Sljedeći put kad se loginaš, tražit će kod iz Google Authenticatora.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
