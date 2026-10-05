import { useEffect } from "react";
import PageNotice from "../components/PageNotice";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

// A placeholder for a page that isn't ready yet
export default function UnderConstruction({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} · PRO-AM`;
  }, [title]);

  return (
    <main className="legal-page">
      <SiteHeader />
      <PageNotice
        title={title}
        message="This page is under construction. Check back soon."
        action={{ label: "Back to home", to: "/" }}
      />
      <SiteFooter />
    </main>
  );
}
