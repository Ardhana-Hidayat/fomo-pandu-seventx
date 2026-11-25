import { redirect } from "next/navigation";
import { getCurrentTeacher } from "@/features/auth";
import { TeacherSettingsClient } from "@/features/teacher-settings/components/TeacherSettingsClient";

export const instant = false;

export default async function TeacherSettingsPage() {
  const session = await getCurrentTeacher();
  if (!session) redirect("/guru/masuk");

  return (
    <TeacherSettingsClient
      teacher={{
        displayName: session.teacher.displayName,
        email: session.teacher.email,
      }}
    />
  );
}
