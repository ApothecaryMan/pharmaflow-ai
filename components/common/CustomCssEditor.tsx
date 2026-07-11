import React, { useRef } from 'react';
import { Tooltip } from './Tooltip';

const getContrastColor = (color: string): string => {
  let r = 0, g = 0, b = 0;

  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
  } else if (color.startsWith('rgb')) {
    const match = color.match(/\d+(\.\d+)?/g);
    if (match && match.length >= 3) {
      r = parseFloat(match[0]);
      g = parseFloat(match[1]);
      b = parseFloat(match[2]);
    }
  } else if (color.startsWith('hsl')) {
    const match = color.match(/\d+(\.\d+)?/g);
    if (match && match.length >= 3) {
      const l = parseFloat(match[2]);
      return l > 50 ? '#000000' : '#ffffff';
    }
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
};

interface CustomCssEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

const parseCss = (css: string, isOverlay: boolean) => {
  const properties = [
    'background', 'background-color', 'border', 'border-radius', 'box-shadow',
    'padding', 'margin', 'color', 'transform', 'clip-path', 'width', 'height',
    'top', 'left', 'bottom', 'right', 'linear-gradient', 'radial-gradient', 'polygon',
    'repeating-linear-gradient', 'var'
  ];

  const propsPattern = `\\b(?:${properties.join('|')})\\b`;
  const colorsPattern = `#[0-9a-fA-F]{3,8}|rgba?\\([^)]+\\)|hsla?\\([^)]+\\)`;

  const regex = new RegExp(`(${propsPattern})|(${colorsPattern})`, 'gi');

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  css.replace(regex, (match, p1, p2, offset) => {
    if (offset > lastIndex) {
      elements.push(<span key={`text-${lastIndex}`}>{css.slice(lastIndex, offset)}</span>);
    }

    if (p1) {
      elements.push(
        <span key={`prop-${offset}`} className={isOverlay ? '' : "text-primary-600 dark:text-primary-400 font-medium"}>
          {match}
        </span>
      );
    } else if (p2) {
      elements.push(
        <span key={`color-${offset}`} className="relative">
          {match}
          {isOverlay && (
            <Tooltip
              className="!absolute left-0 -bottom-[2px] w-full h-[3px]"
              triggerClassName="!w-full !h-full !block"
              fillColor={match}
              textColor={getContrastColor(match)}
              content={
                <span className="font-mono text-[11px] font-bold tracking-wider">
                  {match}
                </span>
              }
            >
              <span
                className="block w-full h-full rounded-full border border-black/10 dark:border-white/10 pointer-events-auto cursor-pointer hover:h-[5px] transition-all"
                style={{ backgroundColor: match }}
              />
            </Tooltip>
          )}
        </span>
      );
    }

    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < css.length) {
    elements.push(<span key={`text-${lastIndex}`}>{css.slice(lastIndex)}</span>);
  }

  return elements;
};

export const CustomCssEditor = React.memo<CustomCssEditorProps>(({ value, onChange, placeholder }) => {
  const backdropRef0 = useRef<HTMLDivElement>(null);
  const backdropRef20 = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef0.current) {
      backdropRef0.current.scrollTop = e.currentTarget.scrollTop;
      backdropRef0.current.scrollLeft = e.currentTarget.scrollLeft;
    }
    if (backdropRef20.current) {
      backdropRef20.current.scrollTop = e.currentTarget.scrollTop;
      backdropRef20.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const cssText = value || placeholder || '';

  return (
    <div className='relative w-full rounded-lg bg-(--bg-input) border border-(--border-divider) focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 transition-colors'>
      <div
        ref={backdropRef0}
        className={`absolute inset-0 p-2 whitespace-pre-wrap break-words overflow-hidden text-gray-500 dark:text-gray-400 font-mono text-xs ${!value ? 'opacity-40' : ''}`}
        aria-hidden='true'
        dir='ltr'
      >
        {parseCss(cssText, false)}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        className='relative z-10 block w-full h-full p-2 bg-transparent text-transparent caret-black dark:caret-white outline-hidden font-mono text-xs min-h-[80px] resize-y scrollbar-none m-0 border-none selection:bg-primary-500/30 selection:text-transparent'
        spellCheck={false}
        dir='ltr'
      />

      <div
        ref={backdropRef20}
        className='absolute z-20 inset-0 p-2 whitespace-pre-wrap break-words overflow-hidden text-transparent font-mono text-xs pointer-events-none'
        aria-hidden='true'
        dir='ltr'
      >
        {parseCss(cssText, true)}
      </div>
    </div>
  );
});
