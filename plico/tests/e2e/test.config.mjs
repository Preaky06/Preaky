// Configuration de test : paiement Polar fictif (servi par scripts/dev.mjs --mock).
import base from '../../site.config.mjs';

const c = structuredClone(base);
c.siteUrl = 'https://plico.example';
c.billing.provider = 'polar';
c.billing.polar.organizationId = 'org_test';
c.billing.customerPortalUrl = 'https://polar.example/portal';
c.plans.pro.checkout = { monthly: 'https://checkout.example/pro-monthly', yearly: 'https://checkout.example/pro-yearly' };
c.plans.business.checkout = { monthly: 'https://checkout.example/biz-monthly', yearly: 'https://checkout.example/biz-yearly' };
c.plans.pro.match.polarBenefitIds = ['ben_pro'];
c.plans.business.match.polarBenefitIds = ['ben_biz'];
export default c;
