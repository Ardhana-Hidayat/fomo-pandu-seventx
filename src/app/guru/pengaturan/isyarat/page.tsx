import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/features/auth";
import { SignLibraryClient } from "@/features/signs/components/SignLibraryClient";

export const instant = false;

export default async function SignLibraryPage() {
  const session = await getCurrentTeacher();
  if (!session) redirect("/guru/masuk");

  return <SignLibraryClient />;
}
