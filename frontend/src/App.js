import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from './services/api';
import './App.css';

const emptyAuthForm = {
  name: '',
  email: '',
  password: '',
  role: 'student',
};

const emptyFilters = {
  location: '',
  minPrice: '',
  maxPrice: '',
  amenities: '',
  moveInDate: '',
  type: '-',
};

const emptyBookingForm = {
  notes: '',
  moveInDate: '',
  moveOutDate: '',
};

const emptyProfileForm = {
  name: '',
  email: '',
  role: '',
  phone: '',
  age: '',
  gender: '',
  profileImageUrl: '',
};

const emptyPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const emptyRoomForm = {
  name: '',
  location: '',
  campusName: '',
  monthlyPrice: '',
  fullAddress: '',
  description: '',
  availability: '',
  type: 'any',
  amount: '1',
  amenities: [],
  rules: [],
  latitude: '',
  longitude: '',
  mapLink: '',
  documentations: [],
  listingStatus: 'published',
};



const facilityGroups = [
  { title: 'Bedroom', items: ['Bed', 'Mattress', 'Pillow', 'Bedsheet', 'Blanket', 'Wardrobe', 'Desk', 'Chair', 'Study Lamp', 'AC', 'Fan', 'Window', 'Curtains', 'Mirror', 'TV', 'Smart TV', 'Wi-Fi in Room', 'Power Socket', 'Private Balcony', 'Drying Rack'] },
  { title: 'Bathroom', items: ['Private Bathroom', 'Shared Bathroom', 'Sitting Toilet', 'Squat Toilet', 'Shower', 'Water Heater', 'Sink', 'Bathroom Mirror', 'Good Water Flow', 'Bathroom Ventilation'] },
  { title: 'Utilities', items: ['Electricity Included', 'Water Included', 'Wi-Fi Included', 'Cleaning Included', 'Laundry Included', 'Trash Collection Included', 'Token Electricity', 'Gas Included'] },
  { title: 'Shared Area', items: ['Shared Kitchen', 'Dining Area', 'Shared Living Room', 'Laundry Area', 'Drying Area', 'Musholla', 'Rooftop Area', 'Garden', 'Study Area', 'Common Refrigerator', 'Common Microwave', 'Water Dispenser'] },
  { title: 'Parking & Access', items: ['Motorcycle Parking', 'Car Parking', 'Bicycle Parking', 'Covered Parking', 'Guest Parking', 'Near Public Transport', 'Near Bus Stop', 'Near Train Station', '24-Hour Access'] },
  { title: 'Security', items: ['CCTV', 'Security Guard', 'Gate Access', 'Keycard Access', 'Smart Lock', 'Fire Extinguisher', 'Emergency Exit', 'Well-Lit Area', 'Gated Property'] },
  { title: 'Nearby', items: ['Near Campus', 'Near Minimarket', 'Near Supermarket', 'Near Laundry Service', 'Near Food Stalls', 'Near Restaurant', 'Near Pharmacy', 'Near Clinic', 'Quiet Environment', 'Good Road Access'] },
  { title: 'Rules', items: ['Male Only', 'Female Only', 'Mixed', 'Visitors Allowed', 'Guests Overnight Allowed', 'Pet Friendly', 'Smoking Allowed', 'No Smoking', 'Curfew Applies', 'No Curfew', 'Cooking Allowed', 'No Cooking'] },
];

const roomRuleSuggestions = [
  'No Smoking',
  'No Pets',
  'Curfew Applies',
  'No Curfew',
  'Visitors Allowed',
  'No Overnight Guests',
  'Cooking Allowed',
  'No Cooking',
  'Keep Shared Areas Clean',
  'Quiet Hours After 10 PM',
  'Monthly Payment On Time',
  'Report Damage Immediately',
];

const hiddenBookingsKey = 'hiddenDeniedBookingIds';
const viewHistoryPrefix = 'viewingHistory';
const wishlistPrefix = 'wishlistRooms';
const onboardingPrefix = 'onboardingSeenV2';

function storageKey(prefix, userId) {
  return `${prefix}:${userId || 'guest'}`;
}

