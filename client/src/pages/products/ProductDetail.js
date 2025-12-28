import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { StarIcon, ShoppingCartIcon, PlusIcon, MinusIcon, HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/solid';
import { productAPI, reviewAPI } from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart, getCartItem } = useCart();
  const { isAuthenticated } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ title: '', comment: '', rating: 5 });

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productAPI.getById(id)
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => reviewAPI.getProductReviews(id),
    enabled: !!id
  });

  const createReviewMutation = useMutation({
    mutationFn: (reviewData) => reviewAPI.createReview(reviewData),
    onSuccess: () => {
      toast.success('Review submitted! It will be displayed after admin approval.');
      setShowReviewForm(false);
      setReviewForm({ title: '', comment: '', rating: 5 });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    }
  });

  const cartItem = getCartItem(id);

  const handleAddToCart = () => {
    if (!product || product.totalStock <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    addToCart(product, quantity);
    toast.success(`Added ${quantity} ${quantity === 1 ? 'item' : 'items'} to cart`);
  };

  const incrementQuantity = () => {
    if (quantity < (product?.totalStock || product?.stock || 1)) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to submit a review');
      return;
    }
    if (reviewForm.comment.length < 10) {
      toast.error('Review must be at least 10 characters');
      return;
    }
    createReviewMutation.mutate({
      productId: id,
      ...reviewForm
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading product: {error.message}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Product not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="sticky top-8">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 overflow-hidden">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                <img
                  src={product.images?.[0] || '/placeholder-product.jpg'}
                  alt={product.name}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                />
                {(product.totalStock || product.stock) <= 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-6 py-3 rounded-full text-lg font-bold">
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>
              
              {/* Additional Images Placeholder */}
              <div className="flex gap-4 mt-6 overflow-x-auto">
                {[1,2,3,4].map((thumb) => (
                  <div key={thumb} className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-xl border-2 border-gray-200 hover:border-primary-300 transition-colors cursor-pointer"></div>
                ))}
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-8">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
              {/* Breadcrumb */}
              <div className="flex items-center text-sm text-gray-600 mb-6">
                <Link to="/" className="hover:text-primary-600">Home</Link>
                <span className="mx-2">›</span>
                <Link to="/products" className="hover:text-primary-600">Products</Link>
                <span className="mx-2">›</span>
                <span className="text-gray-900 font-semibold">{product.category?.name}</span>
              </div>

              <h1 className="text-4xl font-black text-gray-900 mb-6 leading-tight">{product.name}</h1>
              
              {/* Rating & Reviews */}
              <div className="flex items-center gap-6 mb-8">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`h-6 w-6 ${
                          i < Math.floor(reviewsData?.ratingStats?.averageRating || 0)
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {reviewsData?.ratingStats?.averageRating?.toFixed(1) || 'No'}
                  </span>
                  <span className="text-gray-600">({reviewsData?.ratingStats?.totalReviews || 0} reviews)</span>
                </div>
                <div className="text-green-600 font-semibold flex items-center gap-1">
                  ✅ Verified Quality
                </div>
              </div>

              {/* Price Section */}
              <div className="mb-8 p-6 bg-gradient-to-r from-primary-50 to-primary-100 rounded-2xl border border-primary-200">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-4xl font-black text-gray-900">
                    ₹{product.price?.toLocaleString()}
                  </span>
                  <span className="text-xl text-gray-400 line-through">
                    ₹{(product.price * 1.2)?.toLocaleString()}
                  </span>
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    17% OFF
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">per {product.unit}</span>
                  <span className="text-green-600 font-bold">
                    You save ₹{((product.price * 0.2) || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Product Features */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Product Highlights</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xl">✓</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Premium Quality</div>
                    <div className="text-sm text-gray-600">ISI certified materials</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xl">🚚</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Fast Delivery</div>
                    <div className="text-sm text-gray-600">24-48 hours</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-xl">🔒</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Secure Payment</div>
                    <div className="text-sm text-gray-600">100% safe checkout</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 text-xl">🔄</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Easy Returns</div>
                    <div className="text-sm text-gray-600">7-day return policy</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Purchase Section */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
              <div className="space-y-6">
                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600">{product.description}</p>
                </div>

                {/* Specifications */}
                {product.specifications && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Specifications</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(product.specifications).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium text-gray-700">{key}:</span>
                          <span className="ml-2 text-gray-600">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stock Status */}
                <div className="mb-6">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    (product.totalStock || product.stock) > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {(product.totalStock || product.stock) > 0 
                      ? `In Stock (${product.totalStock || product.stock} available)` 
                      : 'Out of Stock'}
                  </span>
                </div>

                {/* Quantity Selector */}
                {(product.totalStock || product.stock) > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={decrementQuantity}
                        disabled={quantity <= 1}
                        className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MinusIcon className="h-5 w-5" />
                      </button>
                      <span className="w-16 text-center text-xl font-semibold">{quantity}</span>
                      <button
                        onClick={incrementQuantity}
                        disabled={quantity >= (product.totalStock || product.stock)}
                        className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <PlusIcon className="h-5 w-5" />
                      </button>
                      <div className="ml-4 text-gray-600">
                        Available: {product.totalStock || product.stock}
                      </div>
                    </div>
                  </div>
                )}

                {/* Add to Cart */}
                {!cartItem ? (
                  <button
                    onClick={handleAddToCart}
                    disabled={(product.totalStock || product.stock) === 0}
                    className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
                  >
                    <ShoppingCartIcon className="h-5 w-5 mr-2" />
                    Add {quantity} to Cart
                  </button>
                ) : (
                  <div className="w-full bg-green-100 text-green-800 py-3 px-6 rounded-lg font-medium flex items-center justify-center">
                    <ShoppingCartIcon className="h-5 w-5 mr-2" />
                    In Cart ({cartItem.quantity} items)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Customer Reviews</h2>
              {isAuthenticated && !showReviewForm && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  + Write a Review
                </button>
              )}
            </div>

            {/* Review Form */}
            {showReviewForm && (
              <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-200">
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                          className="focus:outline-none"
                        >
                          <StarIcon
                            className={`h-8 w-8 transition-colors ${
                              star <= reviewForm.rating
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title (Optional)</label>
                    <input
                      type="text"
                      value={reviewForm.title}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Summarize your review"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Review <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                      placeholder="Share your experience with this product..."
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength="1000"
                      required
                    />
                    <div className="text-sm text-gray-500 mt-1">
                      {reviewForm.comment.length}/1000 characters
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={createReviewMutation.isLoading}
                      className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                      {createReviewMutation.isLoading ? 'Submitting...' : 'Submit Review'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowReviewForm(false);
                        setReviewForm({ title: '', comment: '', rating: 5 });
                      }}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!isAuthenticated && (
              <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
                <Link to="/login" className="font-semibold hover:underline">
                  Login to write a review
                </Link>
              </div>
            )}

            {/* Reviews List */}
            {reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
              <div className="space-y-6">
                {reviewsData.reviews.map((review) => (
                  <div key={review._id} className="pb-6 border-b border-gray-200 last:border-b-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <StarIcon
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? 'text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-semibold text-gray-900">{review.rating}/5</span>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {review.title || `${review.rating} star review`}
                        </p>
                        <p className="text-sm text-gray-600">
                          By {review.user?.name || 'Anonymous'} • {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {review.verified && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          ✅ Verified
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 mb-3">{review.comment}</p>
                    <div className="flex gap-4 text-sm">
                      <button className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
                        <HandThumbUpIcon className="h-4 w-4" />
                        Helpful ({review.helpful})
                      </button>
                      <button className="flex items-center gap-1 text-gray-600 hover:text-red-600">
                        <HandThumbDownIcon className="h-4 w-4" />
                        Not Helpful ({review.unhelpful})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No reviews yet. Be the first to review this product!</p>
                {isAuthenticated && (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Write a Review
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
