import { useEffect, useState, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useBackend } from '@/contexts/BackendContext';

interface AgentChange {
  id: string;
  name: string;
  updated_at: string;
  updated_by: string;
  version: number;
  is_own_change: boolean;
}

interface ChangeEvent {
  changes: AgentChange[];
  total_count: number;
  since: string;
  current_time: string;
}

export function useAgentChanges() {
  const [hasChanges, setHasChanges] = useState(false);
  const [changeCount, setChangeCount] = useState(0);
  const [recentChanges, setRecentChanges] = useState<AgentChange[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { toast } = useToast();
  const { setConnected, buildVersion, setBuildVersion } = useBackend();
  
  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    // Create new SSE connection
    const eventSource = new EventSource('/api/changes/stream', {
      withCredentials: true
    });
    
    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      console.log('SSE Connected:', data);
      setConnected(true);
      
      // Check if build version changed
      if (data.build_version && buildVersion && data.build_version !== buildVersion) {
        // Backend has been updated, reload the page
        toast({
          title: "Update Available",
          description: "New version detected. Reloading...",
          duration: 2000,
        });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else if (data.build_version) {
        // Store the build version if we don't have one yet
        setBuildVersion(data.build_version);
      }
    });
    
    eventSource.addEventListener('agent-changes', (event) => {
      const data: ChangeEvent = JSON.parse(event.data);
      
      // Filter out own changes
      const othersChanges = data.changes.filter(change => !change.is_own_change);
      
      if (othersChanges.length > 0) {
        setHasChanges(true);
        setChangeCount(prev => prev + othersChanges.length);
        setRecentChanges(prev => [...othersChanges, ...prev].slice(0, 10));
        
        // Show toast for first change
        const firstChange = othersChanges[0];
        toast({
          title: "Agent Updated",
          description: `${firstChange.name} was modified by another user`,
          duration: 5000,
        });
      }
    });
    
    eventSource.addEventListener('error', (event) => {
      console.error('SSE Error:', event);
      setConnected(false);
      // Reconnect after 5 seconds
      setTimeout(() => {
        if (eventSourceRef.current === eventSource) {
          connect();
        }
      }, 5000);
    });
    
    eventSourceRef.current = eventSource;
  }, [toast, setConnected, buildVersion, setBuildVersion]);
  
  useEffect(() => {
    connect();
    
    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);
  
  const clearChanges = useCallback(() => {
    setHasChanges(false);
    setChangeCount(0);
    setRecentChanges([]);
  }, []);
  
  return {
    hasChanges,
    changeCount,
    recentChanges,
    clearChanges
  };
}