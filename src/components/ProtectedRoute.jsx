import { Navigate, useLocation } from 'react-router-dom';
import { useEffect } from "react";
import { useAuth } from '../contexts/AuthContext';
import { message } from 'antd';

const GUEST_ONLY_PATHS = ['/login'];
const PUBLIC_PATHS = ['/reset-password'];

export const ProtectedRoute = ({ children, requiredRoles = [] }) => {
    const { user } = useAuth();
    const location = useLocation();

    useEffect(() => {
        const isGuestOnly = GUEST_ONLY_PATHS.includes(location.pathname);
        const isPublic = PUBLIC_PATHS.includes(location.pathname);
        if (!isGuestOnly && !isPublic && !user) {
            message.error('请先登录');
        }
    }, [location.pathname, user]);

    if (user && GUEST_ONLY_PATHS.includes(location.pathname)) {
        return <Navigate to="/" replace />;
    }

    if (GUEST_ONLY_PATHS.includes(location.pathname) || PUBLIC_PATHS.includes(location.pathname)) {
        return children;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Check if user has any of the required roles
    if (requiredRoles.length > 0) {
        const roles = Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : []);
        const hasRole = roles.some(role => {
            const roleVal = typeof role === 'object' && role !== null ? role.name : role;
            const roleId = typeof role === 'object' && role !== null ? role.id : role;
            return requiredRoles.includes(roleVal) || requiredRoles.includes(roleId);
        });
        if (!hasRole) {
            return <Navigate to="/403" replace />;
        }
    }

    return children;
};
