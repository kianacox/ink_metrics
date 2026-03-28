import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">
            Thank you for signing up!
          </CardTitle>
          <CardDescription>Check your email to confirm</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You&apos;ve successfully signed up. Please check your email to
            confirm your account before signing in.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
