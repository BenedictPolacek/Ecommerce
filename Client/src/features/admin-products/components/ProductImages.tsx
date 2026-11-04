import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Star, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormAlert } from '@/components/form/FormAlert';
import { TextField } from '@/components/form/TextField';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import type { Product, ProductImage } from '@/features/products/types';
import { getErrorMessage, setServerErrors } from '@/lib/form-errors';
import { useAddProductImage, useDeleteProductImage, useReorderProductImages } from '../hooks';

// Mirrors MAX_IMAGES_PER_PRODUCT and addImageSchema on the server (UX only)
const MAX_IMAGES = 10;

const imageSchema = z.object({
  // Only http(s): no javascript: or data: URLs in an <img src>
  url: z
    .url({ protocol: /^https?$/, error: 'Enter an image URL starting with https://' })
    .max(2048, 'URL cannot exceed 2048 characters'),
  alt_text: z.string().trim().max(255, 'Description cannot exceed 255 characters'),
});

type ImageForm = z.infer<typeof imageSchema>;

const EMPTY: ImageForm = { url: '', alt_text: '' };

/** The new order after moving one image from `from` to `to` */
function moved(images: ProductImage[], from: number, to: number) {
  const ids = images.map((image) => image.id);
  const [id] = ids.splice(from, 1);
  ids.splice(to, 0, id);
  return ids;
}

function AddImageForm({ productId }: { productId: string }) {
  const addImage = useAddProductImage();
  const form = useForm<ImageForm>({ resolver: zodResolver(imageSchema), defaultValues: EMPTY });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ url, alt_text }) => {
    try {
      await addImage.mutateAsync({ productId, url, alt_text: alt_text || undefined });
      form.reset(EMPTY);
      toast.success('Image added');
    } catch (error) {
      setServerErrors(error, form.setError, ['url', 'alt_text']);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="add-image-title">
      <FieldGroup>
        <h4 id="add-image-title" className="font-medium">
          Add an image
        </h4>
        <FormAlert message={errors.root?.server?.message} />
        <TextField
          id="image-url"
          label="Image URL"
          type="url"
          placeholder="https://"
          autoComplete="off"
          error={errors.url}
          {...form.register('url')}
        />
        <TextField
          id="image-alt"
          label="Description for screen readers"
          hint='What the image shows, e.g. "Desk lamp in black, switched on".'
          autoComplete="off"
          error={errors.alt_text}
          {...form.register('alt_text')}
        />
        <Button type="submit" variant="outline" className="self-start" disabled={isSubmitting}>
          {isSubmitting ? 'Adding…' : 'Add image'}
        </Button>
      </FieldGroup>
    </form>
  );
}

/** Images of a product; the first one is the main image in the shop */
export function ProductImages({ product }: { product: Product }) {
  const reorder = useReorderProductImages();
  const remove = useDeleteProductImage();
  const busy = reorder.isPending || remove.isPending;
  const { images } = product;
  const onError = (error: Error) => toast.error(getErrorMessage(error));

  const move = (from: number, to: number, message: string) =>
    reorder.mutate(
      { productId: product.id, imageIds: moved(images, from, to) },
      { onSuccess: () => toast.success(message), onError }
    );

  return (
    <div className="flex flex-col gap-6">
      {images.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No images yet. The shop shows a placeholder instead.
        </p>
      ) : (
        <ol className="flex flex-col gap-3" aria-label="Product images" aria-busy={busy}>
          {images.map((image, index) => {
            // "Image 2" in button names: screen readers know which image a button belongs to
            const name = `image ${index + 1}`;
            return (
              <li key={image.id} className="flex items-center gap-4 rounded-lg border p-3">
                <img
                  src={image.url}
                  alt={image.alt_text ?? ''}
                  className="size-16 shrink-0 rounded object-cover"
                  loading="lazy"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    Image {index + 1}
                    {index === 0 && <Badge variant="secondary">Main image</Badge>}
                  </span>
                  <span
                    className={image.alt_text ? 'truncate' : 'text-destructive'}
                    title={image.alt_text ?? undefined}
                  >
                    {image.alt_text ?? 'No description for screen readers'}
                  </span>
                </div>
                <div className="flex shrink-0 gap-1">
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy}
                      aria-label={`Make ${name} the main image`}
                      title="Make main image"
                      onClick={() => move(index, 0, 'Main image changed')}
                    >
                      <Star />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy || index === 0}
                    aria-label={`Move ${name} up`}
                    title="Move up"
                    onClick={() => move(index, index - 1, 'Image moved up')}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy || index === images.length - 1}
                    aria-label={`Move ${name} down`}
                    title="Move down"
                    onClick={() => move(index, index + 1, 'Image moved down')}
                  >
                    <ArrowDown />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        aria-label={`Delete ${name}`}
                        title="Delete"
                      >
                        <Trash2 />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          The image is removed from the product. The file itself stays where it is
                          hosted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep image</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            remove.mutate(
                              { productId: product.id, imageId: image.id },
                              { onSuccess: () => toast.success('Image deleted'), onError }
                            )
                          }
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {images.length < MAX_IMAGES ? (
        <AddImageForm productId={product.id} />
      ) : (
        <p className="text-muted-foreground text-sm">
          A product can have at most {MAX_IMAGES} images. Delete one to add another.
        </p>
      )}
    </div>
  );
}
