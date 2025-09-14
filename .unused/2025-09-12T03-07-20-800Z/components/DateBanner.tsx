import React from "react";

export type DateBannerProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
  testId?: string;
};
export default function DateBanner({ title, subtitle, onPrev, onNext, testId }: DateBannerProps) {
  return (
    <section className="DateBanner" data-testid={testId}>
      <button
        type="button"
        aria-label="Previous"
        className="DateBanner__chev"
        onClick={onPrev}
        disabled={!onPrev}
      >
        ‹
      </button>
      <div className="DateBanner__titles">
        <div className="DateBanner__title">{title}</div>
        {subtitle ? <div className="DateBanner__subtitle">{subtitle}</div> : null}
      </div>
      <button
        type="button"
        aria-label="Next"
        className="DateBanner__chev"
        onClick={onNext}
        disabled={!onNext}
      >
        ›
      </button>
    </section>
  );
}
