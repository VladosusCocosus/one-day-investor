import Html from "@kitajs/html";
import { Nav, type NavProps } from "./nav";
import { Footer, type FooterProps } from "./footer";

export interface PageShellProps {
  nav: NavProps;
  footer: FooterProps;
  children: Html.Children;
}

export function PageShell({ nav, footer, children }: PageShellProps) {
  return (
    <>
      <Nav {...nav} />
      <main id="main">{children as "safe"}</main>
      <Footer {...footer} />
    </>
  );
}
