import React, { createContext, useState, useContext, useEffect } from 'react';
import { checkUser } from '../api/user'; // Assume we will create this

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const response = await checkUser();
            // Assuming the Vue backend returns code === 0 for success
            if (response.data && response.data.status === 0) {
                setUser({
                    ...response.data.data
                });
            } else {
                setUser(null);
            }
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const value = {
        user,
        loading,
        checkAuthStatus,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
