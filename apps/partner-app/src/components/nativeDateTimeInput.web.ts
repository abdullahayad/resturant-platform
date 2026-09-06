// Shared polish for the browser-native <input type="date"/"time"> fallback used by
// DateField.web.tsx and TimeField.web.tsx. Inline React styles can't reach :hover,
// :focus, or the browser's own calendar/clock icon (::-webkit-calendar-picker-indicator),
// so this injects one small stylesheet the first time either field mounts, and the
// fields feed it their theme colors via CSS custom properties (set inline per-instance).
export const NATIVE_DT_CLASS = 'liqeta-native-dt-input';

let injected = false;

export function ensureNativeDateTimeStyles() {
  if (injected || typeof document === 'undefined') return;
  injected = true;

  const style = document.createElement('style');
  style.textContent = `
    .${NATIVE_DT_CLASS} {
      cursor: pointer;
      border-color: var(--dt-border-default);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .${NATIVE_DT_CLASS}:hover {
      border-color: var(--dt-border-hover);
    }
    .${NATIVE_DT_CLASS}:focus {
      outline: none;
      border-color: var(--dt-border-focus);
      box-shadow: 0 0 0 3px var(--dt-glow);
    }
    .${NATIVE_DT_CLASS}::-webkit-calendar-picker-indicator {
      cursor: pointer;
      border-radius: 6px;
      padding: 3px;
      margin-inline-start: 6px;
      transition: background-color 0.15s ease;
    }
    .${NATIVE_DT_CLASS}::-webkit-calendar-picker-indicator:hover {
      background-color: var(--dt-icon-hover-bg);
    }
  `;
  document.head.appendChild(style);
}