function loadStoredSession() {
  try {
    const raw = sessionStorage.getItem('session') || localStorage.getItem('session');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function loadHiddenBookings() {
  try {
    const raw = localStorage.getItem(hiddenBookingsKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveHiddenBookings(ids) {
  localStorage.setItem(hiddenBookingsKey, JSON.stringify(ids));
}

function loadViewingHistory(userId) {
  try {
    const raw = localStorage.getItem(storageKey(viewHistoryPrefix, userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveViewingHistory(userId, items) {
  localStorage.setItem(storageKey(viewHistoryPrefix, userId), JSON.stringify(items.slice(0, 30)));
}

function loadWishlist(userId) {
  try {
    const raw = localStorage.getItem(storageKey(wishlistPrefix, userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveWishlist(userId, items) {
  localStorage.setItem(storageKey(wishlistPrefix, userId), JSON.stringify(items.slice(0, 100)));
}

function onboardingSeen(userId) {
  return localStorage.getItem(storageKey(onboardingPrefix, userId)) === 'true';
}

function markOnboardingSeen(userId) {
  localStorage.setItem(storageKey(onboardingPrefix, userId), 'true');
}

function roomShareUrl(roomId) {
  if (!roomId || typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}#/rooms/${roomId}`;
}

function roomIdFromHash() {
  if (typeof window === 'undefined') return null;
  const match = window.location.hash.match(/^#\/rooms\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function listingStatusLabel(status) {
  return String(status || 'published') === 'draft' ? 'Draft' : 'Published';
}

function stripToDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normaliseLegacyPriceValue(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed >= 100000000 && parsed % 100 === 0) {
    return Math.trunc(parsed / 100);
  }
  return parsed;
}

function formatRupiahInput(value) {
  const digits = stripToDigits(value);
  if (!digits) return '';
  return `Rp${new Intl.NumberFormat('id-ID').format(Number(digits))}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(normaliseLegacyPriceValue(value));
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function humanRole(role) {
  return String(role || '') === 'provider' ? 'Provider' : 'Student';
}

function humanGender(gender) {
  if (gender === 'male') return 'Man';
  if (gender === 'female') return 'Woman';
  return '-';
}

function apiGender(label) {
  if (label === 'Man') return 'male';
  if (label === 'Woman') return 'female';
  return '';
}

function uiGender(value) {
  if (value === 'male') return 'Man';
  if (value === 'female') return 'Woman';
  return '';
}

function humanType(type) {
  if (type === 'male') return "Men's Only";
  if (type === 'female') return "Women's Only";
  return 'Any';
}

function statusClass(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'accepted') return 'status-badge accepted';
  if (value === 'rejected' || value === 'denied') return 'status-badge denied';
  return 'status-badge pending';
}

function statusLabel(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'accepted') return 'Accepted';
  if (value === 'rejected' || value === 'denied') return 'Denied';
  return 'Pending';
}

function requestStatusLabel(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'accepted') return 'Accepted';
  if (value === 'rejected' || value === 'denied') return 'Denied';
  return 'Requested';
}

function renderProviderLine(name, profileImageUrl, phone, extraClass = '') {
  return (
    <div className={`provider-inline ${extraClass}`.trim()}>
      <img
        src={imageSrc(profileImageUrl)}
        alt={name || 'Provider'}
        className="provider-inline-avatar"
      />
      <div className="provider-inline-copy">
        <strong>{name || '-'}</strong>
        <span>{phone || '-'}</span>
      </div>
    </div>
  );
}

function defaultMoveOut(moveInDate) {
  if (!moveInDate) return '';
  const date = new Date(moveInDate);
  if (Number.isNaN(date.getTime())) return '';
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function imageSrc(value) {
  return value || 'https://placehold.co/640x420/e5ecf6/6b7280?text=KosanKu';
}

function renderTitleByProvider(title, providerName, tag = 'h3') {
  const Tag = tag;
  return (
    <Tag className="title-by-provider">
      <span className="room-title-text">{title || '-'}</span>
      {providerName ? <span>by {providerName}</span> : null}
    </Tag>
  );
}

function roomPhotos(room) {
  const photos = Array.isArray(room?.documentation_urls) ? room.documentation_urls.filter(Boolean) : [];
  if (photos.length > 0) return photos;
  return [room?.main_photo_url].filter(Boolean);
}

function roomMainPhoto(room) {
  const photos = roomPhotos(room);
  return photos[0] || '';
}

function hasCoordinates(room) {
  const lat = Number(room?.latitude);
  const lng = Number(room?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function roomMapLink(room) {
  return room?.map_link || room?.mapLink || room?.google_maps_link || room?.googleMapsLink || '';
}

function mapSearchQuery(room) {
  if (hasCoordinates(room)) return `${Number(room.latitude)},${Number(room.longitude)}`;
  return room?.address || room?.fullAddress || room?.location || roomMapLink(room) || '';
}

function hasMapLocation(room) {
  return Boolean(mapSearchQuery(room) || roomMapLink(room));
}

function mapEmbedUrl(room) {
  const query = mapSearchQuery(room);
  if (!query) return '';
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
}

function googleMapsUrl(room) {
  const directLink = roomMapLink(room);
  if (directLink) return directLink;
  const query = mapSearchQuery(room);
  if (!query) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function selectedAmenities(room) {
  return Array.isArray(room?.amenities) ? room.amenities.filter(Boolean) : [];
}

function selectedRules(room) {
  return Array.isArray(room?.rules) ? room.rules.filter(Boolean) : [];
}


function toProfileForm(user) {
  return {
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || '',
    phone: user?.phone || '',
    age: user?.age || '',
    gender: uiGender(user?.gender || ''),
    profileImageUrl: user?.profileImageUrl || user?.profile_image_url || '',
    emailVerified: Boolean(user?.emailVerified || user?.email_verified),
  };
}

function toRoomForm(room) {
  const photos = Array.isArray(room?.documentation_urls) ? room.documentation_urls.filter((item) => item && !String(item).includes('placehold.co')) : [];
  return {
    name: room?.title || '',
    location: room?.location || '',
    campusName: room?.campus_name || '',
    monthlyPrice: formatRupiahInput(normaliseLegacyPriceValue(room?.price_per_month || '')),
    fullAddress: room?.address || '',
    description: room?.description || '',
    availability: room?.available_from ? String(room.available_from).slice(0, 10) : '',
    type: room?.allowed_gender || 'any',
    amount: String(room?.room_count || 1),
    amenities: selectedAmenities(room),
    rules: selectedRules(room),
    latitude: room?.latitude === null || room?.latitude === undefined ? '' : String(room.latitude),
    longitude: room?.longitude === null || room?.longitude === undefined ? '' : String(room.longitude),
    mapLink: roomMapLink(room),
    documentations: photos,
    listingStatus: room?.listing_status || 'published',
  };
}


function serialiseRoomForm(form) {
  return JSON.stringify({
    ...form,
    monthlyPrice: stripToDigits(form?.monthlyPrice || ''),
    amenities: Array.isArray(form?.amenities) ? form.amenities.filter(Boolean) : [],
    rules: Array.isArray(form?.rules) ? form.rules.filter(Boolean) : [],
    documentations: Array.isArray(form?.documentations) ? form.documentations.filter(Boolean) : [],
  });
}

function serialiseBookingForm(form) {
  return JSON.stringify({
    notes: form?.notes || '',
    moveInDate: form?.moveInDate || '',
    moveOutDate: form?.moveOutDate || '',
  });
}

function copyFilters(value) {
  return {
    location: value.location || '',
    minPrice: value.minPrice || '',
    maxPrice: value.maxPrice || '',
    amenities: value.amenities || '',
    moveInDate: value.moveInDate || '',
    type: value.type || '-',
  };
}

function InlineFeedback() {
  return null;
}

function FloatingFeedback({ feedback, onDismiss }) {
  if (!feedback?.text) return null;
  return (
    <div className={`floating-feedback ${feedback.type || 'info'}`.trim()}>
      <span>{feedback.text}</span>
      <button type="button" className="feedback-close" onClick={() => onDismiss(feedback.scope)} aria-label="Dismiss message">×</button>
    </div>
  );
}

function HouseMark({ className = 'house-mark-icon' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3.75 10.5L12 4.5l8.25 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.75 9.75v8.25a1.5 1.5 0 0 0 1.5 1.5h7.5a1.5 1.5 0 0 0 1.5-1.5V9.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.25 19.5v-4.25a1 1 0 0 1 1-1h1.5a1 1 0 0 1 1 1v4.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function App() {
  const [session, setSession] = useState(loadStoredSession());
  const [booting, setBooting] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [filters, setFilters] = useState(emptyFilters);
  const [rooms, setRooms] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [comparisonRoomIds, setComparisonRoomIds] = useState([]);
  const [ratingDrafts, setRatingDrafts] = useState({});
  const [ratingSubmitted, setRatingSubmitted] = useState({});
  const [emailCodeInput, setEmailCodeInput] = useState('');
  const [emailCodeRequested, setEmailCodeRequested] = useState(false);
  const [adminMessages, setAdminMessages] = useState([]);
  const [bookingIssues, setBookingIssues] = useState([]);
  const [issueForm, setIssueForm] = useState({ title: '', description: '' });
  const [viewingHistory, setViewingHistory] = useState(() => loadViewingHistory(loadStoredSession()?.user?.id));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studentBookings, setStudentBookings] = useState([]);
  const [providerRooms, setProviderRooms] = useState([]);
  const [providerBookings, setProviderBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatDraft, setChatDraft] = useState('');
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [bookingForm, setBookingForm] = useState(emptyBookingForm);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [page, setPage] = useState('auth');
  const [pageProps, setPageProps] = useState({});
  const [, setPageHistory] = useState([]);
  const [pageAnimationKey, setPageAnimationKey] = useState(0);
  const [feedback, setFeedback] = useState({ scope: '', type: '', text: '' });
  const [authBackgroundIndex, setAuthBackgroundIndex] = useState(0);
  const suppressDiscardPromptRef = useRef(false);
  const [loadingState, setLoadingState] = useState({
    auth: false,
    rooms: false,
    student: false,
    provider: false,
    roomSave: false,
    bookingSave: false,
    profileSave: false,
    passwordSave: false,
    requestAction: false,
    chat: false,
    notifications: false,
    favorites: false,
    emailVerification: false,
    rating: false,
    issues: false,
    deleteAccount: false,
  });
  const [hiddenDeniedBookingIds, setHiddenDeniedBookingIds] = useState(loadHiddenBookings());

  const studentBookingsVisible = useMemo(
    () => studentBookings.filter((booking) => String(booking.status || '').toLowerCase() !== 'cancelled' && !hiddenDeniedBookingIds.includes(booking.id)),
    [studentBookings, hiddenDeniedBookingIds]
  );

  const currentRoomPlan = useMemo(() => {
    const visibleActiveBookings = studentBookingsVisible.filter((booking) => ['pending', 'accepted'].includes(String(booking.status || '').toLowerCase()));
    if (!visibleActiveBookings.length) return null;
    const score = { accepted: 3, pending: 2 };
    return [...visibleActiveBookings].sort((left, right) => {
      const leftScore = score[left.status] ?? 0;
      const rightScore = score[right.status] ?? 0;
      if (rightScore !== leftScore) return rightScore - leftScore;
      return new Date(right.requested_at || 0) - new Date(left.requested_at || 0);
    })[0];
  }, [studentBookingsVisible]);

  const providerActiveRequests = useMemo(
    () => providerBookings.filter((booking) => booking.status === 'pending'),
    [providerBookings]
  );

  const providerRequestHistory = useMemo(
    () => providerBookings.filter((booking) => !['pending', 'cancelled'].includes(String(booking.status || '').toLowerCase())),
    [providerBookings]
  );

  const unreadNotificationCount = useMemo(() => notifications.filter((notification) => !notification.is_read).length, [notifications]);

  const unreadChatCount = useMemo(() => conversations.reduce((sum, item) => sum + Number(item.unread_count || 0), 0), [conversations]);

  const favoriteIds = useMemo(() => new Set(favorites.map((room) => room.id)), [favorites]);

  const comparisonRooms = useMemo(() => {
    const sources = [...rooms, ...favorites, ...viewingHistory, ...providerRooms];
    return comparisonRoomIds
      .map((roomId) => sources.find((room) => Number(room.id) === Number(roomId)))
      .filter(Boolean)
      .slice(0, 2);
  }, [comparisonRoomIds, rooms, favorites, viewingHistory, providerRooms]);

  const providerRoomStatusList = useMemo(() => {
    return providerRooms.map((room) => ({
      ...room,
      currentResidents: Number(room.current_residents_count || 0),
    }));
  }, [providerRooms]);

  const authBackdropPhotos = useMemo(() => {
    const photos = [];
    rooms.forEach((room) => {
      const candidates = Array.isArray(room.documentation_urls) && room.documentation_urls.length > 0
        ? room.documentation_urls
        : [room.main_photo_url].filter(Boolean);
      candidates.forEach((photo) => {
        if (photo && !photos.includes(photo)) {
          photos.push(photo);
        }
      });
    });
    return photos.slice(0, 6);
  }, [rooms]);

  const bookingFormBaseline = useMemo(() => {
    const defaultMoveIn = selectedRoom?.available_from ? String(selectedRoom.available_from).slice(0, 10) : '';
    return serialiseBookingForm({
      notes: '',
      moveInDate: defaultMoveIn,
      moveOutDate: defaultMoveOut(defaultMoveIn),
    });
  }, [selectedRoom?.available_from]);

  const roomFormBaseline = useMemo(() => {
    if (page === 'providerRoomEdit' && pageProps.room) {
      return serialiseRoomForm(toRoomForm(pageProps.room));
    }
    return serialiseRoomForm(emptyRoomForm);
  }, [page, pageProps.room]);

  const bookingFormDirty = useMemo(() => serialiseBookingForm(bookingForm) !== bookingFormBaseline, [bookingForm, bookingFormBaseline]);
  const roomFormDirty = useMemo(() => serialiseRoomForm(roomForm) !== roomFormBaseline, [roomForm, roomFormBaseline]);

  useEffect(() => {
    async function initialise() {
      setBooting(true);
      if (session?.token) {
        try {
          const meResponse = await api.get('/auth/me');
          const restored = { token: session.token, user: meResponse.data.user };
          persistSession(restored, false);
          await Promise.all([
            loadRooms(filters),
            loadNotifications(),
            loadConversations(),
            restored.user.role === 'student' ? loadStudentBookings() : Promise.resolve(),
            restored.user.role === 'student' ? loadFavorites() : Promise.resolve(),
            restored.user.role === 'provider' ? loadProviderDashboard() : Promise.resolve(),
          ]);
        } catch (error) {
          hardSignOut();
        }
      } else {
        await loadRooms(filters);
      }
      const sharedRoomId = roomIdFromHash();
      if (sharedRoomId) {
        await openRoomDetails(sharedRoomId, session ? 'home' : 'public');
      }
      setBooting(false);
    }

    initialise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const sharedRoomId = roomIdFromHash();
      if (sharedRoomId) {
        openRoomDetails(sharedRoomId, session ? 'home' : 'public');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.token || authBackdropPhotos.length <= 1) return undefined;
    const intervalId = window.setInterval(() => {
      setAuthBackgroundIndex((current) => (current + 1) % authBackdropPhotos.length);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [session?.token, authBackdropPhotos.length]);

  useEffect(() => {
    if (!session?.token) return undefined;

    const isStudentRefreshPage = ['home', 'studentBookings', 'studentBookingDetails', 'messages', 'notifications'].includes(page);
    const isProviderRefreshPage = ['home', 'providerRequests', 'providerRequestDetails', 'providerRoomStatus', 'providerRooms', 'messages', 'notifications'].includes(page);

    if (session.user.role === 'student' && !isStudentRefreshPage) {
      return undefined;
    }

    if (session.user.role === 'provider' && !isProviderRefreshPage) {
      return undefined;
    }

    const refresh = async () => {
      try {
        await Promise.all([loadNotifications(), loadConversations()]);
        if (session.user.role === 'student') {
          await loadStudentBookings();
        } else if (session.user.role === 'provider') {
          await loadProviderDashboard();
        }
        if (page === 'messages' && activeConversation?.id) {
          await loadMessages(activeConversation.id, false);
        }
      } catch (error) {
        // keep silent; normal page loaders already handle visible errors when needed
      }
    };

    const intervalId = window.setInterval(refresh, 5000);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token, session?.user?.role, page]);

  useEffect(() => {
    if (!selectedBooking?.id) return;

    const source = session?.user?.role === 'provider' ? providerBookings : studentBookings;
    const latestBooking = source.find((booking) => booking.id === selectedBooking.id);
    if (!latestBooking) return;

    setSelectedBooking((current) => {
      if (!current || current.id !== latestBooking.id) return current;
      const merged = { ...current, ...latestBooking };
      return JSON.stringify(current) === JSON.stringify(merged) ? current : merged;
    });
  }, [providerBookings, studentBookings, selectedBooking?.id, session?.user?.role]);

  useEffect(() => {
    if (!selectedRoom?.id) return;

    const sources = [...rooms, ...providerRooms];
    const latestRoom = sources.find((room) => room.id === selectedRoom.id);
    if (!latestRoom) return;

    setSelectedRoom((current) => {
      if (!current || current.id !== latestRoom.id) return current;
      const merged = { ...current, ...latestRoom };
      return JSON.stringify(current) === JSON.stringify(merged) ? current : merged;
    });
  }, [rooms, providerRooms, selectedRoom?.id]);

  useEffect(() => {
    if (!feedback?.text) return undefined;
    const timer = window.setTimeout(() => setFeedback({ scope: '', type: '', text: '' }), 3200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    const shouldWarn = (page === 'bookingRequest' && bookingFormDirty)
      || (['providerRoomCreate', 'providerRoomEdit'].includes(page) && roomFormDirty);

    if (!shouldWarn) return undefined;

    const beforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [page, bookingFormDirty, roomFormDirty]);

  function confirmDiscardChanges() {
    if (suppressDiscardPromptRef.current) return true;
    const shouldWarn = (page === 'bookingRequest' && bookingFormDirty)
      || (['providerRoomCreate', 'providerRoomEdit'].includes(page) && roomFormDirty);

    if (!shouldWarn) return true;
    return window.confirm('Leave this page? Your current input will be lost');
  }

  function persistSession(nextSession, resetForms = true) {
    sessionStorage.setItem('session', JSON.stringify(nextSession));
    sessionStorage.setItem('token', nextSession.token);
    localStorage.removeItem('session');
    localStorage.removeItem('token');
    setSession(nextSession);
    setProfileForm(toProfileForm(nextSession.user));
    if (resetForms) {
      setPasswordForm(emptyPasswordForm);
      setBookingForm(emptyBookingForm);
    }
    setViewingHistory(loadViewingHistory(nextSession.user?.id));
    navigateTo(onboardingSeen(nextSession.user?.id) ? 'home' : 'onboarding', {}, false);
  }

  function hardSignOut(skipConfirm = false) {
    if (!skipConfirm && !confirmDiscardChanges()) return;
    sessionStorage.removeItem('session');
    sessionStorage.removeItem('token');
    localStorage.removeItem('session');
    localStorage.removeItem('token');
    setSession(null);
    setProfileForm(emptyProfileForm);
    setPasswordForm(emptyPasswordForm);
    setStudentBookings([]);
    setProviderRooms([]);
    setProviderBookings([]);
    setNotifications([]);
    setFavorites([]);
    setComparisonRoomIds([]);
    setRatingDrafts({});
    setRatingSubmitted({});
    setViewingHistory([]);
    setConversations([]);
    setActiveConversation(null);
    setMessages([]);
    setChatDraft('');
    setEmailCodeInput('');
    setEmailCodeRequested(false);
    setAdminMessages([]);
    setBookingIssues([]);
    setIssueForm({ title: '', description: '' });
    setSelectedRoom(null);
    setSelectedBooking(null);
    setRoomForm(emptyRoomForm);
    setBookingForm(emptyBookingForm);
    setFilters(emptyFilters);
    setEditingRoomId(null);
    setPage('auth');
    setPageProps({});
    setPageHistory([]);
    setFeedback({ scope: '', type: '', text: '' });
    setAuthForm(emptyAuthForm);
  }

  function showFeedback(scope, type, text) {
    setFeedback({ scope, type, text });
  }

  function clearFeedback(scope) {
    setFeedback((current) => (current.scope === scope ? { scope: '', type: '', text: '' } : current));
  }

  function navigateTo(nextPage, nextProps = {}, pushHistory = true) {
    if (nextPage !== page && !confirmDiscardChanges()) return;
    setFeedback({ scope: '', type: '', text: '' });
    setSelectedRoom(nextProps.room || null);
    setSelectedBooking(nextProps.booking || null);
    setGalleryIndex(0);
    setShowNotificationPanel(false);
    setMobileMenuOpen(false);
    setPageHistory((current) => {
      if (!pushHistory) return current;
      return [...current, { page, props: pageProps }];
    });
    setPage(nextPage);
    setPageProps(nextProps);
    setPageAnimationKey((current) => current + 1);
  }

  function goBack() {
    if (!confirmDiscardChanges()) return;
    setFeedback({ scope: '', type: '', text: '' });
    setPageHistory((current) => {
      if (current.length === 0) {
        const fallback = session ? 'home' : 'auth';
        setPage(fallback);
        setPageProps({});
        setPageAnimationKey((value) => value + 1);
        return current;
      }
      const next = [...current];
      const previous = next.pop();
      if (previous.page === 'home') {
        setFilters(emptyFilters);
      }
      setPage(previous.page);
      setPageProps(previous.props || {});
      setSelectedRoom(previous.props?.room || null);
      setSelectedBooking(previous.props?.booking || null);
      setPageAnimationKey((value) => value + 1);
      return next;
    });
  }

  async function loadRooms(customFilters = filters) {
    setLoadingState((current) => ({ ...current, rooms: true }));
    try {
      const params = {};
      if (customFilters.location.trim()) params.location = customFilters.location.trim();
      const parsedMinPrice = stripToDigits(customFilters.minPrice);
      const parsedMaxPrice = stripToDigits(customFilters.maxPrice);
      if (parsedMinPrice) params.minPrice = parsedMinPrice;
      if (parsedMaxPrice) params.maxPrice = parsedMaxPrice;
      if (customFilters.amenities.trim()) params.amenities = customFilters.amenities.trim();
      if (customFilters.moveInDate) params.moveInDate = customFilters.moveInDate;
      if (customFilters.type && customFilters.type !== '-') params.type = customFilters.type;
      const response = await api.get('/rooms', { params });
      setRooms(response.data.rooms || []);
    } catch (error) {
      showFeedback(page, 'error', error.response?.data?.error || 'Unable to load rooms');
    } finally {
      setLoadingState((current) => ({ ...current, rooms: false }));
    }
  }

  async function loadStudentBookings() {
    setLoadingState((current) => ({ ...current, student: true }));
    try {
      const response = await api.get('/student/bookings');
      setStudentBookings(response.data.bookings || []);
    } catch (error) {
      showFeedback('studentBookings', 'error', error.response?.data?.error || 'Unable to load bookings');
    } finally {
      setLoadingState((current) => ({ ...current, student: false }));
    }
  }


  async function loadFavorites() {
    const stored = loadStoredSession();
    const activeUser = session?.user || stored?.user;

    if (activeUser?.role !== 'student') return;

    setLoadingState((current) => ({ ...current, favorites: true }));

    try {
      // Local wishlist is used as the source of truth so the button works immediately
      // even when the backend/database is still being adjusted.
      setFavorites(loadWishlist(activeUser.id));
    } finally {
      setLoadingState((current) => ({ ...current, favorites: false }));
    }
  }


  async function loadProviderDashboard() {
    setLoadingState((current) => ({ ...current, provider: true }));
    try {
      const [roomsResponse, bookingsResponse] = await Promise.all([
        api.get('/provider/rooms'),
        api.get('/provider/bookings'),
      ]);
      setProviderRooms(roomsResponse.data.rooms || []);
      setProviderBookings(bookingsResponse.data.bookings || []);
    } catch (error) {
      showFeedback('providerHome', 'error', error.response?.data?.error || 'Unable to load provider dashboard');
    } finally {
      setLoadingState((current) => ({ ...current, provider: false }));
    }
  }

  async function loadNotifications() {
    if (!(sessionStorage.getItem('token') || localStorage.getItem('token'))) return;
    setLoadingState((current) => ({ ...current, notifications: true }));
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications || []);
    } catch (error) {
      // Silent refresh.
    } finally {
      setLoadingState((current) => ({ ...current, notifications: false }));
    }
  }

  async function loadConversations() {
    if (!(sessionStorage.getItem('token') || localStorage.getItem('token'))) return;
    try {
      const response = await api.get('/conversations');
      setConversations(response.data.conversations || []);
    } catch (error) {
      // Silent refresh.
    }
  }

  async function loadMessages(conversationId, shouldNavigate = true) {
    setLoadingState((current) => ({ ...current, chat: true }));
    try {
      const response = await api.get(`/conversations/${conversationId}/messages`);
      setActiveConversation(response.data.conversation);
      setMessages(response.data.messages || []);
      await loadConversations();
      if (shouldNavigate) navigateTo('messages', { conversationId }, false);
    } catch (error) {
      showFeedback('messages', 'error', error.response?.data?.error || 'Unable to load messages');
    } finally {
      setLoadingState((current) => ({ ...current, chat: false }));
    }
  }

  async function openRoomDetails(roomId, returnPage) {
    try {
      const response = await api.get(`/rooms/${roomId}`);
      const room = response.data.room;
      if (session?.user?.id) {
        addRoomToViewingHistory(room);
      }
      navigateTo('roomDetails', { room, returnPage });
    } catch (error) {
      showFeedback(returnPage || page, 'error', error.response?.data?.error || 'Unable to load room details');
    }
  }

  function addRoomToViewingHistory(room) {
    if (!room?.id || !session?.user?.id) return;
    const item = {
      id: room.id,
      title: room.title,
      location: room.location,
      price_per_month: room.price_per_month,
      provider_name: room.provider_name,
      main_photo_url: roomMainPhoto(room),
      viewed_at: new Date().toISOString(),
    };
    setViewingHistory((current) => {
      const next = [item, ...current.filter((entry) => entry.id !== room.id)].slice(0, 30);
      saveViewingHistory(session.user.id, next);
      return next;
    });
  }

  async function toggleFavorite(room) {
    const stored = loadStoredSession();
    const activeUser = session?.user || stored?.user;

    if (!room?.id || activeUser?.role !== 'student') return;

    clearFeedback(page);

    const roomForWishlist = {
      ...room,
      main_photo_url: roomMainPhoto(room) || room.main_photo_url || '',
    };

    let shouldAddToBackend = false;
    let shouldRemoveFromBackend = false;

    setFavorites((current) => {
      const alreadySaved = current.some((item) => Number(item.id) === Number(room.id));
      const next = alreadySaved
        ? current.filter((item) => Number(item.id) !== Number(room.id))
        : [roomForWishlist, ...current.filter((item) => Number(item.id) !== Number(room.id))];

      saveWishlist(activeUser.id, next);
      shouldAddToBackend = !alreadySaved;
      shouldRemoveFromBackend = alreadySaved;

      return next;
    });

    showFeedback(page, 'success', shouldRemoveFromBackend ? 'Removed from wishlist' : 'Added to wishlist');

    // Best-effort backend sync. The UI already works from local storage, so errors here
    // will not undo the user's wishlist action.
    try {
      if (shouldRemoveFromBackend) {
        await api.delete(`/rooms/${room.id}/favorite`);
      } else if (shouldAddToBackend) {
        await api.post(`/rooms/${room.id}/favorite`);
      }
    } catch (error) {
      // Keep local wishlist working even if the backend favorite endpoint is unavailable.
    }
  }


  async function shareRoom(room) {
    const link = roomShareUrl(room?.id);
    if (!link) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link);
      } else {
        window.prompt('Copy this room link', link);
      }
      showFeedback(page, 'success', 'Link copied');
    } catch (error) {
      window.prompt('Copy this room link', link);
      showFeedback(page, 'success', 'Link copied');
    }
  }

  function toggleCompareRoom(room) {
    if (!room?.id) return;
    setComparisonRoomIds((current) => {
      const exists = current.some((id) => Number(id) === Number(room.id));
      if (exists) return current.filter((id) => Number(id) !== Number(room.id));
      if (current.length >= 2) return [current[1], room.id];
      return [...current, room.id];
    });
    showFeedback(page, 'success', 'Room comparison updated');
  }

  function clearComparison() {
    setComparisonRoomIds([]);
    showFeedback('compareRooms', 'success', 'Comparison cleared');
  }

  function selectRating(bookingId, value) {
    setRatingDrafts((current) => ({ ...current, [bookingId]: value }));
  }

  function finishOnboarding() {
    if (session?.user?.id) {
      markOnboardingSeen(session.user.id);
    }
    navigateTo('home', {}, false);
  }

  function onAuthInputChange(event) {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
  }

  function onFilterChange(event) {
    const { name, value } = event.target;
    if (name === 'minPrice' || name === 'maxPrice') {
      setFilters((current) => ({ ...current, [name]: formatRupiahInput(value) }));
      return;
    }
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function onProfileChange(event) {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  }

  function onPasswordChange(event) {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  }

  function onBookingChange(event) {
    const { name, value } = event.target;
    setBookingForm((current) => {
      if (name === 'moveInDate') {
        const nextMoveOut = defaultMoveOut(value);
        return { ...current, moveInDate: value, moveOutDate: nextMoveOut };
      }
      return { ...current, [name]: value };
    });
  }

  function onRoomFormChange(event) {
    const { name, value } = event.target;
    if (name === 'monthlyPrice') {
      setRoomForm((current) => ({ ...current, monthlyPrice: formatRupiahInput(value) }));
      return;
    }
    setRoomForm((current) => ({ ...current, [name]: value }));
  }

  async function onProfileImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const value = await fileToDataUrl(file);
    setProfileForm((current) => ({ ...current, profileImageUrl: value }));
  }

  async function onRoomImagesChange(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const nextImages = await Promise.all(files.map((file) => fileToDataUrl(file)));
    setRoomForm((current) => ({ ...current, documentations: [...current.documentations, ...nextImages].slice(0, 10) }));
    event.target.value = '';
  }

  function removeRoomImage(indexToRemove) {
    setRoomForm((current) => ({ ...current, documentations: current.documentations.filter((_, index) => index !== indexToRemove) }));
  }

  function toggleFacility(facility) {
    setRoomForm((current) => {
      const amenities = Array.isArray(current.amenities) ? current.amenities : [];
      const nextAmenities = amenities.includes(facility) ? amenities.filter((item) => item !== facility) : [...amenities, facility];
      return { ...current, amenities: nextAmenities };
    });
  }

  function toggleRule(rule) {
    setRoomForm((current) => {
      const rules = Array.isArray(current.rules) ? current.rules : [];
      const nextRules = rules.includes(rule) ? rules.filter((item) => item !== rule) : [...rules, rule];
      return { ...current, rules: nextRules };
    });
  }

  function onAuthModeChange(mode) {
    clearFeedback('auth');
    setAuthMode(mode);
    setAuthForm(emptyAuthForm);
  }

  async function submitAuth(event) {
    event.preventDefault();
    clearFeedback('auth');

    if (authMode === 'register') {
      if (!authForm.name.trim() || !authForm.email.trim() || !authForm.password.trim() || !authForm.role) {
        showFeedback('auth', 'error', 'Please complete all register fields');
        return;
      }
    } else if (!authForm.email.trim() || !authForm.password.trim()) {
      showFeedback('auth', 'error', 'Please enter your email and password');
      return;
    }

    setLoadingState((current) => ({ ...current, auth: true }));

    try {
      if (authMode === 'login') {
        const response = await api.post('/auth/login', {
          email: authForm.email,
          password: authForm.password,
        });
        persistSession(response.data);
        if (response.data.user.role === 'student') {
          await Promise.all([loadRooms(filters), loadStudentBookings(), loadFavorites(), loadNotifications(), loadConversations()]);
        } else {
          await Promise.all([loadRooms(filters), loadProviderDashboard(), loadNotifications(), loadConversations()]);
        }
      } else {
        await api.post('/auth/register', {
          name: authForm.name,
          email: authForm.email,
          password: authForm.password,
          role: authForm.role,
        });
        setAuthMode('login');
        setAuthForm(emptyAuthForm);
        showFeedback('auth', 'success', 'Account created. Please login');
      }
    } catch (error) {
      showFeedback('auth', 'error', error.response?.data?.error || 'Unable to continue');
    } finally {
      setLoadingState((current) => ({ ...current, auth: false }));
    }
  }

  async function applyFilters(targetPage) {
    const nextFilters = copyFilters(filters);
    clearFeedback(targetPage);
    setFilters(nextFilters);
    await loadRooms(nextFilters);
    navigateTo(targetPage, { filters: nextFilters });
  }

  async function submitBooking(event) {
    event.preventDefault();
    if (!selectedRoom) return;
    clearFeedback('bookingRequest');
    setLoadingState((current) => ({ ...current, bookingSave: true }));
    try {
      const payload = {
        roomId: selectedRoom.id,
        notes: bookingForm.notes,
        moveInDate: bookingForm.moveInDate,
        moveOutDate: bookingForm.moveOutDate || defaultMoveOut(bookingForm.moveInDate),
      };
      await api.post('/bookings', payload);
      suppressDiscardPromptRef.current = true;
      setBookingForm(emptyBookingForm);
      await Promise.all([loadRooms(filters), loadStudentBookings(), loadFavorites(), loadNotifications(), loadConversations()]);
      navigateTo('studentBookings', {}, false);
      showFeedback('studentBookings', 'success', 'Room submitted');
    } catch (error) {
      showFeedback('bookingRequest', 'error', error.response?.data?.error || 'Unable to send booking request');
    } finally {
      suppressDiscardPromptRef.current = false;
      setLoadingState((current) => ({ ...current, bookingSave: false }));
    }
  }

  async function submitProfile(event) {
    event.preventDefault();
    clearFeedback('profile');
    setLoadingState((current) => ({ ...current, profileSave: true }));
    try {
      const response = await api.put('/auth/profile', {
        name: profileForm.name,
        phone: profileForm.phone,
        age: profileForm.age,
        gender: apiGender(profileForm.gender),
        profileImageUrl: profileForm.profileImageUrl,
      });
      const updatedSession = { ...session, user: response.data.user };
      sessionStorage.setItem('session', JSON.stringify(updatedSession));
      setSession(updatedSession);
      setProfileForm(toProfileForm(response.data.user));
      if (response.data.user.role === 'student') {
        await loadStudentBookings();
      } else {
        await loadProviderDashboard();
      }
      showFeedback('profile', 'success', 'Profile updated');
    } catch (error) {
      showFeedback('profile', 'error', error.response?.data?.error || 'Unable to update profile');
    } finally {
      setLoadingState((current) => ({ ...current, profileSave: false }));
    }
  }

  async function submitPassword(event) {
    event.preventDefault();
    clearFeedback('password');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showFeedback('password', 'error', 'New passwords do not match');
      return;
    }
    setLoadingState((current) => ({ ...current, passwordSave: true }));
    try {
      await api.put('/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(emptyPasswordForm);
      showFeedback('password', 'success', 'Password updated');
    } catch (error) {
      showFeedback('password', 'error', error.response?.data?.error || 'Unable to change password');
    } finally {
      setLoadingState((current) => ({ ...current, passwordSave: false }));
    }
  }

  async function deleteAccount() {
    if (!window.confirm('Delete account? All of your data will be lost')) return;

    setLoadingState((current) => ({ ...current, deleteAccount: true }));
    try {
      await api.delete('/auth/account');
      hardSignOut(true);
    } catch (error) {
      window.alert(error.response?.data?.error || 'Unable to delete account');
    } finally {
      setLoadingState((current) => ({ ...current, deleteAccount: false }));
    }
  }

  async function submitRoom(event) {
    event.preventDefault();
    clearFeedback('roomForm');
    setLoadingState((current) => ({ ...current, roomSave: true }));
    try {
      const submitterStatus = event.nativeEvent?.submitter?.value;
      const nextListingStatus = submitterStatus || roomForm.listingStatus || 'published';
      const payload = {
        name: roomForm.name,
        location: roomForm.location,
        campusName: roomForm.campusName,
        monthlyPrice: Number(stripToDigits(roomForm.monthlyPrice)),
        fullAddress: roomForm.fullAddress,
        description: roomForm.description,
        availability: roomForm.availability,
        type: roomForm.type,
        amount: Number(roomForm.amount),
        amenities: roomForm.amenities,
        rules: roomForm.rules,
        latitude: roomForm.latitude,
        longitude: roomForm.longitude,
        documentations: roomForm.documentations,
        listingStatus: nextListingStatus,
        mapLink: roomForm.mapLink,
      };

      if (editingRoomId) {
        await api.put(`/rooms/${editingRoomId}`, payload);
      } else {
        await api.post('/rooms', payload);
      }

      await loadProviderDashboard();
      suppressDiscardPromptRef.current = true;
      setRoomForm(emptyRoomForm);
      setEditingRoomId(null);
      navigateTo('providerRooms', {}, false);
      showFeedback('providerRooms', 'success', editingRoomId ? 'Room updated' : 'Room submitted');
    } catch (error) {
      showFeedback('roomForm', 'error', error.response?.data?.error || 'Unable to save room');
    } finally {
      suppressDiscardPromptRef.current = false;
      setLoadingState((current) => ({ ...current, roomSave: false }));
    }
  }

  async function acceptOrDenyBooking(booking, nextStatus) {
    clearFeedback('providerRequestDetails');
    setLoadingState((current) => ({ ...current, requestAction: true }));
    try {
      await api.patch(`/bookings/${booking.id}/status`, { status: nextStatus });
      await loadProviderDashboard();
      navigateTo('providerRequests', {}, false);
      showFeedback('providerRequests', 'success', `Request ${nextStatus === 'accepted' ? 'accepted' : 'denied'}`);
    } catch (error) {
      showFeedback('providerRequestDetails', 'error', error.response?.data?.error || 'Unable to update request');
    } finally {
      setLoadingState((current) => ({ ...current, requestAction: false }));
    }
  }

  async function removeStudentFromRoomStatus(booking) {
    if (!window.confirm('Are you sure you want to delete this student from the room status?')) return;
    clearFeedback('providerRequestDetails');
    setLoadingState((current) => ({ ...current, requestAction: true }));
    try {
      await api.patch(`/bookings/${booking.id}/remove-student`);
      await Promise.all([loadProviderDashboard(), loadRooms(filters), loadNotifications()]);
      navigateTo('providerRoomStatus', { room: pageProps.room }, false);
      showFeedback('providerRoomStatus', 'success', 'Student deleted from room status');
    } catch (error) {
      showFeedback('providerRequestDetails', 'error', error.response?.data?.error || 'Unable to delete student');
    } finally {
      setLoadingState((current) => ({ ...current, requestAction: false }));
    }
  }

  async function openConversationFromRoom(room, firstMessage = '') {
    if (!room?.id) return;
    if (session?.user?.role !== 'student') {
      showFeedback(page, 'error', 'Only students can message providers from a room listing');
      return;
    }
    setLoadingState((current) => ({ ...current, chat: true }));
    try {
      const response = await api.post('/conversations', { roomId: room.id, message: firstMessage });
      await loadMessages(response.data.conversation.id);
      await Promise.all([loadNotifications(), loadConversations()]);
    } catch (error) {
      showFeedback(page, 'error', error.response?.data?.error || 'Unable to open chat');
    } finally {
      setLoadingState((current) => ({ ...current, chat: false }));
    }
  }

  async function submitChatMessage(event) {
    event.preventDefault();
    if (!activeConversation?.id || !chatDraft.trim()) return;
    setLoadingState((current) => ({ ...current, chat: true }));
    try {
      await api.post(`/conversations/${activeConversation.id}/messages`, { body: chatDraft.trim() });
      setChatDraft('');
      await Promise.all([loadMessages(activeConversation.id, false), loadNotifications(), loadConversations()]);
    } catch (error) {
      showFeedback('messages', 'error', error.response?.data?.error || 'Unable to send message');
    } finally {
      setLoadingState((current) => ({ ...current, chat: false }));
    }
  }

  async function openNotification(notification) {
    try {
      if (!notification.is_read) await api.patch(`/notifications/${notification.id}/read`);
      await loadNotifications();
      setShowNotificationPanel(false);
      if (notification.related_conversation_id) {
        await loadMessages(notification.related_conversation_id);
      } else if (notification.related_booking_id) {
        navigateTo(session.user.role === 'student' ? 'studentBookings' : 'providerRequests');
      } else if (notification.related_room_id) {
        await openRoomDetails(notification.related_room_id, 'home');
      } else {
        navigateTo('notifications');
      }
    } catch (error) {
      showFeedback('notifications', 'error', error.response?.data?.error || 'Unable to open notification');
    }
  }

  async function markAllNotificationsRead() {
    try {
      await api.patch('/notifications/read-all');
      await loadNotifications();
    } catch (error) {
      showFeedback('notifications', 'error', error.response?.data?.error || 'Unable to update notifications');
    }
  }

  function startRoomSubmission() {
    clearFeedback('roomForm');
    setEditingRoomId(null);
    setRoomForm(emptyRoomForm);
    navigateTo('providerRoomCreate');
  }

  function startRoomEdit(room) {
    clearFeedback('roomForm');
    setEditingRoomId(room.id);
    setRoomForm(toRoomForm(room));
    navigateTo('providerRoomEdit', { room });
  }

  function openProviderRoomDetails(room) {
    addRoomToViewingHistory(room);
    navigateTo('roomDetails', { room, returnPage: 'providerRooms' });
  }

  function openProviderRoomStatus(room) {
    navigateTo('providerRoomStatus', { room });
  }

  function openRequestDetails(booking, origin = 'providerRequests') {
    setBookingIssues([]);
    loadBookingIssues(booking.id);
    navigateTo('providerRequestDetails', { booking, origin });
  }

  function openBookingDetails(booking) {
    setBookingIssues([]);
    setIssueForm({ title: '', description: '' });
    loadBookingIssues(booking.id);
    navigateTo('studentBookingDetails', { booking, tab: 'room' });
  }


  function updateSessionUser(user) {
    const updatedSession = { ...session, user };
    sessionStorage.setItem('session', JSON.stringify(updatedSession));
    setSession(updatedSession);
    setProfileForm(toProfileForm(user));
  }

  async function requestEmailVerification() {
    clearFeedback('profile');
    setLoadingState((current) => ({ ...current, emailVerification: true }));
    try {
      const response = await api.post('/auth/email-verification/send');
      updateSessionUser(response.data.user);
      setEmailCodeRequested(true);
      const code = response.data.code;
      const message = {
        id: `admin-email-${Date.now()}`,
        sender_id: 'admin',
        body: `Your KosanKu email verification code is ${code}. Enter this code in your Profile page to verify your email.`,
        created_at: new Date().toISOString(),
      };
      setAdminMessages((current) => [message, ...current]);
      setActiveConversation({ id: 'admin-email', room_title: 'KosanKu Admin', provider_name: 'Admin', student_name: 'Admin', main_photo_url: '' });
      setMessages([message]);
      showFeedback('profile', 'success', 'Verification code sent in Messages from Admin');
    } catch (error) {
      showFeedback('profile', 'error', error.response?.data?.error || 'Unable to send verification code');
    } finally {
      setLoadingState((current) => ({ ...current, emailVerification: false }));
    }
  }

  async function confirmEmailVerification() {
    clearFeedback('profile');
    if (!emailCodeInput.trim()) {
      showFeedback('profile', 'error', 'Please enter the verification code');
      return;
    }
    setLoadingState((current) => ({ ...current, emailVerification: true }));
    try {
      const response = await api.post('/auth/email-verification/confirm', { code: emailCodeInput.trim() });
      updateSessionUser(response.data.user);
      setEmailCodeInput('');
      setEmailCodeRequested(false);
      showFeedback('profile', 'success', 'Email is verified');
    } catch (error) {
      showFeedback('profile', 'error', error.response?.data?.error || 'Unable to verify email');
    } finally {
      setLoadingState((current) => ({ ...current, emailVerification: false }));
    }
  }

  async function submitRoomRating(booking) {
    if (!booking?.room_id) return;
    const currentRating = Number(ratingDrafts[booking.id] ?? booking.student_rating ?? ratingSubmitted[booking.id] ?? 0);

    clearFeedback('studentBookingDetails');

    if (!currentRating) {
      showFeedback('studentBookingDetails', 'error', 'Please choose a star rating first');
      return;
    }

    setLoadingState((current) => ({ ...current, rating: true }));
    try {
      await api.post(`/rooms/${booking.room_id}/rating`, { rating: currentRating });
      setRatingSubmitted((current) => ({ ...current, [booking.id]: currentRating }));
      await Promise.all([loadRooms(filters), loadStudentBookings()]);
      showFeedback('studentBookingDetails', 'success', `${currentRating}-star rating submitted`);
    } catch (error) {
      showFeedback('studentBookingDetails', 'error', error.response?.data?.error || 'Unable to submit rating');
    } finally {
      setLoadingState((current) => ({ ...current, rating: false }));
    }
  }

  async function loadBookingIssues(bookingId) {
    if (!bookingId) return;
    setLoadingState((current) => ({ ...current, issues: true }));
    try {
      const response = await api.get(`/bookings/${bookingId}/requests`);
      setBookingIssues(response.data.requests || []);
    } catch (error) {
      setBookingIssues([]);
    } finally {
      setLoadingState((current) => ({ ...current, issues: false }));
    }
  }

  async function submitMaintenanceRequest(event) {
    event.preventDefault();
    if (!selectedBooking?.id) return;
    clearFeedback('studentBookingDetails');
    setLoadingState((current) => ({ ...current, issues: true }));
    try {
      await api.post(`/bookings/${selectedBooking.id}/requests`, issueForm);
      setIssueForm({ title: '', description: '' });
      await loadBookingIssues(selectedBooking.id);
      showFeedback('studentBookingDetails', 'success', 'Room problem request submitted');
    } catch (error) {
      showFeedback('studentBookingDetails', 'error', error.response?.data?.error || 'Unable to submit request');
    } finally {
      setLoadingState((current) => ({ ...current, issues: false }));
    }
  }

  async function acknowledgeMaintenanceRequest(request) {
    clearFeedback('providerRequestDetails');
    setLoadingState((current) => ({ ...current, issues: true }));
    try {
      await api.patch(`/bookings/requests/${request.id}/acknowledge`);
      await loadBookingIssues(request.booking_id);
      await loadNotifications();
      showFeedback('providerRequestDetails', 'success', 'Request acknowledged');
    } catch (error) {
      showFeedback('providerRequestDetails', 'error', error.response?.data?.error || 'Unable to acknowledge request');
    } finally {
      setLoadingState((current) => ({ ...current, issues: false }));
    }
  }

  async function cancelBookingRequest(booking) {
    clearFeedback('studentBookingDetails');
    setLoadingState((current) => ({ ...current, requestAction: true }));
    try {
      await api.patch(`/bookings/${booking.id}/cancel`);
      await Promise.all([loadStudentBookings(), loadRooms(filters)]);
      navigateTo('studentBookings', {}, false);
    } catch (error) {
      showFeedback('studentBookingDetails', 'error', error.response?.data?.error || 'Unable to cancel request');
    } finally {
      setLoadingState((current) => ({ ...current, requestAction: false }));
    }
  }

  function hideDeniedBooking(bookingId) {
    const next = Array.from(new Set([...hiddenDeniedBookingIds, bookingId]));
    setHiddenDeniedBookingIds(next);
    saveHiddenBookings(next);
  }

  function signOut() {
    hardSignOut();
  }

  function goHome() {
    setFilters(emptyFilters);
    setFeedback({ scope: '', type: '', text: '' });
    navigateTo('home', {}, false);
  }

  function providerRoomResidents(roomId) {
    return providerBookings.filter(
      (booking) => booking.room_id === roomId && booking.status === 'accepted'
    );
  }

  function renderAuthPage() {
    const currentBackdrop = authBackdropPhotos[authBackgroundIndex] || '';
    return (
      <div className="public-shell">
        {currentBackdrop ? (
          <>
            <div
              key={currentBackdrop}
              className="auth-backdrop-layer"
              style={{ backgroundImage: `url(${currentBackdrop})` }}
            />
            <div className="auth-backdrop-overlay" />
          </>
        ) : null}
        <div className="auth-card card pop-card">
          <div className="brand-lockup">
            <div className="brand-title-row brand-title-row--center">
              <HouseMark />
              <h1 className="brand-mark">KosanKu</h1>
            </div>
            <p className="brand-motto">Tempat Asik Cari Kos-kosan</p>
          </div>

          <div className="tab-row top-tabs">
            <button
              type="button"
              className={`tab-button ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => onAuthModeChange('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`tab-button ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => onAuthModeChange('register')}
            >
              Register
            </button>
          </div>

          <form className="stack-form" onSubmit={submitAuth}>
            {authMode === 'register' && (
              <label className="field-block">
                <span>Name</span>
                <input name="name" value={authForm.name} onChange={onAuthInputChange} />
              </label>
            )}

            <label className="field-block">
              <span>Email</span>
              <input name="email" type="email" value={authForm.email} onChange={onAuthInputChange} />
            </label>

            <label className="field-block">
              <span>Password</span>
              <input
                name="password"
                type="password"
                value={authForm.password}
                onChange={onAuthInputChange}
              />
            </label>

            {authMode === 'register' && (
              <label className="field-block">
                <span>Role</span>
                <select name="role" value={authForm.role} onChange={onAuthInputChange}>
                  <option value="student">Student</option>
                  <option value="provider">Provider</option>
                </select>
              </label>
            )}

            <InlineFeedback feedback={feedback} scope="auth" onDismiss={clearFeedback} />

            <button className="primary-button submit-button" type="submit" disabled={loadingState.auth}>
              {loadingState.auth ? 'Please Wait' : authMode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  function renderNotificationPanel() {
    if (!showNotificationPanel) return null;
    const recentNotifications = notifications.slice(0, 6);
    return (
      <div className="notification-panel card">
        <div className="row-between compact-room-top">
          <strong>Notifications</strong>
          <button type="button" className="link-button" onClick={markAllNotificationsRead}>Mark all read</button>
        </div>
        <div className="notification-list compact-gap">
          {recentNotifications.length > 0 ? recentNotifications.map((notification) => (
            <button key={notification.id} type="button" className={`notification-item ${notification.is_read ? '' : 'unread'}`.trim()} onClick={() => openNotification(notification)}>
              <strong>{notification.title}</strong>
              <span>{notification.message}</span>
              <small>{formatDateTime(notification.created_at)}</small>
            </button>
          )) : <div className="empty-card mini-empty-card">No notifications yet</div>}
        </div>
        <button className="secondary-button full-width-button" type="button" onClick={() => navigateTo('notifications')}>View All Notifications</button>
      </div>
    );
  }

  function renderRoomGallery(room) {
    const photos = roomPhotos(room);
    const currentPhoto = photos[galleryIndex] || photos[0] || '';
    return (
      <div className="room-gallery">
        <div className="room-gallery-main">
          <img src={imageSrc(currentPhoto)} alt={room?.title || 'Room'} className="detail-image" />
          {photos.length > 1 ? <>
            <button type="button" className="gallery-nav gallery-nav-left" onClick={() => setGalleryIndex((current) => (current === 0 ? photos.length - 1 : current - 1))}>‹</button>
            <button type="button" className="gallery-nav gallery-nav-right" onClick={() => setGalleryIndex((current) => (current + 1) % photos.length)}>›</button>
          </> : null}
          <span className="gallery-counter">{photos.length ? galleryIndex + 1 : 0}/{photos.length || 0}</span>
        </div>
        {photos.length > 1 ? <div className="gallery-thumbnails">
          {photos.map((photo, index) => (
            <button key={`${photo}-${index}`} type="button" className={`gallery-thumb ${index === galleryIndex ? 'active' : ''}`.trim()} onClick={() => setGalleryIndex(index)}>
              <img src={imageSrc(photo)} alt={`${room?.title || 'Room'} ${index + 1}`} />
            </button>
          ))}
        </div> : null}
      </div>
    );
  }

  function renderAmenitiesPreview(room) {
    const amenities = selectedAmenities(room);
    if (amenities.length === 0) return null;
    return <div className="amenity-chip-row">{amenities.slice(0, 4).map((amenity) => <span key={amenity} className="amenity-chip">{amenity}</span>)}{amenities.length > 4 ? <span className="amenity-chip">+{amenities.length - 4} more</span> : null}</div>;
  }

  function renderFacilitiesSection(room) {
    const amenities = selectedAmenities(room);
    return (
      <section className="card detail-section-card">
        <div className="row-between compact-room-top"><h3>Facilities</h3><span>{amenities.length} selected</span></div>
        {amenities.length > 0 ? <div className="facility-detail-grid">
          {facilityGroups.map((group) => {
            const selected = group.items.filter((item) => amenities.includes(item));
            if (selected.length === 0) return null;
            return <div key={group.title} className="facility-detail-group"><strong>{group.title}</strong><div className="facility-detail-list">{selected.map((item) => <span key={item}>✓ {item}</span>)}</div></div>;
          })}
        </div> : <div className="empty-card mini-empty-card">No facilities listed yet</div>}
      </section>
    );
  }


  function renderRulesSection(room) {
    const rules = selectedRules(room);
    return (
      <section className="card detail-section-card">
        <div className="row-between compact-room-top"><h3>Rules</h3><span>{rules.length} listed</span></div>
        {rules.length > 0 ? <div className="facility-detail-grid rules-detail-grid">
          {rules.map((rule) => <span key={rule} className="rule-pill">• {rule}</span>)}
        </div> : <div className="empty-card mini-empty-card">No rules listed yet</div>}
      </section>
    );
  }

  function renderMapSection(room) {
    return (
      <section className="card detail-section-card">
        <h3>Location</h3>
        <div className="detail-copy-block"><strong>Full Address</strong><p>{room?.address || '-'}</p></div>
        {room?.campus_name ? <div className="detail-copy-block"><strong>Nearby Campus</strong><p>{room.campus_name}</p></div> : null}
        {hasMapLocation(room) ? <>
          <div className="map-frame-wrap"><iframe title={`${room.title || 'Room'} map`} className="map-frame" src={mapEmbedUrl(room)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /><span className="map-red-marker" aria-hidden="true" /></div>
          <a className="secondary-button map-link-button" href={googleMapsUrl(room)} target="_blank" rel="noreferrer">Open in Google Maps</a>
        </> : <div className="empty-card mini-empty-card">Map location has not been added yet</div>}
      </section>
    );
  }

  function renderHeader() {
    if (!session) return null;
    const role = session.user.role;
    const actionButtons = (
      <>
        <div className="notification-wrap">
          <button type="button" className="ghost-button icon-badge-button" onClick={() => setShowNotificationPanel((current) => !current)} aria-label="Notifications">
            🔔{unreadNotificationCount > 0 ? <span className="badge-count">{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</span> : null}
          </button>
          {renderNotificationPanel()}
        </div>
        <button type="button" className="ghost-button icon-badge-button" onClick={() => navigateTo('messages')}>
          Messages{unreadChatCount > 0 ? <span className="badge-count badge-count-inline">{unreadChatCount > 9 ? '9+' : unreadChatCount}</span> : null}
        </button>
        {role === 'student' ? (
          <>
            <button type="button" className="ghost-button" onClick={() => navigateTo('wishlist')}>Wishlist</button>
            <button type="button" className="ghost-button" onClick={() => navigateTo('compareRooms')}>Compare</button>
            <button type="button" className="ghost-button" onClick={() => navigateTo('viewingHistory')}>History</button>
            <button type="button" className="ghost-button" onClick={() => navigateTo('profile')}>Profile</button>
            <button type="button" className="ghost-button" onClick={() => navigateTo('studentBookings')}>Bookings</button>
            <button type="button" className="ghost-button logout-button" onClick={signOut}>Logout</button>
          </>
        ) : (
          <>
            <button type="button" className="ghost-button" onClick={() => navigateTo('viewingHistory')}>History</button>
            <button type="button" className="ghost-button" onClick={() => navigateTo('profile')}>Profile</button>
            <button type="button" className="ghost-button" onClick={() => navigateTo('providerRooms')}>My Rooms</button>
            <button type="button" className="ghost-button" onClick={() => navigateTo('providerRequests')}>Requests</button>
            <button type="button" className="ghost-button logout-button" onClick={signOut}>Logout</button>
          </>
        )}
      </>
    );

    return (
      <header className="app-header">
        <button type="button" className="brand-link" onClick={goHome}>
          <HouseMark className="house-mark-icon house-mark-icon--header" />
          <span>KosanKu</span>
        </button>
        <button
          type="button"
          className="mobile-menu-button ghost-button"
          onClick={() => setMobileMenuOpen((current) => !current)}
          aria-label="Open menu"
        >
          ☰
        </button>
        <div className={`header-actions ${mobileMenuOpen ? 'mobile-open' : ''}`.trim()}>
          {actionButtons}
        </div>
      </header>
    );
  }

  function renderBackButton() {
    if (page === 'home' || page === 'auth' || page === 'onboarding') return null;
    return (
      <button
        type="button"
        className={`back-button ${['profile', 'password', 'studentBookingDetails', 'providerRequestDetails'].includes(page) ? 'compact-back-button' : ''}`.trim()}
        onClick={goBack}
      >
        ← Back
      </button>
    );
  }

  function renderHome() {
    if (session.user.role === 'provider') {
      return (
        <div className="page-grid two-up">
          <div className="panel-stack">
            <h2 className="page-title">Find Rooms</h2>
            <section className="card equal-card">
              {renderCompactFilterForm()}
              <button className="accent-button" type="button" onClick={() => applyFilters('providerSearch')}>
                Apply Filters
              </button>
            </section>
          </div>

          <div className="panel-stack">
            <h2 className="page-title">Room Status</h2>
            <section className="card equal-card">
              <div className="list-stack">
                {providerRoomStatusList.length > 0 ? (
                  providerRoomStatusList.slice(0, 4).map((room) => {
                    const totalSlots = Number(room.room_count || 1);
                    const remainingSlots = Number(
                      room.remaining_slots ?? Math.max(totalSlots - Number(room.currentResidents || 0), 0)
                    );
                    return (
                      <div key={room.id} className="room-status-row compact-room-row">
                        <img src={imageSrc(roomMainPhoto(room))} alt={room.title} className="row-image" />
                        <div className="compact-room-copy">
                          <div className="row-between compact-room-top">
                            <strong>{room.title}</strong>
                            <span>{remainingSlots} of {totalSlots} slots available</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-card full-row">No rooms submitted yet</div>
                )}
              </div>
              <button className="secondary-button" type="button" onClick={() => navigateTo('providerRooms')}>
                View All
              </button>
            </section>
          </div>
        </div>
      );
    }

    return (
      <div className="page-grid two-up">
        <div className="panel-stack">
          <h2 className="page-title">Find Your Room</h2>
          <section className="card equal-card">
            {renderCompactFilterForm()}
            <button className="accent-button" type="button" onClick={() => applyFilters('studentSearch')}>
              Apply Filters
            </button>
          </section>
        </div>

        <div className="panel-stack">
          <h2 className="page-title">Active Plan</h2>
          <section className="card equal-card">
            {currentRoomPlan ? (
              <div className="active-plan-card">
                <div className="row-between start">
                  <div className="request-room-summary">
                    <img
                      src={imageSrc(currentRoomPlan.main_photo_url)}
                      alt={currentRoomPlan.room_title}
                      className="summary-thumb"
                    />
                    <div>
                      <h3>{currentRoomPlan.room_title}</h3>
                    </div>
                  </div>
                  <span className={statusClass(currentRoomPlan.status)}>{statusLabel(currentRoomPlan.status)}</span>
                </div>
                <div className="soft-box">
                  <div className="info-line">
                    <span>Expected Move-In Date</span>
                    <strong>{formatDate(currentRoomPlan.move_in_date || currentRoomPlan.preferred_move_in_date)}</strong>
                  </div>
                  <div className="info-line">
                    <span>{currentRoomPlan.status === 'accepted' ? 'Date Accepted' : 'Date Requested'}</span>
                    <strong>{formatDate(currentRoomPlan.responded_at || currentRoomPlan.requested_at)}</strong>
                  </div>
                </div>
                <button className="secondary-button" type="button" onClick={() => navigateTo('studentBookings')}>
                  View Details
                </button>
              </div>
            ) : (
              <div className="empty-card">No room plan yet</div>
            )}
          </section>
        </div>
      </div>
    );
  }

  function renderCompactFilterForm() {
    return (
      <div className="field-grid compact-fields">
        <label className="field-block">
          <span>Location</span>
          <input name="location" value={filters.location} onChange={onFilterChange} />
        </label>
        <label className="field-block">
          <span>Move-In Date</span>
          <input name="moveInDate" type="date" value={filters.moveInDate} onChange={onFilterChange} />
        </label>
        <label className="field-block price-range-field">
          <span>Price Range</span>
          <div className="price-range-row">
            <input name="minPrice" type="text" inputMode="numeric" value={filters.minPrice} onChange={onFilterChange} placeholder="Minimum" />
            <input name="maxPrice" type="text" inputMode="numeric" value={filters.maxPrice} onChange={onFilterChange} placeholder="Maximum" />
          </div>
        </label>
        <label className="field-block">
          <span>Amenities</span>
          <input name="amenities" value={filters.amenities} onChange={onFilterChange} />
        </label>
        <label className="field-block">
          <span>Type</span>
          <select name="type" value={filters.type} onChange={onFilterChange}>
            <option value="-">-</option>
            <option value="any">Any</option>
            <option value="male">Men's Only</option>
            <option value="female">Women's Only</option>
          </select>
        </label>
      </div>
    );
  }

  function renderSearchPage(targetRole) {
    return (
      <div className="stack-layout">
        <h2>Search Result</h2>
        <section className="card slim-filter-bar">
          <div className="filter-inline-grid">
            <label className="field-inline">
              <span>Location</span>
              <input name="location" value={filters.location} onChange={onFilterChange} />
            </label>
            <label className="field-inline">
              <span>Move-In Date</span>
              <input name="moveInDate" type="date" value={filters.moveInDate} onChange={onFilterChange} />
            </label>
            <label className="field-inline price-range-inline">
              <span>Price Range</span>
              <div className="price-range-row">
                <input name="minPrice" type="text" inputMode="numeric" value={filters.minPrice} onChange={onFilterChange} placeholder="Minimum" />
                <input name="maxPrice" type="text" inputMode="numeric" value={filters.maxPrice} onChange={onFilterChange} placeholder="Maximum" />
              </div>
            </label>
            <label className="field-inline">
              <span>Amenities</span>
              <input name="amenities" value={filters.amenities} onChange={onFilterChange} />
            </label>
            <label className="field-inline">
              <span>Type</span>
              <select name="type" value={filters.type} onChange={onFilterChange}>
                <option value="-">-</option>
                <option value="any">Any</option>
                <option value="male">Men's Only</option>
                <option value="female">Women's Only</option>
              </select>
            </label>
            <button className="accent-button compact-action" type="button" onClick={() => loadRooms(filters)}>
              Change Filters
            </button>
          </div>
        </section>

        <div className="cards-grid three-up spaced-top">
          {rooms.length > 0 ? (
            rooms.map((room) => (
              <article key={room.id} className="card room-card result-card">
                <img className="room-cover" src={imageSrc(roomMainPhoto(room))} alt={room.title} />
                <div className="room-card-body">
                  {renderTitleByProvider(room.title, room.provider_name)}
                  <strong>{formatCurrency(room.price_per_month)} / month</strong>
                  <span className="muted-line">{room.location || '-'}</span>
                  {renderAmenitiesPreview(room)}
                  <div className="button-row wrap-row room-card-actions">
                    <button className="secondary-button" type="button" onClick={() => openRoomDetails(room.id, targetRole === 'provider' ? 'providerSearch' : 'studentSearch')}>
                      View Details
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-card full-row">No rooms found</div>
          )}
        </div>
      </div>
    );
  }

  function renderRoomDetails() {
    if (!selectedRoom) return <div className="empty-card full-row">Room details are unavailable</div>;

    return (
      <div className="stack-layout">
        <h2>Details</h2>
        <section className="card detail-hero">
          <div className="detail-hero-media">
            {renderRoomGallery(selectedRoom)}
          </div>
          <div className="detail-hero-copy">
            <div className="row-between start">
              {renderTitleByProvider(selectedRoom.title, selectedRoom.provider_name, 'h2')}
              {selectedRoom.listing_status === 'draft' ? <span className="status-badge pending">Draft</span> : null}
            </div>
            {renderProviderLine(selectedRoom.provider_name, selectedRoom.provider_profile_image_url, selectedRoom.provider_phone, 'detail-provider-line')}
            <div className="detail-meta-grid">
              <div><span>Location</span><strong>{selectedRoom.location || '-'}</strong></div>
              <div><span>Monthly Price</span><strong>{formatCurrency(selectedRoom.price_per_month)}</strong></div>
              <div><span>Availability</span><strong>{formatDate(selectedRoom.available_from)}</strong></div>
              <div><span>Type</span><strong>{humanType(selectedRoom.allowed_gender)}</strong></div>
              <div><span>Amount</span><strong>{selectedRoom.remaining_slots ?? selectedRoom.room_count ?? 1}</strong></div>
            </div>
            <div className="detail-copy-block">
              <strong>Description</strong>
              <p>{selectedRoom.description || '-'}</p>
            </div>
            <div className="button-row wrap-row">
              {session?.user?.role === 'student' && (
                <>
                  <button className="accent-button" type="button" onClick={() => {
                    setBookingForm((current) => ({ ...current, moveInDate: current.moveInDate || (selectedRoom.available_from ? String(selectedRoom.available_from).slice(0, 10) : '') }));
                    navigateTo('bookingRequest', { room: selectedRoom });
                  }}>
                    Request Room
                  </button>
                  <button className="wishlist-button" type="button" onClick={() => toggleFavorite(selectedRoom)}>
                    {favoriteIds.has(selectedRoom.id) ? '♥ Added to Wishlist' : '♡ Add to Wishlist'}
                  </button>
                  <button className="secondary-button" type="button" onClick={() => toggleCompareRoom(selectedRoom)}>
                    {comparisonRoomIds.some((id) => Number(id) === Number(selectedRoom.id)) ? 'Comparing' : 'Compare'}
                  </button>
                  <button className="secondary-button" type="button" onClick={() => openConversationFromRoom(selectedRoom)}>
                    Message Provider
                  </button>
                </>
              )}
              <button className="secondary-button" type="button" onClick={() => shareRoom(selectedRoom)}>
                Copy Link
              </button>
            </div>
          </div>
        </section>
        {renderFacilitiesSection(selectedRoom)}
        {renderRulesSection(selectedRoom)}
        {renderMapSection(selectedRoom)}
      </div>
    );
  }

  function renderBookingRequestPage() {
    if (!selectedRoom) return <div className="empty-card full-row">Room details are unavailable</div>;

    return (
      <div className="stack-layout narrow-stack centered-stack">
        <h2>Request Room</h2>
        <section className="card centered-card">
          <InlineFeedback feedback={feedback} scope="bookingRequest" onDismiss={clearFeedback} />
          <div className="request-room-summary">
            <img src={imageSrc(roomMainPhoto(selectedRoom))} alt={selectedRoom.title} className="summary-thumb" />
            <div>
              {renderTitleByProvider(selectedRoom.title, selectedRoom.provider_name)}
              <span>{formatCurrency(selectedRoom.price_per_month)} / month</span>
            </div>
          </div>
          <form className="stack-form" onSubmit={submitBooking}>
            <div className="field-grid two-columns">
              <label className="field-block">
                <span>Move-In Date</span>
                <input name="moveInDate" type="date" value={bookingForm.moveInDate} onChange={onBookingChange} required />
              </label>
              <label className="field-block">
                <span>Move-Out Date</span>
                <input name="moveOutDate" type="date" value={bookingForm.moveOutDate} onChange={onBookingChange} />
              </label>
            </div>
            <label className="field-block">
              <span>Notes</span>
              <textarea name="notes" rows="4" value={bookingForm.notes} onChange={onBookingChange} />
            </label>
            <button className="primary-button medium-submit-button" type="submit" disabled={loadingState.bookingSave}>
              {loadingState.bookingSave ? 'Sending Request' : 'Request Room'}
            </button>
          </form>
        </section>
      </div>
    );
  }

  function renderStudentBookings() {
    return (
      <div className="stack-layout">
        <h2>Bookings</h2>
        <InlineFeedback feedback={feedback} scope="studentBookings" onDismiss={clearFeedback} />
        <div className="cards-grid two-up">
          {studentBookingsVisible.length > 0 ? (
            studentBookingsVisible.map((booking) => (
              <article key={booking.id} className="card booking-card spaced-card">
                <div className="row-between start">
                  <div className="request-room-summary">
                    <img src={imageSrc(booking.main_photo_url)} alt={booking.room_title} className="summary-thumb" />
                    <div>
                      {renderTitleByProvider(booking.room_title, booking.provider_name)}
                    </div>
                  </div>
                  <span className={statusClass(booking.status)}>{statusLabel(booking.status)}</span>
                </div>
                <div className="info-pairs compact-gap">
                  <div><span>Requested</span><strong>{formatDate(booking.requested_at)}</strong></div>
                  <div><span>Move-In Date</span><strong>{formatDate(booking.move_in_date || booking.preferred_move_in_date)}</strong></div>
                </div>
                <div className="button-row wrap-row">
                  <button className="secondary-button" type="button" onClick={() => openBookingDetails(booking)}>
                    View Details
                  </button>
                  {(booking.status === 'rejected' || booking.status === 'denied') && (
                    <button className="danger-button" type="button" onClick={() => hideDeniedBooking(booking.id)}>
                      Delete
                    </button>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="empty-card full-row">No bookings to show</div>
          )}
        </div>
      </div>
    );
  }

  function renderStudentBookingDetails() {
    const booking = selectedBooking;
    const activeTab = pageProps.tab || 'room';
    if (!booking) return <div className="empty-card full-row">Booking details are unavailable</div>;
    const accepted = String(booking.status || '').toLowerCase() === 'accepted';
    const bookingRoom = {
      ...booking,
      title: booking.room_title,
      provider_name: booking.provider_name,
      provider_profile_image_url: booking.provider_profile_image_url,
      provider_phone: booking.provider_phone,
    };

    return (
      <div className="stack-layout narrow-stack raised-page">
        <h2>Details</h2>
        <section className="card spaced-card detail-page-card">
          <div className="row-between start">
            <h2>{booking.room_title || '-'}</h2>
            <span className={statusClass(booking.status)}>{statusLabel(booking.status)}</span>
          </div>
          <div className="detail-photo-grid single-center-photo">
            {(Array.isArray(booking.documentation_urls) && booking.documentation_urls.length > 0
              ? booking.documentation_urls
              : [booking.main_photo_url].filter(Boolean)
            ).slice(0, 1).map((photo, index) => (
              <img key={`${booking.id}-${index}`} src={imageSrc(photo)} alt={`${booking.room_title} ${index + 1}`} className="detail-gallery-image" />
            ))}
          </div>
          <div className="tab-row top-tabs detail-switch-tabs">
            <button type="button" className={`tab-button ${activeTab === 'room' ? 'active' : ''}`} onClick={() => setPageProps((current) => ({ ...current, tab: 'room' }))}>Room</button>
            <button type="button" className={`tab-button ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setPageProps((current) => ({ ...current, tab: 'details' }))}>Details</button>
            <button type="button" className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => { loadBookingIssues(booking.id); setPageProps((current) => ({ ...current, tab: 'requests' })); }}>Requests</button>
          </div>

          {activeTab === 'room' ? (
            <>
              {renderProviderLine(booking.provider_name, booking.provider_profile_image_url, booking.provider_phone, 'detail-provider-line')}
              <div className="detail-meta-grid">
                <div><span>Location</span><strong>{booking.location || '-'}</strong></div>
                <div><span>Price</span><strong>{formatCurrency(booking.price_per_month)}</strong></div>
                <div><span>Type</span><strong>{humanType(booking.allowed_gender)}</strong></div>
              </div>
              <div className="detail-copy-block"><strong>Full Address</strong><p>{booking.address || '-'}</p></div>
              <div className="detail-copy-block"><strong>Description</strong><p>{booking.description || '-'}</p></div>
              {renderFacilitiesSection(bookingRoom)}
              {renderRulesSection(bookingRoom)}
            </>
          ) : null}

          {activeTab === 'details' ? (
            <>
              <div className="detail-meta-grid">
                <div><span>Move In</span><strong>{formatDate(booking.move_in_date || booking.preferred_move_in_date)}</strong></div>
                <div><span>Move Out</span><strong>{formatDate(booking.move_out_date)}</strong></div>
                <div><span>Requested</span><strong>{formatDate(booking.requested_at)}</strong></div>
                {String(booking.status || '').toLowerCase() !== 'pending' && <div><span>Response</span><strong>{formatDate(booking.responded_at)}</strong></div>}
              </div>
              <div className="detail-note-stack">
                <div className="detail-copy-block detail-note-block"><strong>Notes</strong><p>{booking.notes || '-'}</p></div>
              </div>
              {accepted ? (() => {
                const storedRating = Number(booking.student_rating || ratingSubmitted[booking.id] || 0);
                const selectedRating = Number(ratingDrafts[booking.id] ?? storedRating);
                return (
                  <div className="rating-submit-box">
                    <div className="row-between compact-room-top">
                      <strong>{storedRating ? 'Your Rating' : 'Submit Rating'}</strong>
                      {selectedRating ? <span className="rating-selection-copy">{selectedRating}/5 selected</span> : null}
                    </div>
                    <div className="star-rating-row">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`star-rating-button ${value <= selectedRating ? 'selected' : ''}`.trim()}
                          disabled={loadingState.rating}
                          onClick={() => selectRating(booking.id, value)}
                          aria-label={`${value} star rating`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <button className="primary-button small-action-button" type="button" disabled={loadingState.rating || !selectedRating} onClick={() => submitRoomRating(booking)}>
                      {loadingState.rating ? 'Submitting Rating' : storedRating ? 'Edit Rating' : 'Submit Rating'}
                    </button>
                  </div>
                );
              })() : null}
              {String(booking.status || '').toLowerCase() === 'pending' && (
                <button className="danger-button medium-submit-button" type="button" disabled={loadingState.requestAction} onClick={() => cancelBookingRequest(booking)}>Cancel Request</button>
              )}
            </>
          ) : null}

          {activeTab === 'requests' ? (
            <div className="request-panel-stack">
              {accepted ? (
                <form className="stack-form issue-form" onSubmit={submitMaintenanceRequest}>
                  <label className="field-block"><span>Problem Type</span><input value={issueForm.title} onChange={(event) => setIssueForm((current) => ({ ...current, title: event.target.value }))} placeholder="Lamp is off, seat is broken, fading paint..." required /></label>
                  <label className="field-block"><span>Description</span><textarea rows="4" value={issueForm.description} onChange={(event) => setIssueForm((current) => ({ ...current, description: event.target.value }))} placeholder="Explain the problem clearly" /></label>
                  <button className="primary-button medium-submit-button" type="submit" disabled={loadingState.issues}>{loadingState.issues ? 'Submitting' : 'Submit Request'}</button>
                </form>
              ) : <div className="empty-card mini-empty-card">Room problem requests are available after your booking is accepted.</div>}
              <div className="issue-list">
                {bookingIssues.length > 0 ? bookingIssues.map((request) => (
                  <article key={request.id} className="soft-box issue-item">
                    <div className="row-between compact-room-top"><strong>{request.title}</strong><span className={request.status === 'acknowledged' ? 'status-badge accepted' : 'status-badge pending'}>{request.status}</span></div>
                    <p>{request.description || '-'}</p>
                    <small>{formatDateTime(request.created_at)}</small>
                  </article>
                )) : <div className="empty-card mini-empty-card">No room problem requests yet</div>}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  function renderProfilePage() {
    return (
      <div className="stack-layout narrow-stack centered-stack raised-page">
        <h2>Profile</h2>
        <section className="card spaced-card centered-card profile-card">
          <InlineFeedback feedback={feedback} scope="profile" onDismiss={clearFeedback} />
          <form className="stack-form" onSubmit={submitProfile}>
            <div className="profile-top">
              <div className="profile-avatar-panel">
                <img src={imageSrc(profileForm.profileImageUrl)} alt="Profile" className="profile-avatar" />
                <label className="upload-button">
                  Upload From Device
                  <input type="file" accept="image/*" onChange={onProfileImageChange} hidden />
                </label>
              </div>
              <div className="field-grid two-columns profile-fields">
                <label className="field-block">
                  <span>Name</span>
                  <input name="name" value={profileForm.name} onChange={onProfileChange} required />
                </label>
                <label className="field-block">
                  <span className="email-label-row">Email
                    {!profileForm.emailVerified ? (
                      <button type="button" className="email-warning-button" onClick={() => showFeedback('profile', 'error', 'This email is unverified. Press Verify Email to receive a code from Admin in Messages.')}>⚠️</button>
                    ) : <span className="verified-pill">Verified</span>}
                  </span>
                  <input value={profileForm.email} readOnly />
                </label>
                <label className="field-block">
                  <span>Role</span>
                  <input value={humanRole(profileForm.role)} readOnly />
                </label>
                <label className="field-block">
                  <span>Phone Number</span>
                  <input name="phone" value={profileForm.phone} onChange={onProfileChange} />
                </label>
                <label className="field-block">
                  <span>Age</span>
                  <input name="age" type="number" value={profileForm.age} onChange={onProfileChange} />
                </label>
                <label className="field-block">
                  <span>Gender</span>
                  <select name="gender" value={profileForm.gender} onChange={onProfileChange}>
                    <option value="">Select Gender</option>
                    <option value="Man">Man</option>
                    <option value="Woman">Woman</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="button-row compact-action-row profile-action-row profile-action-row--triple">
              <button className="primary-button profile-action-button" type="submit" disabled={loadingState.profileSave}>
                {loadingState.profileSave ? 'Saving Profile' : 'Save Changes'}
              </button>
              {!profileForm.emailVerified ? (
                <>
                  <button className="secondary-button profile-action-button" type="button" disabled={loadingState.emailVerification} onClick={requestEmailVerification}>
                    {loadingState.emailVerification ? 'Sending Code' : 'Verify Email'}
                  </button>
                  {emailCodeRequested ? (
                    <div className="email-code-row">
                      <input value={emailCodeInput} onChange={(event) => setEmailCodeInput(event.target.value)} placeholder="Enter code" />
                      <button className="success-button profile-action-button" type="button" disabled={loadingState.emailVerification} onClick={confirmEmailVerification}>Enter Code</button>
                    </div>
                  ) : null}
                </>
              ) : null}
              <button className="secondary-button profile-action-button" type="button" onClick={() => navigateTo('password')}>
                Edit Password
              </button>
              <button className="danger-button profile-action-button" type="button" disabled={loadingState.deleteAccount} onClick={deleteAccount}>
                {loadingState.deleteAccount ? 'Deleting Account' : 'Delete Account'}
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  function renderPasswordPage() {
    return (
      <div className="stack-layout narrow-stack centered-stack raised-page">
        <h2>Edit Password</h2>
        <section className="card spaced-card centered-card profile-card">
          <InlineFeedback feedback={feedback} scope="password" onDismiss={clearFeedback} />
          <form className="stack-form" onSubmit={submitPassword}>
            <label className="field-block">
              <span>Current Password</span>
              <input name="currentPassword" type="password" value={passwordForm.currentPassword} onChange={onPasswordChange} required />
            </label>
            <label className="field-block">
              <span>New Password</span>
              <input name="newPassword" type="password" value={passwordForm.newPassword} onChange={onPasswordChange} required />
            </label>
            <label className="field-block">
              <span>Re-Enter New Password</span>
              <input name="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={onPasswordChange} required />
            </label>
            <button className="primary-button medium-submit-button" type="submit" disabled={loadingState.passwordSave}>
              {loadingState.passwordSave ? 'Saving Password' : 'Submit'}
            </button>
          </form>
        </section>
      </div>
    );
  }

  function renderProviderRooms() {
    const tab = pageProps.tab || 'published';
    const publishedRooms = providerRooms.filter((room) => String(room.listing_status || 'published') !== 'draft');
    const draftRooms = providerRooms.filter((room) => String(room.listing_status || 'published') === 'draft');
    const activeRooms = tab === 'drafts' ? draftRooms : publishedRooms;

    return (
      <div className="stack-layout">
        <div className="title-row">
          <h2>My Rooms</h2>
          <button className="secondary-button small-action-button submit-room-button" type="button" onClick={startRoomSubmission}>
            Submit Room
          </button>
        </div>
        <InlineFeedback feedback={feedback} scope="providerRooms" onDismiss={clearFeedback} />
        <div className="tab-row request-tabs">
          <button type="button" className={`tab-button ${tab === 'published' ? 'active' : ''}`} onClick={() => setPageProps({ tab: 'published' })}>
            Published ({publishedRooms.length})
          </button>
          <button type="button" className={`tab-button ${tab === 'drafts' ? 'active' : ''}`} onClick={() => setPageProps({ tab: 'drafts' })}>
            Drafts ({draftRooms.length})
          </button>
        </div>
        <div className="cards-grid two-up">
          {activeRooms.length > 0 ? (
            activeRooms.map((room) => (
              <article key={room.id} className="card room-list-card spaced-card">
                <div className="request-room-summary">
                  <img src={imageSrc(roomMainPhoto(room))} alt={room.title} className="summary-thumb large-thumb" />
                  <div className="compact-room-copy grow-copy">
                    <div className="row-between compact-room-top">
                      <strong>{room.title}</strong>
                      <span>{listingStatusLabel(room.listing_status)}</span>
                    </div>
                    <span>{room.location}</span>
                    <span>{room.remaining_slots} of {room.room_count} slots available</span>
                  </div>
                </div>
                <div className="button-row wrap-row">
                  <button className="secondary-button" type="button" onClick={() => openProviderRoomDetails(room)}>
                    View Room
                  </button>
                  <button className="secondary-button" type="button" onClick={() => startRoomEdit(room)}>
                    Edit Room
                  </button>
                  <button className="secondary-button" type="button" onClick={() => openProviderRoomStatus(room)}>
                    Room Status
                  </button>
                  <button className="secondary-button" type="button" onClick={() => shareRoom(room)}>
                    Share
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-card full-row">{tab === 'drafts' ? 'No draft rooms yet' : 'No published rooms yet'}</div>
          )}
        </div>
      </div>
    );
  }

  function renderRoomFormPage(isEditing) {
    return (
      <div className="stack-layout narrow-stack">
        <h2>{isEditing ? 'Edit Room' : 'Submit Room'}</h2>
        <section className="card spaced-card">
          <form className="stack-form" onSubmit={submitRoom}>
            <div className="field-grid two-columns">
              <label className="field-block">
                <span>Name</span>
                <input name="name" value={roomForm.name} onChange={onRoomFormChange} required />
              </label>
              <label className="field-block">
                <span>Location</span>
                <input name="location" value={roomForm.location} onChange={onRoomFormChange} required />
              </label>
              <label className="field-block">
                <span>Nearby Campus</span>
                <input name="campusName" value={roomForm.campusName} onChange={onRoomFormChange} />
              </label>
              <label className="field-block">
                <span>Monthly Price</span>
                <input name="monthlyPrice" type="text" inputMode="numeric" value={roomForm.monthlyPrice} onChange={onRoomFormChange} required />
              </label>
              <label className="field-block">
                <span>Availability</span>
                <input name="availability" type="date" value={roomForm.availability} onChange={onRoomFormChange} />
              </label>
              <label className="field-block">
                <span>Type</span>
                <select name="type" value={roomForm.type} onChange={onRoomFormChange}>
                  <option value="any">Any</option>
                  <option value="male">Men's Only</option>
                  <option value="female">Women's Only</option>
                </select>
              </label>
              <label className="field-block">
                <span>Amount</span>
                <input name="amount" type="number" min="1" value={roomForm.amount} onChange={onRoomFormChange} required />
              </label>
              <label className="field-block map-link-field">
                <span>Google Maps Link</span>
                <input name="mapLink" type="url" value={roomForm.mapLink} onChange={onRoomFormChange} placeholder="Paste regular Google Maps share link" />
              </label>
            </div>
            <label className="field-block">
              <span>Full Address</span>
              <input name="fullAddress" value={roomForm.fullAddress} onChange={onRoomFormChange} required />
            </label>
            <p className="helper-copy map-helper-copy">Tip: open the place in Google Maps, press Share, then paste the regular share link above. Coordinates are no longer required.</p>
            <label className="field-block">
              <span>Description</span>
              <textarea name="description" rows="5" value={roomForm.description} onChange={onRoomFormChange} required />
            </label>
            <div className="stack-form compact-gap room-media-block">
              <span className="field-title">Photo Gallery</span>
              <p className="helper-copy">The first photo will become the main room photo in search results.</p>
              <label className="upload-button inline-upload">
                Upload From Device
                <input type="file" accept="image/*" multiple onChange={onRoomImagesChange} hidden />
              </label>
              {roomForm.documentations.length > 0 && (
                <div className="photo-preview-grid">
                  {roomForm.documentations.map((photo, index) => (
                    <div key={`${photo}-${index}`} className="single-photo-preview">
                      <img src={imageSrc(photo)} alt={`Documentation ${index + 1}`} className="single-photo-preview__image" />
                      <span className="photo-order-badge">{index === 0 ? 'Main' : index + 1}</span>
                      <button type="button" className="photo-remove-button" onClick={() => removeRoomImage(index)}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="stack-form compact-gap room-facilities-block">
              <span className="field-title">Facilities Checklist</span>
              <p className="helper-copy">Select every facility available for this room or kos.</p>
              <div className="facility-form-grid">
                {facilityGroups.map((group) => (
                  <div key={group.title} className="facility-form-group">
                    <strong>{group.title}</strong>
                    <div className="facility-checkbox-list">
                      {group.items.map((item) => (
                        <label key={item} className="facility-checkbox">
                          <input type="checkbox" checked={roomForm.amenities.includes(item)} onChange={() => toggleFacility(item)} />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="stack-form compact-gap room-rules-block">
              <span className="field-title">Room Rules</span>
              <p className="helper-copy">Select the rules students must follow when renting this room.</p>
              <div className="rules-checkbox-grid">
                {roomRuleSuggestions.map((rule) => (
                  <label key={rule} className="facility-checkbox">
                    <input type="checkbox" checked={roomForm.rules.includes(rule)} onChange={() => toggleRule(rule)} />
                    <span>{rule}</span>
                  </label>
                ))}
              </div>
            </div>
            <InlineFeedback feedback={feedback} scope="roomForm" onDismiss={clearFeedback} />
            <div className="button-row wrap-row room-submit-row">
              <button className="secondary-button" type="submit" value="draft" disabled={loadingState.roomSave}>
                {loadingState.roomSave ? 'Saving Room' : 'Save as Draft'}
              </button>
              <button className="primary-button" type="submit" value="published" disabled={loadingState.roomSave}>
                {loadingState.roomSave ? 'Saving Room' : isEditing ? 'Save & Publish' : 'Submit Room'}
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  function renderProviderRequests() {
    const tab = pageProps.tab || 'active';
    const activeList = tab === 'history' ? providerRequestHistory : providerActiveRequests;

    return (
      <div className="stack-layout">
        <h2>Requests</h2>
        <InlineFeedback feedback={feedback} scope="providerRequests" onDismiss={clearFeedback} />
        <div className="tab-row request-tabs">
          <button
            type="button"
            className={`tab-button ${tab === 'active' ? 'active' : ''}`}
            onClick={() => setPageProps({ tab: 'active' })}
          >
            Active Requests
          </button>
          <button
            type="button"
            className={`tab-button ${tab === 'history' ? 'active' : ''}`}
            onClick={() => setPageProps({ tab: 'history' })}
          >
            History
          </button>
        </div>
        <div className="cards-grid two-up">
          {activeList.length > 0 ? (
            activeList.map((booking) => (
              <article key={booking.id} className="card request-card spaced-card request-list-card">
                <div className="row-between start request-card-header">
                  <div className="request-card-title">
                    <img src={imageSrc(booking.main_photo_url)} alt={booking.room_title} className="summary-thumb large-thumb" />
                    <div>
                      <h3>{booking.room_title}</h3>
                      <span>{booking.student_name}</span>
                    </div>
                  </div>
                  <span className={statusClass(booking.status)}>{requestStatusLabel(booking.status)}</span>
                </div>
                <div className="info-pairs compact-gap">
                  <div><span>Requested</span><strong>{formatDate(booking.requested_at)}</strong></div>
                  <div><span>Move-In Date</span><strong>{formatDate(booking.move_in_date || booking.preferred_move_in_date)}</strong></div>
                </div>
                <button className="secondary-button" type="button" onClick={() => openRequestDetails(booking, 'providerRequests')}>
                  View Details
                </button>
              </article>
            ))
          ) : (
            <div className="empty-card full-row">{tab === 'history' ? 'No request history yet' : 'No active requests right now'}</div>
          )}
        </div>
      </div>
    );
  }

  function renderCompareRoomsPage() {
    return (
      <div className="stack-layout">
        <div className="title-row">
          <h2>Compare Rooms</h2>
          {comparisonRoomIds.length > 0 ? <button className="secondary-button small-action-button" type="button" onClick={clearComparison}>Clear</button> : null}
        </div>
        <InlineFeedback feedback={feedback} scope="compareRooms" onDismiss={clearFeedback} />
        <p className="helper-copy">Choose up to two rooms from room details, then compare price, rating, facilities, location, rules, and availability.</p>
        {comparisonRooms.length > 0 ? (
          <div className="compare-grid">
            {comparisonRooms.map((room) => (
              <article key={room.id} className="card compare-card spaced-card">
                <img src={imageSrc(roomMainPhoto(room) || room.main_photo_url)} alt={room.title} className="room-cover compare-cover" />
                {renderTitleByProvider(room.title, room.provider_name)}
                <div className="detail-meta-grid">
                  <div><span>Price</span><strong>{formatCurrency(room.price_per_month)}</strong></div>
                  <div><span>Rating</span><strong>{Number(room.average_rating || 0).toFixed(1)} ({room.rating_count || 0})</strong></div>
                  <div><span>Location</span><strong>{room.location || '-'}</strong></div>
                  <div><span>Slots</span><strong>{room.remaining_slots ?? room.room_count ?? '-'}</strong></div>
                  <div><span>Type</span><strong>{humanType(room.allowed_gender)}</strong></div>
                </div>
                {renderAmenitiesPreview(room)}
                {selectedRules(room).length > 0 ? <div className="rule-preview-row">{selectedRules(room).slice(0, 4).map((rule) => <span key={rule} className="rule-pill">• {rule}</span>)}</div> : null}
                <div className="button-row wrap-row">
                  <button className="secondary-button" type="button" onClick={() => openRoomDetails(room.id, 'compareRooms')}>View Details</button>
                  <button className="danger-button" type="button" onClick={() => toggleCompareRoom(room)}>Remove</button>
                </div>
              </article>
            ))}
            {comparisonRooms.length < 2 ? <div className="empty-card compare-placeholder">Open another room detail page and press Compare to add one more room.</div> : null}
          </div>
        ) : (
          <div className="empty-card full-row">No rooms selected yet. Open a room detail page and press Compare.</div>
        )}
      </div>
    );
  }

  function renderNotificationsPage() {
    return (
      <div className="stack-layout narrow-stack">
        <div className="title-row">
          <h2>Notifications</h2>
          <button className="secondary-button small-action-button" type="button" onClick={markAllNotificationsRead}>Mark All Read</button>
        </div>
        <InlineFeedback feedback={feedback} scope="notifications" onDismiss={clearFeedback} />
        <section className="card spaced-card">
          <div className="notification-list notification-list-page">
            {notifications.length > 0 ? notifications.map((notification) => (
              <button key={notification.id} type="button" className={`notification-item ${notification.is_read ? '' : 'unread'}`.trim()} onClick={() => openNotification(notification)}>
                <strong>{notification.title}</strong>
                <span>{notification.message}</span>
                <small>{formatDateTime(notification.created_at)}</small>
              </button>
            )) : <div className="empty-card full-row">No notifications yet</div>}
          </div>
        </section>
      </div>
    );
  }

  function renderMessagesPage() {
    const adminConversation = adminMessages.length > 0 ? { id: 'admin-email', room_title: 'KosanKu Admin', provider_name: 'Admin', student_name: 'Admin', main_photo_url: '' } : null;
    const conversationItems = adminConversation ? [adminConversation, ...conversations] : conversations;
    const activeId = activeConversation?.id || pageProps.conversationId;
    const selectedConversation = conversationItems.find((conversation) => conversation.id === activeId) || activeConversation;

    return (
      <div className="stack-layout messages-page">
        <h2>Messages</h2>
        <InlineFeedback feedback={feedback} scope="messages" onDismiss={clearFeedback} />
        <section className="messages-layout">
          <aside className="card conversation-list-card">
            <div className="conversation-list-header"><strong>Conversations</strong><button type="button" className="link-button" onClick={loadConversations}>Refresh</button></div>
            <div className="conversation-list">
              {conversationItems.length > 0 ? conversationItems.map((conversation) => {
                const isAdmin = conversation.id === 'admin-email';
                const otherName = isAdmin ? 'Admin' : (session.user.role === 'student' ? conversation.provider_name : conversation.student_name);
                const avatar = isAdmin ? '' : (session.user.role === 'student' ? conversation.provider_profile_image_url : conversation.student_profile_image_url);
                return (
                  <button key={conversation.id} type="button" className={`conversation-item ${selectedConversation?.id === conversation.id ? 'active' : ''}`.trim()} onClick={() => { if (isAdmin) { setActiveConversation(conversation); setMessages(adminMessages); } else { loadMessages(conversation.id); } }}>
                    <img src={imageSrc(avatar || conversation.main_photo_url)} alt={otherName || 'Conversation'} className="conversation-avatar" />
                    <div className="conversation-copy"><strong>{otherName || '-'}</strong><span>{conversation.room_title || '-'}</span><small>{isAdmin ? adminMessages[0]?.body : (conversation.last_message || 'No messages yet')}</small></div>
                    {Number(conversation.unread_count || 0) > 0 ? <span className="chat-unread-pill">{conversation.unread_count}</span> : null}
                  </button>
                );
              }) : <div className="empty-card mini-empty-card">No conversations yet</div>}
            </div>
          </aside>
          <section className="card chat-thread-card">
            {selectedConversation ? (
              <>
                <div className="chat-thread-header"><img src={imageSrc(selectedConversation.main_photo_url)} alt={selectedConversation.room_title} className="summary-thumb" /><div><strong>{selectedConversation.room_title || '-'}</strong><span>{session.user.role === 'student' ? selectedConversation.provider_name : selectedConversation.student_name}</span></div></div>
                <div className="chat-messages">
                  {messages.length > 0 ? messages.map((message) => {
                    const mine = message.sender_id === session.user.id;
                    return <div key={message.id} className={`message-row ${mine ? 'mine' : 'theirs'}`.trim()}><div className="message-bubble"><p>{message.body}</p><small>{formatDateTime(message.created_at)}</small></div></div>;
                  }) : <div className="empty-card mini-empty-card">Open a conversation or send the first message</div>}
                </div>
                {selectedConversation.id === 'admin-email' ? (
                  <div className="empty-card mini-empty-card">Admin verification messages are read-only.</div>
                ) : (
                  <form className="chat-input-row" onSubmit={submitChatMessage}>
                    <input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="Type your message..." />
                    <button className="primary-button" type="submit" disabled={loadingState.chat || !chatDraft.trim()}>Send</button>
                  </form>
                )}
              </>
            ) : <div className="empty-card full-row">Select a conversation to start chatting</div>}
          </section>
        </section>
      </div>
    );
  }


  function renderRoomMiniList(items, emptyText) {
    return (
      <div className="cards-grid three-up spaced-top">
        {items.length > 0 ? items.map((room) => (
          <article key={`${room.id}-${room.viewed_at || 'fav'}`} className="card room-card result-card">
            <img className="room-cover" src={imageSrc(roomMainPhoto(room) || room.main_photo_url)} alt={room.title} />
            <div className="room-card-body">
              {renderTitleByProvider(room.title, room.provider_name)}
              <strong>{formatCurrency(room.price_per_month)} / month</strong>
              <span className="muted-line">{room.location || '-'}</span>
              {room.viewed_at ? <span className="muted-line">Viewed {formatDateTime(room.viewed_at)}</span> : null}
              <div className="button-row wrap-row room-card-actions">
                <button className="secondary-button" type="button" onClick={() => openRoomDetails(room.id, page)}>
                  View Details
                </button>
                <button className="secondary-button" type="button" onClick={() => shareRoom(room)}>
                  Share
                </button>
                {session?.user?.role === 'student' ? (
                  <button className="wishlist-button" type="button" onClick={() => toggleFavorite(room)}>
                    {favoriteIds.has(room.id) ? '♥ Added to Wishlist' : '♡ Wishlist'}
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        )) : <div className="empty-card full-row">{emptyText}</div>}
      </div>
    );
  }

  function renderWishlistPage() {
    return (
      <div className="stack-layout">
        <h2>Wishlist</h2>
        <InlineFeedback feedback={feedback} scope="wishlist" onDismiss={clearFeedback} />
        {renderRoomMiniList(favorites, 'No rooms in your wishlist yet')}
      </div>
    );
  }

  function renderViewingHistoryPage() {
    return (
      <div className="stack-layout">
        <div className="title-row">
          <h2>Viewing History</h2>
          {viewingHistory.length > 0 ? (
            <button className="secondary-button small-action-button" type="button" onClick={() => {
              saveViewingHistory(session.user.id, []);
              setViewingHistory([]);
            }}>
              Clear History
            </button>
          ) : null}
        </div>
        {renderRoomMiniList(viewingHistory, 'No room viewing history yet')}
      </div>
    );
  }

  function renderOnboardingPage() {
    const isStudent = session?.user?.role === 'student';
    const steps = isStudent
      ? [
        { title: 'Search and filter rooms', text: 'Use location, price, move-in date, type, and facilities to narrow down kos options.' },
        { title: 'Save rooms to Wishlist', text: 'Tap the wishlist button on rooms you like, then revisit them from the Wishlist tab.' },
        { title: 'Open details, gallery, map, and share link', text: 'Room details include photos, facilities, location map, and a shareable link that opens directly to the room.' },
        { title: 'Message and book', text: 'Chat with the provider before booking, then submit your room request when ready.' },
        { title: 'Track updates', text: 'Use notifications, messages, bookings, and viewing history to follow everything.' },
      ]
      : [
        { title: 'Create rooms as drafts or publish them', text: 'Save rooms as drafts while you are still preparing details, then publish when ready.' },
        { title: 'Manage room details', text: 'Use View Room to preview a listing, Edit Room to update it, and Room Status to manage accepted students.' },
        { title: 'Use photos, facilities, and maps', text: 'Add room photos, select facilities, and add latitude/longitude so students can see a real map.' },
        { title: 'Respond to requests and messages', text: 'Use Requests, Messages, and Notifications to communicate with students quickly.' },
        { title: 'Check history', text: 'Use Viewing History to quickly return to room pages you have opened.' },
      ];

    return (
      <div className="stack-layout narrow-stack centered-stack raised-page">
        <section className="card onboarding-card">
          <div className="brand-lockup">
            <div className="brand-title-row brand-title-row--center">
              <HouseMark />
              <h1 className="brand-mark">Welcome, {session?.user?.name}</h1>
            </div>
            <p className="brand-motto">A quick guide for your {isStudent ? 'student' : 'provider'} account</p>
          </div>
          <div className="onboarding-grid">
            {steps.map((step, index) => (
              <article key={step.title} className="soft-box onboarding-step">
                <span className="onboarding-number">{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="button-row center-actions">
            <button className="primary-button medium-submit-button" type="button" onClick={finishOnboarding}>Start Using KosanKu</button>
          </div>
        </section>
      </div>
    );
  }


  function renderProviderIssuePanel(booking) {
    return (
      <div className="request-panel-stack provider-issue-panel">
        <div className="row-between compact-room-top"><h3>Room Problem Requests</h3><button type="button" className="link-button" onClick={() => loadBookingIssues(booking.id)}>Refresh</button></div>
        {bookingIssues.length > 0 ? bookingIssues.map((request) => (
          <article key={request.id} className="soft-box issue-item">
            <div className="row-between compact-room-top">
              <strong>{request.title}</strong>
              <span className={request.status === 'acknowledged' ? 'status-badge accepted' : 'status-badge pending'}>{request.status}</span>
            </div>
            <p>{request.description || '-'}</p>
            <small>{formatDateTime(request.created_at)}</small>
            {request.status !== 'acknowledged' ? (
              <button className="success-button small-action-button" type="button" disabled={loadingState.issues} onClick={() => acknowledgeMaintenanceRequest(request)}>✓ Acknowledge</button>
            ) : null}
          </article>
        )) : <div className="empty-card mini-empty-card">No problem requests for this booking yet</div>}
      </div>
    );
  }

  function renderProviderRequestDetails() {
    const booking = selectedBooking;
    const isRoomStatusDetails = pageProps.origin === 'providerRoomStatus';
    if (!booking) return <div className="empty-card full-row">Request details are unavailable</div>;

    if (isRoomStatusDetails) {
      return (
        <div className="stack-layout narrow-stack raised-page">
          <h2>Details</h2>
          <section className="card spaced-card detail-page-card">
            <div className="student-detail-line student-detail-line-large">
              <img
                src={imageSrc(booking.student_profile_image_url || booking.profile_image_url)}
                alt={booking.student_name}
                className="provider-detail-avatar provider-detail-avatar-large"
              />
              <div className="student-detail-copy">
                <strong>{booking.student_name || '-'}</strong>
              </div>
            </div>
            <div className="detail-meta-grid">
              <div><span>Age</span><strong>{booking.student_age || '-'}</strong></div>
              <div><span>Gender</span><strong>{humanGender(booking.student_gender)}</strong></div>
              <div><span>Phone Number</span><strong>{booking.student_phone || '-'}</strong></div>
              <div><span>Move In</span><strong>{formatDate(booking.move_in_date || booking.preferred_move_in_date)}</strong></div>
              <div><span>Move Out</span><strong>{formatDate(booking.move_out_date)}</strong></div>
            </div>
            <InlineFeedback feedback={feedback} scope="providerRequestDetails" onDismiss={clearFeedback} />
            {renderProviderIssuePanel(booking)}
            <div className="button-row wrap-row">
              <button className="danger-button" type="button" disabled={loadingState.requestAction} onClick={() => removeStudentFromRoomStatus(booking)}>
                {loadingState.requestAction ? 'Deleting Student' : 'Delete Student'}
              </button>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="stack-layout narrow-stack raised-page">
        <h2>Details</h2>
        <section className="card spaced-card detail-page-card">
          <div className="row-between start">
            <h2>{booking.room_title}</h2>
            <span className={statusClass(booking.status)}>{requestStatusLabel(booking.status)}</span>
          </div>
          <div className="detail-photo-grid single-center-photo">
            {[booking.main_photo_url].filter(Boolean).slice(0, 1).map((photo, index) => (
              <img key={`${booking.id}-${index}`} src={imageSrc(photo)} alt={`${booking.room_title} ${index + 1}`} className="detail-gallery-image" />
            ))}
          </div>
          <div className="student-detail-line">
            <img
              src={imageSrc(booking.student_profile_image_url || booking.profile_image_url)}
              alt={booking.student_name}
              className="provider-detail-avatar"
            />
            <div className="student-detail-copy">
              <strong>{booking.student_name || '-'}</strong>
              <span>{booking.student_phone || '-'}</span>
            </div>
          </div>
          <div className="detail-meta-grid">
            <div><span>Age</span><strong>{booking.student_age || '-'}</strong></div>
            <div><span>Gender</span><strong>{humanGender(booking.student_gender)}</strong></div>
            <div><span>Move In</span><strong>{formatDate(booking.move_in_date || booking.preferred_move_in_date)}</strong></div>
            <div><span>Move Out</span><strong>{formatDate(booking.move_out_date)}</strong></div>
            {String(booking.status || '').toLowerCase() !== 'pending' && (
              <div><span>Response</span><strong>{formatDate(booking.responded_at)}</strong></div>
            )}
          </div>
          <div className="detail-note-stack">
            <div className="detail-copy-block detail-note-block">
              <strong>Notes</strong>
              <p>{booking.notes || '-'}</p>
            </div>
          </div>
          {String(booking.status || '').toLowerCase() === 'accepted' ? renderProviderIssuePanel(booking) : null}
          {booking.status === 'pending' ? (
            <>
              <InlineFeedback feedback={feedback} scope="providerRequestDetails" onDismiss={clearFeedback} />
              <div className="button-row wrap-row">
                <button className="success-button" type="button" disabled={loadingState.requestAction} onClick={() => acceptOrDenyBooking(booking, 'accepted')}>
                  Accept
                </button>
                <button className="danger-button" type="button" disabled={loadingState.requestAction} onClick={() => acceptOrDenyBooking(booking, 'denied')}>
                  Deny
                </button>
              </div>
            </>
          ) : null}
        </section>
      </div>
    );
  }

  function renderProviderRoomStatus() {
    const room = pageProps.room;
    if (!room) return <div className="empty-card full-row">Room details are unavailable</div>;
    const residents = providerRoomResidents(room.id);

    return (
      <div className="stack-layout">
        <h2>Room Status</h2>
        <InlineFeedback feedback={feedback} scope="providerRoomStatus" onDismiss={clearFeedback} />
        <div className="cards-grid two-up">
          {residents.length > 0 ? (
            residents.map((booking) => (
              <article key={booking.id} className="card resident-card spaced-card">
                <div className="resident-row">
                  <img
                    src={imageSrc(booking.student_profile_image_url || booking.profile_image_url)}
                    alt={booking.student_name}
                    className="resident-avatar"
                  />
                  <div className="resident-copy">
                    <div className="row-between compact-room-top">
                      <strong>{booking.student_name}</strong>
                      <span>{formatDate(booking.move_in_date || booking.preferred_move_in_date)} - {formatDate(booking.move_out_date)}</span>
                    </div>
                  </div>
                </div>
                <button className="secondary-button" type="button" onClick={() => openRequestDetails(booking, 'providerRoomStatus')}>
                  View Details
                </button>
              </article>
            ))
          ) : (
            <div className="empty-card full-row">No students are staying in this room yet</div>
          )}
        </div>
      </div>
    );
  }

  function renderPageContent() {
    if (!session) {
      if (page === 'roomDetails' && selectedRoom) return renderRoomDetails();
      return renderAuthPage();
    }

    switch (page) {
      case 'home':
        return renderHome();
      case 'onboarding':
        return renderOnboardingPage();
      case 'studentSearch':
        return renderSearchPage('student');
      case 'providerSearch':
        return renderSearchPage('provider');
      case 'roomDetails':
        return renderRoomDetails();
      case 'bookingRequest':
        return renderBookingRequestPage();
      case 'studentBookings':
        return renderStudentBookings();
      case 'wishlist':
        return renderWishlistPage();
      case 'compareRooms':
        return renderCompareRoomsPage();
      case 'viewingHistory':
        return renderViewingHistoryPage();
      case 'studentBookingDetails':
        return renderStudentBookingDetails();
      case 'profile':
        return renderProfilePage();
      case 'password':
        return renderPasswordPage();
      case 'providerRooms':
        return renderProviderRooms();
      case 'providerRoomCreate':
        return renderRoomFormPage(false);
      case 'providerRoomEdit':
        return renderRoomFormPage(true);
      case 'providerRequests':
        return renderProviderRequests();
      case 'providerRequestDetails':
        return renderProviderRequestDetails();
      case 'providerRoomStatus':
        return renderProviderRoomStatus();
      case 'messages':
        return renderMessagesPage();
      case 'notifications':
        return renderNotificationsPage();
      default:
        return renderHome();
    }
  }

  if (booting) {
    return <div className="boot-shell">Loading KosanKu</div>;
  }

  return (
    <div className="app-shell">
      <FloatingFeedback feedback={feedback} onDismiss={clearFeedback} />
      {renderHeader()}
      <main key={pageAnimationKey} className={`page-shell ${session ? 'private-shell' : ''} page-enter`}>
        {renderBackButton()}
        {renderPageContent()}
      </main>
    </div>
  );
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default App;
