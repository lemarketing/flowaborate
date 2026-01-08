import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Collaborations from "./pages/Collaborations";
import CollaborationDetail from "./pages/CollaborationDetail";
import Workspaces from "./pages/Workspaces";
import Settings from "./pages/Settings";
import GuestInvite from "./pages/GuestInvite";
import GuestDashboard from "./pages/GuestDashboard";
import Reschedule from "./pages/Reschedule";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/collaborations" element={<Collaborations />} />
            <Route path="/dashboard/collaborations/:id" element={<CollaborationDetail />} />
            <Route path="/dashboard/workspaces" element={<Workspaces />} />
            <Route path="/dashboard/settings" element={<Settings />} />
            <Route path="/invite/:token" element={<GuestInvite />} />
            <Route path="/guest" element={<GuestDashboard />} />
            <Route path="/reschedule/:id" element={<Reschedule />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
