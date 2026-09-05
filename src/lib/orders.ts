import type { Dish } from "./menu";
import { api, isBackendConfigured, tokens } from "@/lib/api/client";
import { PROFILE } from "@/lib/api/endpoints";

export type Address = {
  id?: string | number;
  label: string;
  name: string;
  phone: string;
  street: string;
  area: string;
  city: string;
  notes?: string;
  lat?: number;
  lng?: number;
  is_default?: boolean;
};

export type PaymentMethod = "jazzcash" | "easypaisa" | "cod";

export const PAYMENTS: {
  id: PaymentMethod;
  label: string;
  note: string;
  fee: number;
}[] = [
  { id: "jazzcash", label: "JazzCash", note: "Instant mobile wallet", fee: 0 },
  { id: "easypaisa", label: "EasyPaisa", note: "Instant mobile wallet", fee: 0 },
  { id: "cod", label: "Cash on Delivery", note: "Pay the rider at your door", fee: 150 },
];

export type OrderStatusKey = "confirmed" | "kitchen" | "packed" | "onway" | "delivered";

export const ORDER_STAGES: { key: OrderStatusKey; label: string; hint: string }[] = [
  { key: "confirmed", label: "Order Confirmed", hint: "Payment verified, ticket printed" },
  { key: "kitchen", label: "In the Kitchen", hint: "Charcoal fired, dish cooking" },
  { key: "packed", label: "Packed & Sealed", hint: "Boxed hot with free dips" },
  { key: "onway", label: "Rider On The Way", hint: "Live tracking active" },
  { key: "delivered", label: "Delivered", hint: "Enjoy your meal!" },
];

export type Order = {
  id: string;
  createdAt: number;
  dishName: string;
  dishImage: string;
  size: string;
  qty: number;
  total: number;
  payment: PaymentMethod;
  address: Address;
  rider: { name: string; phone: string; bike: string };
};

const ADDR_KEY = "kennedy.addresses";

export async function loadAddresses(): Promise<Address[]> {
  if (isBackendConfigured() && tokens.access()) {
    try {
      const addresses = await api.get<Address[]>(PROFILE.addresses);
      localStorage.setItem(ADDR_KEY, JSON.stringify(addresses));
      return addresses;
    } catch {
      /* fall back to cache */
    }
  }

  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ADDR_KEY) ?? "[]") as Address[];
  } catch {
    return [];
  }
}

export async function saveAddress(address: Address): Promise<Address[]> {
  if (isBackendConfigured() && tokens.access()) {
    try {
      if (address.id && typeof address.id === "number") {
        await api.patch(PROFILE.addressDetail(address.id), address);
      } else {
        await api.post(PROFILE.addresses, address);
      }
      return loadAddresses();
    } catch (err) {
      throw err;
    }
  }

  const local = loadAddressesLocal();
  const all = [...local.filter((a) => a.id !== address.id), address];
  localStorage.setItem(ADDR_KEY, JSON.stringify(all));
  return all;
}

export function loadAddressesLocal(): Address[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ADDR_KEY) ?? "[]") as Address[];
  } catch {
    return [];
  }
}

export async function deleteAddress(id: number | string): Promise<void> {
  if (isBackendConfigured() && tokens.access()) {
    await api.delete(PROFILE.addressDetail(id));
  }
  const local = loadAddressesLocal().filter((a) => a.id !== id);
  localStorage.setItem(ADDR_KEY, JSON.stringify(local));
}

export async function setDefaultAddress(id: number | string): Promise<void> {
  if (isBackendConfigured() && tokens.access()) {
    await api.post(PROFILE.setDefaultAddress(id));
  }
  const local = loadAddressesLocal().map((a) => ({ ...a, is_default: a.id === id }));
  localStorage.setItem(ADDR_KEY, JSON.stringify(local));
}

export const RIDERS = [
  { name: "Bilal Ahmed", phone: "0300-4471902", bike: "Honda CD-70 · NRL-4471" },
  { name: "Usman Tariq", phone: "0301-8823410", bike: "Suzuki GD-110 · NRL-8823" },
  { name: "Hamza Riaz", phone: "0345-6610233", bike: "Honda CG-125 · NRL-6610" },
];

export function buildOrder(input: {
  dish: Dish;
  size: string;
  qty: number;
  total: number;
  payment: PaymentMethod;
  address: Address;
}): Order {
  return {
    id: `MG-${Math.floor(100000 + Math.random() * 899999)}`,
    createdAt: Date.now(),
    dishName: input.dish.name,
    dishImage: input.dish.image,
    size: input.size,
    qty: input.qty,
    total: input.total,
    payment: input.payment,
    address: input.address,
    rider: RIDERS[Math.floor(Math.random() * RIDERS.length)]!,
  };
}
