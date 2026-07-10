import type React from 'react';
import { getDecoration } from '../employee-portal/avatar-decorations';
import AvatarRing, { type RingStyle } from '../employee-portal/avatar-ring';
import { Icons } from './Icons';

interface EmployeeAvatarProps {
  image?: string | null;
  initials?: string;
  themeHex?: string;
  size?: number; // Size in pixels
  designSettings?: {
    avatar?: {
      decorationId?: string;
      decorationAnimated?: boolean;
      frameColor?: string | null;
      ringStyle?: string;
      ringThickness?: number;
      ringAnimated?: boolean;
    };
  };
  children?: React.ReactNode; // For the camera icon / overlays
}

export const EmployeeAvatar: React.FC<EmployeeAvatarProps> = ({
  image,
  initials,
  themeHex,
  size = 48,
  designSettings,
  children,
}) => {
  const ds = designSettings?.avatar;
  const avatarDecoration = ds?.decorationId;
  const frameColor = ds?.frameColor;
  const ringStyle = (ds?.ringStyle || 'solid') as RingStyle;
  const ringThickness = ds?.ringThickness ?? 4;
  const ringAnimated = ds?.ringAnimated ?? false;

  // Calculate inset proportionally based on size to ensure decorations scale correctly
  // e.g. at size 112, inset-2 (-8px) is ~7%. At size 32, inset-1 (-4px) is ~12%.
  // We'll use a dynamic negative margin / inset calculation
  const insetVal = `-${Math.max(2, size * 0.1)}px`;

  return (
    <div
      className='rounded-full flex items-center justify-center relative bg-clip-padding transition-all shrink-0'
      style={{
        width: size,
        height: size,
        backgroundColor: image ? 'var(--bg-secondary)' : themeHex || 'var(--bg-secondary)',
        borderStyle: 'solid',
        borderColor:
          frameColor && ringStyle === 'solid' && !ringAnimated
            ? frameColor
            : frameColor
              ? 'transparent'
              : 'var(--border-divider)',
        borderWidth: frameColor ? ringThickness : image || initials ? 0 : 1,
      }}
    >
      <div
        className='absolute inset-0 rounded-full overflow-hidden'
        style={{ borderWidth: frameColor ? 0 : 1, borderColor: 'var(--border-divider)' }}
      >
        {image ? (
          <img src={image} alt='Avatar' className='w-full h-full object-cover' />
        ) : initials ? (
          <div
            className='w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500/20 to-primary-600/30 text-primary-500 font-bold'
            style={{ fontSize: size * 0.35 }}
          >
            {initials}
          </div>
        ) : (
          <div className='w-full h-full flex items-center justify-center'>
            <Icons.Store size={Math.max(14, size * 0.5)} stroke={2.5} color='white' />
          </div>
        )}
      </div>

      {avatarDecoration && avatarDecoration !== 'none' && (
        <div
          className={`absolute pointer-events-none z-[1] ${
            ds?.decorationAnimated === false ? 'pause-animations' : ''
          }`}
          style={{ top: insetVal, left: insetVal, right: insetVal, bottom: insetVal }}
        >
          {getDecoration(avatarDecoration)}
        </div>
      )}

      {frameColor && (ringStyle !== 'solid' || ringAnimated) && (
        <div
          className='absolute pointer-events-none z-0'
          style={{ top: insetVal, left: insetVal, right: insetVal, bottom: insetVal }}
        >
          <AvatarRing
            color={frameColor}
            style={ringStyle}
            thickness={ringThickness}
            animated={ringAnimated}
          />
        </div>
      )}

      {children}
    </div>
  );
};
