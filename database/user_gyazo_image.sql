     CREATE TABLE user_gyazo_images (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
       gyazo_image_id TEXT NOT NULL,
       url TEXT NOT NULL,
       permalink_url TEXT NOT NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     );
     ALTER TABLE user_gyazo_images ENABLE ROW LEVEL SECURITY;
     CREATE POLICY "Users can manage own gyazo images"
       ON user_gyazo_images FOR ALL
       USING (user_id = auth.uid())
       WITH CHECK (user_id = auth.uid());
     CREATE INDEX idx_user_gyazo_images_user ON user_gyazo_images(user_id);