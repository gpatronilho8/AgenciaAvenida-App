"use client";
import { useTheme } from "next-themes";
import { Toaster as SonnerOriginal } from "sonner";
import { CheckCircle2, ShieldAlert, Info } from "lucide-react";

export function ToasterCustomizado({ ...props }) {
  const { theme = "system" } = useTheme();
  
  console.log("🔥 AGORA SIM, O MEU SONNER CUSTOMIZADO ARRANCOU!");

  return (
    <SonnerOriginal
      theme={theme}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        unstyled: true, 
        classNames: {
          toast: "flex items-start w-[420px] gap-3 p-4 rounded-xl border shadow-2xl bg-background text-foreground font-sans",
          title: "text-sm font-bold tracking-wide uppercase",
          description: "text-xs text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          error: "bg-gradient-to-r from-red-500/15 via-background to-background border-l-4 border-l-red-500 border-y-border border-r-border",
          success: "bg-gradient-to-r from-emerald-500/15 via-background to-background border-l-4 border-l-emerald-500 border-y-border border-r-border",
          info: "bg-gradient-to-r from-blue-500/15 via-background to-background border-l-4 border-l-blue-500 border-y-border border-r-border",
          default: "border-border",
        },
      }}
      icons={{
        success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 animate-in zoom-in duration-300" />,
        error: <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 animate-in zoom-in duration-300" />,
        info: <Info className="w-5 h-5 text-blue-500 shrink-0 animate-in zoom-in duration-300" />,
      }}
      {...props} 
    />
  );
}