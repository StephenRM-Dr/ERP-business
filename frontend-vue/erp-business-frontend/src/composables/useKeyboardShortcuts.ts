import { onMounted, onUnmounted } from 'vue';

export interface KeyboardShortcut {
  /** Tecla principal (e.g. 'u', 'b', '?') */
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  /** Descripción visible en el panel de ayuda */
  description: string;
  /** Grupo para agrupar en el panel */
  group: string;
  /** Acción a ejecutar */
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  function handleKeydown(event: KeyboardEvent): void {
    // Ignorar si el foco está en un input, textarea o select
    const target = event.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
      return;
    }

    for (const shortcut of shortcuts) {
      const matchKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const matchCtrl = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const matchAlt = shortcut.alt ? event.altKey : !event.altKey;
      const matchShift = shortcut.shift ? event.shiftKey : !event.shiftKey;

      if (matchKey && matchCtrl && matchAlt && matchShift) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
}

/** Genera el texto legible del atajo, e.g. "Ctrl+U" */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  parts.push(shortcut.key.toUpperCase());
  return parts.join('+');
}
