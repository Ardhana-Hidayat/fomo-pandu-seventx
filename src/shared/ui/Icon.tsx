import type { ComponentType } from 'react';
import * as PhosphorIcons from '@phosphor-icons/react';

export type IconName =
  | 'DoorOpen'
  | 'Chalkboard'
  | 'NotePencil'
  | 'FileText'
  | 'ListPlus'
  | 'FilePdf'
  | 'Cards'
  | 'ListChecks'
  | 'TextAa'
  | 'SpeakerHigh'
  | 'SpeakerSlash'
  | 'Image'
  | 'Hand'
  | 'Play'
  | 'Pause'
  | 'ArrowCounterClockwise'
  | 'CaretLeft'
  | 'CaretRight'
  | 'Television'
  | 'Hash'
  | 'UsersThree'
  | 'ChartBar'
  | 'GearSix'
  | 'CheckCircle'
  | 'ArrowsClockwise'
  | 'Warning'
  | 'Copy'
  | 'Trash'
  | 'Question'
  | 'Check'
  | 'Microphone'
  | 'Stop'
  | 'UploadSimple'
  | 'Sparkle'
  | 'Info'
  | 'Plus'
  | 'TextT'
  | 'X';

export interface IconProps {
  name: IconName;
  size?: number | string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  className?: string;
  color?: string;
}

export function Icon({
  name,
  size = 28,
  weight = 'bold',
  className = '',
  color,
}: IconProps) {
  const Component = (
    PhosphorIcons as unknown as Record<
      string,
      ComponentType<{
        size?: number | string;
        weight?: string;
        className?: string;
        color?: string;
        'aria-hidden'?: boolean | 'true' | 'false';
        focusable?: boolean | 'true' | 'false';
      }>
    >
  )[name];

  if (!Component) {
    return null;
  }

  return (
    <Component
      size={size}
      weight={weight}
      color={color}
      className={`inline-block shrink-0 ${className}`}
      aria-hidden="true"
      focusable={false}
    />
  );
}
