import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { clearAuthToken } from "@/utils/authSession";
import { useAuthToken } from "@/hooks/useAuthToken";

interface ProtectedRouteProps {
  allowedRoles?: string[];
  allowedScopes?: string[];
  children?: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, allowedScopes, children }: ProtectedRouteProps) {
  const token = useAuthToken();
  const location = useLocation();

  let isValid = false;
  let hasAccess = false;

  if (token) {
    try {
      const decoded: { exp?: number; scope?: string } = jwtDecode(token);
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();

      if (decoded.exp && decoded.exp * 1000 >= now) {
        isValid = true;

        if ((allowedRoles && allowedRoles.length > 0) || (allowedScopes && allowedScopes.length > 0)) {
          const userRoles: string[] = decoded.scope ? decoded.scope.split(" ") : [];
          const hasRole = allowedRoles?.some((role) => userRoles.includes(role)) || false;
          const hasScope = allowedScopes?.some((scope) => userRoles.includes(scope)) || false;
          hasAccess = hasRole || hasScope;
        } else {
          hasAccess = true;
        }
      }
    } catch {
      isValid = false;
    }
  }

  useEffect(() => {
    if (token && !isValid) {
      clearAuthToken();
    }
  }, [isValid, token]);

  if (!token || !isValid) {
    const returnPath = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/auth?mode=login" replace state={{ from: returnPath }} />;
  }

  if (((allowedRoles && allowedRoles.length > 0) || (allowedScopes && allowedScopes.length > 0)) && !hasAccess) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
