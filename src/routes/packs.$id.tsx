import { createFileRoute, redirect } from "@tanstack/react-router";

// Old pack links keep working: /packs/fo → /themes/fo.
export const Route = createFileRoute("/packs/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/themes/$id", params: { id: params.id }, statusCode: 301 });
  },
});
