import React, { useState } from 'react';
import styles from './ChatInput.module.scss';

interface Props {
    onSendMessage: (text: string) => Promise<void>;
    disabled: boolean;
    onTyping?: (isTyping: boolean) => void;
    t: any;
}

const ChatInput: React.FC<Props> = ({ onSendMessage, disabled, onTyping, t }) => {
    const [text, setText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const typingTimeoutRef = React.useRef<any>(null);
    const isTypingRef = React.useRef(false);

    React.useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setText(val);

        if (onTyping) {
            const hasText = val.trim().length > 0;
            if (hasText) {
                if (!isTypingRef.current) {
                    isTypingRef.current = true;
                    onTyping(true);
                }

                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                }

                typingTimeoutRef.current = setTimeout(() => {
                    isTypingRef.current = false;
                    onTyping(false);
                }, 2500);
            } else {
                if (isTypingRef.current) {
                    isTypingRef.current = false;
                    onTyping(false);
                }
                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                }
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed || disabled || isSending) return;

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        if (onTyping && isTypingRef.current) {
            isTypingRef.current = false;
            onTyping(false);
        }

        setText('');
        setIsSending(true);
        try {
            await onSendMessage(trimmed);
        } catch (err) {
            console.error("Failed to send", err);
            setText(trimmed);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <form className={styles.inputForm} onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder={t.chat_input_placeholder}
                value={text}
                onChange={handleTextChange}
                disabled={disabled}
            />
            <button type="submit" disabled={disabled || isSending || !text.trim()}>
                {isSending ? t.chat_sending : t.chat_send}
            </button>
        </form>
    );
};

export default ChatInput;