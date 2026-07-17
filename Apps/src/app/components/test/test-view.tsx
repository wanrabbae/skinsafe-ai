import { AppHeader } from "@/shared/components/app-header";
import { PageMain } from "@/shared/components/page-main";

import { TestFlow } from "./test-flow";

export function TestView() {
  return (
    <PageMain>
      <AppHeader />
      <TestFlow />
    </PageMain>
  );
}
