import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { CategoryNode } from '@/features/categories/types';
import { CategoryForm } from './CategoryForm';

interface CategoryDialogProps {
  /** The button that opens the dialog */
  trigger: ReactNode;
  tree: CategoryNode[];
  category?: CategoryNode;
  /** "Add subcategory": the new category starts below this one */
  parent?: CategoryNode;
}

/** Create or edit a category in a modal */
export function CategoryDialog({ trigger, tree, category, parent }: CategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const title = category
    ? `Edit ${category.name}`
    : parent
      ? `New subcategory of ${parent.name}`
      : 'New category';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Categories group the products in the shop menu.</DialogDescription>
        </DialogHeader>
        {/* Rendered only while open: the form starts fresh every time */}
        {open && (
          <CategoryForm
            tree={tree}
            category={category}
            parentId={parent?.id}
            onCancel={() => setOpen(false)}
            onSaved={(saved) => {
              setOpen(false);
              toast.success(category ? `${saved.name} saved` : `${saved.name} created`);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
