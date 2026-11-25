import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const item = ({ isActive }: { isActive: boolean }) =>
  'px-2 py-1 rounded ' + (isActive ? 'bg-white/15 font-semibold' : 'text-slate-300')

export default function Layout() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="no-print text-white px-4 py-3" style={{ background: '#0f1a3d' }}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-3 text-sm">
            <NavLink to="/" end className={item}>Panoramica</NavLink>
            <NavLink to="/clienti" className={item}>Clienti</NavLink>
            <NavLink to="/kanban" className={item}>Kanban</NavLink>
            <NavLink to="/interventi" className={item}>Interventi</NavLink>
            <NavLink to="/impostazioni/abbonamenti" className={item}>Impostazioni</NavLink>
            <NavLink to="/nuovo" className={item}>+ Nuovo</NavLink>
          </nav>
          <button type="button" onClick={async () => { await supabase.auth.signOut(); navigate('/login') }} className="text-sm text-slate-300">Esci</button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  )
}
