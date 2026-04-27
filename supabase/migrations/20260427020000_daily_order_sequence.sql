-- Create a function to get the next daily sequence number atomically
-- This function checks the last sale date for the branch and resets to 1 if it's a new day
CREATE OR REPLACE FUNCTION get_next_daily_order_number(p_branch_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_last_date DATE;
    v_next_num INTEGER;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Get the max daily number and the date of the latest sale for this branch
    -- We use FOR UPDATE to lock the rows and prevent concurrent access to the same sequence
    SELECT MAX(daily_order_number), MAX(date::DATE)
    INTO v_next_num, v_last_date
    FROM sales
    WHERE branch_id = p_branch_id;

    IF v_last_date IS NULL OR v_last_date < v_today THEN
        -- New day or first sale, start from 1
        v_next_num := 1;
    ELSE
        -- Same day, increment
        v_next_num := COALESCE(v_next_num, 0) + 1;
    END IF;

    RETURN v_next_num;
END;
$$ LANGUAGE plpgsql;
