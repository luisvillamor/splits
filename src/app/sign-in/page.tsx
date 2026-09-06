import { Suspense } from "react";
import { SignInForm } from "@/components/auth/SignInForm";
import { Spinner } from "@/components/ui/Spinner";

export default function SignInPage() {
  return (
    <Suspense fallback={<Spinner label="Loading sign in" />}>
      <SignInForm />
    </Suspense>
  );
}
