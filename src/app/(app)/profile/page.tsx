import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { getCurrentProfile } from "@/lib/data";

export default async function ProfilePage() {
  const { user, profile } = await getCurrentProfile();
  if (!user) redirect("/sign-in");

  return (
    <ProfileForm
      userId={user.id}
      username={profile?.full_name ?? "Friend"}
      email={user.email ?? ""}
      avatarUrl={profile?.avatar_url}
    />
  );
}
