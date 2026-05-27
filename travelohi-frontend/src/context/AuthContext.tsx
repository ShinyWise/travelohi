import React, { createContext, useState, useContext, type ReactNode, useEffect } from 'react';
import { AccountServiceClient } from '../proto/travelohi/v1/account/account.client';
import { transport } from '../utils/grpcClient';

interface AuthContextType {
    token: string | null;
    userId: string | null;
    profilePictureUrl: string | null;
    isAdmin: boolean;
    login: (token: string, userId: string, profilePicUrl?: string) => Promise<void>;
    logout: () => void;
    updateProfilePicture: (url: string) => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const initializeAuth = () => {
            const isUrlExpired = window.location.search.includes('expired=true') || window.location.hash.includes('expired=true');

            if (isUrlExpired) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user_id');
                localStorage.removeItem('profile_picture_url');
                localStorage.removeItem('is_admin');
                setToken(null);
                setUserId(null);
                setProfilePictureUrl(null);
                setIsAdmin(false);
                setIsLoading(false);
                if (!window.location.pathname.startsWith('/login')) {
                    window.location.href = '/login?expired=true';
                }
                return;
            }

            const storedToken = localStorage.getItem('access_token');
            const storedUserId = localStorage.getItem('user_id');
            const storedProfilePic = localStorage.getItem('profile_picture_url');
            const storedIsAdmin = localStorage.getItem('is_admin') === 'true';

            if (storedToken && storedUserId) {
                setToken(storedToken);
                setUserId(storedUserId);
                setIsAdmin(storedIsAdmin);
                if (storedProfilePic) setProfilePictureUrl(storedProfilePic);
            }
            setIsLoading(false);
        };

        initializeAuth();
    }, []);

    const login = async (newToken: string, newUserId: string, newProfilePicUrl?: string) => {
        setToken(newToken);
        setUserId(newUserId);
        localStorage.setItem('access_token', newToken);
        localStorage.setItem('user_id', newUserId);

        if (newProfilePicUrl) {
            setProfilePictureUrl(newProfilePicUrl);
            localStorage.setItem('profile_picture_url', newProfilePicUrl);
        }

        try {
            const client = new AccountServiceClient(transport);
            const { response } = await client.getProfile({ userId: newUserId });
            if (response.profile) {
                const adminStatus = response.profile.isAdmin;
                setIsAdmin(adminStatus);
                localStorage.setItem('is_admin', adminStatus.toString());
            }
        } catch (err) {
            console.error("Failed to verify user permissions on login:", err);
        }
    };

    const logout = () => {
        setToken(null);
        setUserId(null);
        setProfilePictureUrl(null);
        setIsAdmin(false);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('profile_picture_url');
        localStorage.removeItem('is_admin');
    };

    const updateProfilePicture = (url: string) => {
        setProfilePictureUrl(url);
        localStorage.setItem('profile_picture_url', url);
    };

    return (
        <AuthContext.Provider value={{
            token,
            userId,
            profilePictureUrl,
            isAdmin,
            login,
            logout,
            updateProfilePicture,
            isAuthenticated: !!token,
            isLoading
        }}>
            {children}
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