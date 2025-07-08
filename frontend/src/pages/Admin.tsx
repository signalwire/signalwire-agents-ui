import { useState } from 'react'
import { Settings, Key, Shield, Database, Languages, Variable, FolderOpen } from 'lucide-react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GlobalSettings } from '@/components/admin/GlobalSettings'
import { TokenManagement } from '@/components/admin/TokenManagement'
import { SecuritySettings } from '@/components/admin/SecuritySettings'
import { SystemInfo } from '@/components/admin/SystemInfo'
import { VoiceLanguageSettings } from '@/components/admin/VoiceLanguageSettings'
import { EnvVarsTab } from '@/components/admin/EnvVarsTab'
import { MediaLibraryTab } from '@/components/admin/MediaLibraryTab'

export function AdminPage() {
  const [activeTab, setActiveTab] = useState('settings')

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-heading-primary">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage system settings, tokens, and security configuration
          </p>
        </div>

        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-auto p-1 flex flex-wrap gap-1">
            <TabsTrigger value="settings" className="flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="voice-language" className="flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm">
              <Languages className="h-4 w-4" />
              <span className="hidden sm:inline">Voice & Language</span>
            </TabsTrigger>
            <TabsTrigger value="env-vars" className="flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm">
              <Variable className="h-4 w-4" />
              <span className="hidden sm:inline">Env Vars</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Media</span>
            </TabsTrigger>
            <TabsTrigger value="tokens" className="flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Tokens</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-6">
            <GlobalSettings />
          </TabsContent>

          <TabsContent value="voice-language" className="mt-6">
            <VoiceLanguageSettings />
          </TabsContent>

          <TabsContent value="env-vars" className="mt-6">
            <EnvVarsTab />
          </TabsContent>

          <TabsContent value="media" className="mt-6">
            <MediaLibraryTab />
          </TabsContent>

          <TabsContent value="tokens" className="mt-6">
            <TokenManagement />
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <SecuritySettings />
          </TabsContent>

          <TabsContent value="system" className="mt-6">
            <SystemInfo />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}