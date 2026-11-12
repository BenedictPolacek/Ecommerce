export function Footer() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground container mx-auto space-y-1 px-4 py-6 text-sm">
        <p>© {new Date().getFullYear()} Ecommerce Shop</p>
        <p>
          This is a demo shop built as a portfolio project, not a real store. Please do not enter
          real personal data or send money.
        </p>
      </div>
    </footer>
  );
}
