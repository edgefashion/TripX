// ============================================
// TripGenius AI — All MongoDB Models
// ============================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ===== 1. USER MODEL =====
const UserSchema = new mongoose.Schema({
  name:     { type: String, required: [true, 'Naam zaroori hai'], trim: true },
  email:    { type: String, required: [true, 'Email zaroori hai'], unique: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Valid email daalo'] },
  password: { type: String, required: [true, 'Password zaroori hai'], minlength: [8, 'Min 8 characters'], select: false },
  role:     { type: String, enum: ['traveler','owner','provider','admin'], default: 'traveler' },
  phone:    { type: String, default: '' },
  avatar:   { type: String, default: '' },
  preferences: {
    maxBudget:   { type: Number, default: 15000 },
    stayType:    { type: String, default: 'homestay' },
    travelStyle: { type: String, default: 'budget' },
    favMoods:    [String],
  },
  savedTrips:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Trip' }],
  wishlist:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Destination' }],
  isVerified:  { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true },
  lastLogin:   Date,
}, { timestamps: true });

// Password hash karo save se pehle
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Password compare method
UserSchema.methods.matchPassword = async function(entered) {
  return await bcrypt.compare(entered, this.password);
};

// JWT token generate karo
UserSchema.methods.getJWT = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};


// ===== 2. DESTINATION MODEL =====
const DestinationSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true },
  state:       { type: String, required: true },
  emoji:       { type: String, default: '🏖️' },
  description: String,
  type:        { type: String, enum: ['beach','mountains','heritage','adventure','peaceful','party','family','culture'] },
  tags:        [String],
  budgetRange: { min: Number, max: Number },
  crowdLevel:  { type: String, enum: ['low','medium','high'], default: 'medium' },
  scores: {
    budget:  { type: Number, default: 70 },
    crowd:   { type: Number, default: 50 },
    weather: { type: Number, default: 70 },
    vibe:    { type: Number, default: 80 },
  },
  season: {
    best:        String,
    avoid:       String,
    avoidReason: String,
  },
  images:       [String],
  avgRating:    { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });


// ===== 3. TRIP MODEL =====
const TripSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  destination: { type: String, required: true },
  budget:      { type: Number, required: true },
  people:      { type: Number, required: true, min: 1 },
  days:        { type: Number, required: true, min: 1 },
  mood:        { type: String, required: true },
  aiPlan:      String,
  budgetBreakdown: {
    transport:  Number,
    stay:       Number,
    food:       Number,
    activities: Number,
    rides:      Number,
    buffer:     Number,
    total:      Number,
  },
  itinerary: [{
    day:        Number,
    title:      String,
    activities: [String],
  }],
  status:      { type: String, enum: ['planned','active','completed'], default: 'planned' },
  isGroupTrip: { type: Boolean, default: false },
  group:       { type: mongoose.Schema.Types.ObjectId, ref: 'GroupTrip' },
}, { timestamps: true });


