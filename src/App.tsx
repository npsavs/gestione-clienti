import ModificaCliente from './pages/ModificaCliente'
import ClientDetail from './pages/ClientDetail'
import NuovoCliente from './pages/NuovoCliente'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Caricamento...
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/" />}
        />
        <Route
          path="/"
          element={session ? <Layout /> : <Navigate to="/login" />}
        >
          <Route path="nuovo-cliente" element={<NuovoCliente />} />
<Route path="client/:id" element={<ClientDetail />} />          
<Route index element={<Dashboard />} />
<Route path="client/:id/modifica" element={<ModificaCliente />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App