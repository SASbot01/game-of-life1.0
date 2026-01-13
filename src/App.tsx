import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useLevelUp } from "@/hooks/useLevelUp";
import { useHpDecay } from "@/hooks/useHpDecay";
import { SoundProvider } from "@/contexts/SoundContext";
import { lazy, Suspense, useEffect } from "react";
import { SpaceLayout } from "@/components/layout/SpaceLayout";
import { setGlobalSoundEnabled } from "@/hooks/useSoundEffects";

const Auth = lazy(() => import("./pages/Auth"));
const SetPassword = lazy(() => import("./pages/SetPassword"));
const Setup = lazy(() => import("./pages/Setup"));
const MainDeck = lazy(() => import("./pages/MainDeck"));
const BioDome = lazy(() => import("./pages/BioDome"));
const OpsCenter = lazy(() => import("./pages/OpsCenter"));
const TheVault = lazy(() => import("./pages/TheVault"));
const Chronos = lazy(() => import("./pages/Chronos"));
const Cortex = lazy(() => import("./pages/Cortex"));
const Settings = lazy(() => import("./pages/Settings"));
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-primary font-mono animate-pulse">INITIALIZING SYSTEM...</div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  useLevelUp(); // Auto level-up hook
  useHpDecay(); // HP decay for missed habits
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile && !profile.is_onboarded) return <Navigate to="/setup" replace />;

  return <>{children}</>;
}

function SetupRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.is_onboarded) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (user) {
    if (profile && !profile.is_onboarded) return <Navigate to="/setup" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/setup" element={<SetupRoute><Setup /></SetupRoute>} />

        {/* Protected routes with SpaceLayout */}
        <Route element={<ProtectedRoute><SpaceLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<MainDeck />} />
          <Route path="/command" element={<CommandCenter />} />
          <Route path="/bio" element={<BioDome />} />
          <Route path="/ops" element={<OpsCenter />} />
          <Route path="/vault" element={<TheVault />} />
          <Route path="/chronos" element={<Chronos />} />
          <Route path="/cortex" element={<Cortex />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function AppContent() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

// Sync sound context with global state
function SoundSync({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem('gol-sound-enabled');
    setGlobalSoundEnabled(stored !== 'false');
  }, []);
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SoundProvider>
      <SoundSync>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </SoundSync>
    </SoundProvider>
  </QueryClientProvider>
);

export default App;
