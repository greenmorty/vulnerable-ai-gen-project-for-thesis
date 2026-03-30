/**
 * Responsibility: Renders an interactive star-rating control for review submission forms.
 */
interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
}

export const StarRatingInput = ({ value, onChange }: StarRatingInputProps) => {
  return (
    <div className="rating-input" role="radiogroup" aria-label="Review rating">
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;

        return (
          <button
            aria-checked={value === starValue}
            className={starValue <= value ? "rating-input__star rating-input__star--active" : "rating-input__star"}
            key={starValue}
            onClick={() => onChange(starValue)}
            role="radio"
            type="button"
          >
            ★
          </button>
        );
      })}
    </div>
  );
};
