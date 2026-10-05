import { createBrowserRouter } from "react-router";
import Home from "../pages/Home";
import SignUp from "../pages/SignUp";
import Calcutta from "../pages/Calcutta";
import Champions from "../pages/Champions";
import FindPlayers from "../pages/FindPlayers";
import Umpire from "../pages/Umpire";
import Legal from "../pages/Legal";
import UnderConstruction from "../pages/UnderConstruction";
import { createElement } from "react";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/sign-up",
    Component: SignUp,
  },
  {
    path: "/calcutta",
    Component: Calcutta,
  },
  {
    path: "/champions",
    Component: Champions,
  },
  {
    path: "/find-players",
    Component: FindPlayers,
  },
  {
    path: "/umpire",
    Component: Umpire,
  },
  { path: "/rules", Component: () => createElement(UnderConstruction, { title: "Rules" }) },
  // Legal pages (drafts until reviewed)
  { path: "/privacy", Component: () => createElement(Legal, { page: "privacy" }) },
  { path: "/terms", Component: () => createElement(Legal, { page: "terms" }) },
  { path: "/refunds", Component: () => createElement(Legal, { page: "refunds" }) },
  { path: "/calcutta-rules", Component: () => createElement(Legal, { page: "calcutta-rules" }) },
  { path: "/accessibility", Component: () => createElement(Legal, { page: "accessibility" }) },
  {
    path: "*",
    Component: Home,
  },
]);
