import type { JSX } from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/app/actions";
import { ChatContainer } from "@/components/ChatContainer";

export default async function HomePage(): Promise<JSX.Element> {
  const { session, user } = await getCurrentSession();

  if (session === null || !user) {
    redirect("/login");
  }

  return <ChatContainer user={{ name: user.name, picture: user.picture }} />;
}
