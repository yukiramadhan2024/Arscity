import React, { useState, useRef, useEffect, createContext } from "react";
import { ArrowRight, Mail, Lock, Eye, EyeOff, ArrowLeft, X, AlertCircle, CheckCircle2, Loader, Compass } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useUIStore } from '../state/useUIStore';

// --- CONFETTI HELPER & CONTEXT ---
export type ConfettiRef = { fire: () => void } | null;
export const ConfettiContext = createContext<{ fire: () => void }>({ fire: () => {} });
export const Confetti = React.forwardRef<ConfettiRef, React.HTMLAttributes<HTMLDivElement>>((_props, _ref) => null);
Confetti.displayName = "Confetti";

export const fireConfetti = () => {
  try {
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0A84FF', '#34C759', '#FF9500', '#FF2D55', '#AF52DE']
    });
  } catch (_e) {
    // Graceful fallback for non-browser environments
  }
};

// --- BRANDED SVG ICONS ---
export const GoogleIcon = ({ className = "w-5 h-5", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0, ...style }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export const GitHubIcon = ({ className = "w-5 h-5", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={{ width: '20px', height: '20px', flexShrink: 0, ...style }} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

// --- MODAL PROGRESSION STEPS ---
const modalSteps = [
  { message: "Memverifikasi sesi kerja...", icon: <Loader style={{ width: '36px', height: '36px', color: '#2563EB', animation: 'spin 1s linear infinite' }} strokeWidth={2}/> },
  { message: "Memuat kalibrasi tata ruang & SNI...", icon: <Loader style={{ width: '36px', height: '36px', color: '#2563EB', animation: 'spin 1s linear infinite' }} strokeWidth={2}/> },
  { message: "Menyiapkan World Hub Yogyakarta...", icon: <Loader style={{ width: '36px', height: '36px', color: '#2563EB', animation: 'spin 1s linear infinite' }} strokeWidth={2}/> },
  { message: "Sesi Siap", icon: <CheckCircle2 style={{ width: '36px', height: '36px', color: '#10B981' }} strokeWidth={2}/> }
];
const TEXT_LOOP_INTERVAL_MS = 800;

export interface AuthComponentProps {
  logo?: React.ReactNode;
  brandName?: string;
  onAuthSuccess?: (payload: { email: string; provider: "email" | "google" | "github" | "guest" }) => void;
}

export const AuthComponent: React.FC<AuthComponentProps> = ({
  brandName = "Arscity",
  onAuthSuccess,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authStep, setAuthStep] = useState<"email" | "password" | "confirmPassword">("email");
  const [modalStatus, setModalStatus] = useState<"closed" | "loading" | "error" | "success">("closed");
  const [modalStepIndex, setModalStepIndex] = useState(0);
  const [modalErrorMessage, setModalErrorMessage] = useState("");

  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  const isPasswordValid = password.length >= 6;
  const isConfirmPasswordValid = confirmPassword.length >= 6;

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authStep === "email") {
      emailInputRef.current?.focus();
    } else if (authStep === "password") {
      passwordInputRef.current?.focus();
    } else if (authStep === "confirmPassword") {
      confirmPasswordInputRef.current?.focus();
    }
  }, [authStep]);

  const triggerSuccessSequence = (userEmail: string, provider: "email" | "google" | "github" | "guest") => {
    setModalStatus("loading");
    setModalStepIndex(0);

    const stepInterval = setInterval(() => {
      setModalStepIndex((prev) => {
        if (prev < modalSteps.length - 2) {
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          setModalStatus("success");
          fireConfetti();
          setTimeout(() => {
            onAuthSuccess?.({ email: userEmail, provider });
          }, 850);
          return modalSteps.length - 1;
        }
      });
    }, TEXT_LOOP_INTERVAL_MS);
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalStatus !== "closed") return;

    if (authStep === "email") {
      if (isEmailValid) setAuthStep("password");
      return;
    }

    if (authStep === "password") {
      if (isPasswordValid) setAuthStep("confirmPassword");
      return;
    }

    if (authStep === "confirmPassword") {
      if (password !== confirmPassword) {
        setModalErrorMessage("Sandi tidak cocok. Periksa kembali masukan Anda.");
        setModalStatus("error");
      } else {
        triggerSuccessSequence(email, "email");
      }
    }
  };

  const handleQuickProviderAuth = (provider: "google" | "github" | "guest") => {
    if (modalStatus !== "closed") return;
    const defaultEmail =
      provider === "google"
        ? "architect@google.arscity.id"
        : provider === "github"
        ? "developer@github.arscity.id"
        : "guest@arscity.id";
    setEmail(defaultEmail);
    triggerSuccessSequence(defaultEmail, provider);
  };

  const handleProgressStep = () => {
    if (authStep === "email" && isEmailValid) {
      setAuthStep("password");
    } else if (authStep === "password" && isPasswordValid) {
      setAuthStep("confirmPassword");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleProgressStep();
    }
  };

  const handleGoBack = () => {
    if (authStep === "confirmPassword") {
      setAuthStep("password");
      setConfirmPassword("");
    } else if (authStep === "password") {
      setAuthStep("email");
    }
  };

  const closeModal = () => {
    setModalStatus("closed");
    setModalErrorMessage("");
  };

  return (
    <div className="auth-root-container">
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .auth-root-container {
          position: fixed;
          inset: 0;
          z-index: 200;
          background-color: #090D16;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          overflow: hidden;
          box-sizing: border-box;
          font-family: var(--font-sans);
          user-select: none;
        }
        .auth-card-frame {
          position: relative;
          width: 100%;
          max-width: 720px;
          border-radius: 32px;
          overflow: hidden;
          padding: 52px 48px;
          background-color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 25px 70px -15px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-sizing: border-box;
        }
        @media (max-width: 640px) {
          .auth-card-frame {
            padding: 36px 20px;
            border-radius: 24px;
          }
        }
        .auth-mesh-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          border-radius: 32px;
        }
        .auth-mesh-peach {
          position: absolute;
          right: -80px;
          bottom: -80px;
          width: 480px;
          height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(251, 146, 60, 0.48) 0%, rgba(254, 215, 170, 0.35) 45%, rgba(255, 255, 255, 0) 72%);
          filter: blur(28px);
        }
        .auth-mesh-slate {
          position: absolute;
          left: -80px;
          bottom: -80px;
          width: 440px;
          height: 440px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(148, 163, 184, 0.42) 0%, rgba(203, 213, 225, 0.28) 45%, rgba(255, 255, 255, 0) 70%);
          filter: blur(28px);
        }
        .auth-mesh-amber-top {
          position: absolute;
          right: 60px;
          top: 10px;
          width: 260px;
          height: 260px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(254, 215, 170, 0.28) 0%, rgba(255, 255, 255, 0) 70%);
          filter: blur(24px);
        }
        .auth-logo-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 24px;
        }
        .auth-logo-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background-color: #2563EB;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 2px rgba(37, 99, 235, 0.3);
        }
        .auth-logo-text {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          letter-spacing: -0.01em;
        }
        .auth-headline {
          font-family: var(--font-sans);
          font-size: 44px;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.03em;
          margin-bottom: 10px;
          line-height: 1.15;
        }
        @media (max-width: 640px) {
          .auth-headline {
            font-size: 32px;
          }
        }
        .auth-subhead {
          font-size: 14px;
          font-weight: 500;
          color: #6B7280;
          margin-bottom: 24px;
        }
        .auth-social-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          margin-bottom: 24px;
        }
        .auth-pill-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 10px 24px;
          border-radius: 9999px;
          background-color: #FFFFFF;
          border: 1px solid #E5E7EB;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
          font-size: 14px;
          font-weight: 500;
          color: #1F2937;
          cursor: pointer;
          transition: all 150ms ease-out;
          outline: none;
        }
        .auth-pill-btn:hover {
          background-color: #F9FAFB;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
          border-color: #D1D5DB;
          transform: translateY(-1px);
        }
        .auth-pill-btn:active {
          transform: translateY(0);
        }
        .auth-divider-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 280px;
          max-width: 100%;
          margin: 0 auto 24px;
          gap: 12px;
        }
        .auth-divider-line {
          height: 1px;
          background-color: #E5E7EB;
          flex: 1;
        }
        .auth-divider-text {
          font-size: 11px;
          font-weight: 600;
          color: #9CA3AF;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .auth-input-pill {
          position: relative;
          display: flex;
          align-items: center;
          width: 360px;
          max-width: 100%;
          height: 48px;
          padding: 0 16px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid #D1D5DB;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          box-sizing: border-box;
          margin: 0 auto;
          transition: all 180ms ease-out;
        }
        .auth-input-pill:focus-within {
          background-color: #FFFFFF;
          border-color: #9CA3AF;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15), 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        .auth-input-field {
          flex: 1;
          height: 100%;
          border: none;
          background: transparent;
          font-size: 14px;
          color: #111827;
          outline: none;
          box-sizing: border-box;
        }
        .auth-input-field::placeholder {
          color: #9CA3AF;
        }
        .auth-submit-arrow {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: #111827;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          flex-shrink: 0;
          margin-left: 8px;
          transition: all 150ms ease-out;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        .auth-submit-arrow:hover {
          background-color: #1F2937;
          transform: scale(1.06);
        }
        .auth-sandbox-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 18px;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          color: #6B7280;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 150ms ease-out;
        }
        .auth-sandbox-btn:hover {
          color: #111827;
          background-color: rgba(0, 0, 0, 0.04);
        }
        .auth-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 16px;
          font-size: 13px;
          font-weight: 500;
          color: #6B7280;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color 150ms ease-out;
        }
        .auth-back-btn:hover {
          color: #111827;
        }
      `}</style>

      {/* Loading & Status Modal Dialog */}
      <AnimatePresence>
        {modalStatus !== "closed" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 250,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              padding: '16px'
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              style={{
                position: 'relative',
                backgroundColor: '#FFFFFF',
                borderRadius: '24px',
                padding: '32px',
                width: '100%',
                maxWidth: '360px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                textAlign: 'center',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
                border: '1px solid #E5E7EB'
              }}
            >
              {modalStatus === "error" && (
                <>
                  <button
                    onClick={closeModal}
                    style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}
                  >
                    <X style={{ width: '20px', height: '20px' }} />
                  </button>
                  <AlertCircle style={{ width: '48px', height: '48px', color: '#EF4444' }} strokeWidth={1.75} />
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0, lineHeight: 1.5 }}>
                    {modalErrorMessage}
                  </p>
                  <button
                    onClick={closeModal}
                    style={{
                      marginTop: '8px',
                      padding: '10px 24px',
                      borderRadius: '9999px',
                      backgroundColor: '#111827',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Coba Lagi
                  </button>
                </>
              )}

              {modalStatus === "loading" && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
                  {modalSteps[modalStepIndex].icon}
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
                    {modalSteps[modalStepIndex].message}
                  </p>
                </div>
              )}

              {modalStatus === "success" && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
                  <CheckCircle2 style={{ width: '48px', height: '48px', color: '#10B981' }} strokeWidth={2} />
                  <p style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    Sesi Kerja Siap
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Glassmorphic Card */}
      <div className="auth-card-frame">
        {/* Multi-Color Gradient Mesh Background Inside Card */}
        <div className="auth-mesh-bg">
          <div style={{ position: 'absolute', inset: 0, backgroundColor: '#FFFFFF' }} />
          <div className="auth-mesh-peach" />
          <div className="auth-mesh-slate" />
          <div className="auth-mesh-amber-top" />
        </div>

        {/* Card Content Layer */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          {/* Top Logo Badge */}
          <div className="auth-logo-badge">
            <div className="auth-logo-icon">
              <Compass style={{ width: '18px', height: '18px' }} strokeWidth={2} />
            </div>
            <span className="auth-logo-text">
              {brandName || "Arscity"}
            </span>
          </div>

          {/* Dynamic Heading & Subtitle */}
          <AnimatePresence mode="wait">
            {authStep === "email" && (
              <motion.div
                key="step-email-header"
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
              >
                <h1 className="auth-headline">
                  Get started with Us
                </h1>
                <p className="auth-subhead">
                  Continue with
                </p>

                {/* Social Login Buttons */}
                <div className="auth-social-row">
                  <button
                    type="button"
                    onClick={() => handleQuickProviderAuth("google")}
                    className="auth-pill-btn"
                  >
                    <GoogleIcon />
                    <span>Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickProviderAuth("github")}
                    className="auth-pill-btn"
                  >
                    <GitHubIcon />
                    <span>GitHub</span>
                  </button>
                </div>

                {/* Divider Line */}
                <div className="auth-divider-wrap">
                  <div className="auth-divider-line" />
                  <span className="auth-divider-text">OR</span>
                  <div className="auth-divider-line" />
                </div>
              </motion.div>
            )}

            {authStep === "password" && (
              <motion.div
                key="step-pwd-header"
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: '24px' }}
              >
                <h1 className="auth-headline">
                  Create your password
                </h1>
                <p className="auth-subhead" style={{ marginBottom: 0 }}>
                  Gunakan minimal 6 karakter untuk otentikasi sesi studio.
                </p>
              </motion.div>
            )}

            {authStep === "confirmPassword" && (
              <motion.div
                key="step-confirm-header"
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: '24px' }}
              >
                <h1 className="auth-headline">
                  Confirm your password
                </h1>
                <p className="auth-subhead" style={{ marginBottom: 0 }}>
                  Ketik ulang kata sandi Anda untuk verifikasi masukan.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interactive Input Form */}
          <form
            onSubmit={handleFinalSubmit}
            style={{ width: '100%', maxWidth: '360px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            {authStep === "email" && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="auth-input-pill">
                  <Mail style={{ width: '18px', height: '18px', color: '#9CA3AF', marginRight: '10px', flexShrink: 0 }} />
                  <input
                    ref={emailInputRef}
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="auth-input-field"
                    autoComplete="email"
                    aria-label="Alamat Email"
                  />
                  {isEmailValid && (
                    <button
                      type="button"
                      onClick={handleProgressStep}
                      className="auth-submit-arrow"
                      aria-label="Lanjutkan ke kata sandi"
                    >
                      <ArrowRight style={{ width: '15px', height: '15px' }} />
                    </button>
                  )}
                </div>

                {/* Masuk Tanpa Akun / Sandbox Mode */}
                <button
                  type="button"
                  onClick={() => handleQuickProviderAuth("guest")}
                  className="auth-sandbox-btn"
                >
                  <Compass style={{ width: '15px', height: '15px', color: '#2563EB' }} />
                  <span>Masuk Tanpa Akun (Mode Sandbox)</span>
                </button>
              </div>
            )}

            {authStep === "password" && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="auth-input-pill">
                  <Lock style={{ width: '18px', height: '18px', color: '#9CA3AF', marginRight: '10px', flexShrink: 0 }} />
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? "text" : "password"}
                    placeholder="Kata Sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="auth-input-field"
                    autoComplete="new-password"
                    aria-label="Kata Sandi"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF', padding: '4px', marginRight: '4px', display: 'flex', alignItems: 'center' }}
                    aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                  >
                    {showPassword ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                  </button>
                  {isPasswordValid && (
                    <button
                      type="button"
                      onClick={handleProgressStep}
                      className="auth-submit-arrow"
                      aria-label="Lanjutkan ke konfirmasi sandi"
                    >
                      <ArrowRight style={{ width: '15px', height: '15px' }} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleGoBack}
                  className="auth-back-btn"
                >
                  <ArrowLeft style={{ width: '14px', height: '14px' }} />
                  <span>Kembali</span>
                </button>
              </div>
            )}

            {authStep === "confirmPassword" && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="auth-input-pill">
                  <Lock style={{ width: '18px', height: '18px', color: '#9CA3AF', marginRight: '10px', flexShrink: 0 }} />
                  <input
                    ref={confirmPasswordInputRef}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Konfirmasi Kata Sandi"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="auth-input-field"
                    autoComplete="new-password"
                    aria-label="Konfirmasi Kata Sandi"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF', padding: '4px', marginRight: '4px', display: 'flex', alignItems: 'center' }}
                    aria-label={showConfirmPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                  >
                    {showConfirmPassword ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                  </button>
                  {isConfirmPasswordValid && (
                    <button
                      type="submit"
                      className="auth-submit-arrow"
                      aria-label="Selesaikan Masuk Studio"
                    >
                      <ArrowRight style={{ width: '15px', height: '15px' }} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleGoBack}
                  className="auth-back-btn"
                >
                  <ArrowLeft style={{ width: '14px', height: '14px' }} />
                  <span>Kembali</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export interface LoginPageProps {
  onSuccess?: () => void;
}

/**
 * LoginPage.tsx
 * Canonical unified authentication entrypoint for Arscity.
 * Bridges Zustand UIStore (login, loginAsGuest) with the glassmorphic AuthComponent presentation layer.
 */
export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login, loginAsGuest } = useUIStore();

  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
      aria-label="Gerbang Masuk Arscity"
    >
      <AuthComponent
        brandName="ARSCITY"
        onAuthSuccess={({ email, provider }) => {
          if (provider === 'guest') {
            loginAsGuest();
          } else {
            login(email);
          }
          if (onSuccess) {
            onSuccess();
          }
        }}
      />
    </main>
  );
};
