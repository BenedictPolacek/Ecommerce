import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormAlert } from '@/components/form/FormAlert';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { categoryOptionLabel } from '@/features/categories/api';
import type { Category, CategoryNode } from '@/features/categories/types';
import { setServerErrors } from '@/lib/form-errors';
import { useCreateCategory, useUpdateCategory } from '../hooks';
import { categoryFormSchema, toCategoryForm, type CategoryForm as FormValues } from '../schemas';
import { parentOptions } from '../tree';

const SERVER_FIELDS = ['name', 'slug', 'description', 'parent_id'] as const;

interface CategoryFormProps {
  tree: CategoryNode[];
  /** Edit this category; without it a new one is created */
  category?: CategoryNode;
  /** Preselected parent of a new category ("Add subcategory") */
  parentId?: string;
  onCancel: () => void;
  onSaved: (category: Category) => void;
}

export function CategoryForm({ tree, category, parentId, onCancel, onSaved }: CategoryFormProps) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const form = useForm<FormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: category
      ? toCategoryForm(category)
      : { name: '', slug: '', description: '', parent_id: parentId ?? '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    const input = {
      name: values.name,
      // Empty: generated from the name, or unchanged when editing
      slug: values.slug || undefined,
      parent_id: values.parent_id || null,
    };

    try {
      const saved = category
        ? // An empty description clears it
          await updateCategory.mutateAsync({
            ...input,
            id: category.id,
            description: values.description,
          })
        : await createCategory.mutateAsync({
            ...input,
            description: values.description || undefined,
          });
      onSaved(saved);
    } catch (error) {
      // 409 (name or slug taken) and 400 (too deep) have no field errors: shown above the form
      setServerErrors(error, form.setError, SERVER_FIELDS);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={errors.root?.server?.message} />
        <TextField
          id="category-name"
          label="Name"
          autoComplete="off"
          error={errors.name}
          {...form.register('name')}
        />

        <Field data-invalid={!!errors.parent_id}>
          <FieldLabel htmlFor="category-parent">Parent category</FieldLabel>
          <select
            id="category-parent"
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs"
            aria-describedby="category-parent-hint"
            {...form.register('parent_id')}
          >
            <option value="">None (top level)</option>
            {parentOptions(tree, category).map((option) => (
              <option key={option.id} value={option.id}>
                {categoryOptionLabel(option)}
              </option>
            ))}
          </select>
          <FieldDescription id="category-parent-hint">
            At most 3 levels, e.g. Clothing, Men, Shirts.
            {category && ' Subcategories move along.'}
          </FieldDescription>
          <FieldError errors={[errors.parent_id]} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="category-description">Description (optional)</FieldLabel>
          <Textarea
            id="category-description"
            rows={3}
            aria-invalid={!!errors.description}
            {...form.register('description')}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <TextField
          id="category-slug"
          label="URL slug (optional)"
          hint={
            category
              ? `Shop address: /?category=${category.slug}. Changing it breaks existing links.`
              : 'Leave empty to create it from the name; subcategories get the parent as prefix, e.g. audio-headphones.'
          }
          autoComplete="off"
          error={errors.slug}
          {...form.register('slug')}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : category ? 'Save changes' : 'Create category'}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  );
}
