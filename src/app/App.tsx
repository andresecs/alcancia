import { Analytics } from "@vercel/analytics/react";
import { RouterProvider } from "react-router";
import { router } from "./routes";

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      {/* Vercel Web Analytics: page views, sent only on the deployed site */}
      <Analytics />
    </>
  );
}
