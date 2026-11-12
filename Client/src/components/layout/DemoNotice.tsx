/**
 * Always visible on purpose (no close button): the shop is public, but the bank details are
 * examples and nothing is shipped, so every visitor must know it is not a real store.
 */
export function DemoNotice() {
  return (
    <p className="bg-foreground text-background px-4 py-1.5 text-center text-xs sm:text-sm">
      <strong>Demo shop:</strong> a portfolio project. Orders are not shipped and no real payment is
      taken.
    </p>
  );
}
