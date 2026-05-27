import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TelemetryServiceClient } from '../proto/travelohi/v1/telemetry/telemetry.client';
import { transport } from '../utils/grpcClient';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../utils/useDebounce';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import { Search } from 'lucide-react';
import SearchDropdown from './SearchDropdown';
import styles from './SearchInput.module.scss';
const telemetryClient = new TelemetryServiceClient(transport);
const SearchInput: React.FC = () => {
    const { language } = useAppContext();
    const t = translations[language];
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [recommendations, setRecommendations] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { userId } = useAuth();
    const debouncedQuery = useDebounce(query, 500);

    // clear search when returning to home
    useEffect(() => {
        if (location.pathname === '/') {
            setQuery('');
        }
    }, [location.pathname]);
    // close dropdown when clicking outside of the search container
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    // fetch telemetry data upon focus
    useEffect(() => {
        if (!isFocused) return;
        const fetchTelemetryData = async () => {
            setIsLoading(true);
            try {
                // parallel fetching for performance
                const [recentRes, globalRes] = await Promise.all([
                    userId
                        ? telemetryClient.getRecentSearches({ userId })
                        : Promise.resolve({ response: { queries: [] } }),
                    telemetryClient.getGlobalRecommendations({})
                ]);
                setRecentSearches(recentRes.response?.queries?.slice(0, 3) || []);
                setRecommendations(globalRes.response?.recommendedQueries?.slice(0, 5) || []);
            } catch (error) {
                console.error("Failed to load search telemetry via gRPC", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTelemetryData();
    }, [isFocused, userId]);
    useEffect(() => {
        if (debouncedQuery) {
            console.debug("Ready to trigger lightweight autocomplete for:", debouncedQuery);
        }
    }, [debouncedQuery]);
    const executeSearch = async (searchQuery: string) => {
        const trimmedQuery = searchQuery.trim();
        setIsFocused(false);
        setQuery(trimmedQuery);
        // non-blocking telemetry log
        if (userId && trimmedQuery) {
            telemetryClient.logSearchQuery({ userId, query: trimmedQuery }).response.catch((err) => {
                console.warn("Failed to log search query:", err);
            });
        }
        navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            executeSearch(query);
        }
    };
    return (
        <div className={styles.searchContainer} ref={containerRef}>
            <div className={styles.inputWrapper}>
                <span className={styles.searchIcon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Search size={18} />
                </span>
                <input
                    type="text"
                    className={styles.searchInput}
                    placeholder={t.search_placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onKeyDown={handleKeyDown}
                    aria-label="Global Search"
                />
            </div>
            <SearchDropdown
                isOpen={isFocused && (recentSearches.length > 0 || recommendations.length > 0 || isLoading)}
                recentSearches={recentSearches}
                recommendations={recommendations}
                onSelect={executeSearch}
                isLoading={isLoading}
            />
        </div>
    );
};
export default SearchInput;