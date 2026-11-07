"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { api, qk } from "@/lib/api";
import { registerSchema } from "@/lib/schemas";
import { Spinner } from "@/components/ui/Spinner";
import {
  FieldError,
  FormAlert,
  PasswordInput,
  PasswordStrength,
  RepoNotice,
  SignedInNotice,
  carryParams,
  destinationFor,
} from "@/components/auth/AuthShared";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");
  const destination = destinationFor(params);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", password: "" } });

  const signup = useMutation({
    mutationFn: (values) => api.post("/auth/register", values),
    onSuccess: (res) => {
      queryClient.setQueryData(qk.me, res.user);
      router.replace(destination);
    },
    onError: (err) => {
      if (err.field) setError(err.field, { type: "server", message: err.message });
      else setServerError(err.message || "Could not create your account. Please try again.");
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError("");
    signup.mutate(values);
  });

  return (
    <>
      <SignedInNotice href={destination} />
      <RepoNotice repo={params.get("repo")} />
      <h1 className="text-[28px] font-semibold tracking-[-0.035em]">Create your account</h1>
      <p className="mt-2 text-[15px] text-fg-muted">Index a repository and start asking questions in under a minute.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        <FormAlert message={serverError} />
        <div>
          <label htmlFor="name" className="label">
            Name
          </label>
          <input
            id="name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            className="field"
            aria-invalid={Boolean(errors.name) || undefined}
            aria-describedby={errors.name ? "name-error" : undefined}
            {...register("name")}
          />
          <FieldError id="name-error" message={errors.name?.message} />
        </div>
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
            autoComplete="new-password"
            placeholder="At least 8 characters"
            invalid={Boolean(errors.password)}
            describedBy={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          <PasswordStrength value={watch("password")} />
          <FieldError id="password-error" message={errors.password?.message} />
        </div>
        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={signup.isPending}>
          {signup.isPending ? <Spinner /> : null}
          {signup.isPending ? "Creating account…" : "Create account"}
          {!signup.isPending && <ArrowRight className="size-4" />}
        </button>
      </form>

      <p className="mt-8 border-t hairline pt-6 text-sm text-fg-subtle">
        Already have an account?{" "}
        <Link href={`/login${carryParams(params)}`} className="font-medium text-fg underline decoration-white/20 underline-offset-4 hover:decoration-signal">
          Sign in
        </Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 w-full" />}>
      <RegisterForm />
    </Suspense>
  );
}
