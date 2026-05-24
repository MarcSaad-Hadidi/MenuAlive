import { Header } from "@/components/Header";
import { SeoFooter } from "@/components/seo/SeoFooter";

export default function SeoLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      {children}
      <SeoFooter />
    </>
  );
}
