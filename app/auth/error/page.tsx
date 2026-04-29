import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Suspense } from "react";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  missing_token_or_type: "The sign-in link is incomplete or expired. Please try again.",
  otp_verification_failed: "We could not verify your sign-in link. Please request a new one.",
  verified_user_missing: "We could not finish sign-in setup. Please try again.",
};

export function getAuthErrorMessage(code: string | null | undefined): string {
  if (!code) {
    return "An unspecified error occurred.";
  }

  return (
    AUTH_ERROR_MESSAGES[code] ??
    "We could not complete authentication. Please retry the action."
  );
}

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const message = getAuthErrorMessage(params?.code);

  return (
    <>
      <p className="text-sm text-muted-foreground">{message}</p>
    </>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">
            Sorry, something went wrong.
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div
                aria-hidden
                className="h-32 w-full animate-pulse rounded-md bg-muted"
              />
            }
          >
            <ErrorContent searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
