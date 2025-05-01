"use client";

import { type JSX, type ReactNode, useTransition } from "react";
import { toast } from "sonner";
import { Spinner } from "./Spinner";

export const SignOutFormComponent = ({
  children,
  action,
}: {
  children: ReactNode;
  action: () => Promise<{
    message: string;
    success: boolean;
  }>;
}): JSX.Element => {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        const result = await action();

        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      } catch {
        toast.error("An unexpected error occurred");
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      {children}
      {isPending && <Spinner />}
    </form>
  );
};