// ===== 4. ROOM MODEL =====
const RoomSchema = new mongoose.Schema({
  owner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:        { type: String, required: true, trim: true },
  description:  String,
  type:         { type: String, enum: ['homestay','hostel','private','dorm','guesthouse'], required: true },
  destination:  { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' },
  location: {
    address: String,
    city:    String,
    state:   String,
    pincode: String,
    lat:     Number,
    lng:     Number,
  },
  pricePerNight: { type: Number, required: true },
  amenities:     [String],
  images:        [String],
  maxGuests:     { type: Number, default: 2 },
  availability:  [{ date: Date, isBooked: { type: Boolean, default: false } }],
  avgRating:     { type: Number, default: 0 },
  totalReviews:  { type: Number, default: 0 },
  totalBookings: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  commissionPct: { type: Number, default: 10 },
  status:        { type: String, enum: ['active','inactive','pending'], default: 'pending' },
}, { timestamps: true });


// ===== 5. RESTAURANT MODEL =====
const RestaurantSchema = new mongoose.Schema({
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name:        { type: String, required: true, trim: true },
  type:        { type: String, enum: ['restaurant','cafe','streetfood','local','bakery'], required: true },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' },
  city:        String,
  description: String,
  speciality:  [String],
  priceRange:  { min: Number, max: Number },
  emoji:       { type: String, default: '🍽️' },
  images:      [String],
  openHours:   { from: String, to: String },
  avgRating:   { type: Number, default: 0 },
  totalReviews:{ type: Number, default: 0 },
  isVerified:  { type: Boolean, default: false },
  status:      { type: String, enum: ['active','inactive','pending'], default: 'active' },
}, { timestamps: true });


// ===== 6. RIDE MODEL =====
const RideSchema = new mongoose.Schema({
  provider:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String, required: true },
  type:        { type: String, enum: ['rental','taxi','auto','shared'], required: true },
  vehicleType: String,
  emoji:       { type: String, default: '🚗' },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' },
  city:        String,
  pricePerDay: Number,
  pricePerKm:  Number,
  priceFlat:   Number,
  isAvailable: { type: Boolean, default: true },
  avgRating:   { type: Number, default: 0 },
  totalReviews:{ type: Number, default: 0 },
  commissionPct:{ type: Number, default: 15 },
  status:      { type: String, enum: ['active','inactive','pending'], default: 'active' },
}, { timestamps: true });


// ===== 7. BOOKING MODEL =====
const BookingSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:          { type: String, enum: ['room','ride'], required: true },
  room:          { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  ride:          { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' },
  checkIn:       Date,
  checkOut:      Date,
  guests:        { type: Number, default: 1 },
  totalAmount:   { type: Number, required: true },
  commissionAmt: Number,
  ownerAmount:   Number,
  status:        { type: String, enum: ['pending','confirmed','rejected','cancelled','completed'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending','paid','refunded'], default: 'pending' },
  paymentId:     String,
  notes:         String,
  cancelReason:  String,
}, { timestamps: true });


// ===== 8. REVIEW MODEL =====
const ReviewSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:     { type: String, enum: ['room','restaurant','destination','ride'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  rating:   { type: Number, required: true, min: 1, max: 5 },
  comment:  String,
  images:   [String],
  isVerified:{ type: Boolean, default: false },
}, { timestamps: true });


// ===== 9. GROUP TRIP MODEL =====
const GroupTripSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  creator:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name:     String,
    joinedAt: { type: Date, default: Date.now },
  }],
  destination: String,
  startDate:   Date,
  endDate:     Date,
  totalBudget: Number,
  expenses: [{
    description: String,
    amount:      Number,
    paidBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paidByName:  String,
    emoji:       String,
    splitAmong:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt:   { type: Date, default: Date.now },
  }],
  itinerary: [{
    day:        Number,
    title:      String,
    activities: [String],
  }],
  notes: [{
    text:       String,
    createdBy:  String,
    createdAt:  { type: Date, default: Date.now },
  }],
  status: { type: String, enum: ['planning','active','completed'], default: 'planning' },
}, { timestamps: true });


// ===== 10. WISHLIST MODEL =====
const WishlistSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  destinations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Destination' }],
  rooms:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'Room' }],
}, { timestamps: true });


// ===== EXPORT ALL MODELS =====
module.exports = {
  User:        mongoose.model('User', UserSchema),
  Destination: mongoose.model('Destination', DestinationSchema),
  Trip:        mongoose.model('Trip', TripSchema),
  Room:        mongoose.model('Room', RoomSchema),
  Restaurant:  mongoose.model('Restaurant', RestaurantSchema),
  Ride:        mongoose.model('Ride', RideSchema),
  Booking:     mongoose.model('Booking', BookingSchema),
  Review:      mongoose.model('Review', ReviewSchema),
  GroupTrip:   mongoose.model('GroupTrip', GroupTripSchema),
  Wishlist:    mongoose.model('Wishlist', WishlistSchema),
};
