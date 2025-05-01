"use client";

import { signOutAction } from "@/app/actions";
import type { JSX } from "react";
import { useActionState } from "react";

export function LogoutButton(): JSX.Element {
  const [, action] = useActionState(signOutAction, {
    message: "",
    success: false,
  });
  return (
    <form action={action}>
      <button type="submit">Sign out</button>
    </form>
  );
}
