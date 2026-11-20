-- Apply to the selected pet-care database to report completed revenue per caregiver.
CREATE OR REPLACE VIEW vw_caregiver_workload AS
SELECT
    c.caregiver_id,
    cu.name AS caregiver_name,
    COUNT(b.booking_id)                                    AS total_bookings,
    SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) AS completed_count,
    SUM(CASE WHEN b.status = 'completed' THEN b.amount ELSE 0 END) AS total_revenue
FROM caregivers c
JOIN users cu ON c.caregiver_id = cu.user_id
LEFT JOIN bookings b ON c.caregiver_id = b.caregiver_id
GROUP BY c.caregiver_id, cu.name
HAVING COUNT(b.booking_id) >= 0;
