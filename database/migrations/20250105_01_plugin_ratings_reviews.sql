-- Plugin Ratings and Reviews System
-- Migration: 20250105_01_plugin_ratings_reviews
-- Description: Add tables for plugin ratings and reviews (Phase 3)
--
-- Related Documentation:
--   - Plan: docs/03_plans/plugin-system/implementation-status.md
--   - Issue: #95 - Marketplace UI/UX
--
-- Tables created:
--   1. plugin_ratings - User ratings for plugins (1-5 stars)
--   2. plugin_reviews - User reviews with text content

-- ============================================================================
-- 1. Plugin Ratings Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS plugin_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and Plugin
  user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL REFERENCES plugins(plugin_id) ON DELETE CASCADE,
  
  -- Rating
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, plugin_id)
);

-- Indexes for plugin_ratings table
CREATE INDEX IF NOT EXISTS idx_plugin_ratings_user_id ON plugin_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_plugin_ratings_plugin_id ON plugin_ratings(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_ratings_rating ON plugin_ratings(rating);
CREATE INDEX IF NOT EXISTS idx_plugin_ratings_plugin_rating ON plugin_ratings(plugin_id, rating);

-- Comments
COMMENT ON TABLE plugin_ratings IS 'User ratings for plugins (1-5 stars)';
COMMENT ON COLUMN plugin_ratings.rating IS 'Rating value from 1 to 5';

-- ============================================================================
-- 2. Plugin Reviews Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS plugin_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and Plugin
  user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL REFERENCES plugins(plugin_id) ON DELETE CASCADE,
  
  -- Review Content
  title TEXT,                                  -- Optional review title
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 5000),
  
  -- Helpful votes
  helpful_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_title CHECK (title IS NULL OR (length(title) > 0 AND length(title) <= 200))
);

-- Indexes for plugin_reviews table
CREATE INDEX IF NOT EXISTS idx_plugin_reviews_user_id ON plugin_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_plugin_reviews_plugin_id ON plugin_reviews(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_reviews_created_at ON plugin_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_reviews_helpful ON plugin_reviews(helpful_count DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_reviews_plugin_created ON plugin_reviews(plugin_id, created_at DESC);

-- Comments
COMMENT ON TABLE plugin_reviews IS 'User reviews for plugins with text content';
COMMENT ON COLUMN plugin_reviews.content IS 'Review text content (max 5000 characters)';
COMMENT ON COLUMN plugin_reviews.title IS 'Optional review title (max 200 characters)';
COMMENT ON COLUMN plugin_reviews.helpful_count IS 'Number of users who marked this review as helpful';

-- ============================================================================
-- 3. Plugin Review Helpful Votes Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS plugin_review_helpful (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and Review
  user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES plugin_reviews(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, review_id)
);

-- Indexes for plugin_review_helpful table
CREATE INDEX IF NOT EXISTS idx_plugin_review_helpful_user_id ON plugin_review_helpful(user_id);
CREATE INDEX IF NOT EXISTS idx_plugin_review_helpful_review_id ON plugin_review_helpful(review_id);

-- Comments
COMMENT ON TABLE plugin_review_helpful IS 'Users who marked reviews as helpful';

-- ============================================================================
-- Trigger Functions
-- ============================================================================

-- Update updated_at timestamp for plugin_ratings
CREATE OR REPLACE FUNCTION update_plugin_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_plugin_ratings_updated_at
BEFORE UPDATE ON plugin_ratings
FOR EACH ROW
EXECUTE FUNCTION update_plugin_ratings_updated_at();

-- Update updated_at timestamp for plugin_reviews
CREATE OR REPLACE FUNCTION update_plugin_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_plugin_reviews_updated_at
BEFORE UPDATE ON plugin_reviews
FOR EACH ROW
EXECUTE FUNCTION update_plugin_reviews_updated_at();

-- Update plugin rating average and count when rating is inserted/updated/deleted
CREATE OR REPLACE FUNCTION update_plugin_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_avg DECIMAL;
  v_count INTEGER;
BEGIN
  -- Calculate new average rating and count
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO v_avg, v_count
  FROM plugin_ratings
  WHERE plugin_id = COALESCE(NEW.plugin_id, OLD.plugin_id);
  
  -- Update plugins table
  UPDATE plugins
  SET 
    rating_average = CASE WHEN v_count > 0 THEN v_avg ELSE NULL END,
    rating_count = v_count
  WHERE plugin_id = COALESCE(NEW.plugin_id, OLD.plugin_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_plugin_rating_on_insert
AFTER INSERT ON plugin_ratings
FOR EACH ROW
EXECUTE FUNCTION update_plugin_rating_stats();

CREATE TRIGGER trg_update_plugin_rating_on_update
AFTER UPDATE ON plugin_ratings
FOR EACH ROW
EXECUTE FUNCTION update_plugin_rating_stats();

CREATE TRIGGER trg_update_plugin_rating_on_delete
AFTER DELETE ON plugin_ratings
FOR EACH ROW
EXECUTE FUNCTION update_plugin_rating_stats();

-- Update helpful_count when helpful vote is inserted/deleted
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE plugin_reviews
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE plugin_reviews
    SET helpful_count = helpful_count - 1
    WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_review_helpful_on_insert
AFTER INSERT ON plugin_review_helpful
FOR EACH ROW
EXECUTE FUNCTION update_review_helpful_count();

CREATE TRIGGER trg_update_review_helpful_on_delete
AFTER DELETE ON plugin_review_helpful
FOR EACH ROW
EXECUTE FUNCTION update_review_helpful_count();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE plugin_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_review_helpful ENABLE ROW LEVEL SECURITY;

-- Plugin Ratings: Users can view all, manage their own
CREATE POLICY "Plugin ratings are viewable by everyone"
  ON plugin_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own ratings"
  ON plugin_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON plugin_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
  ON plugin_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- Plugin Reviews: Users can view all, manage their own
CREATE POLICY "Plugin reviews are viewable by everyone"
  ON plugin_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own reviews"
  ON plugin_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON plugin_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON plugin_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Plugin Review Helpful: Users can view all, manage their own votes
CREATE POLICY "Review helpful votes are viewable by everyone"
  ON plugin_review_helpful FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own helpful votes"
  ON plugin_review_helpful FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own helpful votes"
  ON plugin_review_helpful FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Helper Functions
-- ============================================================================

/**
 * Upsert plugin rating (insert or update)
 */
CREATE OR REPLACE FUNCTION upsert_plugin_rating(
  p_plugin_id TEXT,
  p_rating INTEGER
)
RETURNS void AS $$
BEGIN
  INSERT INTO plugin_ratings (user_id, plugin_id, rating)
  VALUES (auth.uid(), p_plugin_id, p_rating)
  ON CONFLICT (user_id, plugin_id)
  DO UPDATE SET 
    rating = p_rating,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Toggle helpful vote for a review
 */
CREATE OR REPLACE FUNCTION toggle_review_helpful(p_review_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if vote already exists
  SELECT EXISTS(
    SELECT 1 FROM plugin_review_helpful
    WHERE user_id = auth.uid() AND review_id = p_review_id
  ) INTO v_exists;
  
  IF v_exists THEN
    -- Remove vote
    DELETE FROM plugin_review_helpful
    WHERE user_id = auth.uid() AND review_id = p_review_id;
    RETURN false;
  ELSE
    -- Add vote
    INSERT INTO plugin_review_helpful (user_id, review_id)
    VALUES (auth.uid(), p_review_id);
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

