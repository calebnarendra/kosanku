const pool = require('../config/db');

const roomSelect = `
  SELECT
    r.id,
    r.provider_id,
    r.title,
    r.description,
    r.location,
    r.address,
    r.campus_name,
    r.price_per_month,
    r.room_size,
    r.available_from,
    r.allowed_gender,
    r.room_count,
    r.is_available,
    COALESCE(r.listing_status, 'published') AS listing_status,
    r.latitude,
    r.longitude,
    COALESCE(r.map_link, '') AS map_link,
    COALESCE(r.amenities, ARRAY[]::TEXT[]) AS amenities,
    COALESCE(r.rules, ARRAY[]::TEXT[]) AS rules,
    COALESCE(r.documentation_urls, ARRAY[]::TEXT[]) AS documentation_urls,
    COALESCE(r.documentation_urls[1], '') AS main_photo_url,
    COALESCE(stats.occupied_count, 0) AS occupied_count,
    COALESCE(stats.current_residents_count, 0) AS current_residents_count,
    COALESCE(rating_stats.average_rating, 0)::NUMERIC(3,2) AS average_rating,
    COALESCE(rating_stats.rating_count, 0)::INTEGER AS rating_count,
    GREATEST(r.room_count - COALESCE(stats.occupied_count, 0), 0) AS remaining_slots,
    r.created_at,
    r.updated_at,
    u.name AS provider_name,
    u.email AS provider_email,
    COALESCE(u.phone, '') AS provider_phone,
    COALESCE(u.profile_image_url, '') AS provider_profile_image_url
  FROM rooms r
  JOIN users u ON u.id = r.provider_id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (
        WHERE b.status = 'pending'
           OR (
             b.status = 'accepted'
             AND (b.move_out_date IS NULL OR b.move_out_date >= CURRENT_DATE)
           )
      )::INTEGER AS occupied_count,
      COUNT(*) FILTER (
        WHERE b.status = 'accepted'
          AND COALESCE(b.move_in_date, b.preferred_move_in_date, CURRENT_DATE) <= CURRENT_DATE
          AND (b.move_out_date IS NULL OR b.move_out_date >= CURRENT_DATE)
      )::INTEGER AS current_residents_count
    FROM bookings b
    WHERE b.room_id = r.id
  ) stats ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      ROUND(AVG(rr.rating)::NUMERIC, 2) AS average_rating,
      COUNT(rr.id)::INTEGER AS rating_count
    FROM room_ratings rr
    WHERE rr.room_id = r.id
  ) rating_stats ON TRUE
`;

function normaliseStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\n|,/) 
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function parseCurrencyInput(value) {
  if (value === undefined || value === null || value === '') return NaN;
  if (typeof value === 'number') return value;
  const digits = String(value).replace(/[^\d-]/g, '');
  return digits ? Number(digits) : NaN;
}

