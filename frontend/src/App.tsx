import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoginPage } from '@/pages/Login'
import { AgentsPage } from '@/pages/Agents'
import { AgentBuilderPage } from '@/pages/AgentBuilder'
import { AdminPage } from '@/pages/Admin'
import { SkillsMarketplacePage } from '@/pages/SkillsMarketplace'
import { CallSummariesPage } from '@/pages/CallSummaries'
import { AllCallSummariesPage } from '@/pages/AllCallSummaries'
import { KnowledgeBasesPage } from '@/pages/KnowledgeBases'
import { KnowledgeBaseDetailPage } from '@/pages/KnowledgeBaseDetail'
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
            path="/call-summaries"
            element={
              <ProtectedRoute>
                <AllCallSummariesPage />
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
          
          <Route
            path="/knowledge-bases"
            element={
              <ProtectedRoute>
                <KnowledgeBasesPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/knowledge-bases/new"
            element={
              <ProtectedRoute>
                <KnowledgeBaseDetailPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/knowledge-bases/:id"
            element={
              <ProtectedRoute>
                <KnowledgeBaseDetailPage />
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