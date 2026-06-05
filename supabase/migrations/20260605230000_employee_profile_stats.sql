-- 1. Create the aggregate table
CREATE TABLE IF NOT EXISTS public.employee_profile_stats (
  employee_id UUID PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  sales_count INT NOT NULL DEFAULT 0,
  returns_count INT NOT NULL DEFAULT 0,
  medicine_count INT NOT NULL DEFAULT 0,
  cosmetic_count INT NOT NULL DEFAULT 0,
  present_days_count INT NOT NULL DEFAULT 0,
  absent_days_count INT NOT NULL DEFAULT 0
);

-- Enable RLS for the stats table
ALTER TABLE public.employee_profile_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can view own stats" ON public.employee_profile_stats;
CREATE POLICY "Employees can view own stats"
  ON public.employee_profile_stats FOR SELECT
  USING (employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid() LIMIT 1));

-- 2. Trigger for new employees
CREATE OR REPLACE FUNCTION public.auto_create_employee_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.employee_profile_stats (employee_id, branch_id)
  VALUES (NEW.id, NEW.branch_id)
  ON CONFLICT (employee_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_create_employee_stats ON public.employees;
CREATE TRIGGER trigger_auto_create_employee_stats
  AFTER INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_employee_stats();

-- 3. Trigger for sales count
CREATE OR REPLACE FUNCTION public.update_employee_stats_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.employee_profile_stats
    SET sales_count = sales_count + 1
    WHERE employee_id = NEW.sold_by_employee_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.employee_profile_stats
    SET sales_count = GREATEST(sales_count - 1, 0)
    WHERE employee_id = OLD.sold_by_employee_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_stats_on_sale ON public.sales;
CREATE TRIGGER trigger_update_stats_on_sale
  AFTER INSERT OR DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_employee_stats_on_sale();

-- 4. Trigger for sale items
CREATE OR REPLACE FUNCTION public.update_employee_stats_on_sale_item()
RETURNS TRIGGER AS $$
DECLARE
  v_emp_id UUID;
  v_category TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT s.sold_by_employee_id, d.category INTO v_emp_id, v_category
    FROM public.sales s
    JOIN public.drugs d ON d.id = NEW.drug_id
    WHERE s.id = NEW.sale_id;
    
    IF v_category IN ('medicine', 'medicine_and_treatments', 'أدوية', 'دواء', 'أدوية وعلاجات') THEN
      UPDATE public.employee_profile_stats SET medicine_count = medicine_count + NEW.quantity WHERE employee_id = v_emp_id;
    ELSIF v_category IN ('cosmetic', 'cosmetics', 'personal_care', 'تجميل', 'مستحضرات تجميل', 'عناية شخصية') THEN
      UPDATE public.employee_profile_stats SET cosmetic_count = cosmetic_count + NEW.quantity WHERE employee_id = v_emp_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT s.sold_by_employee_id, d.category INTO v_emp_id, v_category
    FROM public.sales s
    JOIN public.drugs d ON d.id = OLD.drug_id
    WHERE s.id = OLD.sale_id;
    
    IF v_category IN ('medicine', 'medicine_and_treatments', 'أدوية', 'دواء', 'أدوية وعلاجات') THEN
      UPDATE public.employee_profile_stats SET medicine_count = GREATEST(medicine_count - OLD.quantity, 0) WHERE employee_id = v_emp_id;
    ELSIF v_category IN ('cosmetic', 'cosmetics', 'personal_care', 'تجميل', 'مستحضرات تجميل', 'عناية شخصية') THEN
      UPDATE public.employee_profile_stats SET cosmetic_count = GREATEST(cosmetic_count - OLD.quantity, 0) WHERE employee_id = v_emp_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_stats_on_sale_item ON public.sale_items;
CREATE TRIGGER trigger_update_stats_on_sale_item
  AFTER INSERT OR DELETE ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.update_employee_stats_on_sale_item();

-- 5. Trigger for returns count
CREATE OR REPLACE FUNCTION public.update_employee_stats_on_return()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.employee_profile_stats
    SET returns_count = returns_count + 1
    WHERE employee_id = NEW.processed_by;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.employee_profile_stats
    SET returns_count = GREATEST(returns_count - 1, 0)
    WHERE employee_id = OLD.processed_by;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_stats_on_return ON public.returns;
CREATE TRIGGER trigger_update_stats_on_return
  AFTER INSERT OR DELETE ON public.returns
  FOR EACH ROW EXECUTE FUNCTION public.update_employee_stats_on_return();

-- 6. Trigger for shifts (Present Days)
CREATE OR REPLACE FUNCTION public.update_employee_stats_on_shift()
RETURNS TRIGGER AS $$
DECLARE
  v_emp_id UUID;
  v_is_new_day BOOLEAN;
BEGIN
  v_emp_id := NEW.opened_by;

  -- Check if they already have a shift opened on this specific day
  SELECT NOT EXISTS (
    SELECT 1 FROM public.shifts 
    WHERE opened_by = v_emp_id 
      AND date_trunc('day', open_time) = date_trunc('day', NEW.open_time)
      AND id != NEW.id
  ) INTO v_is_new_day;

  IF v_is_new_day THEN
    UPDATE public.employee_profile_stats
    SET present_days_count = present_days_count + 1
    WHERE employee_id = v_emp_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_stats_on_shift ON public.shifts;
CREATE TRIGGER trigger_update_stats_on_shift
  AFTER INSERT ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_employee_stats_on_shift();

-- 7. Initial Data Seeding (Backfill)
INSERT INTO public.employee_profile_stats (
  employee_id, branch_id, sales_count, returns_count, medicine_count, cosmetic_count, present_days_count, absent_days_count
)
SELECT 
  e.id,
  e.branch_id,
  (SELECT count(*) FROM public.sales WHERE sold_by_employee_id = e.id),
  (SELECT count(*) FROM public.returns WHERE processed_by = e.id),
  COALESCE((
    SELECT SUM(si.quantity) 
    FROM public.sale_items si 
    JOIN public.sales s ON s.id = si.sale_id 
    JOIN public.drugs d ON d.id = si.drug_id 
    WHERE s.sold_by_employee_id = e.id 
      AND d.category IN ('medicine', 'medicine_and_treatments', 'أدوية', 'دواء', 'أدوية وعلاجات')
  ), 0),
  COALESCE((
    SELECT SUM(si.quantity) 
    FROM public.sale_items si 
    JOIN public.sales s ON s.id = si.sale_id 
    JOIN public.drugs d ON d.id = si.drug_id 
    WHERE s.sold_by_employee_id = e.id 
      AND d.category IN ('cosmetic', 'cosmetics', 'personal_care', 'تجميل', 'مستحضرات تجميل', 'عناية شخصية')
  ), 0),
  (SELECT count(DISTINCT date_trunc('day', open_time)) FROM public.shifts WHERE opened_by = e.id OR closed_by = e.id),
  0
FROM public.employees e
ON CONFLICT (employee_id) DO UPDATE 
SET 
  sales_count = EXCLUDED.sales_count,
  returns_count = EXCLUDED.returns_count,
  medicine_count = EXCLUDED.medicine_count,
  cosmetic_count = EXCLUDED.cosmetic_count,
  present_days_count = EXCLUDED.present_days_count;

-- 8. Refactored RPC returning instantaneous JSON
CREATE OR REPLACE FUNCTION public.get_my_employee_profile_stats(p_employee_id UUID)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    row_to_json(stats), 
    json_build_object(
      'sales_count', 0,
      'returns_count', 0,
      'medicine_count', 0,
      'cosmetic_count', 0,
      'present_days_count', 0,
      'absent_days_count', 0
    )
  )
  FROM public.employee_profile_stats stats
  WHERE employee_id = p_employee_id;
$$;
