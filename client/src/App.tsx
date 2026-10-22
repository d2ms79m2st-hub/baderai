import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Assistant from "./pages/Assistant";
import Home from "./pages/Home";
import Knowledge from "./pages/Knowledge";
import Store from "./pages/Store";

function AppRoutes() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/assistant" component={Assistant} />
    <Route path="/store" component={Store} />
    <Route path="/knowledge" component={Knowledge} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router hook={useHashLocation}><AppRoutes /></Router></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
