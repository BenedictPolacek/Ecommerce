export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/** Category with its subcategories (GET /categories?tree=true) */
export interface CategoryNode extends Category {
  children: CategoryNode[];
}
