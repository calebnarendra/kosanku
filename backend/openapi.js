module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'KosanKu API',
    version: '1.0.0',
    description: 'Interactive API reference for the KosanKu student room rental backend.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local backend',
    },
  ],
  tags: [
    { name: 'Health', description: 'Basic backend health check' },
    { name: 'Auth', description: 'Authentication and account endpoints' },
    { name: 'Rooms', description: 'Public room browsing and provider room management' },
    { name: 'Bookings', description: 'Student booking actions and provider decisions' },
    { name: 'Student', description: 'Student dashboard endpoints' },
    { name: 'Provider', description: 'Provider dashboard endpoints' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Route not found' },
        },
      },
      AuthRegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password', 'role'],
        properties: {
          name: { type: 'string', example: 'Caleb Narendra' },
          email: { type: 'string', format: 'email', example: 'caleb@example.com' },
          password: { type: 'string', format: 'password', example: 'secret123' },
          role: { type: 'string', enum: ['student', 'provider'], example: 'student' },
          phone: { type: 'string', example: '08123456789' },
          age: { type: 'integer', example: 20 },
          gender: { type: 'string', example: 'Man' },
          profileImageUrl: { type: 'string', example: 'data:image/png;base64,...' },
        },
      },
      AuthLoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'caleb@example.com' },
          password: { type: 'string', format: 'password', example: 'secret123' },
        },
      },
      UpdateProfileRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Caleb Narendra' },
          phone: { type: 'string', example: '08123456789' },
          age: { type: 'integer', example: 21 },
          gender: { type: 'string', example: 'Man' },
          profileImageUrl: { type: 'string', example: 'data:image/png;base64,...' },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', format: 'password', example: 'oldsecret123' },
          newPassword: { type: 'string', format: 'password', example: 'newsecret123' },
        },
      },
      RoomUpsertRequest: {
        type: 'object',
        required: ['title', 'location', 'pricePerMonth'],
        properties: {
          title: { type: 'string', example: 'Kosan Mawar' },
          location: { type: 'string', example: 'Depok' },
          campusName: { type: 'string', example: 'Universitas Indonesia' },
          address: { type: 'string', example: 'Jl. Mawar No. 10, Depok' },
          description: { type: 'string', example: 'Free Wi-Fi\nAC\nLaundry nearby' },
          pricePerMonth: { oneOf: [{ type: 'string' }, { type: 'number' }], example: 'Rp1.500.000' },
          allowedGender: { type: 'string', enum: ['any', 'male', 'female'], example: 'any' },
          availableFrom: { type: 'string', format: 'date', example: '2026-08-20' },
          roomCount: { type: 'integer', example: 3 },
          documentationUrls: {
            type: 'array',
            items: { type: 'string' },
            example: ['data:image/png;base64,...'],
          },
        },
      },
      CreateBookingRequest: {
        type: 'object',
        required: ['roomId', 'moveInDate'],
        properties: {
          roomId: { type: 'integer', example: 5 },
          moveInDate: { type: 'string', format: 'date', example: '2026-08-20' },
          moveOutDate: { type: 'string', format: 'date', example: '2027-08-20' },
          notes: { type: 'string', example: 'I plan to move in after the semester starts.' },
        },
      },
      UpdateBookingStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['accepted', 'denied'], example: 'accepted' },
          providerResponseNote: { type: 'string', example: 'Please bring your student ID when moving in.' },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Check whether the backend is running',
        responses: {
          200: {
            description: 'Backend is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new student or provider account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthRegisterRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Account created successfully' },
          400: { description: 'Invalid request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          409: { description: 'Email already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and receive a JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthLoginRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Wrong email or password', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the currently logged-in user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Current user returned' },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/profile': {
      put: {
        tags: ['Auth'],
        summary: 'Update the logged-in user profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProfileRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Profile updated' },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/password': {
      put: {
        tags: ['Auth'],
        summary: 'Change the logged-in user password',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChangePasswordRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Password updated' },
          400: { description: 'Invalid password data', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/auth/account': {
      delete: {
        tags: ['Auth'],
        summary: 'Delete the logged-in user account',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Account deleted' },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/rooms': {
      get: {
        tags: ['Rooms'],
        summary: 'List rooms with optional filters',
        parameters: [
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'minPrice', in: 'query', schema: { type: 'string' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'string' } },
          { name: 'amenities', in: 'query', schema: { type: 'string' } },
          { name: 'moveInDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['any', 'male', 'female', '-'] } },
        ],
        responses: {
          200: { description: 'Room list returned' },
        },
      },
      post: {
        tags: ['Rooms'],
        summary: 'Create a new room listing',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RoomUpsertRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Room created' },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Provider role required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/rooms/{id}': {
      get: {
        tags: ['Rooms'],
        summary: 'Get a single room by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Room detail returned' },
          404: { description: 'Room not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      put: {
        tags: ['Rooms'],
        summary: 'Update a room listing',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RoomUpsertRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Room updated' },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Provider role required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Room not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'Create a booking request for a room',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateBookingRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Booking created' },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Student role required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          409: { description: 'Room unavailable or duplicate request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/bookings/{id}/cancel': {
      patch: {
        tags: ['Bookings'],
        summary: 'Cancel a pending booking request as a student',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Booking cancelled' },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Student role required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Booking not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/bookings/{id}/status': {
      patch: {
        tags: ['Bookings'],
        summary: 'Accept or deny a booking request as a provider',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateBookingStatusRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Booking status updated' },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Provider role required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Booking not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/student/bookings': {
      get: {
        tags: ['Student'],
        summary: 'List bookings for the logged-in student',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Student bookings returned' },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Student role required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/provider/rooms': {
      get: {
        tags: ['Provider'],
        summary: 'List rooms belonging to the logged-in provider',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Provider rooms returned' },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Provider role required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/provider/bookings': {
      get: {
        tags: ['Provider'],
        summary: 'List booking requests for the logged-in provider',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Provider bookings returned' },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Provider role required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
  },
};