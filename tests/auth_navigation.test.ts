import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../src/ui/state/useUIStore';

describe('Auth & Screen Navigation State Management (Auth -> Hub -> Game)', () => {
  beforeEach(() => {
    // Reset auth state
    useUIStore.getState().logout();
  });

  it('starts at auth screen when logged out', () => {
    const state = useUIStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.userEmail).toBeNull();
    expect(state.currentScreen).toBe('auth');
  });

  it('transitions from auth to hub on successful credentials login', () => {
    const store = useUIStore.getState();
    store.login('arsitek.tropis@ugm.ac.id');

    const updated = useUIStore.getState();
    expect(updated.isLoggedIn).toBe(true);
    expect(updated.userEmail).toBe('arsitek.tropis@ugm.ac.id');
    expect(updated.currentScreen).toBe('hub');
    expect(updated.isMapHubOpen).toBe(true);
  });

  it('transitions from auth to hub on guest / demo login', () => {
    const store = useUIStore.getState();
    store.loginAsGuest();

    const updated = useUIStore.getState();
    expect(updated.isLoggedIn).toBe(true);
    expect(updated.userEmail).toBe('Tamu Demo Arscity');
    expect(updated.currentScreen).toBe('hub');
  });

  it('transitions from hub to game when starting game session', () => {
    const store = useUIStore.getState();
    store.login('peneliti@itb.ac.id');
    expect(useUIStore.getState().currentScreen).toBe('hub');

    store.startGame();
    expect(useUIStore.getState().currentScreen).toBe('game');
    expect(useUIStore.getState().isMapHubOpen).toBe(false);
  });

  it('transitions from game back to hub when opening map hub (Ganti Map)', () => {
    const store = useUIStore.getState();
    store.login('peneliti@itb.ac.id');
    store.startGame();
    expect(useUIStore.getState().currentScreen).toBe('game');

    store.openMapHub();
    expect(useUIStore.getState().currentScreen).toBe('hub');
    expect(useUIStore.getState().isMapHubOpen).toBe(true);
  });

  it('transitions back to auth and clears credentials on logout', () => {
    const store = useUIStore.getState();
    store.login('alumni@ui.ac.id');
    store.startGame();
    expect(useUIStore.getState().isLoggedIn).toBe(true);

    store.logout();
    const loggedOut = useUIStore.getState();
    expect(loggedOut.isLoggedIn).toBe(false);
    expect(loggedOut.userEmail).toBeNull();
    expect(loggedOut.currentScreen).toBe('auth');
  });
});
