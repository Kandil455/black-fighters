import React from "react";

const LOGO_URL = "/icons/black-fighters-192.png";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <img src={LOGO_URL} alt="Black Fighters" className="fixed top-5 right-5 w-12 h-12 rounded-2xl border border-primary/40 neon-glow-cyan object-cover" />
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card border border-primary/40 neon-glow-cyan mb-4 overflow-hidden">
            <img src={LOGO_URL} alt="Black Fighters" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}