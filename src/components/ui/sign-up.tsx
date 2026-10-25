/**
 * sign-up.tsx - Barrel Alias & Backward-Compatibility Gateway
 *
 * Komponen ini berfungsi sebagai barrel alias untuk komponen autentikasi utama (LoginPage.tsx).
 * Dipertahankan untuk kompatibilitas dependensi historis tanpa menduplikasi logika internal.
 * Seluruh impor internal baru sebaiknya langsung merujuk ke `src/ui/components/LoginPage.tsx`.
 */
export {
  AuthComponent,
  LoginPage,
  ConfettiContext,
  Confetti,
  fireConfetti,
  GoogleIcon,
  GitHubIcon,
  ArchitecturalCityBackground
} from '../../ui/components/LoginPage';
export { ArscityLogo } from '../../ui/components/ArscityLogo';

export type {
  AuthComponentProps,
  ConfettiRef,
  LoginPageProps
} from '../../ui/components/LoginPage';