function parseCoordinate(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function parseBoolean(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return fallback;
  return ['true', '1', 'yes', 'y', 'on'].includes(String(value).trim().toLowerCase());
}

function normaliseAllowedGender(value) {
  const raw = String(value || 'any').trim().toLowerCase();
  const mapping = {
    any: 'any',
    mixed: 'any',
    'mixed gender': 'any',
    'mixed-gender': 'any',
    male: 'male',
    men: 'male',
    "men's only": 'male',
    'man only': 'male',
    'male only': 'male',
    female: 'female',
    women: 'female',
    "women's only": 'female',
    'woman only': 'female',
    'female only': 'female',
  };

  return mapping[raw] || raw;
}

function validateRoomPayload(body) {
  const title = String(body.title || body.name || '').trim();
  const description = String(body.description || '').trim();
  const location = String(body.location || '').trim();
  const address = String(body.address || body.fullAddress || '').trim();
  const campusName = String(body.campusName || body.campus_name || '').trim();
  const roomSize = String(body.roomSize || body.room_size || '').trim();
  const allowedGender = normaliseAllowedGender(body.allowedGender || body.allowed_gender || body.type || 'any');
  const availableFrom = body.availableFrom || body.available_from || body.availability || null;
  const priceRaw = body.pricePerMonth ?? body.price_per_month ?? body.monthlyPrice ?? body.price;
  const pricePerMonth = parseCurrencyInput(priceRaw);
  const roomCountRaw = body.roomCount ?? body.room_count ?? body.amount ?? 1;
  const roomCount = Number(roomCountRaw);
  const amenities = normaliseStringArray(body.amenities);
  const rules = normaliseStringArray(body.rules || body.roomRules || body.room_rules);
  const documentationUrls = normaliseStringArray(body.documentationUrls || body.documentation_urls || body.documentations);
  const isAvailable = parseBoolean(body.isAvailable ?? body.is_available, true);
  const listingStatus = String(body.listingStatus || body.listing_status || 'published').trim().toLowerCase();
  const latitude = parseCoordinate(body.latitude || body.lat);
  const longitude = parseCoordinate(body.longitude || body.lng || body.long);
  const mapLink = String(body.mapLink || body.map_link || body.googleMapsLink || body.google_maps_link || '').trim();

  if (!title || !description || !location || !address) {
    return { error: 'Name, description, location, and full address are required' };
  }

  if (!Number.isFinite(pricePerMonth) || pricePerMonth < 0) {
    return { error: 'Monthly price must be a valid positive number' };
  }

  if (!Number.isInteger(roomCount) || roomCount < 1) {
    return { error: 'Amount must be at least 1' };
  }

  if (!['male', 'female', 'any'].includes(allowedGender)) {
    return { error: 'Type must be Any, Men\'s Only, or Women\'s Only' };
  }

  if (!['published', 'draft'].includes(listingStatus)) {
    return { error: 'Listing status must be published or draft' };
  }

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return { error: 'Latitude and longitude must be valid numbers' };
  }

  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    return { error: 'Latitude must be between -90 and 90' };
  }

  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    return { error: 'Longitude must be between -180 and 180' };
  }

  return {
    values: {
      title,
      description,
      location,
      address,
      campusName: campusName || null,
      pricePerMonth,
      roomSize: roomSize || null,
      availableFrom: availableFrom || null,
      allowedGender,
      roomCount,
      isAvailable,
      listingStatus,
      amenities,
      rules,
      documentationUrls,
      latitude,
      longitude,
      mapLink,
    },
  };
}

async function refreshRoomAvailability(client, roomId) {
  await client.query(
    `UPDATE rooms r
     SET is_available = CASE
       WHEN GREATEST(r.room_count - COALESCE(stats.occupied_count, 0), 0) > 0 THEN true
       ELSE false
     END,
     updated_at = CURRENT_TIMESTAMP
     FROM (
       SELECT
         COUNT(*) FILTER (
           WHERE status = 'pending'
              OR (
                status = 'accepted'
                AND (move_out_date IS NULL OR move_out_date >= CURRENT_DATE)
              )
         )::INTEGER AS occupied_count
       FROM bookings
       WHERE room_id = $1
     ) stats
     WHERE r.id = $1`,
    [roomId]
  );
}

