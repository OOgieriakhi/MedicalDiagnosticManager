import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Permission, hasPermission, hasAnyPermission } from "@/lib/rbac-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

interface PermissionGuardProps {
  children: ReactNode;
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showFallback?: boolean;
}

export function PermissionGuard({
  children,
  requiredPermission,
  requiredPermissions = [],
  requireAll = false,
  fallback,
  showFallback = true
}: PermissionGuardProps) {
  const { user } = useAuth();

  // If no user is authenticated, don't show anything
  if (!user) {
    return null;
  }

  // Get user permissions from user object
  const userPermissions = user.permissions || [];

  // Check single permission
  if (requiredPermission) {
    const hasAccess = hasPermission(userPermissions, requiredPermission);
    if (!hasAccess) {
      return showFallback ? (fallback || <AccessDeniedFallback />) : null;
    }
  }

  // Check multiple permissions
  if (requiredPermissions.length > 0) {
    const hasAccess = requireAll 
      ? requiredPermissions.every(perm => hasPermission(userPermissions, perm))
      : hasAnyPermission(userPermissions, requiredPermissions);
    
    if (!hasAccess) {
      return showFallback ? (fallback || <AccessDeniedFallback />) : null;
    }
  }

  return <>{children}</>;
}

function AccessDeniedFallback() {
  return (
    <Alert className="max-w-md mx-auto">
      <Shield className="h-4 w-4" />
      <AlertDescription>
        You don't have permission to access this feature. Please contact your administrator.
      </AlertDescription>
    </Alert>
  );
}

// Hook for checking permissions in components
export function usePermissions() {
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];

  return {
    permissions: userPermissions,
    hasPermission: (permission: Permission) => hasPermission(userPermissions, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(userPermissions, permissions),
    hasAllPermissions: (permissions: Permission[]) => permissions.every(perm => hasPermission(userPermissions, perm)),
    canAccessModule: (module: string) => userPermissions.some(perm => perm.module === module),
  };
}