import { useQuery } from '@tanstack/react-query';
import { productAPI } from '../services/api';

/**
 * Live products for the rate tables. `category` is a category name matched
 * case-insensitively ("Cement", "aggregate"); omit it for every category.
 */
export const useRateProducts = (category) => {
  const { data: categories, isError: categoriesError } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productAPI.getCategories(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const categoryId = category
    ? categories?.find((c) => c.name?.toLowerCase() === category.toLowerCase())?._id
    : undefined;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['rate-products', categoryId ?? 'all'],
    queryFn: () => productAPI.getProducts({ category: categoryId, sortBy: 'name', limit: 100 }),
    enabled: category ? !!categoryId : true, // wait for the id when a category is given
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    products: data?.products || [],
    isLoading: isLoading || (!!category && !categories && !categoriesError),
    isError: isError || categoriesError,
  };
};
