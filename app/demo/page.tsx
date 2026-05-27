import { JsonLd } from "@/components/JsonLd";
import { VistaireMenuPreview } from "@/components/vistaire-preview/VistaireMenuPreview";
import { buildBreadcrumbJsonLd } from "@/lib/seo";

export default function DemoPage() {
  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Menu client exemple", path: "/demo" }
        ])}
      />
      <VistaireMenuPreview routeMode="production" />
    </>
  );
}
