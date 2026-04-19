import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, Settings } from "lucide-react";
import { billingApi } from "../api/billing";

export function SubscriptionBanner() {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ["billing", "status"],
    queryFn: () => billingApi.getStatus(),
    retry: false,
    staleTime: 30_000,
  });

  if (isLoading || !status) return null;
  if (status.active) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-green-500" />
          <span>Subscription active</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={portalLoading}
          onClick={async () => {
            setPortalLoading(true);
            try {
              const result = await billingApi.createPortal();
              if (result.url) window.location.href = result.url;
            } catch {
              setPortalLoading(false);
            }
          }}
        >
          {portalLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Settings className="h-3.5 w-3.5 mr-1" />
              Manage
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Agents are paused</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Subscribe for <span className="font-semibold">$20/month</span> to activate your agents.
            The subscription owner manages billing — invited team members can configure and run agents freely.
          </p>
        </div>
        <Button
          size="sm"
          disabled={checkoutLoading}
          onClick={async () => {
            setCheckoutLoading(true);
            setError(null);
            try {
              const result = await billingApi.createCheckout();
              if (result.url) window.location.href = result.url;
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to start checkout");
              setCheckoutLoading(false);
            }
          }}
        >
          {checkoutLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              <Zap className="h-3.5 w-3.5 mr-1" />
              Subscribe
            </>
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
}
