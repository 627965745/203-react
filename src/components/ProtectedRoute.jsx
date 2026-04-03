import { Navigate, useLocation } from 'react-router-dom';
import { useEffect } from "react";
import { useAuth } from '../contexts/AuthContext';
import { message } from 'antd';

const PUBLIC_PATHS = ['/login'];

export const ProtectedRoute = ({ children, requiredRoles = [] }) => {
    const { user } = useAuth();
    const location = useLocation();

    useEffect(() => {
        if (!PUBLIC_PATHS.includes(location.pathname) && !user) {
            message.error('请先登录');
        }
    }, [location.pathname, user]);

    if (user && PUBLIC_PATHS.includes(location.pathname)) {
        return <Navigate to="/" replace />;
    }

    if (PUBLIC_PATHS.includes(location.pathname)) {
        return children;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Adapt this based on your roles/group data structure
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.roles)) {
        return <Navigate to="/403" replace />; // or your GroupError placeholder
    }

    return children;
};
