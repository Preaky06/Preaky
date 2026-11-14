// Configuration de test : paiement Polar fictif (servi par scripts/dev.mjs --mock).
import base from '../../site.config.mjs';

const c = structuredClone(base);
c.siteUrl = 'https://cessio.example';
c.billing.polar.organizationId = 'org_test';
c.billing.customerPortalUrl = 'https://polar.example/portal';
c.plans.solo.checkout = { monthly: 'https://checkout.example/solo-monthly', yearly: 'https://checkout.example/solo-yearly' };
c.plans.studio.checkout = { monthly: 'https://checkout.example/studio-monthly', yearly: 'https://checkout.example/studio-yearly' };
c.plans.solo.match.polarBenefitIds = ['ben_1'];
c.plans.studio.match.polarBenefitIds = ['ben_2'];
export default c;
