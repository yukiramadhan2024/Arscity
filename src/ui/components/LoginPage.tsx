import React, { useState, useRef, useEffect, createContext } from "react";
import { ArrowRight, Mail, Lock, Eye, EyeOff, ArrowLeft, X, AlertCircle, CheckCircle2, Loader, Compass } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useUIStore } from '../state/useUIStore';
import { ArscityLogo } from './ArscityLogo';

// --- CONFETTI HELPER & CONTEXT (Clean No-Op, Zero External Dependencies) ---
export type ConfettiRef = { fire: () => void } | null;
export const ConfettiContext = createContext<{ fire: () => void }>({ fire: () => {} });
export const Confetti = React.forwardRef<ConfettiRef, React.HTMLAttributes<HTMLDivElement>>((_props, _ref) => null);
Confetti.displayName = "Confetti";

export const fireConfetti = () => {
  // Pure no-op for zero external dependencies
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

// --- ARCHITECTURAL CITY ISOMETRIC SVG BACKGROUND ---
export const ArchitecturalCityBackground: React.FC = () => {
  return (
    <svg
      className="auth-architectural-bg"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
      aria-hidden="true"
    >
      <defs>
        {/* Isometric Pattern Grid */}
        <pattern id="archIsoGrid" width="60" height="104" patternUnits="userSpaceOnUse">
          <path d="M 0 52 L 60 104 M 0 52 L 60 0 M 60 52 L 0 104 M 60 52 L 0 0" stroke="rgba(10, 132, 255, 0.04)" strokeWidth="0.8" />
          <line x1="0" y1="52" x2="60" y2="52" stroke="rgba(15, 23, 42, 0.03)" strokeWidth="0.6" />
        </pattern>
        <linearGradient id="bgSolarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0A84FF" stopOpacity="0.12" />
          <stop offset="50%" stopColor="#FF9500" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FFCC00" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* 1. Blueprint Isometric Grid */}
      <rect width="100%" height="100%" fill="url(#archIsoGrid)" />

      {/* 2. Topographic Elevation Contour Lines */}
      <g stroke="rgba(15, 23, 42, 0.06)" strokeWidth="1" strokeLinecap="round">
        <path d="M -50 220 C 200 210, 420 280, 700 240 C 950 200, 1200 270, 1650 220" />
        <path d="M -50 340 C 220 310, 480 390, 780 330 C 1040 280, 1300 370, 1650 320" stroke="rgba(10, 132, 255, 0.08)" />
        <path d="M -50 460 C 240 430, 520 510, 840 440 C 1120 380, 1380 480, 1650 430" />
        <path d="M -50 580 C 260 540, 560 620, 900 550 C 1180 490, 1420 600, 1650 540" stroke="rgba(10, 132, 255, 0.08)" />
        <path d="M -50 720 C 300 680, 620 760, 960 670 C 1240 610, 1480 730, 1650 660" />
        <path d="M -50 850 C 340 810, 680 890, 1040 800 C 1300 730, 1520 860, 1650 790" stroke="rgba(10, 132, 255, 0.07)" />

        {/* Contour elevation markers */}
        <text x="90" y="215" fill="rgba(15, 23, 42, 0.25)" fontSize="9" fontFamily="var(--font-mono)">+112.50m</text>
        <text x="1350" y="325" fill="rgba(15, 23, 42, 0.25)" fontSize="9" fontFamily="var(--font-mono)">+115.00m</text>
        <text x="120" y="575" fill="rgba(15, 23, 42, 0.25)" fontSize="9" fontFamily="var(--font-mono)">+120.00m</text>
      </g>

      {/* 3. Solar Trajectory & Compass Arc */}
      <g>
        <path
          d="M 120 880 C 350 420, 1150 280, 1520 780"
          stroke="url(#bgSolarGrad)"
          strokeWidth="2.5"
          strokeDasharray="6 6"
        />
        {/* Sun Altitude Degree Rings */}
        <circle cx="1280" cy="220" r="140" stroke="rgba(10, 132, 255, 0.08)" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="1280" cy="220" r="80" stroke="rgba(255, 149, 0, 0.12)" strokeWidth="1" />
        <line x1="1280" y1="60" x2="1280" y2="380" stroke="rgba(15, 23, 42, 0.06)" strokeWidth="0.8" />
        <line x1="1120" y1="220" x2="1440" y2="220" stroke="rgba(15, 23, 42, 0.06)" strokeWidth="0.8" />
        <text x="1285" y="76" fill="rgba(10, 132, 255, 0.4)" fontSize="11" fontWeight="700" fontFamily="var(--font-mono)">N 000°</text>
        <text x="1445" y="224" fill="rgba(15, 23, 42, 0.3)" fontSize="10" fontFamily="var(--font-mono)">E 090°</text>
        <text x="1285" y="375" fill="rgba(15, 23, 42, 0.3)" fontSize="10" fontFamily="var(--font-mono)">S 180°</text>
        <text x="1080" y="224" fill="rgba(15, 23, 42, 0.3)" fontSize="10" fontFamily="var(--font-mono)">W 270°</text>
      </g>

      {/* 4. Isometric Road Corridors */}
      <g stroke="rgba(15, 23, 42, 0.07)" strokeWidth="1.2">
        {/* Main Boulevard 1 (SW to NE) */}
        <line x1="-100" y1="750" x2="680" y2="300" strokeWidth="20" stroke="rgba(15, 23, 42, 0.02)" />
        <line x1="-100" y1="740" x2="680" y2="290" stroke="rgba(10, 132, 255, 0.1)" strokeWidth="1.5" />
        <line x1="-100" y1="760" x2="680" y2="310" stroke="rgba(10, 132, 255, 0.1)" strokeWidth="1.5" />
        <line x1="-100" y1="750" x2="680" y2="300" stroke="rgba(15, 23, 42, 0.08)" strokeDasharray="8 8" strokeWidth="1" />

        {/* Boulevard 2 (NW to SE Crossing) */}
        <line x1="420" y1="120" x2="1350" y2="660" strokeWidth="20" stroke="rgba(15, 23, 42, 0.02)" />
        <line x1="420" y1="110" x2="1350" y2="650" stroke="rgba(10, 132, 255, 0.1)" strokeWidth="1.5" />
        <line x1="420" y1="130" x2="1350" y2="670" stroke="rgba(10, 132, 255, 0.1)" strokeWidth="1.5" />
        <line x1="420" y1="120" x2="1350" y2="660" stroke="rgba(15, 23, 42, 0.08)" strokeDasharray="8 8" strokeWidth="1" />

        {/* Ring Road Arc connecting sectors */}
        <path d="M 680 300 Q 1020 380 1350 660" stroke="rgba(10, 132, 255, 0.08)" strokeWidth="1.5" fill="none" />
        <path d="M 670 305 Q 1010 385 1340 665" stroke="rgba(10, 132, 255, 0.08)" strokeWidth="1.5" fill="none" />
      </g>

      {/* 5. Isometric Tropical Joglo & Modern Buildings (Left Cluster) */}
      <g stroke="rgba(15, 23, 42, 0.07)" fill="rgba(255, 255, 255, 0.35)">
        {/* Joglo Pavilion 1 (Left lower) */}
        <polygon points="180,620 230,590 280,620 230,650" stroke="rgba(10, 132, 255, 0.12)" strokeWidth="1.2" />
        <polygon points="205,605 230,575 255,605 230,620" fill="rgba(10, 132, 255, 0.04)" stroke="rgba(10, 132, 255, 0.15)" strokeWidth="1.4" />
        <line x1="230" y1="565" x2="230" y2="575" stroke="#FF9500" strokeWidth="1.5" />
        {/* Saka Guru Columns */}
        <line x1="205" y1="620" x2="205" y2="640" />
        <line x1="255" y1="620" x2="255" y2="640" />

        {/* Modern Tower 1 (Left upper) */}
        <polygon points="120,380 160,355 200,380 160,405" />
        <line x1="120" y1="380" x2="120" y2="480" />
        <line x1="160" y1="405" x2="160" y2="505" />
        <line x1="200" y1="380" x2="200" y2="480" />
        {/* Grid floor lines */}
        <line x1="120" y1="405" x2="160" y2="430" stroke="rgba(10, 132, 255, 0.08)" />
        <line x1="160" y1="430" x2="200" y2="405" stroke="rgba(10, 132, 255, 0.08)" />
        <line x1="120" y1="430" x2="160" y2="455" stroke="rgba(10, 132, 255, 0.08)" />
        <line x1="160" y1="455" x2="200" y2="430" stroke="rgba(10, 132, 255, 0.08)" />
        <line x1="120" y1="455" x2="160" y2="480" stroke="rgba(10, 132, 255, 0.08)" />
        <line x1="160" y1="480" x2="200" y2="455" stroke="rgba(10, 132, 255, 0.08)" />

        {/* Joglo Pavilion 2 (Near road) */}
        <polygon points="340,490 390,460 440,490 390,520" stroke="rgba(10, 132, 255, 0.12)" strokeWidth="1.2" />
        <polygon points="365,475 390,445 415,475 390,490" fill="rgba(10, 132, 255, 0.04)" stroke="rgba(10, 132, 255, 0.15)" strokeWidth="1.4" />
      </g>

      {/* 6. Isometric Tropical Joglo & Modern Buildings (Right Cluster) */}
      <g stroke="rgba(15, 23, 42, 0.07)" fill="rgba(255, 255, 255, 0.35)">
        {/* Modern High-Rise Tower 2 (Right skyline) */}
        <polygon points="1320,440 1370,410 1420,440 1370,470" />
        <line x1="1320" y1="440" x2="1320" y2="600" />
        <line x1="1370" y1="470" x2="1370" y2="630" />
        <line x1="1420" y1="440" x2="1420" y2="600" />
        {/* Vertical curtain mullions */}
        <line x1="1345" y1="455" x2="1345" y2="615" stroke="rgba(10, 132, 255, 0.08)" />
        <line x1="1395" y1="455" x2="1395" y2="615" stroke="rgba(10, 132, 255, 0.08)" />
        {/* Floors */}
        <line x1="1320" y1="480" x2="1370" y2="510" stroke="rgba(10, 132, 255, 0.08)" />
        <line x1="1370" y1="510" x2="1420" y2="480" stroke="rgba(10, 132, 255, 0.08)" />
        <line x1="1320" y1="520" x2="1370" y2="550" stroke="rgba(10, 132, 255, 0.08)" />
        <line x1="1370" y1="550" x2="1420" y2="520" stroke="rgba(10, 132, 255, 0.08)" />
        <line x1="1320" y1="560" x2="1370" y2="590" stroke="rgba(10, 132, 255, 0.08)" />
        <line x1="1370" y1="590" x2="1420" y2="560" stroke="rgba(10, 132, 255, 0.08)" />

        {/* Joglo Pavilion 3 (Right lower) */}
        <polygon points="1200,680 1250,650 1300,680 1250,710" stroke="rgba(10, 132, 255, 0.12)" strokeWidth="1.2" />
        <polygon points="1225,665 1250,635 1275,665 1250,680" fill="rgba(10, 132, 255, 0.04)" stroke="rgba(10, 132, 255, 0.15)" strokeWidth="1.4" />
      </g>
    </svg>
  );
};

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
          z-index: var(--z-auth, 70);
          background: radial-gradient(circle at 50% 45%, #FFF8F0 0%, #F1F5F9 52%, #E8EEF5 100%);
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
          z-index: 10;
          width: 100%;
          max-width: 680px;
          border-radius: 28px;
          overflow: hidden;
          padding: 48px 44px;
          background: rgba(235, 242, 250, 0.72);
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          border: 1.5px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.14);
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
          gap: 12px;
          margin-bottom: 24px;
          padding: 8px 20px 8px 10px;
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 9999px;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
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
          color: var(--label);
          letter-spacing: -0.01em;
        }
        .auth-headline {
          font-family: var(--font-sans);
          font-size: 40px;
          font-weight: 700;
          color: var(--label);
          letter-spacing: -0.03em;
          margin-bottom: 10px;
          line-height: 1.15;
        }
        @media (max-width: 640px) {
          .auth-headline {
            font-size: 30px;
          }
        }
        .auth-subhead {
          font-size: 14px;
          font-weight: 500;
          color: var(--label-secondary);
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
          border: 1.5px solid rgba(15, 23, 42, 0.12);
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
          font-size: 14px;
          font-weight: 600;
          color: #0F172A;
          cursor: pointer;
          transition: all 150ms ease-out;
          outline: none;
        }
        .auth-pill-btn:hover {
          background-color: #F8FAFC;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
          border-color: rgba(15, 23, 42, 0.22);
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
          background-color: rgba(15, 23, 42, 0.12);
          flex: 1;
        }
        .auth-divider-text {
          font-size: 11px;
          font-weight: 700;
          color: #64748B;
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
          background: #FFFFFF;
          border: 1.5px solid rgba(15, 23, 42, 0.14);
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
          box-sizing: border-box;
          margin: 0 auto;
          transition: all 180ms ease-out;
        }
        .auth-input-pill:focus-within {
          background-color: #FFFFFF;
          border-color: #007AFF;
          box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.2), 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        .auth-input-field {
          flex: 1;
          height: 100%;
          border: none;
          background: transparent;
          font-size: 14px;
          font-weight: 500;
          color: #0F172A;
          outline: none;
          box-sizing: border-box;
        }
        .auth-input-field::placeholder {
          color: #94A3B8;
        }
        .auth-submit-arrow {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: var(--accent);
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
          filter: brightness(1.1);
          transform: scale(1.06);
        }
        .auth-sandbox-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 18px;
          padding: 8px 18px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 600;
          color: #007AFF;
          background: rgba(10, 132, 255, 0.08);
          border: 1px solid rgba(10, 132, 255, 0.22);
          cursor: pointer;
          transition: all 150ms ease-out;
        }
        .auth-sandbox-btn:hover {
          color: #0056B3;
          background-color: rgba(10, 132, 255, 0.16);
          transform: translateY(-1px);
        }
        .auth-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 16px;
          font-size: 13px;
          font-weight: 500;
          color: var(--label-secondary);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color 150ms ease-out;
        }
        .auth-back-btn:hover {
          color: var(--label);
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
                backgroundColor: 'var(--surface)',
                borderRadius: '24px',
                padding: '32px',
                width: '100%',
                maxWidth: '360px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                textAlign: 'center',
                boxShadow: 'var(--shadow-modal)',
                border: '1px solid var(--hairline)'
              }}
            >
              {modalStatus === "error" && (
                <>
                  <button
                    onClick={closeModal}
                    style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--label-tertiary)' }}
                  >
                    <X style={{ width: '20px', height: '20px' }} />
                  </button>
                  <AlertCircle style={{ width: '48px', height: '48px', color: 'var(--bad, #EF4444)' }} strokeWidth={1.75} />
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--label)', margin: 0, lineHeight: 1.5 }}>
                    {modalErrorMessage}
                  </p>
                  <button
                    onClick={closeModal}
                    style={{
                      marginTop: '8px',
                      padding: '10px 24px',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--accent)',
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
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--label)', margin: 0 }}>
                    {modalSteps[modalStepIndex].message}
                  </p>
                </div>
              )}

              {modalStatus === "success" && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
                  <CheckCircle2 style={{ width: '48px', height: '48px', color: 'var(--good, #10B981)' }} strokeWidth={2} />
                  <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--label)', margin: 0 }}>
                    Sesi Kerja Siap
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Architectural City Isometric Background */}
      <ArchitecturalCityBackground />

      {/* Main Glassmorphic Card (Standard Laboratorium Analisis) */}
      <div className="auth-card-frame">
        {/* Multi-Color Gradient Mesh Background Inside Card */}
        <div className="auth-mesh-bg">
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255, 255, 255, 0.45)' }} />
          <div className="auth-mesh-peach" style={{ opacity: 0.28 }} />
          <div className="auth-mesh-slate" style={{ opacity: 0.20 }} />
          <div className="auth-mesh-amber-top" style={{ opacity: 0.20 }} />
        </div>

        {/* Card Content Layer */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          {/* Top Logo Badge */}
          <div className="auth-logo-badge">
            <ArscityLogo size={36} showText={true} badge="STUDIO" textColor="#0F172A" />
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
                <h1 className="auth-headline" style={{ color: '#0F172A' }}>
                  Selamat Datang di Arscity
                </h1>
                <p className="auth-subhead" style={{ color: '#475569' }}>
                  Lanjutkan Masuk dengan
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
                  <span className="auth-divider-text">ATAU</span>
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
                <h1 className="auth-headline" style={{ color: '#0F172A' }}>
                  Buat Kata Sandi
                </h1>
                <p className="auth-subhead" style={{ color: '#475569', marginBottom: 0 }}>
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
                <h1 className="auth-headline" style={{ color: '#0F172A' }}>
                  Konfirmasi Kata Sandi
                </h1>
                <p className="auth-subhead" style={{ color: '#475569', marginBottom: 0 }}>
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
                <div className="auth-input-pill" style={{ background: 'rgba(255, 255, 255, 0.85)', border: '1px solid rgba(15, 23, 42, 0.12)' }}>
                  <Mail style={{ width: '18px', height: '18px', color: '#64748B', marginRight: '10px', flexShrink: 0 }} />
                  <input
                    ref={emailInputRef}
                    type="email"
                    placeholder="nama@arsitek.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="auth-input-field"
                    autoComplete="email"
                    aria-label="Alamat Email"
                    style={{ color: '#0F172A' }}
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
                  style={{ color: '#475569' }}
                >
                  <ArscityLogo size={16} />
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
        zIndex: 'var(--z-auth, 70)' as any,
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
