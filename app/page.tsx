import type { JSX } from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/app/actions";
import { Chat } from "@/components/Chat";

export default async function HomePage(): Promise<JSX.Element> {
  const { session, user } = await getCurrentSession();

  if (session === null) {
    redirect("/login");
  }

  return <Chat user={{ name: user.name, picture: user.picture }} />;
}
