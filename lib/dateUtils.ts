// Utility function to calculate exact age from Date of Birth string (YYYY-MM-DD)
// Kiss My Cheek — Exclusive Dating & Social Club

export function calculateAge(dobString?: string | null): number {
  if (!dobString) return 26;
  try {
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return 26;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : 21;
  } catch {
    return 26;
  }
}
