import { redirect } from "next/navigation";
import { getCurrentSession, getUserConversations } from "@/app/actions";
import HomePageClient from "@/components/HomepageClient";

interface UserData {
  id: number;
  google_id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export default async function HomePage() {
  const sessionResult = await getCurrentSession();
  if (!sessionResult.session || !sessionResult.user) {
    redirect("/login");
  }

  const conversationsResult = await getUserConversations();

  const initialConversations = conversationsResult.success
    ? conversationsResult.conversations
    : [];

  const userData: UserData = {
    id: sessionResult.user.id,
    google_id: sessionResult.user.google_id,
    email: sessionResult.user.email,
    name: sessionResult.user.name,
    picture: sessionResult.user.picture,
  };

  return (
    <HomePageClient
      userData={userData}
      initialConversations={initialConversations}
    />
  );
}
