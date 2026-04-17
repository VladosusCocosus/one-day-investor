-- Blog Chart Updates: Add chart blocks to all published posts
-- Executed: 2026-04-17
-- Posts affected: #4, #5, #6, #7

-- =============================================================================
-- Task 5: Post #4 (Frequent Checking) — 1 chart
-- Insert bar chart after "Theoretical Background: Myopic Loss Aversion" (position 3)
-- =============================================================================

UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{3}',
    '{"type":"chart","chartType":"bar","heading":"Chance of Seeing a Moderate Loss","caption":"Source: Benartzi & Thaler (1995), OnePortfolio analysis","height":300,"data":{"labels":["Daily Checking","Quarterly Checking"],"series":[25,12]},"options":{"colors":["#ef4444","#10b981"],"suffix":"%"}}'::jsonb
  )
  FROM posts WHERE id = 4
),
updated_at = now()
WHERE id = 4;

-- =============================================================================
-- Task 6: Post #5 (Investing Apps) — 2 charts
-- =============================================================================

-- First insert: PFOF donut after "How Brokers Actually Make Money" (position 3)
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{3}',
    '{"type":"chart","chartType":"donut","heading":"Robinhood Revenue Breakdown (2021)","caption":"Source: Business of Apps","height":320,"data":{"labels":["Transaction-Based (PFOF)","Other Revenue"],"series":[77,23]},"options":{"colors":["#ef4444","#10b981"],"suffix":"%"}}'::jsonb
  )
  FROM posts WHERE id = 5
),
updated_at = now()
WHERE id = 5;

-- Second insert: DALBAR bar after "The Numbers Don't Lie" (now at index 5, insert at 6)
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{6}',
    '{"type":"chart","chartType":"bar","heading":"The Behavior Gap (2024)","caption":"Source: DALBAR Quantitative Analysis of Investor Behavior","height":300,"data":{"labels":["Average Investor","S&P 500"],"series":[16.54,25.02]},"options":{"colors":["#ef4444","#10b981"],"suffix":"%"}}'::jsonb
  )
  FROM posts WHERE id = 5
),
updated_at = now()
WHERE id = 5;

-- =============================================================================
-- Task 7: Post #6 (Monthly Check) — 2 charts
-- =============================================================================

-- First insert: DALBAR bar after "Why Monthly?" (position 3)
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{3}',
    '{"type":"chart","chartType":"bar","heading":"The Behavior Gap (2024)","caption":"Source: DALBAR Quantitative Analysis of Investor Behavior","height":300,"data":{"labels":["Average Investor","S&P 500"],"series":[16.54,25.02]},"options":{"colors":["#ef4444","#10b981"],"suffix":"%"}}'::jsonb
  )
  FROM posts WHERE id = 6
),
updated_at = now()
WHERE id = 6;

-- Second insert: Active traders bar after "What NOT to Do" (now at index 5, insert at 6)
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{6}',
    '{"type":"chart","chartType":"bar","heading":"Active Traders vs Market Return","caption":"Source: Barber & Odean, The Journal of Finance (2000)","height":300,"data":{"labels":["Most Active Traders","Market Return"],"series":[11.4,17.9]},"options":{"colors":["#ef4444","#10b981"],"suffix":"%"}}'::jsonb
  )
  FROM posts WHERE id = 6
),
updated_at = now()
WHERE id = 6;

-- =============================================================================
-- Task 8: Post #7 (When One Day Isn't Enough) — 4 charts
-- NOTE: Inserted bottom to top to avoid index shifting issues
-- =============================================================================

-- Insert 1 (bottom): Health insurance bar after "Exception 4: Open Enrollment" (insert at 7)
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{7}',
    '{"type":"chart","chartType":"bar","heading":"Health Insurance Cost Increase (2026)","caption":"Source: Mercer, Business Group on Health","height":300,"data":{"labels":["Employee Premium Increase","Total Employer Cost Increase"],"series":[7,9]},"options":{"colors":["#3b82f6","#1e40af"],"suffix":"%"}}'::jsonb
  )
  FROM posts WHERE id = 7
),
updated_at = now()
WHERE id = 7;

-- Insert 2: Tax alpha horizontal-bar after "Exception 3" (insert at 6)
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{6}',
    '{"type":"chart","chartType":"horizontal-bar","heading":"Tax Alpha by Period (MIT Study)","caption":"Source: Chaudhuri, Burnham & Lo, Financial Analysts Journal (2020)","height":280,"data":{"labels":["1926–1949","1949–1972","1972–1995","1995–2018"],"series":[2.29,0.57,1.04,0.83]},"options":{"colors":["hsl(160,84%,25%)","hsl(160,70%,40%)","hsl(150,60%,55%)","hsl(170,55%,55%)"],"suffix":"% annual"}}'::jsonb
  )
  FROM posts WHERE id = 7
),
updated_at = now()
WHERE id = 7;

-- Insert 3: Corrections donut after "Exception 2" (insert at 5)
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{5}',
    '{"type":"chart","chartType":"donut","heading":"S&P 500 Corrections Since 1974","caption":"Source: Charles Schwab. Only 6 of 27 corrections became bear markets.","height":320,"data":{"labels":["Recovered Without Bear Market","Became Bear Markets"],"series":[21,6]},"options":{"colors":["#10b981","#ef4444"]}}'::jsonb
  )
  FROM posts WHERE id = 7
),
updated_at = now()
WHERE id = 7;

-- Insert 4 (top): DALBAR bar after "The Rule Still Stands" (insert at 3)
UPDATE posts
SET content = (
  SELECT jsonb_insert(
    content,
    '{3}',
    '{"type":"chart","chartType":"bar","heading":"The Behavior Gap (2024)","caption":"Source: DALBAR Quantitative Analysis of Investor Behavior","height":300,"data":{"labels":["Average Investor","S&P 500"],"series":[16.54,25.02]},"options":{"colors":["#ef4444","#10b981"],"suffix":"%"}}'::jsonb
  )
  FROM posts WHERE id = 7
),
updated_at = now()
WHERE id = 7;

-- =============================================================================
-- Expected final block counts:
--   Post #4: 12 blocks, chart at position 3
--   Post #5: 12 blocks, charts at positions 3 and 6
--   Post #6: 11 blocks, charts at positions 3 and 6
--   Post #7: 16 blocks, charts at positions 3, 5(donut), 6(tax), 8(health)
-- =============================================================================
