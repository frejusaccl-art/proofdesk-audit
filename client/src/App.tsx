import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import RouterPage from "./pages/Home";
import SaaSWorkspace from "./pages/SaaSWorkspace";
import QualifyDashboard from "./pages/QualifyDashboard";

function Router() {
  return <Switch>
    <Route path="/" component={RouterPage} />
    <Route path="/app" component={SaaSWorkspace} />
    <Route path="/qualify" component={QualifyDashboard} />
    <Route component={RouterPage} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
