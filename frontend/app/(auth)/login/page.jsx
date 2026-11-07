"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { api, qk } from "@/lib/api";
import { loginSchema } from "@/lib/schemas";
import { Spinner } from "@/components/ui/Spinner";
import {
  FieldError,
  FormAlert,
  PasswordInput,
  RepoNotice,
  SignedInNotice,
  carryParams,
  destinationFor,
} from "@/components/auth/AuthShared";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");
  const destination = destinationFor(params);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const login = useMutation({
    mutationFn: (values) => api.post("/auth/login", values),
    onSuccess: (res) => {
      queryClient.setQueryData(qk.me, res.user);
      router.replace(destination);
    },
    onError: (err) => {
      if (err.field) setError(err.field, { type: "server", message: err.message });
      else setServerError(err.message || "Sign in failed. Please try again.");
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError("");
    login.mutate(values);
  });

  return (
    <>
      <SignedInNotice href={destination} />
      <RepoNotice repo={params.get("repo")} />
      <h1 className="text-[28px] font-semibold tracking-[-0.035em]">Welcome back</h1>
      <p className="mt-2 text-[15px] text-fg-muted">Sign in to your repositories and conversations.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        <FormAlert message={serverError} />
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@company.com"
            className="field"
            aria-invalid={Boolean(errors.email) || undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          <FieldError id="email-error" message={errors.email?.message} />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            invalid={Boolean(errors.password)}
            describedBy={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          <FieldError id="password-error" message={errors.password?.message} />
        </div>
        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={login.isPending}>
          {login.isPending ? <Spinner /> : null}
          {login.isPending ? "Signing in…" : "Sign in"}
          {!login.isPending && <ArrowRight className="size-4" />}
        </button>
      </form>

      <p className="mt-8 border-t hairline pt-6 text-sm text-fg-subtle">
        New to Zenoryx?{" "}
        <Link href={`/register${carryParams(params)}`} className="font-medium text-fg underline decoration-white/20 underline-offset-4 hover:decoration-signal">
          Create an account
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="skeleton h-80 w-full" />}>
      <LoginForm />
    </Suspense>
  );
}
