import type { Address, OrderStatusKey, PaymentMethod } from "@/lib/orders";
import { api, isBackendConfigured, tokens } from "@/lib/api/client";
import { ORDERS, PROFILE } from "@/lib/api/endpoints";

export type DbOrder = {
  id: string;
  order_code: string;
  dish_name: string;
  dish_image: string | null;
  size: string;
  qty: number;
  total: number;
  payment: string;
  address: Address;
  rider: { name: string; phone: string; bike: string };
  status: OrderStatusKey;
  eta_minutes: number;
  created_at: string;
  rating?: number | null;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  street: string | null;
  avatar_url: string | null;
  role?: string;
  email?: string;
};

type LocalAccount = { profile: Profile | null; orders: DbOrder[] };

const KEY = "kmg.account.local.v1";

function read(): LocalAccount {
  if (typeof window === "undefined") return { profile: null, orders: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { profile: null, orders: [] };
    return JSON.parse(raw) as LocalAccount;
  } catch {
    return { profile: null, orders: [] };
  }
}

function write(next: LocalAccount) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

type BackendProfileResponse = {
  username: string;
  email: string;
  role: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
};

export async function fetchProfile(_userId?: string): Promise<Profile | null> {
  if (!isBackendConfigured() || !tokens.access()) {
    return read().profile;
  }

  try {
    const p = await api.get<BackendProfileResponse>(PROFILE.detail);
    
    // Attempt to pull default address for city/street display on profile banner
    let defaultCity: string | null = null;
    let defaultStreet: string | null = null;
    try {
      const addresses = await api.get<Address[]>(PROFILE.addresses);
      const def = addresses.find((a) => a.is_default) || addresses[0];
      if (def) {
        defaultCity = def.city;
        defaultStreet = def.street;
      }
    } catch {
      /* ignore address fetch failure */
    }

    const profile: Profile = {
      id: p.username,
      full_name: p.full_name || p.username,
      phone: p.phone || null,
      city: defaultCity,
      street: defaultStreet,
      avatar_url: p.avatar_url || null,
      role: p.role,
      email: p.email,
    };

    write({ ...read(), profile });
    return profile;
  } catch {
    return read().profile;
  }
}

export async function saveProfile(input: Partial<Profile>): Promise<Profile | null> {
  if (!isBackendConfigured() || !tokens.access()) {
    const store = read();
    const merged = { ...(store.profile || { id: "local", full_name: "", phone: "", city: "", street: "", avatar_url: "" }), ...input };
    write({ ...store, profile: merged as Profile });
    return merged as Profile;
  }

  const payload: Record<string, unknown> = {};
  if (input.full_name !== undefined) payload["full_name"] = input.full_name;
  if (input.phone !== undefined) payload["phone"] = input.phone;
  if (input.avatar_url !== undefined) payload["avatar_url"] = input.avatar_url;

  const res = await api.patch<BackendProfileResponse>(PROFILE.update, payload);
  return fetchProfile(res.username);
}

type BackendOrderItem = {
  id: number;
  dish_name: string;
  size: string;
  qty: number;
  unit_price: string;
  line_total: string;
};

type BackendOrder = {
  id: number;
  order_code: string;
  dish_name: string;
  dish_image: string | null;
  size: string;
  qty: number;
  subtotal: string;
  delivery_fee: string;
  cod_fee: string;
  discount: string;
  total: string;
  payment: string;
  address: Address;
  rider: { name?: string; phone?: string; bike?: string; vehicle?: string } | null;
  status: OrderStatusKey;
  eta_minutes: number;
  rating?: number | null;
  created_at: string;
  order_items?: BackendOrderItem[];
};

export function mapBackendOrder(o: BackendOrder): DbOrder {
  return {
    id: String(o.id),
    order_code: o.order_code,
    dish_name: o.dish_name,
    dish_image: o.dish_image,
    size: o.size || "Regular",
    qty: o.qty || 1,
    total: Number(o.total),
    payment: o.payment,
    address: o.address,
    rider: {
      name: o.rider?.name || "Assigned Courier",
      phone: o.rider?.phone || "0300-0000000",
      bike: o.rider?.bike || o.rider?.vehicle || "Honda CD-70",
    },
    status: o.status,
    eta_minutes: o.eta_minutes || 30,
    rating: o.rating,
    created_at: o.created_at,
  };
}

export async function fetchOrders(_userId?: string): Promise<DbOrder[]> {
  if (!isBackendConfigured() || !tokens.access()) {
    return read().orders.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  try {
    const raw = await api.get<BackendOrder[]>(ORDERS.list);
    const orders = raw.map(mapBackendOrder);
    write({ ...read(), orders });
    return orders;
  } catch {
    return read().orders;
  }
}

export async function createOrder(input: {
  userId?: string;
  orderCode?: string;
  dishName?: string;
  dishImage?: string;
  size?: string;
  qty?: number;
  total?: number;
  payment: PaymentMethod;
  address: Address;
  rider?: { name: string; phone: string; bike: string };
  items?: { dish_slug?: string; dish_id?: number; size: string; qty: number }[];
  dishSlug?: string;
}): Promise<string> {
  if (isBackendConfigured() && tokens.access()) {
    const itemsPayload =
      input.items && input.items.length
        ? input.items.map((i) => ({
            dish_slug: i.dish_slug,
            dish_id: i.dish_id,
            size: i.size || "Regular",
            qty: i.qty || 1,
          }))
        : [
            {
              dish_slug: input.dishSlug,
              size: input.size || "Regular",
              qty: input.qty || 1,
            },
          ];

    const orderPayload = {
      items: itemsPayload,
      payment: input.payment,
      address: {
        label: input.address.label || "Home",
        name: input.address.name,
        phone: input.address.phone,
        street: input.address.street,
        area: input.address.area,
        city: input.address.city,
        notes: input.address.notes || "",
        lat: input.address.lat || 32.1023,
        lng: input.address.lng || 74.8721,
      },
    };

    const res = await api.post<BackendOrder>(ORDERS.create, orderPayload);
    await fetchOrders();
    return String(res.id);
  }

  // Local fallback
  const store = read();
  const order: DbOrder = {
    id: `local-${Date.now()}`,
    order_code: input.orderCode || `MG-${Math.floor(100000 + Math.random() * 900000)}`,
    dish_name: input.dishName || "Custom Order",
    dish_image: input.dishImage || null,
    size: input.size || "Regular",
    qty: input.qty || 1,
    total: input.total || 1500,
    payment: input.payment,
    address: input.address,
    rider: input.rider || { name: "Bilal Ahmed", phone: "0300-4471902", bike: "Honda CD-70" },
    status: "confirmed",
    eta_minutes: 35,
    created_at: new Date().toISOString(),
  };
  write({ ...store, orders: [order, ...store.orders] });
  return order.id;
}

export async function rateOrder(orderId: string | number, rating: number): Promise<void> {
  if (isBackendConfigured() && tokens.access()) {
    await api.post(ORDERS.rate(orderId), { rating });
    await fetchOrders();
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatusKey) {
  if (isBackendConfigured() && tokens.access()) {
    await api.post(ORDERS.status(orderId), { status });
    await fetchOrders();
    return;
  }
  const store = read();
  write({
    ...store,
    orders: store.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
  });
}
