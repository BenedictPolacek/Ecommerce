export function Footer() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground container mx-auto px-4 py-6 text-sm">
        © {new Date().getFullYear()} Ecommerce Shop
      </div>
    </footer>
  );
}
