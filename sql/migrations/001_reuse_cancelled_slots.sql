-- Apply to the selected pet-care database with application writers stopped.
-- The routine definition matches sql/schema.sql. The final ALTER replaces
-- the old unique index in one statement and retains all existing rows.
DROP PROCEDURE IF EXISTS sp_create_booking;

DELIMITER $$

CREATE PROCEDURE sp_create_booking (
    IN  p_pet_id        INT,
    IN  p_service_id    INT,
    IN  p_caregiver_id  INT,
    IN  p_booking_date  DATE,
    IN  p_booking_time  TIME,
    IN  p_amount        DECIMAL(10,2),
    IN  p_payment_method VARCHAR(20),
    OUT p_booking_id    INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO bookings (booking_date, booking_time, status, amount, pet_id, service_id, caregiver_id)
    VALUES (p_booking_date, p_booking_time, 'pending', p_amount, p_pet_id, p_service_id, p_caregiver_id);

    SET p_booking_id = LAST_INSERT_ID();

    INSERT INTO payments (booking_id, amount, payment_method, payment_status)
    VALUES (p_booking_id, p_amount, p_payment_method, 'pending');

    COMMIT;
END$$

DELIMITER ;

ALTER TABLE bookings
    ADD COLUMN active_slot TINYINT GENERATED ALWAYS AS (CASE WHEN status <> 'cancelled' THEN 1 END) VIRTUAL,
    ADD UNIQUE INDEX uq_caregiver_active_slot (caregiver_id, booking_date, booking_time, active_slot),
    DROP INDEX uq_caregiver_slot;
