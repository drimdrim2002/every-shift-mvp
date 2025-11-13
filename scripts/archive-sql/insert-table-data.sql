-- 기본 테이블 데이터 삽입 스크립트

-- 샘플 상품 데이터 삽입
INSERT INTO products (
  product_name, description, category, price, currency, quantity,
  status, available, in_production, open,
  image_url, image_url2, weight, color, rating, tags, release_date
) VALUES
-- Electronics
('iPhone 15 Pro', 'Latest flagship smartphone with advanced features', 'Electronics', 999.99, 'USD', 50, 'success', true, true, true,
 'https://images.unsplash.com/photo-1592210454359-9043f067919b?w=300', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300',
 0.201, 'Space Black', 4.8, '["smartphone", "apple", "premium"]', '2023-09-15'),

('Samsung Galaxy S24', 'Premium Android smartphone with AI features', 'Electronics', 899.99, 'USD', 75, 'success', true, true, true,
 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=300', 'https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?w=300',
 0.195, 'Titanium Gray', 4.7, '["smartphone", "samsung", "android"]', '2024-01-20'),

('MacBook Pro 16"', 'Professional laptop for creative work', 'Electronics', 2499.99, 'USD', 25, 'success', true, true, true,
 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300',
 2.1, 'Space Gray', 4.9, '["laptop", "apple", "professional"]', '2023-10-30'),

('Dell XPS 13', 'Ultra-portable laptop for business', 'Electronics', 1299.99, 'USD', 40, 'warning', true, true, true,
 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=300', 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=300',
 1.3, 'Platinum Silver', 4.5, '["laptop", "dell", "business"]', '2023-08-15'),

-- Clothing
('Premium Cotton T-Shirt', 'Comfortable everyday wear made from organic cotton', 'Clothing', 29.99, 'USD', 100, 'success', true, true, true,
 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300', 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=300',
 0.2, 'Navy Blue', 4.3, '["t-shirt", "cotton", "casual"]', '2024-03-01'),

('Leather Jacket', 'Classic genuine leather jacket for style', 'Clothing', 199.99, 'USD', 30, 'success', true, true, true,
 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300', 'https://images.unsplash.com/photo-1506629905607-5b0e1b7c6f6c?w=300',
 1.5, 'Black', 4.6, '["jacket", "leather", "fashion"]', '2023-12-10'),

('Running Shoes', 'High-performance athletic footwear', 'Clothing', 129.99, 'USD', 60, 'success', true, true, true,
 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300', 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=300',
 0.8, 'White/Blue', 4.4, '["shoes", "running", "athletic"]', '2024-02-15'),

-- Home & Garden
('Smart Home Hub', 'Central control for all smart devices', 'Home & Garden', 149.99, 'USD', 80, 'success', true, true, true,
 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300', 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa9?w=300',
 0.5, 'White', 4.2, '["smart-home", "hub", "automation"]', '2023-11-20'),

('Indoor Plant Set', 'Collection of easy-care houseplants', 'Home & Garden', 79.99, 'USD', 45, 'success', true, true, true,
 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300', 'https://images.unsplash.com/photo-1509423350716-97f2360af378?w=300',
 2.0, 'Green', 4.7, '["plants", "indoor", "decoration"]', '2024-01-05'),

('Coffee Maker', 'Automatic drip coffee maker with timer', 'Home & Garden', 89.99, 'USD', 35, 'success', true, true, true,
 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300',
 3.2, 'Stainless Steel', 4.1, '["coffee", "appliance", "kitchen"]', '2023-09-30'),

-- Books
('The Art of Programming', 'Comprehensive guide to software development', 'Books', 49.99, 'USD', 120, 'success', true, true, true,
 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300',
 0.8, 'Multicolor', 4.8, '["programming", "education", "technology"]', '2023-06-15'),

('Cooking Masterclass', 'Professional techniques for home chefs', 'Books', 34.99, 'USD', 90, 'success', true, true, true,
 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300',
 1.2, 'White', 4.5, '["cooking", "recipe", "culinary"]', '2023-12-01'),

-- Sports
('Yoga Mat Premium', 'Non-slip exercise mat for yoga and fitness', 'Sports', 39.99, 'USD', 70, 'success', true, true, true,
 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300', 'https://images.unsplash.com/photo-1506142468547-9c232374014f?w=300',
 1.5, 'Purple', 4.6, '["yoga", "fitness", "exercise"]', '2024-01-10'),

('Basketball', 'Official size indoor/outdoor basketball', 'Sports', 24.99, 'USD', 85, 'success', true, true, true,
 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=300', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300',
 0.6, 'Orange', 4.3, '["basketball", "sports", "recreation"]', '2023-10-05'),

-- 일부 제품을 다른 상태로 설정
('Discontinued Model', 'Old product model no longer in production', 'Electronics', 599.99, 'USD', 5, 'error', false, false, false,
 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
 1.8, 'Silver', 3.2, '["discontinued", "electronics", "old"]', '2022-03-15'),

('Limited Edition Watch', 'Exclusive timepiece with limited availability', 'Accessories', 899.99, 'USD', 3, 'warning', true, true, true,
 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300', 'https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=300',
 0.15, 'Gold', 4.9, '["watch", "luxury", "limited"]', '2024-02-29'),

-- 추가 샘플 데이터 (다양한 카테고리와 상태)
('Wireless Headphones', 'Noise-cancelling over-ear headphones', 'Electronics', 299.99, 'USD', 65, 'success', true, true, true,
 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300', 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=300',
 0.4, 'Black', 4.4, '["headphones", "wireless", "audio"]', '2023-11-12'),

('Desk Lamp', 'Adjustable LED desk lamp for work', 'Home & Garden', 69.99, 'USD', 55, 'success', true, true, true,
 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300', 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=300',
 1.2, 'White', 4.2, '["lamp", "desk", "lighting"]', '2024-01-25'),

('Protein Powder', 'High-quality whey protein supplement', 'Sports', 59.99, 'USD', 40, 'success', true, true, true,
 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=300', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300',
 2.3, 'White', 4.1, '["protein", "supplement", "fitness"]', '2023-08-20'),

('Wall Art Print', 'Modern abstract art for home decoration', 'Home & Garden', 45.99, 'USD', 25, 'success', true, true, true,
 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300', 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=300',
 0.3, 'Multicolor', 4.0, '["art", "print", "decoration"]', '2023-12-08');

-- 총 20개의 샘플 상품 데이터가 삽입됩니다.
