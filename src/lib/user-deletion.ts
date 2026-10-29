export function assertDeletableUser(callerId: string, target: { id: string; email?: string }) {
  if (target.id === callerId || target.email?.toLowerCase() === "conectstore.app@gmail.com") {
    throw new Error("A conta do admin master não pode ser excluída.");
  }
}