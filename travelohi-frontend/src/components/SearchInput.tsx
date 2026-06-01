import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TelemetryServiceClient } from '../proto/travelohi/v1/telemetry/telemetry.client';
import { HotelSearchResult } from '../proto/travelohi/v1/telemetry/telemetry';
import { transport } from '../utils/grpcClient';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../utils/useDebounce';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import { Search } from 'lucide-react';
import SearchDropdown, { type DropdownAirline } from './SearchDropdown';
import { getDisplayAirportName } from '../utils/airportMapper';
import styles from './SearchInput.module.scss';
interface SearchInputProps {
    onFocus?: () => void;
}

const telemetryClient = new TelemetryServiceClient(transport);
const SearchInput: React.FC<SearchInputProps> = ({ onFocus }) => {
    const { language } = useAppContext();
    const t = translations[language];
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [hotelResults, setHotelResults] = useState<HotelSearchResult[]>([]);
    const [airlineResults, setAirlineResults] = useState<DropdownAirline[]>([]);
    const [popHotels, setPopHotels] = useState<HotelSearchResult[]>([]);
    const [popFlights, setPopFlights] = useState<DropdownAirline[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
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
                const [recentRes, popHotelsRes, popFlightsRes] = await Promise.all([
                    userId
                        ? telemetryClient.getRecentSearches({ userId })
                        : Promise.resolve({ response: { queries: [] } }),
                    telemetryClient.getPopularHotels({}),
                    telemetryClient.getPopularFlightDestinations({})
                ]);
                setRecentSearches(recentRes.response?.queries?.slice(0, 3) || []);


                const mappedPopHotels = (popHotelsRes.response?.hotels || []).slice(0, 5).map(h => ({
                    id: h.hotelId,
                    name: h.name,
                    location: h.location,
                    imageUrl: h.imageUrl
                }));

                const mappedPopFlights = (popFlightsRes.response?.destinations || []).slice(0, 5).map(d => ({
                    id: d.destinationAirport,
                    name: getDisplayAirportName(d.destinationAirport),
                    displayTitle: `Flights to ${getDisplayAirportName(d.destinationAirport)}`,
                    logoUrl: d.imageUrl
                }));

                setPopHotels(mappedPopHotels);
                setPopFlights(mappedPopFlights);

                if (!debouncedQuery) {
                    setHotelResults(mappedPopHotels);
                    setAirlineResults(mappedPopFlights);
                }
            } catch (error) {
                console.error("Failed to load search telemetry via gRPC", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTelemetryData();
    }, [isFocused, userId, debouncedQuery]);
    useEffect(() => {
        if (debouncedQuery) {
            console.debug("Ready to trigger lightweight autocomplete for:", debouncedQuery);
            setIsLoading(true);
            telemetryClient.globalSearch({ query: debouncedQuery })
                .then(({ response }) => {
                    setHotelResults(response.hotels || []);
                    setAirlineResults(response.airlines || []);
                })
                .catch(err => console.error("Global search error:", err))
                .finally(() => setIsLoading(false));
        } else {
            setHotelResults(popHotels);
            setAirlineResults(popFlights);
        }
    }, [debouncedQuery, popHotels, popFlights]);
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
                <span
                    className={styles.searchIcon}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onClick={() => {
                        if (query.trim()) {
                            executeSearch(query);
                        } else {
                            inputRef.current?.focus();
                        }
                    }}
                >
                    <Search size={18} />
                </span>
                <input
                    ref={inputRef}
                    type="text"
                    className={styles.searchInput}
                    placeholder={t.search_placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        setIsFocused(true);
                        onFocus?.();
                    }}
                    onKeyDown={handleKeyDown}
                    aria-label="Global Search"
                />
            </div>
            <SearchDropdown
                isOpen={isFocused && (recentSearches.length > 0 || hotelResults.length > 0 || airlineResults.length > 0 || isLoading)}
                recentSearches={recentSearches}
                hotels={hotelResults}
                airlines={airlineResults}
                onSelect={executeSearch}
                isLoading={isLoading}
            />
        </div>
    );
};
export default SearchInput;