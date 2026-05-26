import React, { createContext, useState, useContext, type ReactNode, useEffect } from 'react';

interface AuthContextType {
    token: string | null;
    userId: string | null;
    profilePictureUrl: string | null;
    login: (token: string, userId: string, profilePicUrl?: string) => void;
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
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const initializeAuth = () => {
            const isUrlExpired = window.location.search.includes('expired=true') || window.location.hash.includes('expired=true');

            if (isUrlExpired) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user_id');
                localStorage.removeItem('profile_picture_url');
                setToken(null);
                setUserId(null);
                setProfilePictureUrl(null);
                setIsLoading(false);
                if (!window.location.pathname.startsWith('/login')) {
                    window.location.href = '/login?expired=true';
                }
                return;
            }

            const storedToken = localStorage.getItem('access_token');
            const storedUserId = localStorage.getItem('user_id');
            const storedProfilePic = localStorage.getItem('profile_picture_url');

            if (storedToken && storedUserId) {
                setToken(storedToken);
                setUserId(storedUserId);
                if (storedProfilePic) setProfilePictureUrl(storedProfilePic);
            }
            setIsLoading(false);
        };

        initializeAuth();
    }, []);

    const login = (newToken: string, newUserId: string, newProfilePicUrl?: string) => {
        setToken(newToken);
        setUserId(newUserId);
        localStorage.setItem('access_token', newToken);
        localStorage.setItem('user_id', newUserId);

        if (newProfilePicUrl) {
            setProfilePictureUrl(newProfilePicUrl);
            localStorage.setItem('profile_picture_url', newProfilePicUrl);
        }
    };

    const logout = () => {
        setToken(null);
        setUserId(null);
        setProfilePictureUrl(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('profile_picture_url');
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