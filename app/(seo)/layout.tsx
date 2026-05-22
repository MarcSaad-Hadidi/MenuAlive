import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";

export default function SeoLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      {children}
      <SiteFooter />
    </>
  );
}
