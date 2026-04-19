import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { billingApi } from "../api/billing";

interface SubscriptionGateProps {
  onError?: (message: string) => void;
}

export function SubscriptionGate({ onError }: SubscriptionGateProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const result = await billingApi.createCheckout();
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to start checkout");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/30 p-6 text-center space-y-4">
        <h3 className="text-lg font-semibold">Subscription Required</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          A subscription is required to create an organization. Subscribe for
          <span className="font-semibold text-foreground"> $20/month</span> to
          get started.
        </p>
        <Button onClick={handleSubscribe} disabled={loading} className="mt-2">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirecting to checkout...
            </>
          ) : (
            "Subscribe Now"
          )}
        </Button>
      </div>
    </div>
  );
}
