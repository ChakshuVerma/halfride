import { LoadingState } from "@/components/common/LoadingState";

type PageLoaderProps = {
  message?: string;
};

export const PageLoader = ({ message = "Loading..." }: PageLoaderProps) => (
  <LoadingState message={message} fullPage size="xl" />
);
