import React from 'react';

const DEFAULT_AVATAR = '/default-avatar.png';

interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
}

export default function UserAvatar({ src, alt = 'User', className = 'w-10 h-10' }: UserAvatarProps) {
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = DEFAULT_AVATAR;
  };

  return (
    <img
      src={src || DEFAULT_AVATAR}
      alt={alt}
      onError={handleError}
      className={`rounded-full object-cover ${className}`}
    />
  );
}
