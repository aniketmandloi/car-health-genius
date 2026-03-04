import { useQuery } from "@tanstack/react-query";
import { Tabs, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomTabBar } from "@/components/custom-tab-bar";
import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export default function TabLayout() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  const entitlements = useQuery({
    ...trpc.billing.getEntitlements.queryOptions(),
    enabled: !!session?.user,
  });

  const hasProAccess = (entitlements.data?.features ?? []).some((feature) =>
    feature.featureKey.startsWith("pro."),
  );
  const showPricingTab = !session?.user || (Boolean(entitlements.data) && !hasProAccess);

  useEffect(() => {
    const isOnPricing = pathname === "/pricing" || pathname.endsWith("/pricing");
    const isOnProfile = pathname === "/profile" || pathname.endsWith("/profile");

    if (!showPricingTab && isOnPricing) {
      router.replace("/profile");
      return;
    }

    if (showPricingTab && isOnProfile) {
      router.replace("/pricing");
    }
  }, [pathname, router, showPricingTab]);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.background,
          paddingTop: insets.top,
        },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="scan" />
      <Tabs.Screen name="vehicles" />
      <Tabs.Screen name="pricing" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
