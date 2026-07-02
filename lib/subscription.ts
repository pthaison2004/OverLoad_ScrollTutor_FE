import { enrollmentsApi } from "./api";

export async function fetchUserActivePlan(userId: number): Promise<"FREE" | "PLUS" | "PRO"> {
  try {
    const res = await enrollmentsApi.getByUserDetails(userId);
    const subscriptionEnrollments = res
      .filter(e => e.courseSlug === "pro-upgrade-month" || e.courseSlug === "pro-upgrade-year" || e.courseSlug === "plus-upgrade-month")
      .map(e => ({
        enrolledAt: new Date(e.enrolledAt),
        durationDays: e.courseSlug.includes("year") ? 365 : 30,
        isPro: e.courseSlug.includes("pro-upgrade"),
      }))
      .sort((a, b) => a.enrolledAt.getTime() - b.enrolledAt.getTime());

    for (const planType of ["pro", "plus"] as const) {
      const planEnrollments = subscriptionEnrollments.filter(e => planType === "pro" ? e.isPro : !e.isPro);
      if (planEnrollments.length > 0) {
        let expiration: Date | null = null;
        for (const item of planEnrollments) {
          if (expiration === null || expiration < item.enrolledAt) {
            expiration = new Date(item.enrolledAt.getTime() + item.durationDays * 24 * 60 * 60 * 1000);
          } else {
            expiration = new Date(expiration.getTime() + item.durationDays * 24 * 60 * 60 * 1000);
          }
        }
        if (expiration && expiration > new Date()) {
          return planType.toUpperCase() as "PLUS" | "PRO";
        }
      }
    }
    return "FREE";
  } catch (err) {
    console.error("Error fetching active plan:", err);
    return "FREE";
  }
}
