-- CreateEnum
CREATE TYPE "ClientBusinessType" AS ENUM (
    'ACCOUNTING',
    'ARCHITECTURE',
    'AUTOMOTIVE',
    'CONSTRUCTION',
    'CONSULTING',
    'EDUCATION',
    'FINANCIAL_SERVICES',
    'GOVERNMENT',
    'HEALTHCARE',
    'HOSPITALITY',
    'LEGAL',
    'MANUFACTURING',
    'NONPROFIT',
    'REAL_ESTATE',
    'RESTAURANT_FOOD_SERVICE',
    'RETAIL',
    'TECHNOLOGY',
    'TRANSPORTATION_LOGISTICS',
    'OTHER'
);

-- Convert existing free-text values to the controlled enum. Unrecognized non-empty
-- values are retained semantically as OTHER rather than blocking the migration.
ALTER TABLE "Client"
ALTER COLUMN "businessType" TYPE "ClientBusinessType"
USING (
    CASE
        WHEN "businessType" IS NULL OR BTRIM("businessType") = '' THEN NULL
        WHEN LOWER(BTRIM("businessType")) = 'accounting' THEN 'ACCOUNTING'
        WHEN LOWER(BTRIM("businessType")) = 'architecture' THEN 'ARCHITECTURE'
        WHEN LOWER(BTRIM("businessType")) = 'automotive' THEN 'AUTOMOTIVE'
        WHEN LOWER(BTRIM("businessType")) = 'construction' THEN 'CONSTRUCTION'
        WHEN LOWER(BTRIM("businessType")) = 'consulting' THEN 'CONSULTING'
        WHEN LOWER(BTRIM("businessType")) = 'education' THEN 'EDUCATION'
        WHEN LOWER(BTRIM("businessType")) = 'financial services' THEN 'FINANCIAL_SERVICES'
        WHEN LOWER(BTRIM("businessType")) = 'government' THEN 'GOVERNMENT'
        WHEN LOWER(BTRIM("businessType")) = 'healthcare' THEN 'HEALTHCARE'
        WHEN LOWER(BTRIM("businessType")) = 'hospitality' THEN 'HOSPITALITY'
        WHEN LOWER(BTRIM("businessType")) = 'legal' THEN 'LEGAL'
        WHEN LOWER(BTRIM("businessType")) = 'manufacturing' THEN 'MANUFACTURING'
        WHEN LOWER(BTRIM("businessType")) = 'nonprofit' THEN 'NONPROFIT'
        WHEN LOWER(BTRIM("businessType")) = 'real estate' THEN 'REAL_ESTATE'
        WHEN LOWER(BTRIM("businessType")) IN ('restaurant / food service', 'restaurant/food service') THEN 'RESTAURANT_FOOD_SERVICE'
        WHEN LOWER(BTRIM("businessType")) = 'retail' THEN 'RETAIL'
        WHEN LOWER(BTRIM("businessType")) = 'technology' THEN 'TECHNOLOGY'
        WHEN LOWER(BTRIM("businessType")) IN ('transportation / logistics', 'transportation/logistics') THEN 'TRANSPORTATION_LOGISTICS'
        WHEN LOWER(BTRIM("businessType")) = 'other' THEN 'OTHER'
        ELSE 'OTHER'
    END::"ClientBusinessType"
);
