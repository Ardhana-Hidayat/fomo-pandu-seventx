import {
  type Icon as PhosphorIcon,
  ArrowCounterClockwise,
  ArrowsClockwise,
  ArrowSquareOut,
  Cards,
  CaretLeft,
  CaretRight,
  Chalkboard,
  ChartBar,
  Check,
  CheckCircle,
  Copy,
  DoorOpen,
  FilePdf,
  FileText,
  GearSix,
  Hand,
  Hash,
  Image,
  Info,
  Key,
  Link,
  ListChecks,
  ListPlus,
  Microphone,
  NotePencil,
  Pause,
  Play,
  Plus,
  QrCode,
  Question,
  Sparkle,
  SpeakerHigh,
  SpeakerSlash,
  Stop,
  Television,
  TextAa,
  TextT,
  Trash,
  UploadSimple,
  UsersThree,
  Warning,
  X,
} from '@phosphor-icons/react';

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
  | 'QrCode'
  | 'Link'
  | 'ArrowSquareOut'
  | 'Key'
  | 'X';

export interface IconProps {
  name: IconName;
  size?: number | string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  className?: string;
  color?: string;
}

const ICON_MAP: Record<IconName, PhosphorIcon> = {
  DoorOpen,
  Chalkboard,
  NotePencil,
  FileText,
  ListPlus,
  FilePdf,
  Cards,
  ListChecks,
  TextAa,
  SpeakerHigh,
  SpeakerSlash,
  Image,
  Hand,
  Play,
  Pause,
  ArrowCounterClockwise,
  CaretLeft,
  CaretRight,
  Television,
  Hash,
  UsersThree,
  ChartBar,
  GearSix,
  CheckCircle,
  ArrowsClockwise,
  Warning,
  Copy,
  Trash,
  Question,
  Check,
  Microphone,
  Stop,
  UploadSimple,
  Sparkle,
  Info,
  Plus,
  TextT,
  QrCode,
  Link,
  ArrowSquareOut,
  Key,
  X,
};

export function Icon({
  name,
  size = 28,
  weight = 'bold',
  className = '',
  color,
}: IconProps) {
  const Component = ICON_MAP[name];

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
