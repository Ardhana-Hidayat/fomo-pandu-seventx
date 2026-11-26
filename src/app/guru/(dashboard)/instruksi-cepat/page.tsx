import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/features/auth";
import { QuickInstructionsClient } from "@/features/quick-instructions";

export const instant = false;

export default async function QuickInstructionsPage() {
  const session = await getCurrentTeacher();
  if (!session) redirect("/guru/masuk");

  return <QuickInstructionsClient />;
}
