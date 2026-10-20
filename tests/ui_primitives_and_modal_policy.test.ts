import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../src/ui/state/useUIStore';
import { spring, fade } from '../src/ui/motion/presets';

describe('UI/UX Architecture: Single Modal Exclusivity & Theme Token System', () => {
  beforeEach(() => {
    // Reset all modals
    useUIStore.getState().closeModal();
  });

  it('enforces single active modal at all times with openModal', () => {
    const store = useUIStore.getState();

    // 1. Open glossary
    store.openModal('glossary');
    let state = useUIStore.getState();
    expect(state.activeModal).toBe('glossary');
    expect(state.showGlossary).toBe(true);
    expect(state.showSettings).toBe(false);
    expect(state.showStyles).toBe(false);
    expect(state.showHelp).toBe(false);

    // 2. Open settings: automatically collapses glossary
    store.openModal('settings');
    state = useUIStore.getState();
    expect(state.activeModal).toBe('settings');
    expect(state.showGlossary).toBe(false);
    expect(state.showSettings).toBe(true);

    // 3. Open help modal: closes settings
    store.openModal('help');
    state = useUIStore.getState();
    expect(state.activeModal).toBe('help');
    expect(state.showHelp).toBe(true);
    expect(state.showSettings).toBe(false);

    // 4. Close modal: all modals are closed
    store.closeModal();
    state = useUIStore.getState();
    expect(state.activeModal).toBeNull();
    expect(state.showHelp).toBe(false);
    expect(state.showGlossary).toBe(false);
    expect(state.showSettings).toBe(false);
  });

  it('maintains backward compatibility with legacy boolean setters', () => {
    const store = useUIStore.getState();

    // Opening via legacy setter
    store.setShowStyles(true);
    let state = useUIStore.getState();
    expect(state.activeModal).toBe('styles');
    expect(state.showStyles).toBe(true);
    expect(state.showGlossary).toBe(false);

    // Opening quiz via legacy setter closes styles
    store.setShowQuiz(true);
    state = useUIStore.getState();
    expect(state.activeModal).toBe('quiz');
    expect(state.showQuiz).toBe(true);
    expect(state.showStyles).toBe(false);

    // Closing via legacy setter
    store.setShowQuiz(false);
    state = useUIStore.getState();
    expect(state.activeModal).toBeNull();
    expect(state.showQuiz).toBe(false);
  });

  it('handles theme switcher states and resolved values correctly', () => {
    const store = useUIStore.getState();

    // Test explicit dark mode
    store.setThemeMode('dark');
    expect(useUIStore.getState().themeMode).toBe('dark');
    expect(useUIStore.getState().resolvedTheme).toBe('dark');

    // Test explicit light mode
    store.setThemeMode('light');
    expect(useUIStore.getState().themeMode).toBe('light');
    expect(useUIStore.getState().resolvedTheme).toBe('light');

    // Return to default dark mode
    store.setThemeMode('dark');
    expect(useUIStore.getState().themeMode).toBe('dark');
  });

  it('provides consistent spring physics and fade presets', () => {
    expect(spring.panel).toBeDefined();
    expect((spring.panel as any).stiffness).toBe(420);
    expect((spring.panel as any).damping).toBe(34);

    expect(spring.press.scale).toBe(0.95);
    expect(spring.hover.scale).toBe(1.04);

    expect(fade.modal).toBeDefined();
    expect(fade.modal.initial.opacity).toBe(0);
    expect(fade.modal.animate.opacity).toBe(1);
    expect(fade.modal.exit.opacity).toBe(0);

    expect(fade.backdrop).toBeDefined();
  });
});
