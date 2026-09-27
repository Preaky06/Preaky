// Abonnement ExpliSite+ (Stripe) et quotas mensuels.
//   POST /api/billing/checkout   → page de paiement Stripe (mensuel ou annuel)
//   POST /api/billing/portal     → espace client Stripe (résilier, carte, factures)
//   POST /api/billing/webhook    → notifications Stripe, signature vérifiée
// Sans dépendance : appels REST à l'API Stripe, signature HMAC-SHA256 vérifiée ici.
import crypto from "node:crypto";

const PREMIUM_STATUSES = new Set(["active", "trialing", "past_due"]);
const GRACE_MS = 3 * 86400_000; // paiement en échec : 3 jours de grâce après l'échéance

export function createBilling(env, { store, sendJson, readJsonBody, readRawBody, foreignOrigin, currentUser, baseUrl, log = console }) {
  const stripeKey = env.STRIPE_SECRET_KEY || "";
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET || "";
  const apiBase = (env.STRIPE_API_BASE || "https://api.stripe.com").replace(/\/+$/, "");
  const priceIds = { month: env.STRIPE_PRICE_MONTHLY || "", year: env.STRIPE_PRICE_YEARLY || "" };
  const stripeOn = !!(stripeKey && (priceIds.month || priceIds.year));

  const limits = {
    free: { analyses: num(env.FREE_ANALYSES_PER_MONTH, 1), questions: num(env.FREE_QUESTIONS_PER_MONTH, 10) },
    premium: { analyses: num(env.PREMIUM_ANALYSES_PER_MONTH, 200), questions: num(env.PREMIUM_QUESTIONS_PER_MONTH, 1000) },
  };
  // Quotas actifs dès que Stripe est configuré, ou explicitement (QUOTAS=1).
  const quotasOn = !!store && (stripeOn || env.QUOTAS === "1");

  // Prix affichés : lus chez Stripe au démarrage (source de vérité), sinon réglages.
  const prices = {
    month: priceIds.month || !stripeOn ? { amount: num(env.PRICE_MONTHLY_CENTS, 499), currency: "eur" } : null,
    year: priceIds.year || !stripeOn ? { amount: num(env.PRICE_YEARLY_CENTS, 4999), currency: "eur" } : null,
  };
  if (stripeOn) {
    for (const interval of ["month", "year"]) {
      if (!priceIds[interval]) continue;
      stripe("GET", `/v1/prices/${priceIds[interval]}`).then((p) => {
        prices[interval] = { amount: p.unit_amount, currency: p.currency };
      }).catch((e) => log.warn(`Stripe : prix ${interval} illisible (${e.message}). Prix de secours affiché.`));
    }
  }

  async function stripe(method, path, params) {
    const res = await fetch(apiBase + path, {
      method,
      headers: { Authorization: `Bearer ${stripeKey}`, ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
      body: params ? formEncode(params) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `Stripe ${res.status}`);
    return data;
  }

  const month = () => new Date().toISOString().slice(0, 7);
  const nextMonthStart = () => { const d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); };

  function isPremium(plan) {
    if (!plan?.status || !PREMIUM_STATUSES.has(plan.status)) return false;
    return !plan.periodEnd || plan.periodEnd * 1000 + GRACE_MS > Date.now();
  }

  // Ce que voit l'interface pour la personne connectée.
  function account(userId) {
    const plan = store.getPlan(userId);
    const premium = isPremium(plan);
    return {
      plan: {
        premium, status: plan?.status || null, interval: plan?.interval || null,
        periodEnd: plan?.periodEnd || null, cancelAtPeriodEnd: !!plan?.cancelAtPeriodEnd, manageable: !!plan?.customer && stripeOn,
      },
      usage: { month: month(), resetsAt: nextMonthStart(), ...store.getUsage(userId, month()) },
      limits: premium ? limits.premium : limits.free,
    };
  }

  // Réserve une unité avant l'appel coûteux ; release() la rend si l'appel échoue.
  function reserve(userId, kind) {
    const { limits: lim, plan } = account(userId);
    const used = store.getUsage(userId, month())[kind];
    if (used >= lim[kind]) {
      return {
        ok: false, premium: plan.premium, limit: lim[kind], resetsAt: nextMonthStart(),
        message: plan.premium
          ? `Vous avez atteint la limite d'usage raisonnable (${lim[kind]} ce mois-ci). Elle se réinitialise le 1er du mois prochain.`
          : kind === "analyses"
            ? `Votre analyse gratuite de ce mois est utilisée. Passez à ExpliSite+ pour analyser sans attendre, ou revenez le 1er du mois prochain.`
            : `Vous avez posé vos ${lim[kind]} questions gratuites de ce mois. Passez à ExpliSite+ pour continuer.`,
      };
    }
    const m = month();
    store.bumpUsage(userId, m, kind, 1);
    return { ok: true, release: () => store.bumpUsage(userId, m, kind, -1) };
  }

  // Applique l'état d'un abonnement Stripe au compte correspondant.
  function applySubscription(sub) {
    const item = sub.items?.data?.[0];
    const periodEnd = sub.current_period_end || item?.current_period_end || null; // selon la version de l'API Stripe
    const ok = store.setPlanByCustomer(sub.customer, {
      status: sub.status, interval: item?.price?.recurring?.interval || item?.plan?.interval || null,
      periodEnd, cancelAtPeriodEnd: !!sub.cancel_at_period_end || !!sub.cancel_at,
    });
    if (!ok) log.warn(`Stripe : abonnement ${sub.id} pour un client inconnu (${sub.customer}).`);
  }

  function verifySignature(raw, header) {
    let t = null;
    const sigs = [];
    for (const kv of String(header || "").split(",")) {
      const [k, v] = kv.split("=");
      if (k === "t") t = v;
      if (k === "v1" && v) sigs.push(v);
    }
    if (!t || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
    const expected = crypto.createHmac("sha256", webhookSecret).update(`${t}.${raw}`).digest("hex");
    return sigs.some((s) => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
  }

  const fail = (status, message) => Object.assign(new Error(message), { status });

  async function handle(req, res, url) {
    if (!url.startsWith("/api/billing/")) return false;

    if (url === "/api/billing/webhook" && req.method === "POST") {
      if (!stripeOn || !webhookSecret) throw fail(404, "Paiement non configuré.");
      const raw = await readRawBody(req);
      if (!verifySignature(raw, req.headers["stripe-signature"])) throw fail(400, "Signature invalide.");
      const event = JSON.parse(raw);
      const obj = event.data?.object || {};
      if (event.type === "checkout.session.completed" && obj.mode === "subscription") {
        const userId = obj.client_reference_id || obj.metadata?.user_id;
        if (userId && obj.customer) store.setCustomer(userId, obj.customer);
        if (obj.subscription) applySubscription(await stripe("GET", `/v1/subscriptions/${obj.subscription}`));
      } else if (event.type?.startsWith("customer.subscription.")) {
        applySubscription(obj);
      }
      sendJson(res, 200, { received: true });
      return true;
    }

    if (req.method !== "POST") throw fail(405, "Méthode non autorisée.");
    if (foreignOrigin(req)) throw fail(403, "Origine non autorisée.");
    if (!stripeOn) throw fail(404, "Paiement non configuré.");
    const user = currentUser(req);
    if (!user) throw fail(401, "Connectez-vous pour vous abonner.");
    const plan = store.getPlan(user.id);

    if (url === "/api/billing/checkout") {
      const body = await readJsonBody(req);
      const interval = body.interval === "year" ? "year" : "month";
      if (!priceIds[interval]) throw fail(400, "Cette formule n'est pas proposée.");
      if (!body.withdrawalAck) throw fail(400, "Cochez la case sur le droit de rétractation pour continuer.");
      if (isPremium(plan)) throw fail(409, "Vous êtes déjà abonné. Gérez votre abonnement depuis « Mes documents ».");
      const base = baseUrl(req);
      const session = await stripe("POST", "/v1/checkout/sessions", {
        mode: "subscription",
        line_items: [{ price: priceIds[interval], quantity: 1 }],
        client_reference_id: user.id,
        ...(plan?.customer ? { customer: plan.customer } : { customer_email: user.email }),
        success_url: `${base}/#abonnement-ok`,
        cancel_url: `${base}/#abonnement-annule`,
        allow_promotion_codes: "true",
        locale: "fr",
        metadata: { user_id: user.id, withdrawal_ack: "immediate_start" },
        subscription_data: { metadata: { user_id: user.id } },
        ...(env.STRIPE_AUTOMATIC_TAX === "1" ? { automatic_tax: { enabled: "true" }, billing_address_collection: "required" } : {}),
      });
      sendJson(res, 200, { url: session.url });
      return true;
    }

    if (url === "/api/billing/portal") {
      if (!plan?.customer) throw fail(400, "Aucun abonnement à gérer.");
      const portal = await stripe("POST", "/v1/billing_portal/sessions", { customer: plan.customer, return_url: `${baseUrl(req)}/#compte` });
      sendJson(res, 200, { url: portal.url });
      return true;
    }
    throw fail(404, "Point d'accès inconnu.");
  }

  return {
    handle, reserve, account, quotasOn, stripeOn,
    publicInfo: () => ({
      enabled: stripeOn, quotas: quotasOn, prices,
      free: limits.free, premium: limits.premium,
    }),
  };
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && v !== undefined && v !== "" ? n : fallback;
}

// { a: { b: 1 }, c: [{ d: 2 }] } → "a[b]=1&c[0][d]=2" (format attendu par Stripe)
function formEncode(obj, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (typeof v === "object") formEncode(v, key, out);
    else out.append(key, String(v));
  }
  return prefix ? out : out.toString();
}
