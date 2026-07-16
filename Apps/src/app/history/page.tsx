import {
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";
import { getScanHistory } from "@/modules/scan";
import { getQueryClient } from "@/shared/lib/query-client";
import { HistoryView } from "@/app/components/history/history-view";

export const metadata = { title: "Riwayat scan" };

export default async function HistoryPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["scan", "history"],
    queryFn: getScanHistory,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HistoryView />
    </HydrationBoundary>
  );
}
