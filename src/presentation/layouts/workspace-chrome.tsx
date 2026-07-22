"use client";

import React, { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/presentation/components/auth/sign-out-button";
import { ToastProvider, ToastViewport } from "@/presentation/components/ui/toast";

const navigation = [
  { label: "Dashboard", href: "/", enabled: true },
  { label: "Clients", href: "/clients", enabled: true },
  { label: "Proposals", href: "/proposals", enabled: true },
  { label: "Pricing", href: "/pricing-projects", enabled: true },
  { label: "Projects", href: "#", enabled: false },
  { label: "Agreements", href: "#", enabled: false },
  { label: "HR", href: "#", enabled: false },
  { label: "Marketing", href: "#", enabled: false },
  { label: "Technology", href: "#", enabled: false },
  { label: "Administration", href: "#", enabled: false }
] as const;

function ThemeButton() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const next = localStorage.getItem("cotarion-theme") === "dark";
    document.documentElement.classList.toggle("dark", next);
    setDark(next);
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("cotarion-theme", next ? "dark" : "light");
  }
  return <button aria-label="Toggle color theme" className="workspace-icon-button" onClick={toggle} type="button">{dark ? "Light" : "Dark"}</button>;
}

function Navigation({ close }: { close?: () => void }) {
  const pathname = usePathname();
  return <nav aria-label="Primary" className="workspace-navigation">
    {navigation.map((item) => item.enabled ? (
      <Link aria-current={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)) ? "page" : undefined} className="workspace-nav-link" href={item.href} key={item.label} onClick={close}>{item.label}</Link>
    ) : (
      <span aria-disabled="true" className="workspace-nav-link workspace-nav-disabled" key={item.label}>{item.label}<span>Later</span></span>
    ))}
  </nav>;
}

export function WorkspaceChrome({ children, userName }: { children: ReactNode; userName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const crumbs = pathname.split("/").filter(Boolean);
  return <ToastProvider>
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="workspace-brand"><span className="workspace-mark">C</span><div><strong>Cotarion</strong><small>Consulting workspace</small></div></div>
        <Navigation />
        <div className="workspace-sidebar-footer"><span className="workspace-avatar" aria-hidden="true">{userName.slice(0, 1).toUpperCase()}</span><div><strong>{userName}</strong><small>Active workspace</small></div></div>
      </aside>
      {open ? <button aria-label="Close navigation" className="workspace-scrim" onClick={() => setOpen(false)} type="button" /> : null}
      <aside aria-label="Mobile navigation" className={`workspace-mobile-drawer ${open ? "is-open" : ""}`}><div className="workspace-brand"><span className="workspace-mark">C</span><strong>Cotarion</strong></div><Navigation close={() => setOpen(false)} /></aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <button aria-expanded={open} aria-label="Open navigation" className="workspace-menu-button" onClick={() => setOpen(true)} type="button">Menu</button>
          <div><p className="workspace-eyebrow">Cotarion Consulting Group</p><nav aria-label="Breadcrumb"><ol className="workspace-breadcrumbs"><li><Link href="/">Workspace</Link></li>{crumbs.map((crumb, index) => <li key={`${crumb}-${index}`}>{decodeURIComponent(crumb).replaceAll("-", " ")}</li>)}</ol></nav></div>
          <div className="workspace-header-actions"><ThemeButton /><SignOutButton /></div>
        </header>
        <main className="workspace-content" id="main-content">{children}</main>
      </div>
      <ToastViewport />
    </div>
  </ToastProvider>;
}
