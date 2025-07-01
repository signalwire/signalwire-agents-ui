import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoginPage } from '@/pages/Login'
import { AgentsPage } from '@/pages/Agents'
import { AgentBuilderPage } from '@/pages/AgentBuilder'
import { AdminPage } from '@/pages/Admin'
import { SkillsMarketplacePage } from '@/pages/SkillsMarketplace'
import { CallSummariesPage } from '@/pages/CallSummaries'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/theme-provider'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="signalwire-theme">
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
          
          <Route
            path="/agents/new"
            element={
              <ProtectedRoute>
                <AgentBuilderPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/agents/:id/edit"
            element={
              <ProtectedRoute>
                <AgentBuilderPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/agents/:agentId/summaries"
            element={
              <ProtectedRoute>
                <CallSummariesPage />
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
          />
          
          <Route
            path="/skills"
            element={
              <ProtectedRoute>
                <SkillsMarketplacePage />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App