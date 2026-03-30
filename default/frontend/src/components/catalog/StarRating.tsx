/**
 * Responsibility: Renders a compact visual star rating summary for catalog cards and product detail views.
 */
interface StarRatingProps {
  rating: number;
  reviewCount?: number;
}

export const StarRating = ({ rating, reviewCount }: StarRatingProps) => {
  const clampedRating = Math.max(0, Math.min(5, rating));
  const filledStars = Math.round(clampedRating);

  return (
    <div className="rating-row">
      <span className="rating-stars" aria-label={`${clampedRating.toFixed(1)} out of 5 stars`}>
        {"★★★★★".slice(0, filledStars)}
        <span className="rating-stars rating-stars--muted">{"★★★★★".slice(filledStars)}</span>
      </span>
      <span className="rating-text">
        {clampedRating.toFixed(1)}
        {typeof reviewCount === "number" ? ` (${reviewCount})` : ""}
      </span>
    </div>
  );
};

