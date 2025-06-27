import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoginPage } from '@/pages/Login'
import { AgentsPage } from '@/pages/Agents'
// import { AgentBuilderPage } from '@/pages/AgentBuilder'
// import { AdminPage } from '@/pages/Admin'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/agents" replace />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/agents"
          element={
            <ProtectedRoute>
              <AgentsPage />
            </ProtectedRoute>
          }
        />
        
        {/* TODO: Add these routes */}
        {/* <Route
          path="/agents/new"
          element={
            <ProtectedRoute>
              <AgentBuilderPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/agents/:id"
          element={
            <ProtectedRoute>
              <AgentBuilderPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        /> */}
      </Routes>
    </AuthProvider>
  )
}

export default App