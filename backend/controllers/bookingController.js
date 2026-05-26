const pool = require('../config/db');
const { refreshRoomAvailability } = require('./roomController');
const { createNotification } = require('./notificationController');

function addOneYear(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

async function getRoomAvailability(client, roomId, excludeBookingId = null) {
  const result = await client.query(
    `SELECT
      r.id,
      r.provider_id,
      r.room_count,
      r.title,
      GREATEST(
        r.room_count - COALESCE(
          (
            SELECT COUNT(*)::INTEGER
            FROM bookings b
            WHERE b.room_id = r.id
              AND ($2::INTEGER IS NULL OR b.id <> $2)
              AND (
                b.status = 'pending'
                OR (
                  b.status = 'accepted'
                  AND (b.move_out_date IS NULL OR b.move_out_date >= CURRENT_DATE)
                )
              )
          ),
          0
        ),
        0
      ) AS remaining_slots,
      r.is_available
     FROM rooms r
     WHERE r.id = $1
     FOR UPDATE`,
    [roomId, excludeBookingId]
  );

  return result.rows[0] || null;
}

async function createBooking(req, res, next) {
  try {
    const roomId = Number(req.body.roomId || req.body.room_id);
    const notes = String(req.body.notes || req.body.message || '').trim();
    const moveInDate = req.body.moveInDate || req.body.move_in_date || req.body.preferredMoveInDate || req.body.preferred_move_in_date || null;
    const moveOutDate = req.body.moveOutDate || req.body.move_out_date || addOneYear(moveInDate);

    if (!Number.isInteger(roomId)) {
      return res.status(400).json({ error: 'A valid room ID is required' });
    }

    if (!moveInDate) {
      return res.status(400).json({ error: 'Move-In Date is required' });
    }

    const roomResult = await pool.query(
      `SELECT
        r.id,
        r.provider_id,
        r.title,
        r.is_available,
        GREATEST(
          r.room_count - COALESCE(
            (
              SELECT COUNT(*)::INTEGER
              FROM bookings b
              WHERE b.room_id = r.id
                AND (
                  b.status = 'pending'
                  OR (
                    b.status = 'accepted'
                    AND (b.move_out_date IS NULL OR b.move_out_date >= CURRENT_DATE)
                  )
                )
            ),
            0
          ),
          0
        ) AS remaining_slots
       FROM rooms r
       WHERE r.id = $1`,
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomResult.rows[0];

    if (Number(room.remaining_slots) <= 0 || !room.is_available) {
      return res.status(409).json({ error: 'This room is no longer available' });
    }

    if (room.provider_id === req.user.id) {
      return res.status(400).json({ error: 'Providers cannot book their own rooms' });
    }

    const acceptedThisYear = await pool.query(
      `SELECT id
       FROM bookings
       WHERE student_id = $1
         AND status = 'accepted'
         AND EXTRACT(YEAR FROM COALESCE(move_in_date, preferred_move_in_date, requested_at::DATE)) = EXTRACT(YEAR FROM $2::DATE)
       LIMIT 1`,
      [req.user.id, moveInDate]
    );

    if (acceptedThisYear.rows.length > 0) {
      return res.status(409).json({ error: 'You can only rent one room for this year after a booking is accepted' });
    }

    const existingBooking = await pool.query(
      `SELECT id
       FROM bookings
       WHERE room_id = $1
         AND student_id = $2
         AND status IN ('pending', 'accepted')`,
      [roomId, req.user.id]
    );

    if (existingBooking.rows.length > 0) {
      return res.status(409).json({ error: 'You already have an active request for this room' });
    }

    const result = await pool.query(
      `INSERT INTO bookings (
        room_id,
        student_id,
        message,
        contact_phone,
        preferred_move_in_date,
        move_in_date,
        move_out_date,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *`,
      [roomId, req.user.id, notes || null, null, moveInDate, moveInDate, moveOutDate]
    );

    await createNotification(pool, {
      userId: room.provider_id,
      title: 'New Booking Request',
      message: `${req.user.name || 'A student'} requested ${room.title}`,
      type: 'booking_request',
      relatedBookingId: result.rows[0].id,
      relatedRoomId: room.id,
    });

    return res.status(201).json({
      message: `Booking request sent for ${room.title}`,
      booking: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
}

async function listStudentBookings(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
        b.id,
        b.room_id,
        b.student_id,
        b.status,
        b.message,
        b.message AS notes,
        b.contact_phone,
        b.preferred_move_in_date,
        b.move_in_date,
        b.move_out_date,
        b.provider_response_note,
        b.requested_at,
        b.responded_at,
        r.title AS room_title,
        r.location,
        r.address,
        r.description,
        r.allowed_gender,
        r.price_per_month,
        r.is_available,
        r.latitude,
        r.longitude,
        COALESCE(r.map_link, '') AS map_link,
        COALESCE(r.amenities, ARRAY[]::TEXT[]) AS amenities,
        COALESCE(r.rules, ARRAY[]::TEXT[]) AS rules,
        COALESCE(r.documentation_urls[1], '') AS main_photo_url,
        COALESCE(r.documentation_urls, ARRAY[]::TEXT[]) AS documentation_urls,
        rr.rating AS student_rating,
        p.name AS provider_name,
        p.email AS provider_email,
        COALESCE(p.phone, '') AS provider_phone,
        COALESCE(p.profile_image_url, '') AS provider_profile_image_url
      FROM bookings b
      JOIN rooms r ON r.id = b.room_id
      JOIN users p ON p.id = r.provider_id
      LEFT JOIN room_ratings rr ON rr.room_id = r.id AND rr.student_id = b.student_id
      WHERE b.student_id = $1
        AND b.status <> 'cancelled'
      ORDER BY b.requested_at DESC`,
      [req.user.id]
    );

    return res.json({ bookings: result.rows });
  } catch (error) {
    return next(error);
  }
}

async function listProviderBookings(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
        b.id,
        b.room_id,
        b.student_id,
        b.status,
        b.message,
        b.message AS notes,
        b.contact_phone,
        b.preferred_move_in_date,
        b.move_in_date,
        b.move_out_date,
        b.provider_response_note,
        b.requested_at,
        b.responded_at,
        r.title AS room_title,
        r.location,
        r.address,
        r.price_per_month,
        r.latitude,
        r.longitude,
        COALESCE(r.map_link, '') AS map_link,
        COALESCE(r.amenities, ARRAY[]::TEXT[]) AS amenities,
        COALESCE(r.rules, ARRAY[]::TEXT[]) AS rules,
        COALESCE(r.documentation_urls[1], '') AS main_photo_url,
        COALESCE(r.documentation_urls, ARRAY[]::TEXT[]) AS documentation_urls,
        s.name AS student_name,
        s.email AS student_email,
        COALESCE(s.phone, '') AS student_phone,
        COALESCE(s.gender, '') AS student_gender,
        s.age AS student_age,
        COALESCE(s.profile_image_url, '') AS student_profile_image_url
      FROM bookings b
      JOIN rooms r ON r.id = b.room_id
      JOIN users s ON s.id = b.student_id
      WHERE r.provider_id = $1
        AND b.status <> 'cancelled'
      ORDER BY
        CASE WHEN b.status = 'pending' THEN 0 ELSE 1 END,
        b.requested_at DESC`,
      [req.user.id]
    );

    return res.json({ bookings: result.rows });
  } catch (error) {
    return next(error);
  }
}

async function updateBookingStatus(req, res, next) {
  const client = await pool.connect();

  try {
    const bookingId = Number(req.params.id);
    const status = String(req.body.status || '').trim().toLowerCase();
    const providerResponseNote = String(req.body.providerResponseNote || req.body.provider_response_note || '').trim();

    if (!Number.isInteger(bookingId)) {
      return res.status(400).json({ error: 'A valid booking ID is required' });
    }

    if (!['accepted', 'rejected', 'denied'].includes(status)) {
      return res.status(400).json({ error: 'Status must be accepted or denied' });
    }

    const resolvedStatus = status === 'denied' ? 'rejected' : status;

    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT
        b.id,
        b.room_id,
        b.student_id,
        b.status,
        r.provider_id,
        r.title AS room_title
      FROM bookings b
      JOIN rooms r ON r.id = b.room_id
      WHERE b.id = $1
      FOR UPDATE`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.provider_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You can only manage bookings for your own rooms' });
    }

    if (booking.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Only pending bookings can be updated' });
    }

    if (resolvedStatus === 'accepted') {
      const room = await getRoomAvailability(client, booking.room_id, booking.id);
      if (!room || Number(room.remaining_slots) <= 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'This room has no remaining slot available' });
      }
    }

    await client.query(
      `UPDATE bookings
       SET status = $1,
           provider_response_note = $2,
           responded_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [resolvedStatus, providerResponseNote || null, bookingId]
    );

    await createNotification(client, {
      userId: booking.student_id,
      title: resolvedStatus === 'accepted' ? 'Booking Accepted' : 'Booking Denied',
      message: resolvedStatus === 'accepted'
        ? `Your request for ${booking.room_title} was accepted`
        : `Your request for ${booking.room_title} was denied`,
      type: resolvedStatus === 'accepted' ? 'booking_accepted' : 'booking_denied',
      relatedBookingId: booking.id,
      relatedRoomId: booking.room_id,
    });

    await refreshRoomAvailability(client, booking.room_id);

    if (resolvedStatus === 'accepted') {
      const room = await getRoomAvailability(client, booking.room_id);
      if (room && Number(room.remaining_slots) <= 0) {
        await client.query(
          `UPDATE bookings
           SET status = 'rejected',
               provider_response_note = COALESCE(provider_response_note, 'No remaining room slot available'),
               responded_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE room_id = $1
             AND id <> $2
             AND status = 'pending'`,
          [booking.room_id, bookingId]
        );
      }
      await refreshRoomAvailability(client, booking.room_id);
    }

    await client.query('COMMIT');

    return res.json({
      message: `Booking ${resolvedStatus} successfully for ${booking.room_title}`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}


async function cancelBooking(req, res, next) {
  const client = await pool.connect();

  try {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId)) {
      return res.status(400).json({ error: 'A valid booking ID is required' });
    }

    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT b.id, b.room_id, b.student_id, b.status, r.provider_id, r.title AS room_title
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       WHERE b.id = $1
       FOR UPDATE`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.student_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You can only cancel your own request' });
    }

    if (booking.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Only pending requests can be cancelled' });
    }

    await client.query(
      `UPDATE bookings
       SET status = 'cancelled',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [bookingId]
    );

    await createNotification(client, {
      userId: booking.provider_id,
      title: 'Booking Cancelled',
      message: `${req.user.name || 'A student'} cancelled the request for ${booking.room_title}`,
      type: 'booking_cancelled',
      relatedBookingId: booking.id,
      relatedRoomId: booking.room_id,
    });

    await refreshRoomAvailability(client, booking.room_id);
    await client.query('COMMIT');

    return res.json({ message: 'Booking request cancelled' });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}


async function removeStudentFromRoom(req, res, next) {
  const client = await pool.connect();

  try {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId)) {
      return res.status(400).json({ error: 'A valid booking ID is required' });
    }

    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT b.id, b.room_id, b.student_id, b.status, r.provider_id, r.title AS room_title
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       WHERE b.id = $1
       FOR UPDATE`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.provider_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You can only remove students from your own rooms' });
    }

    if (booking.status !== 'accepted') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Only accepted students can be removed from room status' });
    }

    await client.query(
      `UPDATE bookings
       SET status = 'cancelled',
           provider_response_note = COALESCE(provider_response_note, 'Removed by provider'),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [bookingId]
    );

    await createNotification(client, {
      userId: booking.student_id,
      title: 'Room Removed',
      message: `You were removed from ${booking.room_title} by the provider`,
      type: 'student_removed',
      relatedBookingId: booking.id,
      relatedRoomId: booking.room_id,
    });

    await refreshRoomAvailability(client, booking.room_id);
    await client.query('COMMIT');

    return res.json({ message: `Student removed from ${booking.room_title}` });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}


async function listMaintenanceRequests(req, res, next) {
  try {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId)) {
      return res.status(400).json({ error: 'A valid booking ID is required' });
    }

    const bookingResult = await pool.query(
      `SELECT b.id, b.student_id, r.provider_id
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];
    if (booking.student_id !== req.user.id && booking.provider_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only view requests for your own booking or room' });
    }

    const result = await pool.query(
      `SELECT id, booking_id, student_id, provider_id, title, description, status, created_at, acknowledged_at
       FROM maintenance_requests
       WHERE booking_id = $1
       ORDER BY created_at DESC`,
      [bookingId]
    );

    return res.json({ requests: result.rows });
  } catch (error) {
    return next(error);
  }
}

async function createMaintenanceRequest(req, res, next) {
  try {
    const bookingId = Number(req.params.id);
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();

    if (!Number.isInteger(bookingId)) {
      return res.status(400).json({ error: 'A valid booking ID is required' });
    }

    if (!title) {
      return res.status(400).json({ error: 'Request title is required' });
    }

    const bookingResult = await pool.query(
      `SELECT b.id, b.student_id, b.status, r.provider_id, r.title AS room_title
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];
    if (booking.student_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only submit requests for your own booking' });
    }

    if (booking.status !== 'accepted') {
      return res.status(409).json({ error: 'Requests can only be submitted for accepted rooms' });
    }

    const result = await pool.query(
      `INSERT INTO maintenance_requests (booking_id, student_id, provider_id, title, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [booking.id, req.user.id, booking.provider_id, title, description || null]
    );

    await createNotification(pool, {
      userId: booking.provider_id,
      title: 'New Room Request',
      message: `${req.user.name || 'A student'} submitted a problem request for ${booking.room_title}`,
      type: 'maintenance_request',
      relatedBookingId: booking.id,
    });

    return res.status(201).json({ message: 'Request submitted', request: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

async function acknowledgeMaintenanceRequest(req, res, next) {
  try {
    const requestId = Number(req.params.requestId);
    if (!Number.isInteger(requestId)) {
      return res.status(400).json({ error: 'A valid request ID is required' });
    }

    const result = await pool.query(
      `UPDATE maintenance_requests
       SET status = 'acknowledged', acknowledged_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND provider_id = $2
       RETURNING *`,
      [requestId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found or not owned by this provider' });
    }

    await createNotification(pool, {
      userId: result.rows[0].student_id,
      title: 'Request Acknowledged',
      message: `Your room problem request was acknowledged by the provider`,
      type: 'maintenance_acknowledged',
      relatedBookingId: result.rows[0].booking_id,
    });

    return res.json({ message: 'Request acknowledged', request: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createBooking,
  listStudentBookings,
  listProviderBookings,
  updateBookingStatus,
  cancelBooking,
  removeStudentFromRoom,
  listMaintenanceRequests,
  createMaintenanceRequest,
  acknowledgeMaintenanceRequest,
};
