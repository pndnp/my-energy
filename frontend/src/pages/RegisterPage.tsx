import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { FieldError } from "@/components/form/FieldError";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/api-error";

const EMAIL_INPUT_PLACEHOLDER = "email@example.com";

const schema = z
  .object({
    email: z.string().email({ message: "Введите корректный email" }),
    password: z.string().min(8, { message: "Пароль должен содержать не менее 8 символов" }),
    confirmPassword: z.string().min(8, {
      message: "Пароль должен содержать не менее 8 символов",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: doRegister } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  const onSubmit = async (data: FormValues) => {
    setFormError(null);
    try {
      await doRegister(data.email, data.password);
      navigate("/dashboard");
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  };

  return (
    <div className="mx-auto mt-20 max-w-md p-5">
      <Card>
        <CardHeader>
          <CardTitle>Register</CardTitle>
          <CardDescription>Create your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent>
            <InputWithLabelAndError label="Email" error={errors.email?.message}>
              <Input {...registerField("email")} placeholder={EMAIL_INPUT_PLACEHOLDER} />
            </InputWithLabelAndError>
            <div className="mt-4" />
            <InputWithLabelAndError label="Password" error={errors.password?.message}>
              <Input type="password" {...registerField("password")} />
            </InputWithLabelAndError>
            <div className="mt-4" />
            <InputWithLabelAndError
              label="Confirm Password"
              error={errors.confirmPassword?.message}
            >
              <Input type="password" {...registerField("confirmPassword")} />
            </InputWithLabelAndError>
            <div className="mt-4" />
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Loading..." : "Register"}
            </Button>
            {formError && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <p className="mt-4 text-center">
              Already have an account? <Link to="/login">Login</Link>
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
