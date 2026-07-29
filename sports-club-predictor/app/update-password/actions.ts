"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function passwordRedirect(message: string, status: "error" | "success") {
  redirect(
    `/update-password?message=${encodeURIComponent(message)}&status=${status}`,
  );
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    passwordRedirect(
      "Use a password with at least eight characters.",
      "error",
    );
  }

  if (password !== confirmPassword) {
    passwordRedirect("The passwords do not match.", "error");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login?message=Your%20password-reset%20session%20has%20expired.%20Request%20a%20new%20link.&next=%2Fupdate-password",
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    passwordRedirect(error.message, "error");
  }

  revalidatePath("/", "layout");
  passwordRedirect(
    "Your password was updated successfully. You can continue using the app.",
    "success",
  );
}
