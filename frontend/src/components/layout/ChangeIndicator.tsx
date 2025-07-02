import { RefreshCw, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAgentChanges } from '@/hooks/useAgentChanges';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function ChangeIndicator() {
  const { hasChanges, changeCount, recentChanges, clearChanges } = useAgentChanges();
  const navigate = useNavigate();
  
  const handleRefresh = () => {
    // Reload the current page
    window.location.reload();
  };
  
  const handleViewAll = () => {
    clearChanges();
    navigate('/agents');
  };
  
  if (!hasChanges) {
    return null;
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative animate-pulse"
          title="Changes detected"
        >
          <Bell className="h-5 w-5" />
          {changeCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {changeCount > 9 ? '9+' : changeCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Recent Changes</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-7 px-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {recentChanges.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No recent changes
          </div>
        ) : (
          <>
            {recentChanges.slice(0, 5).map((change) => (
              <DropdownMenuItem
                key={`${change.id}-${change.updated_at}`}
                className="flex flex-col items-start p-3 cursor-pointer"
                onClick={() => navigate(`/agents/${change.id}/edit`)}
              >
                <div className="font-medium">{change.name}</div>
                <div className="text-xs text-muted-foreground">
                  Modified {format(new Date(change.updated_at), 'MMM d, h:mm a')}
                </div>
              </DropdownMenuItem>
            ))}
            
            {recentChanges.length > 5 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-center cursor-pointer"
                  onClick={handleViewAll}
                >
                  View all changes ({recentChanges.length})
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}