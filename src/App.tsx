import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Layout from './components/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import NuovoCliente from './pages/NuovoCliente'
import ClientDetail from './pages/ClientDetail'
import ModificaCliente from './pages/ModificaCliente'
import Kanban from './pages/Kanban'
import Interventi from './pages/Interventi'

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="p-10 text-center">Caricamento...</div>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={session ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Home />} />
          <Route path="clienti" element={<Dashboard />} />
          <Route path="nuovo-cliente" element={<NuovoCliente />} />
          <Route path="client/:id" element={<ClientDetail />} />
          <Route path="client/:id/modifica" element={<ModificaCliente />} />
          <Route path="kanban" element={<Kanban />} />
          <Route path="interventi" element={<Interventi />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}