async function listRooms(req, res, next) {
  try {
    const { location, search, minPrice, maxPrice, amenities, moveInDate, type } = req.query;
    const clauses = ["r.is_available = true", "COALESCE(r.listing_status, 'published') = 'published'", 'GREATEST(r.room_count - COALESCE(stats.occupied_count, 0), 0) > 0'];
    const values = [];

    if (search) {
      values.push(`%${String(search).trim()}%`);
      clauses.push(`(
        r.title ILIKE $${values.length}
        OR r.description ILIKE $${values.length}
        OR r.location ILIKE $${values.length}
        OR r.address ILIKE $${values.length}
        OR COALESCE(r.campus_name, '') ILIKE $${values.length}
        OR u.name ILIKE $${values.length}
      )`);
    }

    if (location) {
      values.push(`%${String(location).trim()}%`);
      clauses.push(`(
        r.location ILIKE $${values.length}
        OR r.address ILIKE $${values.length}
        OR COALESCE(r.campus_name, '') ILIKE $${values.length}
      )`);
    }

    if (amenities) {
      values.push(`%${String(amenities).trim()}%`);
      clauses.push(`(
        r.description ILIKE $${values.length}
        OR EXISTS (
          SELECT 1 FROM unnest(COALESCE(r.amenities, ARRAY[]::TEXT[])) amenity
          WHERE amenity ILIKE $${values.length}
        )
      )`);
    }

    if (moveInDate) {
      values.push(moveInDate);
      clauses.push(`(r.available_from IS NULL OR r.available_from >= $${values.length})`);
    }

    const normalisedType = type ? normaliseAllowedGender(type) : '';
    if (normalisedType && ['male', 'female', 'any'].includes(normalisedType)) {
      values.push(normalisedType);
      clauses.push(`r.allowed_gender = $${values.length}`);
    }

    if (minPrice !== undefined && minPrice !== '') {
      const parsed = parseCurrencyInput(minPrice);
      if (Number.isFinite(parsed)) {
        values.push(parsed);
        clauses.push(`r.price_per_month >= $${values.length}`);
      }
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      const parsed = parseCurrencyInput(maxPrice);
      if (Number.isFinite(parsed)) {
        values.push(parsed);
        clauses.push(`r.price_per_month <= $${values.length}`);
      }
    }

    const result = await pool.query(
      `${roomSelect}
       WHERE ${clauses.join(' AND ')}
       ORDER BY r.created_at DESC`,
      values
    );

    return res.json({ rooms: result.rows });
  } catch (error) {
    return next(error);
  }
}

