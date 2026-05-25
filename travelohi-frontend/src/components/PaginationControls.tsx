import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/ThemeContext';
import { translations } from '../utils/translations';
import styles from './PaginationControls.module.scss';
interface Props {
    totalResults: number;
}
const PaginationControls: React.FC<Props> = ({ totalResults }) => {
    const { language } = useAppContext();
    const t = translations[language];
    const [searchParams, setSearchParams] = useSearchParams();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const totalPages = Math.ceil(totalResults / limit) || 1;
    const updateParam = (key: string, value: string) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set(key, value);
        if (key === 'limit') newParams.set('page', '1');
        setSearchParams(newParams);
    };
    return (
        <div className={styles.paginationContainer}>
            <div className={styles.limitSelector}>
                <label>{t.pagination_show}</label>
                <select value={limit} onChange={(e) => updateParam('limit', e.target.value)}>
                    <option value="20">20 {t.per_page}</option>
                    <option value="25">25 {t.per_page}</option>
                    <option value="30">30 {t.per_page}</option>
                </select>
            </div>
            <div className={styles.pageControls}>
                <button
                    onClick={() => updateParam('page', String(page - 1))}
                    disabled={page <= 1}
                >
                    &laquo; {t.previous}
                </button>
                <span className={styles.pageInfo}>{t.page} {page} {t.of} {totalPages}</span>
                <button
                    onClick={() => updateParam('page', String(page + 1))}
                    disabled={page >= totalPages}
                >
                    {t.next} &raquo;
                </button>
            </div>
        </div>
    );
};
export default PaginationControls;