// src/components/LoginScreen.jsx
import { useState } from 'react'
import { supabase, setRemember } from '../logic/supabase.js'
import { Logo } from './widgets.jsx'

export default function LoginScreen({ theme, setTheme }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [remember, setRem] = useState(true)
  const inp = 'w-full px-3 py-2.5 bg-[var(--field)] border border-[color:var(--bd)] rounded-lg text-[color:var(--strong)] text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 mb-3'
  const act = async (mode) => {
    if (!email.trim() || !pw) { setMsg('Isi email & password dulu.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMsg('Format email tidak valid.'); return }
    if (pw.length < 6) { setMsg('Password minimal 6 karakter.'); return }
    setRemember(remember)
    setBusy(true); setMsg('')
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
      if (error) setMsg(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pw })
      if (error) setMsg(error.message)
      else if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setMsg('Email ini sudah terdaftar. Silakan klik "Masuk".')
      } else {
        setMsg('Akun dibuat! Cek email kamu, klik link konfirmasi, baru klik "Masuk".')
      }
    }
    setBusy(false)
  }
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <button onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-[var(--surface)] border border-[color:var(--bd)] text-[color:var(--muted)] flex items-center justify-center text-base" title="Ganti tema">
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Logo size={56} />
          <h1 className="text-xl font-bold mt-3 text-[color:var(--strong)]">Ads Performance Explainer</h1>
          <p className="text-[color:var(--muted)] text-sm text-center mt-1.5 max-w-xs">Masukkan metrik iklanmu, langsung tahu masalah &amp; untung-ruginya — tanpa perlu jago angka.</p>
        </div>
        <div className="bg-[var(--surface)] border border-[color:var(--bd)] rounded-2xl p-6 shadow-xl">
          <input className={inp} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={inp} type="password" placeholder="Password (min. 6 karakter)" value={pw} onChange={(e) => setPw(e.target.value)} />
          <label className="flex items-center gap-2 mb-3 text-sm text-[color:var(--muted)] cursor-pointer select-none">
            <input type="checkbox" checked={remember} onChange={(e) => setRem(e.target.checked)} className="accent-indigo-600 w-4 h-4" />
            Ingat saya di perangkat ini
          </label>
          {msg && <p className="text-sm text-[color:var(--warn)] mb-3">{msg}</p>}
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => act('in')} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold disabled:opacity-50">Masuk</button>
            <button disabled={busy} onClick={() => act('up')} className="flex-1 py-2.5 bg-[var(--field)] border border-[color:var(--bd)] text-[color:var(--strong)] hover:border-indigo-500 rounded-xl font-semibold disabled:opacity-50">Daftar</button>
          </div>
        </div>
        <p className="text-center text-[color:var(--faint)] text-xs mt-4">Gratis untuk mulai &middot; Data tersimpan aman di akunmu</p>
      </div>
    </div>
  )
}
