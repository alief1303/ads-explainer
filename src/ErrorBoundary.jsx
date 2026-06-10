// src/ErrorBoundary.jsx
// Jaring pengaman: kalau ada error runtime, tampilkan pesan + tombol reload,
// bukan layar blank putih. Pakai inline style biar tetap jalan walau CSS gagal.
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('App error:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', background: '#0f1115', color: '#e6e8ec' }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Ups, ada yang error</h1>
            <p style={{ fontSize: 14, color: '#9aa1ad', margin: '0 0 16px' }}>Coba muat ulang halaman. Kalau masih bermasalah, kabari kami.</p>
            <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 0, borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Muat ulang</button>
            <pre style={{ marginTop: 16, fontSize: 11, color: '#6b7280', whiteSpace: 'pre-wrap', textAlign: 'left', maxHeight: 120, overflow: 'auto' }}>{String(this.state.error?.message || this.state.error)}</pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
