'use client';

import { usePreferences } from './PreferencesContext';
import { Button } from './Button';
import { Icon } from './Icon';

export function DisplayPreferencesTrigger({ className = '' }: { className?: string }) {
  const { openSheet } = usePreferences();

  return (
    <Button
      variant="secondary"
      size="normal"
      onClick={openSheet}
      icon={<Icon name="TextAa" size={24} />}
      className={className}
      aria-label="Buka pengaturan tampilan"
    >
      Tampilan
    </Button>
  );
}
