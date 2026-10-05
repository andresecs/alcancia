import { useLocation, useNavigate } from "react-router";
import TabNav from "./TabNav";

export const siteLinks = [
  { to: "/", label: "Home" },
  { to: "/calcutta", label: "Calcutta" },
  { to: "/sign-up", label: "Sign Up" },
  { to: "/champions", label: "Champions" },
  { to: "/rules", label: "Rules" }, // under construction for now
  { to: "/find-players", label: "Find Players" },
];

// Whether a menu link is the page showing. On the home page, "?slide=1" is
// the Rules slide, so only one of Home / Rules is selected.
export function useIsCurrent() {
  const { pathname, search } = useLocation();
  return (to: string) => {
    const [path, query = ""] = to.split("?");
    if (path !== pathname) return false;
    return query ? search === `?${query}` : search !== "?slide=1";
  };
}

// The site's pages as a row of tabs for the header (desktop only; CSS hides
// it on smaller screens, which use the menu toggle instead).
export default function SiteTabs() {
  const navigate = useNavigate();
  const isCurrent = useIsCurrent();
  const links = [...siteLinks, { to: "/umpire", label: "Umpire" }];
  return (
    <TabNav
      className="site-tabs"
      label="Main menu"
      items={links.map((link) => ({ id: link.to, label: link.label }))}
      value={links.find((link) => isCurrent(link.to))?.to ?? ""}
      onChange={(to) => navigate(to)}
    />
  );
}
