// Below this number the exact stock is shown, to create urgency without exposing inventory
const LOW_STOCK = 5;

export function StockStatus({ stock }: { stock: number }) {
  if (stock <= 0) return <p className="text-destructive text-sm font-medium">Out of stock</p>;

  if (stock <= LOW_STOCK) {
    return <p className="text-sm font-medium text-amber-700">Only {stock} left in stock</p>;
  }

  return <p className="text-sm font-medium text-green-700">In stock</p>;
}
