import React, { useState } from 'react';

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    wrapperClassName?: string;
    wrapperStyle?: React.CSSProperties;
    skeletonClassName?: string;
    skeletonStyle?: React.CSSProperties;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
    src,
    alt,
    className,
    style,
    wrapperClassName,
    wrapperStyle,
    skeletonClassName,
    skeletonStyle,
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <div
            className={wrapperClassName}
            style={{
                position: 'relative',
                display: 'inline-block',
                ...wrapperStyle
            }}
        >
            {!isLoaded && (
                <div
                    className={skeletonClassName}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: '#e2e8f0',
                        borderRadius: 'inherit',
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        ...skeletonStyle
                    }}
                />
            )}
            <img
                src={src}
                alt={alt}
                className={className}
                onLoad={() => setIsLoaded(true)}
                onError={() => setIsLoaded(true)} // prevent biar ga infinite loading kalo url broken
                style={{
                    ...style,
                    opacity: isLoaded ? 1 : 0,
                    transition: 'opacity 0.3s ease-in-out',
                }}
                {...props}
            />
        </div>
    );
};

export default ProgressiveImage;
