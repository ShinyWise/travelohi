import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { AuthServiceClient } from '../../proto/travelohi/v1/auth/auth.client';
import { transport } from '../../utils/grpcClient';
import styles from './ActivatePage.module.scss';

const client = new AuthServiceClient(transport);

const ActivatePage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const hasAttempted = useRef(false);

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        if (hasAttempted.current) return;
        hasAttempted.current = true;

        const activate = async () => {
            try {
                await client.activateAccount({ token });
                setStatus('success');
            } catch (err: any) {
                setErrorMessage(err.message || 'Activation failed');
                setStatus('error');
            }
        };

        activate();
    }, [token, navigate]);

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                {status === 'loading' && (
                    <>
                        <div className={styles.loader}></div>
                        <h1>Activating Account...</h1>
                        <p>Please wait while we verify your activation link.</p>
                    </>
                )}
                
                {status === 'success' && (
                    <>
                        <div className={`${styles.icon} ${styles.success}`}>
                            <CheckCircle size={48} />
                        </div>
                        <h1>Account Activated!</h1>
                        <p>Your email has been successfully verified. You can now log in to your account and start booking your next adventure.</p>
                        <Link to="/login" className={styles.btn}>Go to Login</Link>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className={`${styles.icon} ${styles.error}`}>
                            <XCircle size={48} />
                        </div>
                        <h1>Activation Failed</h1>
                        <p>This activation link is invalid or has expired.</p>
                        <p style={{ fontSize: '0.9rem', marginTop: '-15px' }}>{errorMessage}</p>
                        <Link to="/login" className={styles.btn}>Go to Login to Resend</Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default ActivatePage;