async function getRoomById(req, res, next) {
  try {
    const result = await pool.query(`${roomSelect} WHERE r.id = $1`, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    return res.json({ room: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

async function createRoom(req, res, next) {
  try {
    const validation = validateRoomPayload(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const {
      title,
      description,
      location,
      address,
      campusName,
      pricePerMonth,
      roomSize,
      availableFrom,
      allowedGender,
      roomCount,
      isAvailable,
      listingStatus,
      amenities,
      rules,
      documentationUrls,
      latitude,
      longitude,
      mapLink,
    } = validation.values;

    const result = await pool.query(
      `INSERT INTO rooms (
        provider_id, title, description, location, address, campus_name,
        price_per_month, room_size, available_from, allowed_gender,
        room_count, is_available, listing_status, amenities, rules, documentation_urls, latitude, longitude, map_link
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
      RETURNING id`,
      [
        req.user.id,
        title,
        description,
        location,
        address,
        campusName,
        pricePerMonth,
        roomSize,
        availableFrom,
        allowedGender,
        roomCount,
        isAvailable,
        listingStatus,
        amenities,
        rules,
        documentationUrls,
        latitude,
        longitude,
        mapLink,
      ]
    );

    const roomResult = await pool.query(`${roomSelect} WHERE r.id = $1`, [result.rows[0].id]);

    return res.status(201).json({
      message: 'Room created successfully',
      room: roomResult.rows[0],
    });
  } catch (error) {
    return next(error);
  }
}

async function updateRoom(req, res, next) {
  try {
    const roomOwnership = await pool.query('SELECT id FROM rooms WHERE id = $1 AND provider_id = $2', [
      req.params.id,
      req.user.id,
    ]);

    if (roomOwnership.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found or not owned by this provider' });
    }

    const validation = validateRoomPayload(req.body);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const {
      title,
      description,
      location,
      address,
      campusName,
      pricePerMonth,
      roomSize,
      availableFrom,
      allowedGender,
      roomCount,
      isAvailable,
      listingStatus,
      amenities,
      rules,
      documentationUrls,
      latitude,
      longitude,
      mapLink,
    } = validation.values;

    await pool.query(
      `UPDATE rooms
       SET title = $1,
           description = $2,
           location = $3,
           address = $4,
           campus_name = $5,
           price_per_month = $6,
           room_size = $7,
           available_from = $8,
           allowed_gender = $9,
           room_count = $10,
           is_available = $11,
           listing_status = $12,
           amenities = $13,
           rules = $14,
           documentation_urls = $15,
           latitude = $16,
           longitude = $17,
           map_link = $18,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $19 AND provider_id = $20`,
      [
        title,
        description,
        location,
        address,
        campusName,
        pricePerMonth,
        roomSize,
        availableFrom,
        allowedGender,
        roomCount,
        isAvailable,
        listingStatus,
        amenities,
        rules,
        documentationUrls,
        latitude,
        longitude,
        mapLink,
        req.params.id,
        req.user.id,
      ]
    );

    const client = await pool.connect();
    try {
      await refreshRoomAvailability(client, req.params.id);
    } finally {
      client.release();
    }

    const roomResult = await pool.query(`${roomSelect} WHERE r.id = $1`, [req.params.id]);

    return res.json({
      message: 'Room updated successfully',
      room: roomResult.rows[0],
    });
  } catch (error) {
    return next(error);
  }
}

async function listProviderRooms(req, res, next) {
  try {
    const result = await pool.query(
      `${roomSelect}
       WHERE r.provider_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    return res.json({ rooms: result.rows });
  } catch (error) {
    return next(error);
  }
}


async function listFavorites(req, res, next) {
  try {
    const result = await pool.query(
      `${roomSelect}
       JOIN favorites f ON f.room_id = r.id AND f.student_id = $1
       WHERE COALESCE(r.listing_status, 'published') = 'published'
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );

    return res.json({ rooms: result.rows });
  } catch (error) {
    return next(error);
  }
}

async function addFavorite(req, res, next) {
  try {
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId)) {
      return res.status(400).json({ error: 'A valid room ID is required' });
    }

    const roomResult = await pool.query(
      "SELECT id FROM rooms WHERE id = $1 AND COALESCE(listing_status, 'published') = 'published'",
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    await pool.query(
      `INSERT INTO favorites (student_id, room_id)
       VALUES ($1, $2)
       ON CONFLICT (student_id, room_id) DO NOTHING`,
      [req.user.id, roomId]
    );

    return res.status(201).json({ message: 'Room added to wishlist' });
  } catch (error) {
    return next(error);
  }
}

async function removeFavorite(req, res, next) {
  try {
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId)) {
      return res.status(400).json({ error: 'A valid room ID is required' });
    }

    await pool.query('DELETE FROM favorites WHERE student_id = $1 AND room_id = $2', [req.user.id, roomId]);
    return res.json({ message: 'Room removed from wishlist' });
  } catch (error) {
    return next(error);
  }
}


async function submitRoomRating(req, res, next) {
  try {
    const roomId = Number(req.params.id);
    const rating = Number(req.body.rating);

    if (!Number.isInteger(roomId)) {
      return res.status(400).json({ error: 'A valid room ID is required' });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5 stars' });
    }

    const bookingResult = await pool.query(
      `SELECT id
       FROM bookings
       WHERE room_id = $1
         AND student_id = $2
         AND status = 'accepted'
       LIMIT 1`,
      [roomId, req.user.id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only accepted students can rate this room' });
    }

    await pool.query(
      `INSERT INTO room_ratings (room_id, student_id, booking_id, rating)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (room_id, student_id)
       DO UPDATE SET rating = EXCLUDED.rating, booking_id = EXCLUDED.booking_id, updated_at = CURRENT_TIMESTAMP`,
      [roomId, req.user.id, bookingResult.rows[0].id, rating]
    );

    return res.json({ message: 'Rating submitted' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listRooms,
  getRoomById,
  createRoom,
  updateRoom,
  listProviderRooms,
  listFavorites,
  addFavorite,
  removeFavorite,
  submitRoomRating,
  refreshRoomAvailability,
  normaliseAllowedGender,
};
