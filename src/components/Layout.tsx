import { Outlet, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Layout() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Gestione Clienti
          </Link>

          <button
            onClick={handleLogout}
            className="text-sm text-slate-600 hover:text-red-600 transition-colors"
          >
            Esci
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}