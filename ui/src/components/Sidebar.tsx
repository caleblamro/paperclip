import {
  Inbox,
  CircleDot,
  Target,
  LayoutDashboard,
  DollarSign,
  History,
  Search,
  SquarePen,
  Network,
  Boxes,
  Repeat,
  Settings,
  Zap,
  CreditCard,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { billingApi } from "../api/billing";
import { healthApi } from "../api/health";
import { SidebarSection } from "./SidebarSection";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarProjects } from "./SidebarProjects";
import { SidebarAgents } from "./SidebarAgents";
import { useDialog } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { heartbeatsApi } from "../api/heartbeats";
import { queryKeys } from "../lib/queryKeys";
import { useInboxBadge } from "../hooks/useInboxBadge";
import { Button } from "@/components/ui/button";
import { PluginSlotOutlet } from "@/plugins/slots";
import { SidebarCompanyMenu } from "./SidebarCompanyMenu";

function SidebarBillingCard() {
  const [loading, setLoading] = useState(false);
  const { data: health } = useQuery({
    queryKey: queryKeys.health,
    queryFn: () => healthApi.get(),
    retry: false,
  });
  const healthData = health as Record<string, unknown> | undefined;
  const isSaasMode = healthData?.saasMode === true;
  const billingEnabled = healthData?.billingEnabled !== false;

  const { data: status } = useQuery({
    queryKey: ["billing", "status"],
    queryFn: () => billingApi.getStatus(),
    enabled: isSaasMode && billingEnabled,
    retry: false,
    staleTime: 30_000,
  });

  if (!isSaasMode || !billingEnabled || !status) return null;

  if (status.active) {
    return (
      <div className="mt-auto pt-2">
        <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs">
            <Zap className="h-3 w-3 text-green-500 shrink-0" />
            <span className="text-muted-foreground">Agents active</span>
          </div>
          <button
            className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors"
            onClick={async () => {
              setLoading(true);
              try {
                const result = await billingApi.createPortal();
                if (result.url) window.location.href = result.url;
              } catch { setLoading(false); }
            }}
            disabled={loading}
          >
            <CreditCard className="h-3 w-3" />
            {loading ? "Loading..." : "Manage billing"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-auto pt-2">
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Zap className="h-3 w-3 text-yellow-500 shrink-0" />
          <span>Agents paused</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Subscribe to activate your agents.
        </p>
        <button
          className="mt-2 w-full rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          onClick={async () => {
            setLoading(true);
            try {
              const result = await billingApi.createCheckout();
              if (result.url) window.location.href = result.url;
            } catch { setLoading(false); }
          }}
          disabled={loading}
        >
          {loading ? "Redirecting..." : "Subscribe — $20/mo"}
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { openNewIssue } = useDialog();
  const { selectedCompanyId, selectedCompany } = useCompany();
  const inboxBadge = useInboxBadge(selectedCompanyId);
  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 10_000,
  });
  const liveRunCount = liveRuns?.length ?? 0;

  function openSearch() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }

  const pluginContext = {
    companyId: selectedCompanyId,
    companyPrefix: selectedCompany?.issuePrefix ?? null,
  };

  return (
    <aside className="w-60 h-full min-h-0 border-r border-border bg-background flex flex-col">
      {/* Top bar: Company name (bold) + Search — aligned with top sections (no visible border) */}
      <div className="flex items-center gap-1 px-3 h-12 shrink-0">
        <SidebarCompanyMenu />
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground shrink-0"
          onClick={openSearch}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-auto-hide flex flex-col gap-4 px-3 py-2">
        <div className="flex flex-col gap-0.5">
          {/* New Issue button aligned with nav items */}
          <button
            onClick={() => openNewIssue()}
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            <SquarePen className="h-4 w-4 shrink-0" />
            <span className="truncate">New Issue</span>
          </button>
          <SidebarNavItem to="/dashboard" label="Dashboard" icon={LayoutDashboard} liveCount={liveRunCount} />
          <SidebarNavItem
            to="/inbox"
            label="Inbox"
            icon={Inbox}
            badge={inboxBadge.inbox}
            badgeTone={inboxBadge.failedRuns > 0 ? "danger" : "default"}
            alert={inboxBadge.failedRuns > 0}
          />
          <PluginSlotOutlet
            slotTypes={["sidebar"]}
            context={pluginContext}
            className="flex flex-col gap-0.5"
            itemClassName="text-[13px] font-medium"
            missingBehavior="placeholder"
          />
        </div>

        <SidebarSection label="Work">
          <SidebarNavItem to="/issues" label="Issues" icon={CircleDot} />
          <SidebarNavItem to="/routines" label="Routines" icon={Repeat} />
          <SidebarNavItem to="/goals" label="Goals" icon={Target} />
        </SidebarSection>

        <SidebarProjects />

        <SidebarAgents />

        <SidebarSection label="Company">
          <SidebarNavItem to="/org" label="Org" icon={Network} />
          <SidebarNavItem to="/skills" label="Skills" icon={Boxes} />
          <SidebarNavItem to="/costs" label="Costs" icon={DollarSign} />
          <SidebarNavItem to="/activity" label="Activity" icon={History} />
          <SidebarNavItem to="/company/settings" label="Settings" icon={Settings} />
        </SidebarSection>

        <PluginSlotOutlet
          slotTypes={["sidebarPanel"]}
          context={pluginContext}
          className="flex flex-col gap-3"
          itemClassName="rounded-lg border border-border p-3"
          missingBehavior="placeholder"
        />

        <SidebarBillingCard />
      </nav>
    </aside>
  );
}
