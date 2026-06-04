import React, { useState } from 'react';
import StarRatingInput from './StarRatingInput';
import { HotelServiceClient } from '../../../proto/travelohi/v1/hotel/hotel.client';
import { AccountServiceClient } from '../../../proto/travelohi/v1/account/account.client';
import { transport } from '../../../utils/grpcClient';
import { useAuth } from '../../../context/AuthContext';
import { useAppContext } from '../../../context/ThemeContext';
import { translations } from '../../../utils/translations';
import styles from './ReviewSubmissionModal.module.scss';

const hotelClient = new HotelServiceClient(transport);

interface Props {
    isOpen: boolean;
    onClose: () => void;
    hotelId: string;
    bookingId: string;
    hotelName: string;
    onSuccess: () => void;
}

const ReviewSubmissionModal: React.FC<Props> = ({
    isOpen,
    onClose,
    hotelId,
    bookingId,
    hotelName,
    onSuccess
}) => {
    const { userId } = useAuth();
    const { language } = useAppContext();
    const t = translations[language];

    const [cleanliness, setCleanliness] = useState(0);
    const [comfort, setComfort] = useState(0);
    const [location, setLocation] = useState(0);
    const [service, setService] = useState(0);

    const [comment, setComment] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const isFormValid =
        cleanliness > 0 &&
        comfort > 0 &&
        location > 0 &&
        service > 0 &&
        comment.trim().length >= 10;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid || !userId) return;

        setIsSubmitting(true);
        setError(null);

        let fullName = '';
        try {
            const accountClient = new AccountServiceClient(transport);
            const { response: profileRes } = await accountClient.getProfile({ userId });
            if (profileRes.profile) {
                fullName = `${profileRes.profile.firstName} ${profileRes.profile.lastName}`.trim();
            }
        } catch (err) {
            console.warn("Failed to fetch profile name for review, defaulting to Traveler", err);
        }

        try {
            const { response } = await hotelClient.addHotelReview({
                hotelId,
                bookingId,
                ratingCleanliness: cleanliness * 2,
                ratingComfort: comfort * 2,
                ratingLocation: location * 2,
                ratingService: service * 2,
                comment: comment.trim(),
                isAnonymous,
                userName: fullName
            });

            if (response.success) {
                onSuccess();
                onClose();
                setCleanliness(0); setComfort(0); setLocation(0); setService(0);
                setComment(''); setIsAnonymous(false);
            } else {
                setError(response.message || t.review_submit_error);
            }
        } catch (err: any) {
            setError(err.message || t.review_system_error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.header}>
                    <h3>{t.review_modal_title.replace('{hotelName}', hotelName)}</h3>
                    <button className={styles.closeBtn} onClick={onClose} disabled={isSubmitting}>✕</button>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.formBody}>
                    <div className={styles.ratingsGroup}>
                        <StarRatingInput label={t.rating_cleanliness} value={cleanliness} onChange={setCleanliness} />
                        <StarRatingInput label={t.rating_comfort} value={comfort} onChange={setComfort} />
                        <StarRatingInput label={t.rating_location} value={location} onChange={setLocation} />
                        <StarRatingInput label={t.rating_service} value={service} onChange={setService} />
                    </div>

                    <div className={styles.commentGroup}>
                        <label htmlFor="review-comment">{t.review_comment_label}</label>
                        <textarea
                            id="review-comment"
                            placeholder={t.review_comment_placeholder}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            disabled={isSubmitting}
                        />
                        <div className={styles.charCountRow}>
                            <span className={comment.length < 10 ? styles.charCountError : styles.charCountSuccess}>
                                {t.review_char_count.replace('{count}', comment.length.toString())}
                            </span>
                            {comment.length < 10 && (
                                <span className={styles.minHint}>({t.review_char_min_hint})</span>
                            )}
                        </div>
                    </div>

                    <div className={styles.optionsGroup}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                                disabled={isSubmitting}
                            />
                            {t.review_anonymous_label}
                        </label>
                    </div>

                    <div className={styles.actions}>
                        <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
                            {t.cancel}
                        </button>
                        <button type="submit" className={styles.submitBtn} disabled={!isFormValid || isSubmitting}>
                            {isSubmitting ? t.review_submitting_btn : t.review_submit_btn}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReviewSubmissionModal;