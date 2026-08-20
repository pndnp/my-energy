import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { FieldError } from "@/components/form/FieldError";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

const EMAIL_INPUT_PLACEHOLDER = "email@example.com";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  const onSubmit = async (data: FormValues) => {
    await login(data.email, data.password);
    navigate("/dashboard");
  };

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="mx-auto mt-20 max-w-md p-5">
      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your credentials</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent>
            <InputWithLabelAndError label="Email" error={errors.email?.message}>
              <Input {...register("email")} placeholder={EMAIL_INPUT_PLACEHOLDER} />
            </InputWithLabelAndError>
            <div className="mt-4" />
            <InputWithLabelAndError label="Password" error={errors.password?.message}>
              <Input type="password" {...register("password")} />
            </InputWithLabelAndError>
            <div className="mt-4" />
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Loading..." : "Login"}
            </Button>
            <p className="mt-4 text-center">
              Don't have an account? <Link to="/register">Register</Link>
            </p>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}

/** Group with label + children + field-error */
function InputWithLabelAndError({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error && <FieldError message={error} />}
    </div>
  );
}
