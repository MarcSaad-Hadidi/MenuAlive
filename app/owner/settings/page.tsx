import styles from "@/components/owner/OwnerCockpit.module.css";
import { Badge, ModuleHeader, Panel } from "@/components/owner/OwnerUi";
import { OWNER_QR_PRESETS } from "@/lib/owner/qrStyle";
import { getOwnerDashboard } from "@/lib/owner/dashboard";
import { getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

function StatusRow({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid rgba(232, 207, 155, 0.1)"
      }}
    >
      <div>
        <div className={styles.cellMain}>{label}</div>
        <div className={styles.cellSub}>{hint}</div>
      </div>
      <Badge tone={ok ? "ready" : "warn"}>{ok ? "Configuré" : "Non configuré"}</Badge>
    </div>
  );
}

export default async function OwnerSettingsPage() {
  const data = await getOwnerDashboard();
  const origin = getSiteUrl().origin;

  // Presence-only checks — never read or expose secret values.
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const mistralConfigured = Boolean(process.env.MISTRAL_API_KEY);
  const qrSecretConfigured = Boolean(process.env.VISTAIRE_QR_TOKEN_SECRET);
  const ownerAllowlistConfigured = Boolean(
    process.env.VISTAIRE_OWNER_EMAILS ||
      process.env.VISTAIRE_OWNER_USER_IDS ||
      process.env.VISTAIRE_OWNER_CLERK_USER_IDS
  );

  return (
    <>
      <ModuleHeader
        title="Settings"
        description="Configuration et état des intégrations. Aucune valeur secrète n'est affichée."
      />

      <Panel title="État des intégrations">
        <StatusRow
          label="Supabase"
          ok={supabaseConfigured}
          hint={data.source === "supabase" ? "Connecté, données live." : "Fallback démo actif."}
        />
        <StatusRow
          label="AI (Mistral)"
          ok={mistralConfigured}
          hint="Sans clé, le copilote utilise les règles déterministes (fallback)."
        />
        <StatusRow
          label="Secret token QR"
          ok={qrSecretConfigured}
          hint="VISTAIRE_QR_TOKEN_SECRET : à définir en production (pepper + signature)."
        />
        <StatusRow
          label="Allowlist owner"
          ok={ownerAllowlistConfigured}
          hint="VISTAIRE_OWNER_EMAILS / USER_IDS contrôlent l'accès owner-only."
        />
      </Panel>

      <Panel title="Domaine & QR">
        <p className={styles.cellSub}>Domaine public : {origin}</p>
        <p className={styles.cellSub}>
          Les QR pointent vers {origin}/q/&lt;token&gt; puis redirigent vers
          /menu/&lt;slug&gt;.
        </p>
        <p className={styles.cellSub} style={{ marginTop: 10 }}>
          Persistance QR : table <code>qr_codes</code> (voir
          docs/owner-qr-schema.md). Storage/CDN médias géré hors cockpit.
        </p>
        <div className={styles.pillRow} style={{ marginTop: 10 }}>
          {OWNER_QR_PRESETS.map((preset) => (
            <span key={preset.id} className={styles.badge}>
              {preset.label}
            </span>
          ))}
        </div>
      </Panel>

      <p className={styles.sourceTag}>
        Accès owner : protégé par Clerk + allowlist (proxy.ts +
        app/owner/layout.tsx). Les API owner utilisent requireVistaireOwnerApi.
      </p>
    </>
  );
}
