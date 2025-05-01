import type { JSX } from "react";
import { getCurrentSession } from "./actions";
import { redirect } from "next/navigation";
import Image from "next/image";
import { globalGETRateLimit } from "@/lib/requests";
import { LogoutButton } from "@/components/Logout";

export default async function Home(): Promise<JSX.Element> {
  const { user, session } = await getCurrentSession();

  if (session === null) return redirect("/login");

  if (!(await globalGETRateLimit())) {
    return <div>Too many requests</div>;
  }

  return (
    <>
      <h1>{user.name}</h1>
      <Image src={user.picture} alt="profile" height={100} width={100} />
      <p>{user.email}</p>
      <LogoutButton />
    </>
  );
}
