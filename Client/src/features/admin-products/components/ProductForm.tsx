import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { FormAlert } from '@/components/form/FormAlert';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { categoryOptionLabel, flattenCategoryTree } from '@/features/categories/api';
import { useCategoryTree } from '@/features/categories/hooks';
import type { CategoryNode } from '@/features/categories/types';
import type { Product } from '@/features/products/types';
import { setServerErrors } from '@/lib/form-errors';
import { useCreateProduct, useUpdateProduct } from '../hooks';
import {
  emptyProductForm,
  productFormSchema,
  toProductForm,
  type ProductFormIn,
  type ProductFormOut,
} from '../schemas';

const SERVER_FIELDS = ['name', 'slug', 'sku', 'description', 'category_id', 'is_active'] as const;

interface ProductFormProps {
  /** Edit this product; without it a new one is created */
  product?: Product;
}

function ProductFormInner({
  product,
  categories,
}: ProductFormProps & { categories: CategoryNode[] }) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const navigate = useNavigate();
  const form = useForm<ProductFormIn, unknown, ProductFormOut>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product ? toProductForm(product) : emptyProductForm,
  });
  const { errors, isSubmitting, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    const common = {
      name: values.name,
      // Empty: generated from the name, or unchanged when editing (renaming keeps the slug)
      slug: values.slug || undefined,
      price_cents: values.price,
      category_id: values.category_id || null,
      is_active: values.is_active,
    };

    try {
      if (product) {
        const updated = await updateProduct.mutateAsync({
          ...common,
          id: product.id,
          // null clears the field
          sku: values.sku || null,
          description: values.description || null,
        });
        // The saved values are the new starting point ("Save" is disabled until the next change)
        form.reset(toProductForm({ ...product, ...updated }));
        toast.success('Product saved');
      } else {
        const created = await createProduct.mutateAsync({
          ...common,
          sku: values.sku || undefined,
          description: values.description || undefined,
          stock_quantity: values.stock_quantity,
        });
        toast.success(`${created.name} created`);
        // Stock and images are managed on the product page
        navigate(`/admin/products/${created.id}`, { replace: true });
      }
    } catch (error) {
      // 409 (SKU or slug taken) has no field errors: shown above the form
      setServerErrors(error, form.setError, SERVER_FIELDS);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={errors.root?.server?.message} />
        <TextField id="name" label="Name" error={errors.name} {...form.register('name')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="price"
            label="Price incl. VAT (EUR)"
            inputMode="decimal"
            autoComplete="off"
            error={errors.price}
            {...form.register('price')}
          />
          <TextField
            id="sku"
            label="SKU (optional)"
            autoComplete="off"
            error={errors.sku}
            {...form.register('sku')}
          />
        </div>

        <Field data-invalid={!!errors.category_id}>
          <FieldLabel htmlFor="category_id">Category</FieldLabel>
          <select
            id="category_id"
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs"
            {...form.register('category_id')}
          >
            <option value="">No category</option>
            {flattenCategoryTree(categories).map((option) => (
              <option key={option.id} value={option.id}>
                {categoryOptionLabel(option)}
              </option>
            ))}
          </select>
          <FieldError errors={[errors.category_id]} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="description">Description (optional)</FieldLabel>
          <Textarea
            id="description"
            rows={5}
            aria-invalid={!!errors.description}
            {...form.register('description')}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <TextField
          id="slug"
          label="URL slug (optional)"
          hint={
            product
              ? `Shop address: /products/${product.slug}. Changing it breaks existing links.`
              : 'Leave empty to create it from the name, e.g. "Desk Lamp" becomes desk-lamp.'
          }
          autoComplete="off"
          error={errors.slug}
          {...form.register('slug')}
        />

        {/* Afterwards stock only changes through stock movements (on the product page) */}
        {!product && (
          <TextField
            id="stock_quantity"
            label="Initial stock"
            inputMode="numeric"
            autoComplete="off"
            error={errors.stock_quantity}
            {...form.register('stock_quantity')}
          />
        )}

        <Controller
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <Field>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_active"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  aria-describedby="is_active-hint"
                />
                <Label htmlFor="is_active" className="font-normal">
                  Visible in the shop
                </Label>
              </div>
              <FieldDescription id="is_active-hint">
                Hidden products cannot be bought, but past orders keep them.
              </FieldDescription>
            </Field>
          )}
        />

        <Button
          type="submit"
          className="self-start"
          disabled={isSubmitting || (!!product && !isDirty)}
        >
          {isSubmitting ? 'Saving…' : product ? 'Save changes' : 'Create product'}
        </Button>
      </FieldGroup>
    </form>
  );
}

/**
 * Create a product (without `product`) or edit it.
 * The form only mounts once the categories are there: a <select> cannot show a value whose
 * <option> does not exist yet, it would show "No category" while the form holds the id.
 */
export function ProductForm({ product }: ProductFormProps) {
  const { data: categories, isPending } = useCategoryTree();

  if (isPending) {
    return (
      <div role="status" aria-label="Loading form" className="flex flex-col gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  // Categories failed to load: the form still works, just without choosing a category
  return <ProductFormInner product={product} categories={categories ?? []} />;
}
