import { FolderPlus, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { CategoryNode } from '@/features/categories/types';
import { getErrorMessage } from '@/lib/form-errors';
import { useDeleteCategory } from '../hooks';
import { MAX_CATEGORY_DEPTH } from '../tree';
import { CategoryDialog } from './CategoryDialog';

interface RowProps {
  node: CategoryNode;
  tree: CategoryNode[];
  /** 0 = top level */
  depth: number;
}

function DeleteCategoryButton({ node }: { node: CategoryNode }) {
  const remove = useDeleteCategory();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={remove.isPending}
          aria-label={`Delete ${node.name}`}
          title="Delete"
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {node.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Only empty categories can be deleted: move its subcategories and products first.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep category</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              remove.mutate(node.id, {
                onSuccess: () => toast.success(`${node.name} deleted`),
                // 409: still has subcategories or products, the server says which
                onError: (error) => toast.error(getErrorMessage(error)),
              })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CategoryRow({ node, tree, depth }: RowProps) {
  return (
    <li>
      <div className="hover:bg-muted/50 flex items-center gap-3 rounded-md px-2 py-1.5">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{node.name}</span>
          <span className="text-muted-foreground truncate text-xs">{node.slug}</span>
        </div>
        <Button asChild variant="link" size="sm">
          <Link to={`/admin/products?category=${node.id}`} aria-label={`Products in ${node.name}`}>
            Products
          </Link>
        </Button>
        {/* The deepest level cannot have subcategories */}
        {depth + 1 < MAX_CATEGORY_DEPTH && (
          <CategoryDialog
            tree={tree}
            parent={node}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Add a subcategory to ${node.name}`}
                title="Add subcategory"
              >
                <FolderPlus />
              </Button>
            }
          />
        )}
        <CategoryDialog
          tree={tree}
          category={node}
          trigger={
            <Button variant="ghost" size="icon" aria-label={`Edit ${node.name}`} title="Edit">
              <Pencil />
            </Button>
          }
        />
        <DeleteCategoryButton node={node} />
      </div>
      {node.children.length > 0 && (
        <ul className="ml-4 border-l pl-2" aria-label={`Subcategories of ${node.name}`}>
          {node.children.map((child) => (
            <CategoryRow key={child.id} node={child} tree={tree} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** The category tree as nested lists: screen readers announce the level and the list size */
export function CategoryTree({ tree }: { tree: CategoryNode[] }) {
  return (
    <ul aria-label="Categories" className="flex flex-col gap-1">
      {tree.map((node) => (
        <CategoryRow key={node.id} node={node} tree={tree} depth={0} />
      ))}
    </ul>
  );
}
