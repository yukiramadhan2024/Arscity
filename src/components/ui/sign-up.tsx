/**
 * sign-up.tsx - Barrel Alias & Backward-Compatibility Gateway
 *
 * Komponen ini berfungsi sebagai barrel alias untuk komponen autentikasi utama (LoginPage.tsx).
 * Dipertahankan untuk kompatibilitas dependensi historis tanpa menduplikasi logika internal.
 * Seluruh impor internal baru sebaiknya langsung merujuk ke `src/ui/components/LoginPage.tsx`.
 */
export {
  LoginPage,
  LoginPage as AuthComponent,
  ArchitecturalCityBackground
} from '../../ui/components/LoginPage';

export { ArscityLogo } from '../../ui/components/ArscityLogo';

export type {
  LoginPageProps,
  LoginPageProps as AuthComponentProps
} from '../../ui/components/LoginPage';
