import React, { useEffect, useState, useRef } from 'react';
import { AdminServiceClient } from '../../../proto/travelohi/v1/admin/admin.client';
import { transport } from '../../../utils/grpcClient';
import { useToast } from '../../../components/Toast';
import styles from './UserManagerTable.module.scss';

const adminClient = new AdminServiceClient(transport);
const LIMIT = 10;

interface UserRecord {
    id: string;
    fullName: string;
    email: string;
    isAdmin: boolean;
    isBanned: boolean;
}

const UserManagementTable: React.FC = () => {
    const { showToast } = useToast();
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [offset, setOffset] = useState(0);
    const [totalUsers, setTotalUsers] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const previousUsersRef = useRef<UserRecord[]>([]);

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const { response } = await adminClient.getAllUsers({ limit: LIMIT, offset });
                setUsers(response.users as UserRecord[] || []);
                setTotalUsers(response.totalResults || 0);
            } catch (err: any) {
                setError(err.message || 'Gagal mengambil data pengguna.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchUsers();
    }, [offset]);

    const handleToggleBan = async (userId: string, currentStatus: boolean) => {
        previousUsersRef.current = [...users];

        // update UI dlu
        setUsers(prev => prev.map(user =>
            user.id === userId ? { ...user, isBanned: !currentStatus } : user
        ));

        try {
            await adminClient.banUser({ userId, banStatus: !currentStatus });
        } catch (err) {
            // rollback klo error
            console.error("Gagal mengubah status pengguna:", err);
            setUsers(previousUsersRef.current);
            showToast('Gagal menghubungi server. Status pengguna dikembalikan.', 'error');
        }
    };

    const totalPages = Math.ceil(totalUsers / LIMIT) || 1;
    const currentPage = Math.floor(offset / LIMIT) + 1;

    if (isLoading && users.length === 0) return <div className={styles.loading}>Memuat data pengguna...</div>;
    if (error) return <div className={styles.errorBox}>{error}</div>;

    return (
        <div className={styles.tableContainer}>
            <table className={styles.adminTable}>
                <thead>
                    <tr>
                        <th>ID / Email</th>
                        <th>Nama Lengkap</th>
                        <th className={styles.centerCol}>Status</th>
                        <th className={styles.centerCol}>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id} className={user.isBanned ? styles.bannedRow : ''}>
                            <td>
                                <div className={styles.cellStack}>
                                    <span className={styles.email}>{user.email}</span>
                                    <span className={styles.id}>ID: {user.id}</span>
                                </div>
                            </td>
                            <td>
                                {user.fullName}
                                {user.isAdmin && <span style={{ marginLeft: '8px', fontSize: '0.75rem', padding: '2px 6px', backgroundColor: '#0b5b9c', color: '#fff', borderRadius: '4px' }}>Admin</span>}
                            </td>
                            <td className={styles.centerCol}>
                                <span className={`${styles.statusBadge} ${user.isBanned ? styles.banned : styles.active}`}>
                                    {user.isBanned ? 'Banned' : 'Active'}
                                </span>
                            </td>
                            <td className={styles.centerCol}>
                                {user.isAdmin ? (
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Protected (Admin)</span>
                                ) : (
                                    <button
                                        className={`${styles.actionBtn} ${user.isBanned ? styles.unbanBtn : styles.banBtn}`}
                                        onClick={() => handleToggleBan(user.id, user.isBanned)}
                                    >
                                        {user.isBanned ? 'Unban' : 'Ban'}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className={styles.pagination}>
                <button
                    onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                    disabled={currentPage === 1}
                >
                    &laquo; Prev
                </button>
                <span>Halaman {currentPage} dari {totalPages}</span>
                <button
                    onClick={() => setOffset(offset + LIMIT)}
                    disabled={currentPage >= totalPages}
                >
                    Next &raquo;
                </button>
            </div>
        </div>
    );
};

export default UserManagementTable;