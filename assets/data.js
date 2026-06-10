/* ============================================================================
   Coverly — Data Layer
   All Supabase calls go through these typed helpers.
   Feature agents import window.COV.data.* to build their screens.
   ============================================================================ */
(function () {
  'use strict';

  /* ---- Supabase client (same project as Mesa) ---- */
  var SUPABASE_URL = 'https://durugcxsakdbgimgkyiw.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_rfZYlRhgpU23UJHox-tpHw_142Q3U2V';

  var sb = null;
  if (window.supabase && window.supabase.createClient) {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'coverly-auth' },
    });
  } else {
    console.error('[coverly] supabase-js not loaded before data.js');
  }

  /* ---- generic error helper ---- */
  function ok(res) {
    if (res.error) throw res.error;
    return res.data;
  }

  /* ======================================================================
     AUTH
  ====================================================================== */
  var auth = {
    signUp: function (email, pw) {
      return sb.auth.signUp({ email: email, password: pw });
    },
    signIn: function (email, pw) {
      return sb.auth.signInWithPassword({ email: email, password: pw });
    },
    signOut: function () {
      return sb.auth.signOut();
    },
    getSession: function () {
      return sb.auth.getSession();
    },
    onAuthStateChange: function (cb) {
      return sb.auth.onAuthStateChange(cb);
    },
  };

  /* ======================================================================
     RESTAURANT
  ====================================================================== */
  var restaurant = {
    /** Get owner's restaurant (RLS: only their own row) */
    get: async function () {
      var res = await sb.from('cov_restaurants').select('*').limit(1).maybeSingle();
      return ok(res);
    },

    /** Update restaurant profile fields */
    update: async function (id, patch) {
      var res = await sb.from('cov_restaurants').update(patch).eq('id', id).select().single();
      return ok(res);
    },

    /** Insert a new restaurant (onboarding) */
    insert: async function (fields) {
      var res = await sb.from('cov_restaurants').insert(fields).select().single();
      return ok(res);
    },
  };

  /* ======================================================================
     ROOMS
  ====================================================================== */
  var rooms = {
    list: async function (restaurantId) {
      var res = await sb.from('cov_rooms')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order');
      return ok(res);
    },

    create: async function (fields) {
      var res = await sb.from('cov_rooms').insert(fields).select().single();
      return ok(res);
    },

    update: async function (id, patch) {
      var res = await sb.from('cov_rooms').update(patch).eq('id', id).select().single();
      return ok(res);
    },

    remove: async function (id) {
      var res = await sb.from('cov_rooms').delete().eq('id', id);
      return ok(res);
    },
  };

  /* ======================================================================
     TABLES
  ====================================================================== */
  var tables = {
    list: async function (restaurantId, roomId) {
      var q = sb.from('cov_tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order');
      if (roomId) q = q.eq('room_id', roomId);
      var res = await q;
      return ok(res);
    },

    get: async function (id) {
      var res = await sb.from('cov_tables').select('*').eq('id', id).single();
      return ok(res);
    },

    create: async function (fields) {
      var res = await sb.from('cov_tables').insert(fields).select().single();
      return ok(res);
    },

    update: async function (id, patch) {
      var res = await sb.from('cov_tables').update(patch).eq('id', id).select().single();
      return ok(res);
    },

    /** Persist drag-to-move position */
    updatePosition: async function (id, posX, posY) {
      var res = await sb.from('cov_tables').update({ pos_x: posX, pos_y: posY }).eq('id', id).select().single();
      return ok(res);
    },

    remove: async function (id) {
      var res = await sb.from('cov_tables').delete().eq('id', id);
      return ok(res);
    },
  };

  /* ======================================================================
     SERVICE PERIODS
  ====================================================================== */
  var servicePeriods = {
    list: async function (restaurantId) {
      var res = await sb.from('cov_service_periods')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('start_time');
      return ok(res);
    },

    create: async function (fields) {
      var res = await sb.from('cov_service_periods').insert(fields).select().single();
      return ok(res);
    },

    update: async function (id, patch) {
      var res = await sb.from('cov_service_periods').update(patch).eq('id', id).select().single();
      return ok(res);
    },

    remove: async function (id) {
      var res = await sb.from('cov_service_periods').delete().eq('id', id);
      return ok(res);
    },
  };

  /* ======================================================================
     GUESTS
  ====================================================================== */
  var guests = {
    list: async function (restaurantId, opts) {
      opts = opts || {};
      var q = sb.from('cov_guests')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('total_visits', { ascending: false });
      if (opts.limit) q = q.limit(opts.limit);
      var res = await q;
      return ok(res);
    },

    get: async function (id) {
      var res = await sb.from('cov_guests').select('*').eq('id', id).single();
      return ok(res);
    },

    /** Search by normalised phone — returns null if not found */
    findByPhone: async function (restaurantId, phone) {
      // normalize: strip non-digits
      var norm = String(phone).replace(/\D/g, '');
      var res = await sb.from('cov_guests')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .ilike('phone', '%' + norm + '%')
        .maybeSingle();
      return ok(res);
    },

    /** Full-text search by name or phone */
    search: async function (restaurantId, query) {
      var res = await sb.from('cov_guests')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .or('name.ilike.%' + query + '%,phone.ilike.%' + query + '%,email.ilike.%' + query + '%')
        .order('total_visits', { ascending: false })
        .limit(20);
      return ok(res);
    },

    update: async function (id, patch) {
      var res = await sb.from('cov_guests').update(patch).eq('id', id).select().single();
      return ok(res);
    },

    upsert: async function (fields) {
      var res = await sb.from('cov_guests').upsert(fields, { onConflict: 'restaurant_id,phone' }).select().single();
      return ok(res);
    },
  };

  /* ======================================================================
     RESERVATIONS
  ====================================================================== */
  var reservations = {
    /** List reservations for a given date (local to restaurant TZ) */
    listByDate: async function (restaurantId, isoDate) {
      // fetch from start of day to end of day UTC-wide (server filters by starts_at date)
      var startUtc = isoDate + 'T00:00:00.000Z';
      var endUtc   = isoDate + 'T23:59:59.999Z';
      var res = await sb.from('cov_reservations')
        .select('*, cov_guests(id,name,phone,tags,no_show_count,total_visits), cov_tables(id,label,room_id)')
        .eq('restaurant_id', restaurantId)
        .gte('starts_at', startUtc)
        .lte('starts_at', endUtc)
        .neq('status', 'cancelled')
        .order('starts_at');
      return ok(res);
    },

    /** List upcoming reservations (next N hours from now) */
    listUpcoming: async function (restaurantId, hoursAhead) {
      hoursAhead = hoursAhead || 2;
      var now = new Date().toISOString();
      var until = new Date(Date.now() + hoursAhead * 3600 * 1000).toISOString();
      var res = await sb.from('cov_reservations')
        .select('*, cov_guests(id,name,phone,tags), cov_tables(id,label)')
        .eq('restaurant_id', restaurantId)
        .gte('starts_at', now)
        .lte('starts_at', until)
        .in('status', ['booked', 'confirmed'])
        .order('starts_at')
        .limit(20);
      return ok(res);
    },

    /** Count covers (sum of party_size) for a given date */
    countCoversForDate: async function (restaurantId, isoDate) {
      var startUtc = isoDate + 'T00:00:00.000Z';
      var endUtc   = isoDate + 'T23:59:59.999Z';
      var res = await sb.from('cov_reservations')
        .select('party_size')
        .eq('restaurant_id', restaurantId)
        .gte('starts_at', startUtc)
        .lte('starts_at', endUtc)
        .in('status', ['booked', 'confirmed', 'seated', 'completed']);
      var rows = ok(res) || [];
      return rows.reduce(function (sum, r) { return sum + (r.party_size || 0); }, 0);
    },

    /** No-show rate over last 30 days (0..1) */
    noShowRate30d: async function (restaurantId) {
      var since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      var res = await sb.from('cov_reservations')
        .select('status')
        .eq('restaurant_id', restaurantId)
        .gte('starts_at', since)
        .in('status', ['completed', 'no_show']);
      var rows = ok(res) || [];
      if (!rows.length) return 0;
      var noShows = rows.filter(function (r) { return r.status === 'no_show'; }).length;
      return noShows / rows.length;
    },

    get: async function (id) {
      var res = await sb.from('cov_reservations')
        .select('*, cov_guests(*), cov_tables(id,label,room_id,seats_max)')
        .eq('id', id)
        .single();
      return ok(res);
    },

    /** Host creates a reservation directly (not via public booking RPC) */
    create: async function (fields) {
      var res = await sb.from('cov_reservations').insert(fields).select().single();
      return ok(res);
    },

    update: async function (id, patch) {
      var res = await sb.from('cov_reservations').update(patch).eq('id', id).select().single();
      return ok(res);
    },

    /** Transition status with timestamp side effects */
    updateStatus: async function (id, status) {
      var patch = { status: status };
      if (status === 'seated')    patch.seated_at    = new Date().toISOString();
      if (status === 'completed') patch.completed_at = new Date().toISOString();
      if (status === 'cancelled') patch.cancelled_at = new Date().toISOString();
      var res = await sb.from('cov_reservations').update(patch).eq('id', id).select().single();
      return ok(res);
    },

    /** Assign table to a reservation; checks done in UI — authoritative check is DB */
    assignTable: async function (id, tableId) {
      var res = await sb.from('cov_reservations').update({ table_id: tableId }).eq('id', id).select().single();
      return ok(res);
    },

    cancel: async function (id) {
      var res = await sb.from('cov_reservations')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      return ok(res);
    },
  };

  /* ======================================================================
     BLACKOUTS
  ====================================================================== */
  var blackouts = {
    list: async function (restaurantId) {
      var res = await sb.from('cov_blackouts')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('starts_at');
      return ok(res);
    },

    listActive: async function (restaurantId) {
      var now = new Date().toISOString();
      var res = await sb.from('cov_blackouts')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('end_at', now)
        .order('starts_at');
      return ok(res);
    },

    create: async function (fields) {
      var res = await sb.from('cov_blackouts').insert(fields).select().single();
      return ok(res);
    },

    update: async function (id, patch) {
      var res = await sb.from('cov_blackouts').update(patch).eq('id', id).select().single();
      return ok(res);
    },

    remove: async function (id) {
      var res = await sb.from('cov_blackouts').delete().eq('id', id);
      return ok(res);
    },
  };

  /* ======================================================================
     RPCs — the four SECURITY DEFINER functions on the backend
  ====================================================================== */
  var rpc = {
    /**
     * Get available booking slots.
     * Returns: [{slot_time, tables_free, limited}]
     */
    availableSlots: async function (slug, date, partySize) {
      var res = await sb.rpc('cov_available_slots', {
        p_slug:  slug,
        p_date:  date,
        p_party: partySize,
      });
      return ok(res);
    },

    /**
     * Public booking — atomic, conflict-safe.
     * Returns reservation row or throws on conflict.
     */
    book: async function (slug, startsAt, partySize, name, phone, email, requests) {
      var res = await sb.rpc('cov_book', {
        p_slug:     slug,
        p_start:    startsAt,
        p_party:    partySize,
        p_name:     name,
        p_phone:    phone,
        p_email:    email || null,
        p_requests: requests || null,
      });
      return ok(res);
    },

    /**
     * Fetch reservation details by manage token (public manage link).
     * Returns reservation + restaurant info or null.
     */
    manageGet: async function (token) {
      var res = await sb.rpc('cov_manage_get', { p_token: token });
      return ok(res);
    },

    /**
     * Cancel a reservation via manage token (public).
     */
    manageCancel: async function (token) {
      var res = await sb.rpc('cov_manage_cancel', { p_token: token });
      return ok(res);
    },
  };

  /* ======================================================================
     REALTIME subscriptions
  ====================================================================== */

  // Monotonic counter so every sb.channel() call gets a unique topic name.
  // supabase-js caches channels by topic; reusing a topic after subscribe()
  // throws "cannot add postgres_changes callbacks … after subscribe()".
  var _chSeq = 0;

  var realtime = {
    /**
     * Subscribe to reservation changes for a restaurant.
     * cb(payload) is called on INSERT/UPDATE/DELETE.
     * Returns the channel so caller can sb.removeChannel(ch).
     */
    subscribeReservations: function (restaurantId, cb) {
      var ch = sb.channel('cov_res_' + restaurantId + '_' + (++_chSeq))
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'cov_reservations',
          filter: 'restaurant_id=eq.' + restaurantId,
        }, cb)
        .subscribe();
      return ch;
    },

    /**
     * Subscribe to table changes (position, status) for a restaurant.
     */
    subscribeTables: function (restaurantId, cb) {
      var ch = sb.channel('cov_tbl_' + restaurantId + '_' + (++_chSeq))
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'cov_tables',
          filter: 'restaurant_id=eq.' + restaurantId,
        }, cb)
        .subscribe();
      return ch;
    },

    removeChannel: function (ch) {
      if (ch) sb.removeChannel(ch);
    },
  };

  /* ======================================================================
     DOM / UI helpers (shared across screens)
  ====================================================================== */

  function el(sel, root)  { return (root || document).querySelector(sel); }
  function els(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg, kind, ms) {
    var host = el('#cov-toast');
    if (!host) { console.warn('[coverly] #cov-toast not found'); return; }
    var t = document.createElement('div');
    t.className = 'cov-toast' + (kind ? ' ' + kind : '');
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 3500);
  }

  /** Skeleton shimmer HTML: n placeholder cards */
  function skeletonCards(n, cls) {
    var html = '';
    for (var i = 0; i < (n || 3); i++) {
      html += '<div class="' + (cls || 'skeleton-card') + ' skeleton" aria-hidden="true" style="height:96px;border-radius:var(--radius-lg);"></div>';
    }
    return html;
  }

  /** Format date string for display in restaurant timezone.
   *  Falls back to browser locale if Intl is unavailable. */
  function formatDate(isoStr, tz, opts) {
    if (!isoStr) return '';
    try {
      return new Intl.DateTimeFormat('en-GB', Object.assign({
        timeZone: tz || 'UTC',
        dateStyle: 'medium',
        timeStyle: 'short',
      }, opts || {})).format(new Date(isoStr));
    } catch (e) {
      return new Date(isoStr).toLocaleString();
    }
  }

  function formatTime(isoStr, tz) {
    return formatDate(isoStr, tz, { dateStyle: undefined, timeStyle: 'short' });
  }

  /** Slugify restaurant name */
  function slugify(name) {
    return String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60);
  }

  /* ======================================================================
     ONBOARDING — seed starter data for a new owner
  ====================================================================== */
  var onboarding = {
    /**
     * Create restaurant + 1 room + 1 service period + 4 sample tables.
     * Called when logged-in user has no cov_restaurants row.
     */
    seed: async function (userId, name, timezone) {
      timezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      var slug  = slugify(name);

      // 1. Restaurant
      var rest = await restaurant.insert({
        owner_user_id:      userId,
        name:               name,
        slug:               slug,
        timezone:           timezone,
        booking_enabled:    true,
        default_turn_minutes: 90,
        buffer_minutes:     15,
        max_party_online:   10,
        deposit_required:   false,
      });

      // 2. Room "Main Dining"
      var room = await rooms.create({
        restaurant_id: rest.id,
        name:          'Main Dining',
        sort_order:    0,
        is_active:     true,
      });

      // 3. Service period: Dinner Mon–Sun 17:00–22:00, last seating 21:30, 30-min slots
      await servicePeriods.create({
        restaurant_id:       rest.id,
        name:                'Dinner',
        days_of_week:        [0,1,2,3,4,5,6],
        start_time:          '17:00:00',
        end_time:            '22:00:00',
        last_seating_time:   '21:30:00',
        slot_interval_minutes: 30,
      });

      // 4. Four sample tables
      var sampleTables = [
        { label: 'T1', seats_min: 1, seats_max: 2,  shape: 'square', pos_x: 40,  pos_y: 40,  sort_order: 0, online_bookable: true },
        { label: 'T2', seats_min: 1, seats_max: 2,  shape: 'square', pos_x: 160, pos_y: 40,  sort_order: 1, online_bookable: true },
        { label: 'T3', seats_min: 2, seats_max: 4,  shape: 'rect',   pos_x: 40,  pos_y: 160, sort_order: 2, online_bookable: true },
        { label: 'T4', seats_min: 4, seats_max: 6,  shape: 'rect',   pos_x: 200, pos_y: 160, sort_order: 3, online_bookable: true },
      ];
      for (var i = 0; i < sampleTables.length; i++) {
        var t = Object.assign({}, sampleTables[i], {
          restaurant_id: rest.id,
          room_id:       room.id,
          width:         80,
          height:        60,
          is_active:     true,
        });
        await tables.create(t);
      }

      return rest;
    },
  };

  /* ======================================================================
     EXPORT
  ====================================================================== */
  window.COV = window.COV || {};
  window.COV.sb           = sb;
  window.COV.data         = {
    auth,
    restaurant,
    rooms,
    tables,
    servicePeriods,
    guests,
    reservations,
    blackouts,
    rpc,
    realtime,
    onboarding,
  };
  window.COV.utils = { el, els, esc, toast, skeletonCards, formatDate, formatTime, slugify };

}());
