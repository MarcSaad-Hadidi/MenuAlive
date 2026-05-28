import { JsonLd } from "@/components/JsonLd";
import { VistaireMenuPreview } from "@/components/vistaire-preview/VistaireMenuPreview";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "@/lib/seo";

const canonicalPath = "/demo";
const title = "Menu client exemple | Maison Élyse";
const description =
  "Maison Élyse est un restaurant exemple de présentation Vistaire : menu client, fiches plats, allergènes, accords et vues immersives.";

export default function DemoPage() {
  return (
    <>
      <JsonLd
        data={[
          buildWebPageJsonLd({
            path: canonicalPath,
            name: title,
            description
          }),
          buildBreadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Menu client exemple", path: canonicalPath }
          ])
        ]}
      />
      <VistaireMenuPreview routeMode="production" />
    </>
  );
}
