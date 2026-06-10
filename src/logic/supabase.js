// src/logic/supabase.js
// Koneksi ke Supabase (backend: login + database Riwayat).
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY

// "Ingat saya": kalau dicentang -> localStorage (permanen).
// Kalau tidak -> sessionStorage (hilang saat browser ditutup).
const remembered = () => {
  try { return localStorage.getItem('ape_remember') !== '0' } catch { return true }
}
const pick = () => (remembered() ? window.localStorage : window.sessionStorage)

const hybridStorage = {
  getItem: (k) => { try { return pick().getItem(k) } catch { return null } },
  setItem: (k, v) => { try { pick().setItem(k, v) } catch {} },
  removeItem: (k) => {
    try { window.localStorage.removeItem(k) } catch {}
    try { window.sessionStorage.removeItem(k) } catch {}
  },
}

export const supabase = createClient(url, key, {
  auth: {
    storage: hybridStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Dipanggil sebelum login untuk menyetel preferensi "ingat saya".
export function setRemember(on) {
  try { localStorage.setItem('ape_remember', on ? '1' : '0') } catch {}
}
